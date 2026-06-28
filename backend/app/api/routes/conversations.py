from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import User, Conversation, ConversationParticipant, Message, MessageRead, Group, ConversationType
from app.schemas import ConversationResponse, MessageResponse, MessageCreate
from app.api.deps import get_current_user
from app.api.websockets import manager
import json
from datetime import datetime, timedelta

router = APIRouter()

class DirectConvRequest(BaseModel):
    user_id: str

@router.get("", response_model=List[ConversationResponse])
async def get_conversations(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get all conversations the user is a participant of
    result = await db.execute(
        select(Conversation)
        .join(ConversationParticipant)
        .where(ConversationParticipant.user_id == current_user.id)
        .options(selectinload(Conversation.participants).selectinload(ConversationParticipant.user))
        .options(selectinload(Conversation.group))
    )
    conversations = result.scalars().all()
    
    response = []
    for conv in conversations:
        # Get last message
        msg_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .options(selectinload(Message.sender))
            .options(selectinload(Message.reactions))
            .options(selectinload(Message.replies).selectinload(Message.reactions))
            .options(selectinload(Message.replies).selectinload(Message.sender))
            .order_by(desc(Message.created_at))
            .limit(1)
        )
        last_message = msg_result.scalars().first()
        
        # Calculate unread count (messages sent to this conv not read by current user)
        # For simplicity, we just count messages in this conv not sent by the user, where no MessageRead exists for the user
        unread_result = await db.execute(
            select(func.count(Message.id))
            .where(
                and_(
                    Message.conversation_id == conv.id,
                    Message.sender_id != current_user.id,
                    ~Message.reads.any(MessageRead.user_id == current_user.id)
                )
            )
        )
        unread_count = unread_result.scalar() or 0
        
        name = None
        avatar_url = None
        group_admin_id = None
        participants = [p.user for p in conv.participants]
        
        if conv.type == ConversationType.group and conv.group:
            name = conv.group.name
            avatar_url = conv.group.avatar_url
            group_admin_id = conv.group.created_by
        elif conv.type == ConversationType.direct:
            other_user = next((u for u in participants if u.id != current_user.id), current_user)
            name = other_user.display_name
            avatar_url = other_user.avatar_url
            
        response.append(ConversationResponse(
            id=conv.id,
            type=conv.type,
            created_at=conv.created_at,
            name=name,
            avatar_url=avatar_url,
            last_message=last_message,
            unread_count=unread_count,
            participants=participants,
            group_admin_id=group_admin_id,
            disappearing_timer=conv.disappearing_timer
        ))
        
    # Sort by last message created_at descending, or conversation created_at
    response.sort(key=lambda c: c.last_message.created_at if c.last_message else c.created_at, reverse=True)
    return response

@router.post("/direct", response_model=ConversationResponse)
async def create_direct_conversation(req: DirectConvRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if req.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot create conversation with yourself")
        
    # Check if a direct conversation already exists
    # Find conversations with exactly these two users
    subq = select(ConversationParticipant.conversation_id).where(
        ConversationParticipant.user_id.in_([current_user.id, req.user_id])
    ).group_by(ConversationParticipant.conversation_id).having(func.count() == 2)
    
    existing = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id.in_(subq),
                Conversation.type == ConversationType.direct
            )
        ).options(selectinload(Conversation.participants).selectinload(ConversationParticipant.user))
    )
    
    conv = existing.scalars().first()
    
    if not conv:
        conv = Conversation(type=ConversationType.direct)
        db.add(conv)
        await db.flush()
        
        p1 = ConversationParticipant(conversation_id=conv.id, user_id=current_user.id)
        p2 = ConversationParticipant(conversation_id=conv.id, user_id=req.user_id)
        db.add_all([p1, p2])
        await db.commit()
        await db.refresh(conv)
        
        # Load participants
        res = await db.execute(select(Conversation).where(Conversation.id == conv.id).options(selectinload(Conversation.participants).selectinload(ConversationParticipant.user)))
        conv = res.scalars().first()
    
    other_user = next((p.user for p in conv.participants if p.user.id != current_user.id), current_user)
    
    return ConversationResponse(
        id=conv.id,
        type=conv.type,
        created_at=conv.created_at,
        name=other_user.display_name,
        avatar_url=other_user.avatar_url,
        participants=[p.user for p in conv.participants],
        disappearing_timer=conv.disappearing_timer
    )

class GroupCreateRequest(BaseModel):
    name: str
    participant_ids: List[str]

@router.post("/groups", response_model=ConversationResponse)
async def create_group_conversation(req: GroupCreateRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Create the conversation
    conv = Conversation(type=ConversationType.group)
    db.add(conv)
    await db.flush()
    
    # Create the group details
    group = Group(id=conv.id, name=req.name, created_by=current_user.id)
    conv.group = group
    db.add(group)
    
    # Add participants including current user
    all_participants = list(set(req.participant_ids + [current_user.id]))
    participants = [ConversationParticipant(conversation_id=conv.id, user_id=uid) for uid in all_participants]
    db.add_all(participants)
    
    await db.commit()
    await db.refresh(conv)
    
    # Load relationships
    res = await db.execute(
        select(Conversation)
        .where(Conversation.id == conv.id)
        .options(selectinload(Conversation.participants).selectinload(ConversationParticipant.user))
        .options(selectinload(Conversation.group))
    )
    conv = res.scalars().first()
    
    return ConversationResponse(
        id=conv.id,
        type=conv.type,
        created_at=conv.created_at,
        name=conv.group.name,
        avatar_url=conv.group.avatar_url,
        participants=[p.user for p in conv.participants],
        group_admin_id=conv.group.created_by,
        disappearing_timer=conv.disappearing_timer
    )

class AddMemberRequest(BaseModel):
    user_id: str

@router.post("/{conversation_id}/members", response_model=ConversationResponse)
async def add_group_member(conversation_id: str, req: AddMemberRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants))
    )
    conv = res.scalars().first()
    if not conv or conv.type != ConversationType.group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Any member can add members
    if current_user.id not in [p.user_id for p in conv.participants]:
        raise HTTPException(status_code=403, detail="Not a participant")
        
    if req.user_id in [p.user_id for p in conv.participants]:
        raise HTTPException(status_code=400, detail="User already in group")
        
    new_member = ConversationParticipant(conversation_id=conversation_id, user_id=req.user_id)
    db.add(new_member)
    await db.commit()
    
    # Return updated conversation
    return await get_conversation(conversation_id, db, current_user)

@router.delete("/{conversation_id}/members/{user_id}", response_model=ConversationResponse)
async def remove_group_member(conversation_id: str, user_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants))
        .options(selectinload(Conversation.group))
    )
    conv = res.scalars().first()
    if not conv or conv.type != ConversationType.group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Only group creator (admin) can remove others
    if current_user.id != conv.group.created_by:
        raise HTTPException(status_code=403, detail="Only admin can remove members")
        
    if user_id == conv.group.created_by:
        raise HTTPException(status_code=400, detail="Admin cannot be removed")
        
    # Find participant
    participant = next((p for p in conv.participants if p.user_id == user_id), None)
    if not participant:
        raise HTTPException(status_code=404, detail="User not in group")
        
    await db.delete(participant)
    await db.commit()
    
    return await get_conversation(conversation_id, db, current_user)


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants).selectinload(ConversationParticipant.user))
        .options(selectinload(Conversation.group))
    )
    conv = res.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    if current_user.id not in [p.user.id for p in conv.participants]:
        raise HTTPException(status_code=403, detail="Not a participant")
        
    name = None
    avatar_url = None
    participants = [p.user for p in conv.participants]
    
    if conv.type == ConversationType.group and conv.group:
        name = conv.group.name
        avatar_url = conv.group.avatar_url
        group_admin_id = conv.group.created_by
    elif conv.type == ConversationType.direct:
        other_user = next((u for u in participants if u.id != current_user.id), current_user)
        name = other_user.display_name
        avatar_url = other_user.avatar_url
        
    return ConversationResponse(
        id=conv.id,
        type=conv.type,
        created_at=conv.created_at,
        name=name,
        avatar_url=avatar_url,
        participants=participants,
        group_admin_id=group_admin_id,
        disappearing_timer=conv.disappearing_timer
    )

class ConversationSettingsRequest(BaseModel):
    disappearing_timer: Optional[int] = None

@router.put("/{conversation_id}/settings", response_model=ConversationResponse)
async def update_conversation_settings(conversation_id: str, req: ConversationSettingsRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants))
    )
    conv = res.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    if current_user.id not in [p.user_id for p in conv.participants]:
        raise HTTPException(status_code=403, detail="Not a participant")
        
    conv.disappearing_timer = req.disappearing_timer
    await db.commit()
    
    return await get_conversation(conversation_id, db, current_user)

@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(conversation_id: str, limit: int = 50, offset: int = 0, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Filter out expired messages dynamically
    now = datetime.utcnow()
    res = await db.execute(
        select(Message)
        .where(
            and_(
                Message.conversation_id == conversation_id,
                or_(Message.disappears_at == None, Message.disappears_at > now)
            )
        )
        .options(selectinload(Message.sender))
        .options(selectinload(Message.reactions))
        .options(selectinload(Message.replies).selectinload(Message.reactions))
        .options(selectinload(Message.replies).selectinload(Message.sender))
        .order_by(desc(Message.created_at))
        .limit(limit)
        .offset(offset)
    )
    messages = res.scalars().all()
    return list(reversed(messages))


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(conversation_id: str, msg_req: MessageCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get conversation to check timer
    res = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = res.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    disappears_at = None
    if conv.disappearing_timer:
        disappears_at = datetime.utcnow() + timedelta(seconds=conv.disappearing_timer)
        
    msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=msg_req.content,
        message_type=msg_req.message_type,
        attachment_url=msg_req.attachment_url,
        attachment_name=msg_req.attachment_name,
        reply_to_id=msg_req.reply_to_id,
        disappears_at=disappears_at
    )
    db.add(msg)
    await db.commit()
    
    # Reload with relationships for broadcasting
    res = await db.execute(
        select(Message)
        .where(Message.id == msg.id)
        .options(selectinload(Message.sender))
        .options(selectinload(Message.reactions))
        .options(selectinload(Message.replies).selectinload(Message.reactions))
        .options(selectinload(Message.replies).selectinload(Message.sender))
    )
    loaded_msg = res.scalars().first()
    
    # Broadcast via WebSockets
    msg_resp = MessageResponse.model_validate(loaded_msg)
    await manager.broadcast(json.dumps({
        "type": "message.new",
        "conversation_id": conversation_id,
        "message": msg_resp.model_dump(mode='json')
    }))
    
    return msg_resp

@router.put("/{conversation_id}/messages/{message_id}/read")
async def mark_message_read(conversation_id: str, message_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    check = await db.execute(select(MessageRead).where(MessageRead.message_id == message_id, MessageRead.user_id == current_user.id))
    if not check.scalars().first():
        read = MessageRead(message_id=message_id, user_id=current_user.id)
        db.add(read)
        await db.commit()
    return {"message": "marked read"}

class ReactRequest(BaseModel):
    emoji: str

from app.db.models import MessageReaction

@router.post("/{conversation_id}/messages/{message_id}/react")
async def react_to_message(conversation_id: str, message_id: str, req: ReactRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if reaction already exists
    res = await db.execute(
        select(MessageReaction)
        .where(MessageReaction.message_id == message_id, MessageReaction.user_id == current_user.id)
    )
    existing_reaction = res.scalars().first()
    
    action = "added"
    
    if existing_reaction:
        if existing_reaction.emoji == req.emoji:
            # Toggle off if same emoji
            await db.delete(existing_reaction)
            action = "removed"
        else:
            # Change emoji
            existing_reaction.emoji = req.emoji
            action = "updated"
    else:
        new_reaction = MessageReaction(message_id=message_id, user_id=current_user.id, emoji=req.emoji)
        db.add(new_reaction)
        
    await db.commit()
    
    # Fetch all reactions to broadcast updated state
    res = await db.execute(
        select(Message)
        .where(Message.id == message_id)
        .options(selectinload(Message.sender))
        .options(selectinload(Message.reactions))
        .options(selectinload(Message.replies).selectinload(Message.reactions))
        .options(selectinload(Message.replies).selectinload(Message.sender))
    )
    msg = res.scalars().first()
    
    msg_resp = MessageResponse.model_validate(msg)
    
    # Broadcast
    await manager.broadcast(json.dumps({
        "type": "message.reaction",
        "conversation_id": conversation_id,
        "message_id": message_id,
        "reactions": [r.model_dump(mode='json') for r in msg_resp.reactions]
    }))
    
    return {"message": f"Reaction {action}"}

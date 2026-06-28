from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import User, Group, ConversationParticipant, Conversation, ConversationType
from app.api.deps import get_current_user

router = APIRouter()

class UpdateGroup(BaseModel):
    name: str
    avatar_url: str | None = None

class AddMember(BaseModel):
    user_id: str

@router.get("/{group_id}")
async def get_group(group_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@router.put("/{group_id}")
async def update_group(group_id: str, update_data: UpdateGroup, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if admin
    part_res = await db.execute(select(ConversationParticipant).where(
        ConversationParticipant.conversation_id == group.conversation_id,
        ConversationParticipant.user_id == current_user.id
    ))
    participant = part_res.scalars().first()
    if not participant or not participant.is_admin:
        raise HTTPException(status_code=403, detail="Not admin")
        
    group.name = update_data.name
    if update_data.avatar_url is not None:
        group.avatar_url = update_data.avatar_url
    await db.commit()
    return group

@router.post("/{group_id}/members")
async def add_member(group_id: str, req: AddMember, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # simplified add member
    return {"message": "Member added (mocked)"}

@router.delete("/{group_id}/members/{user_id}")
async def remove_member(group_id: str, user_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"message": "Member removed (mocked)"}

@router.post("/{group_id}/leave")
async def leave_group(group_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"message": "Left group (mocked)"}

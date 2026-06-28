from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import User, Story, StoryView, Contact, ConversationParticipant
from app.api.deps import get_current_user
from app.schemas import UserResponse

router = APIRouter()

class StoryCreate(BaseModel):
    media_url: str
    caption: Optional[str] = None

class StoryViewResponse(BaseModel):
    user_id: str
    viewed_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True

class StoryResponse(BaseModel):
    id: str
    user_id: str
    media_url: str
    caption: Optional[str]
    created_at: datetime
    expires_at: datetime
    views: List[StoryViewResponse] = []

    class Config:
        from_attributes = True

class UserStoriesResponse(BaseModel):
    user: UserResponse
    stories: List[StoryResponse]

@router.post("", response_model=StoryResponse)
async def create_story(
    story_in: StoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    story = Story(
        user_id=current_user.id,
        media_url=story_in.media_url,
        caption=story_in.caption,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(story)
    await db.commit()
    
    # Reload with views eagerly loaded to satisfy StoryResponse
    res = await db.execute(
        select(Story)
        .where(Story.id == story.id)
        .options(selectinload(Story.views).selectinload(StoryView.user))
    )
    return res.scalars().first()

@router.get("", response_model=List[UserStoriesResponse])
async def get_stories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get users we share conversations with
    participant_result = await db.execute(
        select(ConversationParticipant.user_id)
        .where(
            ConversationParticipant.conversation_id.in_(
                select(ConversationParticipant.conversation_id)
                .where(ConversationParticipant.user_id == current_user.id)
            )
        )
    )
    shared_users = set(participant_result.scalars().all())
    shared_users.add(current_user.id) # Include own stories
    contact_ids = list(shared_users)

    # Get active stories for these users
    now = datetime.utcnow()
    story_result = await db.execute(
        select(Story)
        .where(
            and_(
                Story.user_id.in_(contact_ids),
                Story.expires_at > now
            )
        )
        .options(selectinload(Story.views).selectinload(StoryView.user))
        .order_by(desc(Story.created_at))
    )
    stories = story_result.scalars().all()

    # Group stories by user
    user_stories_dict = {}
    
    # We need to fetch the user objects
    user_result = await db.execute(select(User).where(User.id.in_(contact_ids)))
    users_by_id = {u.id: u for u in user_result.scalars().all()}

    for story in stories:
        if story.user_id not in user_stories_dict:
            user_stories_dict[story.user_id] = {
                "user": users_by_id[story.user_id],
                "stories": []
            }
        user_stories_dict[story.user_id]["stories"].append(story)
        
    return list(user_stories_dict.values())

@router.post("/{story_id}/view")
async def mark_story_viewed(
    story_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if already viewed
    existing_view = await db.execute(
        select(StoryView).where(
            and_(
                StoryView.story_id == story_id,
                StoryView.user_id == current_user.id
            )
        )
    )
    if existing_view.scalars().first():
        return {"status": "already_viewed"}
        
    view = StoryView(
        story_id=story_id,
        user_id=current_user.id
    )
    db.add(view)
    await db.commit()
    return {"status": "success"}

@router.delete("/{story_id}")
async def delete_story(
    story_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Story).where(Story.id == story_id))
    story = result.scalars().first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this story")
        
    await db.delete(story)
    await db.commit()
    return {"status": "success"}

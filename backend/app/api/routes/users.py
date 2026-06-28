from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from typing import List

from app.db.session import get_db
from app.db.models import User
from app.schemas import UserResponse
from app.api.deps import get_current_user
from pydantic import BaseModel

router = APIRouter()

class UpdateUser(BaseModel):
    display_name: str
    avatar_url: str | None = None

class UpdatePrivacy(BaseModel):
    allow_read_receipts: bool
    allow_typing_indicators: bool

@router.get("/search", response_model=List[UserResponse])
async def search_users(q: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not q or len(q) < 2:
        return []
    
    # Simple search
    result = await db.execute(
        select(User).where(
            and_(
                User.id != current_user.id,
                or_(
                    User.phone_or_username.ilike(f"%{q}%"),
                    User.display_name.ilike(f"%{q}%")
                )
            )
        ).limit(20)
    )
    return result.scalars().all()

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/me", response_model=UserResponse)
async def update_me(update_data: UpdateUser, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.display_name = update_data.display_name
    if update_data.avatar_url is not None:
        current_user.avatar_url = update_data.avatar_url
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.put("/me/privacy", response_model=UserResponse)
async def update_privacy(update_data: UpdatePrivacy, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.allow_read_receipts = update_data.allow_read_receipts
    current_user.allow_typing_indicators = update_data.allow_typing_indicators
    await db.commit()
    await db.refresh(current_user)
    return current_user

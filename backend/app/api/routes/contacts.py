from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import User, Contact
from app.schemas import UserResponse
from app.api.deps import get_current_user

router = APIRouter()

class AddContact(BaseModel):
    phone_or_username: str

@router.get("/", response_model=List[UserResponse])
async def get_contacts(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(User).join(Contact, Contact.contact_id == User.id).where(Contact.owner_id == current_user.id)
    )
    return result.scalars().all()

@router.post("/", response_model=UserResponse)
async def add_contact(contact_data: AddContact, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(User).where(User.phone_or_username == contact_data.phone_or_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
        
    # Check if already contact
    check = await db.execute(select(Contact).where(Contact.owner_id == current_user.id, Contact.contact_id == user.id))
    if check.scalars().first():
        return user # Already a contact
        
    contact = Contact(owner_id=current_user.id, contact_id=user.id)
    db.add(contact)
    await db.commit()
    return user

@router.delete("/{contact_id}")
async def remove_contact(contact_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Contact).where(Contact.owner_id == current_user.id, Contact.contact_id == contact_id))
    contact = result.scalars().first()
    if contact:
        await db.delete(contact)
        await db.commit()
    return {"message": "Contact removed"}

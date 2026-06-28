from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
import random

from app.db.session import get_db
from app.db.models import User
from app.schemas import UserCreate, UserResponse, LoginRequest, VerifyOTP
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register")
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if exists
    result = await db.execute(select(User).where(User.phone_or_username == user_in.phone_or_username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username or phone already registered")
        
    # We will simulate OTP by just returning success here and expecting client to call verify-otp
    # In a real app, we'd save to a pending_users table or Redis
    user = User(
        phone_or_username=user_in.phone_or_username,
        password_hash=get_password_hash(user_in.password),
        display_name=user_in.display_name,
        avatar_url=user_in.avatar_url or f"https://ui-avatars.com/api/?name={user_in.phone_or_username}&background=random"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return {"message": "OTP sent", "otp": "123456"} # Fake OTP for UI

@router.post("/verify-otp")
async def verify_otp(verify_data: VerifyOTP, response: Response, db: AsyncSession = Depends(get_db)):
    if verify_data.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    result = await db.execute(select(User).where(User.phone_or_username == verify_data.phone_or_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.model_validate(user)}

@router.post("/login")
async def login(login_data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone_or_username == login_data.phone_or_username))
    user = result.scalars().first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.model_validate(user)}

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

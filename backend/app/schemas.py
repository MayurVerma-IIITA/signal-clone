from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.db.models import ConversationType, MessageType, MessageStatus

class UserBase(BaseModel):
    phone_or_username: str
    display_name: str
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    is_online: bool
    last_seen: datetime
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    phone_or_username: str
    password: str

class VerifyOTP(BaseModel):
    phone_or_username: str
    otp: str

class MessageBase(BaseModel):
    content: Optional[str] = None
    message_type: MessageType = MessageType.text
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    reply_to_id: Optional[str] = None

class MessageCreate(MessageBase):
    pass

class MessageReactionResponse(BaseModel):
    id: str
    message_id: str
    user_id: str
    emoji: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class MessagePreview(MessageBase):
    id: str
    conversation_id: str
    sender_id: str
    status: MessageStatus
    disappears_at: Optional[datetime] = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    
    sender: Optional[UserResponse] = None
    
    model_config = ConfigDict(from_attributes=True)

class MessageResponse(MessageBase):
    id: str
    conversation_id: str
    sender_id: str
    status: MessageStatus
    disappears_at: Optional[datetime] = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    
    sender: Optional[UserResponse] = None
    reactions: List[MessageReactionResponse] = []
    replies: Optional[MessagePreview] = None
    
    model_config = ConfigDict(from_attributes=True)

class ConversationResponse(BaseModel):
    id: str
    type: ConversationType
    created_at: datetime
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    last_message: Optional[MessagePreview] = None
    unread_count: int = 0
    participants: List[UserResponse] = []
    group_admin_id: Optional[str] = None
    disappearing_timer: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

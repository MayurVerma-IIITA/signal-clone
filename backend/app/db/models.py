import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .session import Base
import enum

# Using String(36) to store UUIDs since SQLite doesn't have a native UUID type, 
# but SQLAlchemy's UUID type can handle it if we specify as_uuid=True.
def generate_uuid():
    return str(uuid.uuid4())

class ConversationType(str, enum.Enum):
    direct = "direct"
    group = "group"

class MessageType(str, enum.Enum):
    text = "text"
    image = "image"
    file = "file"
    audio = "audio"

class MessageStatus(str, enum.Enum):
    sending = "sending"
    sent = "sent"
    delivered = "delivered"
    read = "read"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    phone_or_username = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    avatar_url = Column(String(1024), nullable=True)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=datetime.utcnow)
    allow_read_receipts = Column(Boolean, default=True)
    allow_typing_indicators = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    owner_id = Column(String(36), ForeignKey("users.id"))
    contact_id = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", foreign_keys=[owner_id])
    contact_user = relationship("User", foreign_keys=[contact_id])

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    type = Column(SQLEnum(ConversationType), nullable=False)
    disappearing_timer = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    participants = relationship("ConversationParticipant", back_populates="conversation")
    messages = relationship("Message", back_populates="conversation")
    group = relationship("Group", back_populates="conversation", uselist=False)

class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"))
    user_id = Column(String(36), ForeignKey("users.id"))
    is_admin = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User")

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), unique=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1024), nullable=True)
    avatar_url = Column(String(1024), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="group")
    creator = relationship("User")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"))
    sender_id = Column(String(36), ForeignKey("users.id"))
    content = Column(Text, nullable=True)
    message_type = Column(SQLEnum(MessageType), default=MessageType.text)
    attachment_url = Column(String(1024), nullable=True)
    attachment_name = Column(String(255), nullable=True)
    reply_to_id = Column(String(36), ForeignKey("messages.id"), nullable=True)
    status = Column(SQLEnum(MessageStatus), default=MessageStatus.sent)
    disappears_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")
    replies = relationship("Message", remote_side=[id])
    reactions = relationship("MessageReaction", back_populates="message")
    reads = relationship("MessageRead", back_populates="message")

class MessageReaction(Base):
    __tablename__ = "message_reactions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    message_id = Column(String(36), ForeignKey("messages.id"))
    user_id = Column(String(36), ForeignKey("users.id"))
    emoji = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    message = relationship("Message", back_populates="reactions")
    user = relationship("User")

class MessageRead(Base):
    __tablename__ = "message_reads"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    message_id = Column(String(36), ForeignKey("messages.id"))
    user_id = Column(String(36), ForeignKey("users.id"))
    read_at = Column(DateTime, default=datetime.utcnow)
    
    message = relationship("Message", back_populates="reads")
    user = relationship("User")

class Story(Base):
    __tablename__ = "stories"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    media_url = Column(String(1024), nullable=True)
    caption = Column(String(1024), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    
    user = relationship("User")
    views = relationship("StoryView", back_populates="story")

class StoryView(Base):
    __tablename__ = "story_views"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    story_id = Column(String(36), ForeignKey("stories.id"))
    user_id = Column(String(36), ForeignKey("users.id"))
    viewed_at = Column(DateTime, default=datetime.utcnow)
    
    story = relationship("Story", back_populates="views")
    user = relationship("User")

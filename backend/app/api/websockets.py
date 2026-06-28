from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends
from app.db.session import get_db
from app.db.models import User

class ConnectionManager:
    def __init__(self):
        # map user_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        
        # Broadcast user online
        await self.broadcast(json.dumps({
            "type": "user.online",
            "user_id": user_id
        }))

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            # Should technically broadcast offline here, but requires an async call
            # which is tricky inside a sync disconnect handler. Typically done outside.

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket, user_id: str, db: AsyncSession = Depends(get_db)):
    await manager.connect(websocket, user_id)
    
    # Fetch user privacy settings
    result = await db.execute(select(User).where(User.id == user_id))
    current_user = result.scalars().first()
    allow_typing = current_user.allow_typing_indicators if current_user else True
    allow_read = current_user.allow_read_receipts if current_user else True

    try:
        while True:
            data = await websocket.receive_text()
            # Expecting JSON like {"type": "typing.start", "conversation_id": "..."}
            try:
                event = json.loads(data)
                event_type = event.get("type")
                
                # Check privacy flags
                if event_type in ["typing.start", "typing.stop"] and not allow_typing:
                    continue
                if event_type == "message.read" and not allow_read:
                    continue
                
                if event_type in ["typing.start", "typing.stop", "message.read", "message.delivered"]:
                    # In a real app we'd fetch participants of conversation_id and send only to them
                    # For simplicity, we just broadcast to everyone (or mock it)
                    # We inject the sender's user_id
                    event["user_id"] = user_id
                    await manager.broadcast(json.dumps(event))
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.broadcast(json.dumps({
            "type": "user.offline",
            "user_id": user_id
        }))

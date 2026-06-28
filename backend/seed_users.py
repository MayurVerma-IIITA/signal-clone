import asyncio
from app.db.session import AsyncSessionLocal
from app.db.models import User
from app.core.security import get_password_hash

async def seed():
    async with AsyncSessionLocal() as db:
        users = [
            User(phone_or_username="alice", password_hash=get_password_hash("password"), display_name="Alice Smith", avatar_url="https://ui-avatars.com/api/?name=Alice+Smith&background=random"),
            User(phone_or_username="bob", password_hash=get_password_hash("password"), display_name="Bob Jones", avatar_url="https://ui-avatars.com/api/?name=Bob+Jones&background=random"),
            User(phone_or_username="charlie", password_hash=get_password_hash("password"), display_name="Charlie Brown", avatar_url="https://ui-avatars.com/api/?name=Charlie+Brown&background=random"),
        ]
        db.add_all(users)
        await db.commit()
        print("Seeded 3 users: alice, bob, charlie (password: 'password')")

asyncio.run(seed())

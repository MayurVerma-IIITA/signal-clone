import asyncio
from datetime import datetime, timedelta
import random
from app.db.session import AsyncSessionLocal
from app.db.models import User, Conversation, ConversationParticipant, Message, MessageReaction, Group, ConversationType, MessageType, MessageStatus
from app.core.security import get_password_hash

async def seed():
    async with AsyncSessionLocal() as session:
        # Check if users already exist
        from sqlalchemy import select
        result = await session.execute(select(User))
        if result.scalars().first():
            print("Database already seeded.")
            return

        print("Seeding database...")

        # 1. Create Users
        user_data = [
            ("alice", "Alice Johnson"),
            ("bob", "Bob Smith"),
            ("carol", "Carol White"),
            ("dave", "Dave Brown"),
            ("emma", "Emma Wilson"),
            ("frank", "Frank Davis"),
            ("grace", "Grace Miller"),
            ("henry", "Henry Taylor"),
            ("iris", "Iris Anderson"),
            ("jack", "Jack Thomas"),
        ]
        
        users = {}
        for username, display_name in user_data:
            user = User(
                phone_or_username=username,
                password_hash=get_password_hash("password123"),
                display_name=display_name,
                avatar_url=f"https://ui-avatars.com/api/?name={username}&background=random",
                is_online=random.choice([True, False])
            )
            session.add(user)
            users[username] = user
        
        await session.commit()
        for user in users.values():
            await session.refresh(user)
            
        print(f"Created {len(users)} users.")

        # 2. Create Conversations
        now = datetime.utcnow()
        
        # Direct: alice <-> bob (30 msgs)
        conv1 = Conversation(type=ConversationType.direct)
        session.add(conv1)
        await session.flush()
        session.add(ConversationParticipant(conversation_id=conv1.id, user_id=users["alice"].id))
        session.add(ConversationParticipant(conversation_id=conv1.id, user_id=users["bob"].id))
        
        # Direct: alice <-> carol (20 msgs)
        conv2 = Conversation(type=ConversationType.direct)
        session.add(conv2)
        await session.flush()
        session.add(ConversationParticipant(conversation_id=conv2.id, user_id=users["alice"].id))
        session.add(ConversationParticipant(conversation_id=conv2.id, user_id=users["carol"].id))
        
        # Direct: alice <-> emma (15 msgs, with reply)
        conv3 = Conversation(type=ConversationType.direct)
        session.add(conv3)
        await session.flush()
        session.add(ConversationParticipant(conversation_id=conv3.id, user_id=users["alice"].id))
        session.add(ConversationParticipant(conversation_id=conv3.id, user_id=users["emma"].id))
        
        # Direct: bob <-> dave (10 msgs)
        conv4 = Conversation(type=ConversationType.direct)
        session.add(conv4)
        await session.flush()
        session.add(ConversationParticipant(conversation_id=conv4.id, user_id=users["bob"].id))
        session.add(ConversationParticipant(conversation_id=conv4.id, user_id=users["dave"].id))
        
        # Group: Signal Friends (alice, bob, carol, dave, emma)
        conv5 = Conversation(type=ConversationType.group)
        session.add(conv5)
        await session.flush()
        for u in ["alice", "bob", "carol", "dave", "emma"]:
            session.add(ConversationParticipant(conversation_id=conv5.id, user_id=users[u].id, is_admin=(u=="alice")))
        session.add(Group(conversation_id=conv5.id, name="Signal Friends", created_by=users["alice"].id))
        
        # Group: Work Team (alice, frank, grace, henry)
        conv6 = Conversation(type=ConversationType.group)
        session.add(conv6)
        await session.flush()
        for u in ["alice", "frank", "grace", "henry"]:
            session.add(ConversationParticipant(conversation_id=conv6.id, user_id=users[u].id, is_admin=(u=="frank")))
        session.add(Group(conversation_id=conv6.id, name="Work Team", created_by=users["frank"].id))

        # Group: Family Chat (alice, bob, carol)
        conv7 = Conversation(type=ConversationType.group)
        session.add(conv7)
        await session.flush()
        for u in ["alice", "bob", "carol"]:
            session.add(ConversationParticipant(conversation_id=conv7.id, user_id=users[u].id, is_admin=(u=="bob")))
        session.add(Group(conversation_id=conv7.id, name="Family Chat", created_by=users["bob"].id))

        await session.commit()
        print("Created 7 conversations.")
        
        # 3. Create Messages
        
        def create_message(conv, sender, content, offset_hours, reply_to=None):
            return Message(
                conversation_id=conv.id,
                sender_id=users[sender].id,
                content=content,
                reply_to_id=reply_to.id if reply_to else None,
                status=random.choice(list(MessageStatus)),
                created_at=now - timedelta(hours=offset_hours),
                updated_at=now - timedelta(hours=offset_hours)
            )

        # Alice & Bob (30 msgs)
        messages = []
        for i in range(30):
            sender = "alice" if i % 2 == 0 else "bob"
            msg = create_message(conv1, sender, f"Message {i+1} between Alice and Bob. This is some realistic chat data.", 30-i)
            messages.append(msg)
            session.add(msg)
            
        # Alice & Carol (20 msgs)
        for i in range(20):
            sender = "alice" if i % 2 == 0 else "carol"
            msg = create_message(conv2, sender, f"Hey, did you see the new update? #{i+1}", 20-i)
            messages.append(msg)
            session.add(msg)
            
        # Alice & Emma (15 msgs + reply)
        emma_msg = None
        for i in range(15):
            sender = "alice" if i % 2 == 0 else "emma"
            if i == 5:
                # Store a message to reply to
                msg = create_message(conv3, sender, "Are we still on for tomorrow?", 15-i)
                emma_msg = msg
            elif i == 6 and emma_msg:
                # Reply to the stored message
                msg = create_message(conv3, sender, "Yes! See you then.", 15-i, reply_to=emma_msg)
            else:
                msg = create_message(conv3, sender, f"Chatting with Emma... #{i+1}", 15-i)
            messages.append(msg)
            session.add(msg)
            
        # Bob & Dave (10 msgs)
        for i in range(10):
            sender = "bob" if i % 2 == 0 else "dave"
            msg = create_message(conv4, sender, f"Work stuff #{i+1}", 10-i)
            messages.append(msg)
            session.add(msg)
            
        # Group: Signal Friends (40 msgs)
        for i in range(40):
            sender = random.choice(["alice", "bob", "carol", "dave", "emma"])
            msg = create_message(conv5, sender, f"Group chat message #{i+1}!!", 40-i)
            messages.append(msg)
            session.add(msg)
            
        # Group: Work Team (25 msgs)
        for i in range(25):
            sender = random.choice(["alice", "frank", "grace", "henry"])
            msg = create_message(conv6, sender, f"Project update {i+1}", 25-i)
            messages.append(msg)
            session.add(msg)
            
        # Group: Family Chat (20 msgs)
        for i in range(20):
            sender = random.choice(["alice", "bob", "carol"])
            msg = create_message(conv7, sender, f"Family reunion planning #{i+1}", 20-i)
            messages.append(msg)
            session.add(msg)
            
        await session.commit()
        
        # 4. Create some Reactions
        print("Adding reactions...")
        for _ in range(20):
            msg = random.choice(messages)
            user = random.choice(list(users.values()))
            reaction = MessageReaction(
                message_id=msg.id,
                user_id=user.id,
                emoji=random.choice(["👍", "❤️", "😂", "😮", "😢", "🙏"])
            )
            session.add(reaction)
            
        await session.commit()
        print("Database seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed())

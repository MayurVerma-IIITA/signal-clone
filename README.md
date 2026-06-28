# Signal Clone (SDE Fullstack Assignment)

A fully functional web-based clone of the Signal messaging application, prioritizing real-time messaging, privacy-focused design, and a seamless user experience.

## Features Implemented

### Core Requirements ✅
- **Authentication & Onboarding**: Register with a username, set a display name, choose an avatar. Secure login/logout using hashed passwords (bcrypt) and JWT `httpOnly` cookies for maximum security. OTP is mocked (use `123456`).
- **Contacts & Conversation List**: View all active conversations sorted by recent activity. Unread indicators, last-message previews, and real-time typing/online indicators.
- **One-on-One Messaging**: Real-time direct messaging with delivery & read receipts (single/double ticks), message timestamps, and persistent SQLite storage.
- **Group Messaging**: Create groups, send/receive group messages, view members, and allow group admins to remove members.
- **Signal Experience**: Clean, responsive UI built with Tailwind CSS that closely mimics the real Signal desktop app, including layout, threading, modals, and settings.

### Bonus Features ✅
- **Attachments**: Send Images, Audio, and general files (integrated with Cloudinary, currently mocked for local storage).
- **Message Reactions**: React to messages with emojis.
- **Reply-to**: Quote and reply to specific messages.
- **Disappearing Messages**: Set self-destruct timers on conversations (e.g. 5 seconds, 1 hour).
- **Dark Mode**: Toggle between light, dark, and system themes.
- **Advanced Settings**: Toggle read receipts and typing indicators in the privacy settings.
- **Stories (Status)**: 24-hour expiring status updates with an auto-advancing media viewer.

## Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Zustand (State Management), Lucide React (Icons).
- **Backend**: Python 3, FastAPI, SQLAlchemy (Async), Alembic (Migrations), WebSockets.
- **Database**: SQLite.

## Architecture & Database Schema
The application uses a standard decoupled architecture. The Next.js frontend communicates with the FastAPI backend via REST for standard operations (CRUD, Auth) and maintains a persistent WebSocket connection for real-time events (new messages, reactions, typing status, presence).

**Core Database Models:**
- `User`: Handles authentication, display info, privacy preferences, and online status.
- `Conversation`: Represents a chat room (either `direct` or `group`). Holds settings like `disappearing_timer`.
- `Group`: Extension of `Conversation` to hold group-specific data (name, admin id).
- `ConversationParticipant`: Many-to-Many junction linking Users to Conversations.
- `Message`: The core message entity. Includes self-referential links for replies (`reply_to_id`) and status tracking.
- `MessageReaction`: Junction linking Users to Messages with an emoji string.
- `Story` & `StoryView`: Ephemeral media posts that expire after 24 hours.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Activate venv: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# (Optional) Seed the database with test data
python seed.py

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The app will be available at `http://localhost:3000`.

## Assumptions & Mocks
- **Encryption**: E2E encryption is not implemented natively. All messages are stored in plain text in SQLite for the scope of this assignment.
- **Authentication**: Phone number verification is mocked. Any username can be registered, and the mock OTP is always `123456`.
- **Media Uploads**: While the infrastructure exists to push to Cloudinary, the local dev environment simply accepts the files and returns local blob URLs or mock URLs for speed.

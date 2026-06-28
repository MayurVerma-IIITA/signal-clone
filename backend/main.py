from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import traceback
from app.core.config import settings

from app.api.routes import auth, users, contacts, conversations, groups, upload, stories
from app.api.websockets import websocket_endpoint

app = FastAPI(title="Signal Clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["contacts"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(stories.router, prefix="/api/stories", tags=["stories"])

# WebSockets endpoint
app.add_api_websocket_route("/ws/{user_id}", websocket_endpoint)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": type(exc).__name__}
    )

@app.get("/")
def read_root():
    return {"message": "Signal Clone API is running"}

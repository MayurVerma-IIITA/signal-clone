from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    SECRET_KEY: str = "your-secret-key-here" # In production, this should be kept secret
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30 * 24 * 60 # 30 days
    DATABASE_URL: str = "sqlite+aiosqlite:///./signal.db"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "https://signal-clone-rosy.vercel.app"]
    
    # Cloudinary - mock for now, but keeping in config
    CLOUDINARY_CLOUD_NAME: str = "mock"
    CLOUDINARY_API_KEY: str = "mock"
    CLOUDINARY_API_SECRET: str = "mock"

    class Config:
        env_file = ".env"

settings = Settings()

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Commodity Price Tracker"
    
    # Database
    DATABASE_URL: str
    USE_SUPABASE_POOLER: bool = False
    
    # Redis
    REDIS_URL: str
    
    # Security
    SECRET_KEY: str
    GOOGLE_API_KEY: Optional[str] = None
    SERPER_API_KEY: Optional[str] = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    # App Env
    model_config = SettingsConfigDict(
        env_file=".env", # Only read from backend/.env for local dev
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

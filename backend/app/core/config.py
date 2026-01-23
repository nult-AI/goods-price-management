from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Commodity Price Tracker"
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str
    
    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # App Env
    model_config = SettingsConfigDict(
        env_file=".env", # Only read from backend/.env for local dev
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

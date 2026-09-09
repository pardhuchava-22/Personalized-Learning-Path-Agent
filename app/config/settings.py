from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartLearn AI Rebuilt Backend"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "django-insecure-exam-proctor-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # SQLite Path - using Exam Proactor/db.sqlite3 for data compatibility
    DATABASE_URL: str = "sqlite:///Exam Proactor/db.sqlite3"
    
    class Config:
        case_sensitive = True

settings = Settings()

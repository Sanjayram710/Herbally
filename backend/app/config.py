import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # Database
    DATABASE_URL: str = "sqlite:///./marketing.db"
    
    # Providers
    LLM_PROVIDER: str = "mock"  # "mock" | "openai" | "gemini"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    
    SEARCH_PROVIDER: str = "mock"  # "mock" | "tavily" | "serpapi"
    SEARCH_API_KEY: str = ""
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

import os
from typing import List, Literal
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # Database
    DATABASE_URL: str = "sqlite:///./marketing_v2.db"
    
    # Providers
    LLM_PROVIDER: str = "mock"  # "mock" | "openai" | "gemini"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    
    SEARCH_PROVIDER: str = "mock"  # "mock" | "tavily" | "serpapi"
    SEARCH_API_KEY: str = ""

    # Image generation and durable local media storage. The provider remains
    # unconfigured until the backend receives an explicit API key.
    IMAGE_PROVIDER: str = "unconfigured"  # "unconfigured" | "openai"
    OPENAI_IMAGE_API_KEY: str = ""
    OPENAI_IMAGE_MODEL: str = "gpt-image-2.5-sunburst"
    IMAGE_REQUEST_TIMEOUT_SECONDS: float = 90.0
    IMAGE_MAX_PROMPT_CHARS: int = 4000
    MEDIA_MAX_BYTES: int = 20 * 1024 * 1024
    MEDIA_STORAGE_DIR: str = "media"
    MAX_IMAGE_DIMENSION: int = 4096
    MAX_IMAGE_PIXELS: int = 16_777_216

    # Video generation settings (Luma Dream Machine, Runway Gen-3, Demo Simulation)
    VIDEO_PROVIDER: str = "unconfigured"  # "unconfigured" | "luma" | "runway"
    LUMA_API_KEY: str = ""
    LUMA_MODEL: str = "ray-2"
    RUNWAY_API_KEY: str = ""
    RUNWAY_MODEL: str = "gen3a_turbo"
    VIDEO_REQUEST_TIMEOUT_SECONDS: float = 120.0
    VIDEO_MAX_BYTES: int = 50 * 1024 * 1024

    # Authentication is intentionally configuration-backed because the project
    # has no existing identity provider or login flow. Development mode is only
    # for localhost; deployments must use externally provisioned bearer tokens.
    AUTH_MODE: Literal["development", "token"] = "development"
    AUTH_DEV_TOKEN: str = "herbally-local-dev-token"
    AUTH_DEV_USER_ID: str = "local-user"
    AUTH_DEV_WORKSPACE_ID: str = "local-workspace"
    AUTH_TOKENS_JSON: str = ""
    LEGACY_WORKSPACE_ID: str = "local-workspace"

    # Request and cost controls. The image endpoint only accepts a compact JSON
    # request; generated image bytes are separately capped by MEDIA_MAX_BYTES.
    REQUEST_MAX_BYTES: int = 5 * 1024 * 1024
    IMAGE_GENERATION_REQUEST_MAX_BYTES: int = 16 * 1024
    IMAGE_GENERATION_RATE_LIMIT: int = 5
    IMAGE_GENERATION_RATE_WINDOW_SECONDS: int = 3600
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    @model_validator(mode="after")
    def validate_security_configuration(self):
        if "*" in self.CORS_ORIGINS:
            raise ValueError("CORS_ORIGINS cannot contain '*' when credentialed API access is enabled")
        if self.AUTH_MODE == "development" and self.ENV.lower() == "production":
            raise ValueError("AUTH_MODE=development is not allowed when ENV=production")
        if self.AUTH_MODE == "development" and len(self.AUTH_DEV_TOKEN) < 16:
            raise ValueError("AUTH_DEV_TOKEN must be at least 16 characters")
        if self.AUTH_MODE == "token" and not self.AUTH_TOKENS_JSON.strip():
            raise ValueError("AUTH_TOKENS_JSON is required when AUTH_MODE=token")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

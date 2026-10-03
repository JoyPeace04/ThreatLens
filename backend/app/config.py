import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Union, Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "ThreatLens"
    APP_ENV: str = "development"
    API_PREFIX: str = "/api"
    APP_DEBUG: bool = True

    # Comma-separated browser origins permitted to call the API in production.
    # Example: https://threatlens.vercel.app
    CORS_ORIGINS: str = ""
    FRONTEND_URL: Optional[str] = None

    DATABASE_URL: str = "sqlite:///./threatlens.db"

    # Development fallback only. Set SECRET_KEY in every deployed environment.
    SECRET_KEY: str = "dev-only-insecure-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    DEFAULT_RETENTION_DAYS: int = 90
    ENABLE_PII_MASKING_BY_DEFAULT: bool = False

    ENABLE_LIVE_GEO_FALLBACK: bool = True
    GEO_API_TIMEOUT: float = 3.0
    GEMINI_API_KEY: Optional[str] = None

    # Public-facing backend URL used for QR-code verification links in PDF reports.
    # Must be set in production (e.g. https://threatlens-api.onrender.com).
    PUBLIC_BASE_URL: str = "http://localhost:8000"

    MODEL_PATH: str = str(Path(__file__).resolve().parent / "data" / "phishing_email_pipeline.pkl")
    GEO_CACHE_PATH: str = str(Path(__file__).resolve().parent / "data" / "geo_cache.json")
    BRAND_DOMAINS_PATH: str = str(Path(__file__).resolve().parent / "data" / "brand_domains.json")
    URL_BLOCKLIST_PATH: str = str(Path(__file__).resolve().parent / "data" / "url_blocklist.json")

settings = Settings()


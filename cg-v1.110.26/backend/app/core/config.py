"""
Application configuration using Pydantic Settings.
"""

from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # Application
    APP_NAME: str = "CommonGround"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str
    API_VERSION: str = "v1"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Frontend URL (used for generating invite links, etc.)
    FRONTEND_URL: str = "https://common-ground-blue.vercel.app"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,https://common-ground-blue.vercel.app,https://common-ground-git-main-teejays-projects-caad17d8.vercel.app"
    # Allow Vercel preview/branch URLs by default (regex must match full origin)
    CORS_ORIGIN_REGEX: str = r"https://.*\.vercel\.app$"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Convert ALLOWED_ORIGINS to list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    # Database
    DATABASE_URL: str
    DATABASE_ECHO: bool = False

    @property
    def async_database_url(self) -> str:
        """Convert DATABASE_URL to async driver format for SQLAlchemy."""
        url = self.DATABASE_URL
        # Render and other providers use postgres:// or postgresql://
        # SQLAlchemy async requires postgresql+asyncpg://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # AI Services (for ARIA)
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    ARIA_DEFAULT_PROVIDER: str = "claude"  # "claude" or "openai"

    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # Mapbox (for geocoding in Silent Handoff)
    MAPBOX_API_KEY: str = ""  # Set via MAPBOX_API_KEY environment variable

    # Daily.co (for KidComs video calls)
    DAILY_API_KEY: Optional[str] = None
    DAILY_DOMAIN: str = "cg-mvp.daily.co"
    DAILY_WEBHOOK_SECRET: Optional[str] = None  # For verifying webhook signatures

    # Recording settings (recordings stored in Supabase Storage - call_recordings bucket)
    RECORDING_ENABLED: bool = True
    TRANSCRIPTION_ENABLED: bool = True

    # File Upload
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB

    # Email
    EMAIL_ENABLED: bool = False
    SENDGRID_API_KEY: Optional[str] = None
    FROM_EMAIL: str = "noreply@commonground.family"
    FROM_NAME: str = "CommonGround"

    # Monitoring
    SENTRY_DSN: Optional[str] = None

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds

    # JWT
    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Web Push (VAPID)
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_SUBJECT: str = "mailto:support@commonground.family"

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.ENVIRONMENT == "development"


# Create global settings instance
settings = Settings()

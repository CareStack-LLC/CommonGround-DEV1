"""
Application configuration using Pydantic Settings.
"""

from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def strip_database_url(cls, v: str) -> str:
        """Strip whitespace/newlines from DATABASE_URL (Render env vars can have trailing newlines)."""
        return v.strip() if isinstance(v, str) else v

    # Application
    APP_NAME: str = "CommonGround"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str
    API_VERSION: str = "v1"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Frontend URL (used for generating invite links, etc.)
    FRONTEND_URL: str = "https://www.find-commonground.com"

    # Ed25519 private key (PEM) for cryptographically signing agreements and
    # court reports. Set in production secrets. If empty, the signing service
    # generates an ephemeral key at startup (dev only — signatures won't verify
    # across restarts).
    SIGNING_PRIVATE_KEY_PEM: str = ""

    # Trusted reverse-proxy hops in front of the app, for deriving the real
    # client IP from X-Forwarded-For without trusting client-spoofable values.
    # Verified against the live edge 2026-07-02: traffic flows
    #   client -> Cloudflare -> Render
    # and the real client IP is the 2nd entry from the RIGHT of X-Forwarded-For
    # (Cloudflare appends the real IP; Render appends Cloudflare's edge IP).
    # Set to 1 if Cloudflare is ever removed from the path.
    TRUSTED_PROXY_HOPS: int = 2

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,https://www.find-commonground.com,https://find-commonground.com,https://common-ground-blue.vercel.app,https://common-ground-git-main-teejays-projects-caad17d8.vercel.app"
    # Allow only CommonGround Vercel preview/branch URLs and production custom domain
    CORS_ORIGIN_REGEX: str = r"https://(common-ground[a-z0-9-]*\.vercel\.app|common-ground-git-[a-z0-9-]+\.vercel\.app|find-commonground\.com|www\.find-commonground\.com)$"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Convert ALLOWED_ORIGINS to list, dropping localhost entries in production."""
        origins = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
        if self.is_production:
            origins = [o for o in origins if "localhost" not in o and "127.0.0.1" not in o]
        return origins

    # Database
    DATABASE_URL: str
    DATABASE_ECHO: bool = False

    @property
    def async_database_url(self) -> str:
        """Convert DATABASE_URL to async driver format for SQLAlchemy."""
        url = self.DATABASE_URL.strip()
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
    GEMINI_API_KEY: Optional[str] = None
    ARIA_DEFAULT_PROVIDER: str = "openai"  # "openai", "claude", or "gemini"

    # ARIA V2 Sentinel Shield
    ARIA_V2_ENABLED: bool = True  # Feature flag for V2 analysis pipeline
    ARIA_V3_BETA_ENABLED: bool = False  # Feature flag for V3 beta features
    ARIA_V2_LLM_MODEL: str = "gpt-4o-mini"  # Default LLM for V2 analysis
    ARIA_V2_SEVERITY_MODEL: str = "gpt-4o"  # Model for severity 4-5 analysis
    ARIA_JOB_MAX_RETRIES: int = 3  # aria_jobs worker retries before dead-letter

    # AI usage tracking (reliability batch 1) — alert-only daily token
    # budget across all providers; 0 disables the budget alert.
    AI_DAILY_TOKEN_BUDGET: int = 0

    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    # Signing secret for the generic Payments webhook endpoint (payment_intent
    # success/failure, Connect account events).
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    # Separate signing secret for the Stripe Issuing webhook endpoint
    # (`issuing_authorization.request`, `issuing_transaction.created`, etc.)
    # Stripe issues a distinct secret per webhook endpoint — you cannot share
    # one secret across multiple endpoints. If unset, the Issuing handler
    # falls back to STRIPE_WEBHOOK_SECRET (fine when only one endpoint is
    # configured in the Dashboard and you've pointed it at /webhooks/stripe/issuing).
    STRIPE_ISSUING_WEBHOOK_SECRET: Optional[str] = None

    # Mapbox (for geocoding in Silent Handoff)
    MAPBOX_API_KEY: str = ""  # Set via MAPBOX_API_KEY environment variable

    # Daily.co (for KidComs video calls)
    DAILY_API_KEY: Optional[str] = None
    DAILY_DOMAIN: str = "cg-mvp.daily.co"
    DAILY_WEBHOOK_SECRET: Optional[str] = None  # For verifying webhook signatures

    # Mux (KidSpace theater streaming). Token is created in the Mux dashboard
    # under Settings → Access Tokens → "Full access (video)".
    MUX_TOKEN_ID: Optional[str] = None
    MUX_TOKEN_SECRET: Optional[str] = None
    MUX_WEBHOOK_SECRET: Optional[str] = None  # For asset.ready webhooks later

    # Daily.co room cleanup scheduler (Wave 1 A8)
    DAILY_ROOM_CLEANUP_INTERVAL_MIN: int = 15   # how often the sweeper runs
    DAILY_ROOM_ABANDON_THRESHOLD_MIN: int = 60  # session age before sweep

    # Recording settings (recordings stored in Supabase Storage - call_recordings bucket)
    RECORDING_ENABLED: bool = True
    TRANSCRIPTION_ENABLED: bool = True

    # ARIA Call Monitoring - Video & Audio Supervisor
    ARIA_FRAME_CAPTURE_INTERVAL_SECONDS: int = 30
    ARIA_FRAME_RESOLUTION: str = "320x240"
    ARIA_FRAME_JPEG_QUALITY: int = 40
    ARIA_VISION_MODEL: str = "claude-haiku-4-5-20251001"
    ARIA_MAX_STRIKES: int = 3
    ARIA_SEVERE_IMMEDIATE_TERMINATE: bool = True
    ARIA_DEFAULT_SENSITIVITY: str = "moderate"  # strict, moderate, relaxed, off

    # File Upload
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB

    # Email
    EMAIL_ENABLED: bool = False
    SENDGRID_API_KEY: Optional[str] = None
    SENDGRID_WEBHOOK_VERIFICATION_KEY: Optional[str] = None  # For verifying webhook signatures
    SENDGRID_EARLY_ADOPTER_LIST_ID: Optional[str] = None  # SendGrid Marketing contact list for early adopters
    SENDGRID_NEWSLETTER_LIST_ID: Optional[str] = None  # SendGrid Marketing contact list for newsletter subscribers
    SENDGRID_LEADS_LIST_ID: Optional[str] = None  # SendGrid Marketing contact list for contact form leads
    SENDGRID_PROFESSIONAL_LIST_ID: Optional[str] = None  # SendGrid Marketing contact list for professional leads
    SENDGRID_USERS_LIST_ID: Optional[str] = None  # SendGrid Marketing contact list for registered users
    FROM_EMAIL: str = "noreply@find-commonground.com"
    FROM_NAME: str = "CommonGround"

    # Monitoring
    SENTRY_DSN: Optional[str] = None

    # Sentry API (for bug triage). Org/project verified against the live account
    # 2026-07-02 — the old defaults ("commonground" / "commonground-frontend")
    # pointed at a nonexistent project, so every triage run 404'd unless
    # overridden in the environment.
    SENTRY_AUTH_TOKEN: Optional[str] = None
    SENTRY_ORG_SLUG: str = "commonground-s0"
    SENTRY_PROJECT_SLUG: str = "commonground"
    # Comma-separated list to triage several projects in one run (e.g. a future
    # separate frontend project). Falls back to SENTRY_PROJECT_SLUG when empty.
    SENTRY_PROJECT_SLUGS: str = ""

    # Sentry auto-resolution (guarded). When disabled, the triage worker only
    # LOGS the actions it would take (dry-run) — it never mutates Sentry. Turn on
    # deliberately once you trust the noise list + AI 'ignore' classifications.
    SENTRY_AUTO_RESOLVE_ENABLED: bool = False
    SENTRY_AUTO_RESOLVE_MAX_PER_RUN: int = 25  # safety cap on auto-actions per run

    # Google OAuth (for email monitor)
    GOOGLE_OAUTH_CLIENT_ID: Optional[str] = None
    GOOGLE_OAUTH_CLIENT_SECRET: Optional[str] = None
    GOOGLE_MONITORED_EMAILS: str = "teejay@find-commonground.com"

    # Google Analytics 4
    GA4_CLIENT_ID: Optional[str] = None
    GA4_CLIENT_SECRET: Optional[str] = None
    GA4_PROPERTY_ID: Optional[str] = None

    # Google Search Console (reuses GA4 OAuth token — scope already granted)
    # Set to the verified property identifier:
    #   URL-prefix: "https://www.find-commonground.com/"
    #   Domain:     "sc-domain:find-commonground.com"
    # If unset, defaults to FRONTEND_URL.
    SEARCH_CONSOLE_SITE: Optional[str] = None

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds

    # JWT
    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 3

    # Web Push (VAPID)
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_SUBJECT: str = "mailto:support@find-commonground.com"

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

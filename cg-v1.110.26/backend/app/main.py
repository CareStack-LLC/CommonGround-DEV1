"""
FastAPI application entry point.
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

logger = logging.getLogger(__name__)

# Initialize Sentry before anything else
from app.core.config import settings


def _sentry_before_send(event, hint):
    """Filter and enrich Sentry error events."""
    # Don't send 404s or rate limit errors to Sentry
    if "exc_info" in hint:
        exc_type, exc_value, _ = hint["exc_info"]
        from fastapi import HTTPException
        if isinstance(exc_value, HTTPException) and exc_value.status_code in (404, 429):
            return None
    # Tag the event with the platform
    event.setdefault("tags", {})["platform"] = "commonground"
    return event


def _sentry_before_send_transaction(event, hint):
    """Filter noisy transactions (health checks, static assets)."""
    transaction_name = event.get("transaction", "")
    if transaction_name in ("/health", "/", "/health/"):
        return None
    return event


if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.httpx import HttpxIntegration

    # AI Agent Monitoring — auto-instruments Anthropic + OpenAI calls
    _ai_integrations = []
    try:
        from sentry_sdk.integrations.anthropic import AnthropicIntegration
        _ai_integrations.append(AnthropicIntegration())
        logger.info("Sentry: Anthropic AI monitoring enabled")
    except ImportError:
        logger.debug("Sentry: AnthropicIntegration not available (SDK too old?)")

    try:
        from sentry_sdk.integrations.openai import OpenAIIntegration
        _ai_integrations.append(OpenAIIntegration())
        logger.info("Sentry: OpenAI AI monitoring enabled")
    except ImportError:
        logger.debug("Sentry: OpenAIIntegration not available (SDK too old?)")

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=f"commonground@{settings.API_VERSION}",

        # ── Traces (Performance Monitoring) ──
        # Sample 30% of transactions in prod, 100% in dev
        traces_sample_rate=0.1 if settings.is_production else 1.0,

        # ── Profiling ──
        # Profile 20% of sampled transactions for CPU/memory insights
        profiles_sample_rate=0.05 if settings.is_production else 0.0,

        # ── Logs (SDK 2.35+) ──
        # Stream Python logs to Sentry Logs (viewable in Explore > Logs)
        _experiments={
            "enable_logs": True,
        },

        # ── Session Tracking ──
        auto_session_tracking=True,

        # ── Integrations ──
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(
                transaction_style="endpoint",
                failed_request_status_codes=[range(400, 600)],
            ),
            SqlalchemyIntegration(),
            LoggingIntegration(
                level=logging.INFO,       # Breadcrumbs from INFO+
                event_level=logging.ERROR, # Sentry events from ERROR+
            ),
            HttpxIntegration(),
            *_ai_integrations,  # Anthropic + OpenAI auto-instrumentation
        ],

        # ── AI Monitoring ──
        # Capture LLM inputs/outputs for ARIA debugging
        # (prompts, responses, token counts, model, latency)
        send_default_pii=True,

        # ── Filtering ──
        before_send=_sentry_before_send,
        before_send_transaction=_sentry_before_send_transaction,
    )
    logger.info(f"Sentry initialized for {settings.ENVIRONMENT} (AI monitoring: {len(_ai_integrations)} providers)")


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.database import init_db, close_db
from app.api.v1.router import api_router
from app.core.rate_limit import RateLimitMiddleware
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info(f"Starting {settings.APP_NAME} ({settings.ENVIRONMENT})")
    logger.info(f"CORS Allowed Origins: {settings.allowed_origins_list}")
    logger.debug(f"CORS Origin Regex: {settings.CORS_ORIGIN_REGEX}")
    if settings.SENDGRID_API_KEY and not settings.EMAIL_ENABLED:
        logger.warning("SENDGRID_API_KEY is set but EMAIL_ENABLED is False — all emails will be silently suppressed")
    if settings.is_development:
        await init_db()  # Auto-create tables in dev
        logger.info("Database tables created")

    # Run safe column migrations (idempotent ALTER TABLE IF NOT EXISTS)
    try:
        from app.core.database import engine
        from sqlalchemy import text
        async with engine.begin() as conn:
            migrations = [
                "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP",
                "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20)",
                "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMP",
                "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE",
                # COPPA consent fields on children table
                "ALTER TABLE children ADD COLUMN IF NOT EXISTS coppa_consent_given BOOLEAN DEFAULT FALSE",
                "ALTER TABLE children ADD COLUMN IF NOT EXISTS coppa_consent_at TIMESTAMP",
                "ALTER TABLE children ADD COLUMN IF NOT EXISTS coppa_consent_by VARCHAR(36)",
                # Blog posts table
                """CREATE TABLE IF NOT EXISTS blog_posts (
                    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    title VARCHAR(500) NOT NULL, slug VARCHAR(500) UNIQUE NOT NULL,
                    content TEXT NOT NULL, excerpt VARCHAR(1000) NOT NULL,
                    author VARCHAR(200) DEFAULT 'CommonGround Team', category VARCHAR(100) NOT NULL,
                    tags JSONB DEFAULT '[]'::jsonb, featured_image_url VARCHAR(2048),
                    status VARCHAR(20) DEFAULT 'draft', published_at TIMESTAMP,
                    seo_title VARCHAR(200), seo_description VARCHAR(500),
                    created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
                )""",
                # KidSpace genres (must be before movies/books for FK)
                """CREATE TABLE IF NOT EXISTS kidspace_genres (
                    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    name VARCHAR(100) NOT NULL, description VARCHAR(500),
                    icon_emoji VARCHAR(10), created_at TIMESTAMP DEFAULT NOW()
                )""",
                # KidSpace authors (must be before books for FK)
                """CREATE TABLE IF NOT EXISTS kidspace_authors (
                    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    name VARCHAR(200) NOT NULL, bio TEXT, photo_url VARCHAR(2048),
                    is_featured BOOLEAN DEFAULT FALSE, showcase_book_id VARCHAR(36),
                    created_at TIMESTAMP DEFAULT NOW()
                )""",
                # KidSpace movies
                """CREATE TABLE IF NOT EXISTS kidspace_movies (
                    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    title VARCHAR(300) NOT NULL, description TEXT,
                    duration_minutes INTEGER, age_min INTEGER DEFAULT 3, age_max INTEGER DEFAULT 12,
                    genre_id VARCHAR(36) REFERENCES kidspace_genres(id),
                    poster_url VARCHAR(2048), video_url VARCHAR(2048), trailer_url VARCHAR(2048),
                    is_featured BOOLEAN DEFAULT FALSE, is_visible BOOLEAN DEFAULT TRUE,
                    view_count INTEGER DEFAULT 0, total_minutes_watched INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )""",
                # KidSpace books
                """CREATE TABLE IF NOT EXISTS kidspace_books (
                    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    title VARCHAR(300) NOT NULL,
                    author_id VARCHAR(36) REFERENCES kidspace_authors(id),
                    description TEXT, page_count INTEGER,
                    age_min INTEGER DEFAULT 3, age_max INTEGER DEFAULT 12,
                    genre_id VARCHAR(36) REFERENCES kidspace_genres(id),
                    cover_url VARCHAR(2048), pdf_url VARCHAR(2048),
                    is_featured BOOLEAN DEFAULT FALSE, is_visible BOOLEAN DEFAULT TRUE,
                    read_count INTEGER DEFAULT 0, total_pages_turned INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )""",
                # KidSpace content approval columns
                "ALTER TABLE kidspace_movies ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE",
                "ALTER TABLE kidspace_books ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE",
                # Ensure admin accounts are properly flagged (idempotent)
                """UPDATE users SET is_admin = true, admin_role = 'super_admin'
                   WHERE email IN ('thomas@carestack.us', 'founders@commonground.family')
                   AND is_admin = false""",
            ]
            for sql in migrations:
                await conn.execute(text(sql))
            logger.info("Startup column migrations applied successfully")
    except Exception as e:
        logger.warning(f"Startup migration warning (may already exist): {e}")

    # Initialize Redis-backed services for multi-instance support
    from app.core.websocket import manager as ws_manager
    await ws_manager.init_redis()
    await ws_manager.start_subscriber()
    from app.core.rate_limit import _redis_limiter
    await _redis_limiter.init()

    # Background scheduler — sweeps abandoned KidComs / Daily.co rooms (Wave 1 A8)
    start_scheduler(app)

    yield
    # Shutdown
    logger.info("Shutting down...")
    stop_scheduler()
    await ws_manager.shutdown()
    try:
        from app.core.redis_client import close_redis
        await close_redis()
    except Exception:
        pass
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="Co-Parenting Operating System API",
    version=settings.API_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Middleware
# Allow all Vercel preview URLs and configured origins
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-Request-ID"],
)

# Rate limiting — re-enabled for production scaling
app.add_middleware(RateLimitMiddleware)

# Request ID tracing + canonical log lines (wide events)
from app.middleware.request_id import RequestIDMiddleware
app.add_middleware(RequestIDMiddleware)

# Activity tracking: update User.last_active on authenticated requests
from app.middleware.activity import ActivityTrackingMiddleware
app.add_middleware(ActivityTrackingMiddleware)


# Global exception handler to ensure CORS headers are always present
# This is important because uncaught exceptions skip the CORS middleware
from fastapi import Request
from fastapi.responses import JSONResponse
import traceback


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler that ensures CORS headers are included
    even when the server returns a 500 error.
    """
    # Get the origin from the request
    origin = request.headers.get("origin", "")
    
    # Log the error and report to Sentry
    error_msg = f"{type(exc).__name__}: {exc}"
    tb_str = traceback.format_exc()
    logger.error(f"Unhandled exception: {error_msg}\n{tb_str}")

    # Capture in Sentry with request context
    if settings.SENTRY_DSN:
        import sentry_sdk
        sentry_sdk.capture_exception(exc)
    
    # Build response with CORS headers - never expose internals in production
    if settings.is_production:
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    else:
        response = JSONResponse(
            status_code=500,
            content={
                "detail": str(exc),
                "type": type(exc).__name__,
            }
        )
    
    # Add CORS headers if origin is allowed
    if origin:
        # Check if origin matches allowed list or regex
        import re
        allowed = origin in settings.allowed_origins_list
        if not allowed and settings.CORS_ORIGIN_REGEX:
            try:
                allowed = bool(re.match(settings.CORS_ORIGIN_REGEX, origin))
            except Exception:
                allowed = False
        
        if allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    
    return response


# Include API router
app.include_router(api_router, prefix=f"/api/{settings.API_VERSION}")

@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "app": settings.APP_NAME,
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """
    Lightweight health check for monitoring (UptimeRobot, Render, etc.).

    Returns fast — DB and Redis checks are best-effort with short timeouts.
    Use /api/v1/admin/system-status for deep checks.
    """
    checks = {"api": "healthy"}

    # Check database connectivity (with short timeout)
    try:
        from sqlalchemy import text as sa_text
        from app.core.database import engine
        async with engine.connect() as conn:
            await conn.execute(sa_text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception:
        checks["database"] = "unhealthy"

    # Check Redis connectivity (short timeout to avoid blocking)
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL, socket_timeout=1, socket_connect_timeout=1)
        r.ping()
        checks["redis"] = "healthy"
    except Exception:
        checks["redis"] = "unhealthy"

    overall = "healthy" if all(v == "healthy" for v in checks.values()) else "degraded"

    return {"status": overall, "checks": checks}


# Debug endpoints — only available in development
if settings.is_development:
    from sqlalchemy import text
    from app.core.database import get_db
    from sqlalchemy.ext.asyncio import AsyncSession
    from fastapi import Depends

    @app.get("/debug/cors")
    async def debug_cors():
        """Debug endpoint to check CORS configuration (dev only)."""
        return {
            "allowed_origins_raw": settings.ALLOWED_ORIGINS,
            "allowed_origins_list": settings.allowed_origins_list,
            "regex": settings.CORS_ORIGIN_REGEX
        }

    @app.get("/debug/db")
    async def debug_db(db: AsyncSession = Depends(get_db)):
        """Debug endpoint to check database connection (dev only)."""
        try:
            raw_url = settings.DATABASE_URL
            if "@" in raw_url:
                masked_url = raw_url.split("://")[0] + "://***:***@" + raw_url.split("@")[1]
            else:
                masked_url = "Malformed or missing DATABASE_URL"

            result = await db.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';"))
            users_exists = result.scalar() == 1
            path_result = await db.execute(text("SHOW search_path;"))
            search_path = path_result.scalar()

            return {
                "database_url_host": masked_url,
                "public_users_table_exists": users_exists,
                "search_path": search_path
            }
        except Exception as e:
            return {"error": "Database check failed", "type": type(e).__name__}

    @app.get("/debug/email-config")
    async def debug_email_config():
        """Debug endpoint to check email configuration (dev only)."""
        return {
            "email_enabled": settings.EMAIL_ENABLED,
            "from_email": settings.FROM_EMAIL,
            "from_name": settings.FROM_NAME,
            "sendgrid_key_set": bool(settings.SENDGRID_API_KEY),
        }

    @app.post("/debug/test-email")
    async def test_email(to_email: str):
        """Send a test email to verify SendGrid configuration (dev only)."""
        from app.services.email import email_service
        if not email_service.enabled:
            return {"success": False, "error": "Email is disabled"}
        try:
            result = await email_service._send_email(
                to_email=to_email,
                subject="CommonGround Test Email",
                html_body="<p>SendGrid test from CommonGround dev environment.</p>"
            )
            return {"success": result}
        except Exception as e:
            return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.is_development,
        log_level="debug" if settings.DEBUG else "info",
    )

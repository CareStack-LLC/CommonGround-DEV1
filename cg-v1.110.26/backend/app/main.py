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

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=f"commonground@{settings.API_VERSION}",
        # Performance: sample 20% in prod, 100% in dev
        traces_sample_rate=0.2 if settings.is_production else 1.0,
        # Session tracking for crash-free rate metrics
        auto_session_tracking=True,
        # Profile 10% of sampled transactions in production
        profiles_sample_rate=0.1 if settings.is_production else 0.0,
        # Capture INFO+ logs as breadcrumbs, ERROR+ as events
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(
                transaction_style="endpoint",
                failed_request_status_codes=[range(400, 600)],
            ),
            SqlalchemyIntegration(),
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR,
            ),
            HttpxIntegration(),
        ],
        # Scrub sensitive data (emails, tokens, etc.)
        send_default_pii=False,
        # Filter noise and enrich events
        before_send=_sentry_before_send,
        before_send_transaction=_sentry_before_send_transaction,
    )
    logger.info(f"Sentry initialized for {settings.ENVIRONMENT}")


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.database import init_db, close_db
from app.api.v1.router import api_router
# Rate limiting disabled temporarily — slowapi crashes on Render
# from app.core.rate_limit import limiter, rate_limit_exceeded_handler


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
    yield
    # Shutdown
    logger.info("Shutting down...")
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
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-Request-ID"],
)

# Rate limiting disabled temporarily — slowapi crashes on Render
# from slowapi import _rate_limit_exceeded_handler as _default_handler
# from slowapi.errors import RateLimitExceeded
# app.state.limiter = limiter
# app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

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
            content={"detail": "Internal server error", "error_type": type(exc).__name__}
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
    Health check endpoint for monitoring (UptimeRobot, Render, etc.).

    Checks database connectivity and returns service status.
    """
    checks = {"api": "healthy"}

    # Check database connectivity
    try:
        from sqlalchemy import text as sa_text
        from app.core.database import engine
        async with engine.connect() as conn:
            await conn.execute(sa_text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception:
        checks["database"] = "unhealthy"

    # Check Redis connectivity
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL, socket_timeout=2)
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

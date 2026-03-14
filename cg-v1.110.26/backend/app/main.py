"""
FastAPI application entry point.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import init_db, close_db
from app.api.v1.router import api_router

# Create uploads directory
UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    print(f"🚀 Starting {settings.APP_NAME} ({settings.ENVIRONMENT})")
    print(f"🔓 CORS Allowed Origins: {settings.allowed_origins_list}")
    print(f"🔓 CORS Origin Regex: {settings.CORS_ORIGIN_REGEX}")
    if settings.is_development:
        await init_db()  # Auto-create tables in dev
        print("✅ Database tables created")
    yield
    # Shutdown
    print("👋 Shutting down...")
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
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    
    # Log the error for debugging
    error_msg = f"{type(exc).__name__}: {exc}"
    tb_str = traceback.format_exc()
    print(f"🚨 Unhandled exception: {error_msg}")
    print(tb_str)
    
    # Build response with CORS headers - always include details for debugging
    response = JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
            "traceback": tb_str.split("\n")[-5:] if not settings.DEBUG else tb_str.split("\n"),
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

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


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
    from app.core.database import get_db_engine

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

    overall = "healthy" if all(v == "healthy" for v in checks.values()) else "degraded"

    return {"status": overall, "checks": checks}


@app.get("/debug/cors")
async def debug_cors():
    """Debug endpoint to check CORS configuration."""
    return {
        "allowed_origins_raw": settings.ALLOWED_ORIGINS,
        "allowed_origins_list": settings.allowed_origins_list,
        "regex": settings.CORS_ORIGIN_REGEX
    }

from sqlalchemy import text
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

@app.get("/debug/db")
async def debug_db(db: AsyncSession = Depends(get_db)):
    """Debug endpoint to check the database connection and verify the active host."""
    try:
        # Get raw database URL (safely mask password)
        raw_url = settings.DATABASE_URL
        if "@" in raw_url:
            masked_url = raw_url.split("://")[0] + "://***:***@" + raw_url.split("@")[1]
        else:
            masked_url = "Malformed or missing DATABASE_URL"

        # Check if users table exists via raw SQL
        result = await db.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';"))
        users_exists = result.scalar() == 1
        
        # Check current search path
        path_result = await db.execute(text("SHOW search_path;"))
        search_path = path_result.scalar()

        return {
            "database_url_host": masked_url,
            "public_users_table_exists": users_exists,
            "search_path": search_path
        }
    except Exception as e:
        return {"error": str(e), "type": str(type(e))}


@app.get("/debug/email-config")
async def debug_email_config():
    """Debug endpoint to check email configuration."""
    return {
        "email_enabled": settings.EMAIL_ENABLED,
        "from_email": settings.FROM_EMAIL,
        "from_name": settings.FROM_NAME,
        "sendgrid_key_set": bool(settings.SENDGRID_API_KEY),
        "sendgrid_key_prefix": settings.SENDGRID_API_KEY[:10] + "..." if settings.SENDGRID_API_KEY else None,
    }


@app.post("/debug/test-email")
async def test_email(to_email: str):
    """Send a test email to verify SendGrid configuration."""
    from app.services.email import email_service

    # Check config
    if not email_service.enabled:
        return {
            "success": False,
            "error": "Email is disabled",
            "config": {
                "email_enabled": settings.EMAIL_ENABLED,
                "api_key_set": bool(settings.SENDGRID_API_KEY),
            }
        }

    try:
        result = await email_service._send_email(
            to_email=to_email,
            subject="CommonGround Test Email",
            html_body="""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h1 style="color: #6B8E6B;">Test Email from CommonGround</h1>
                <p>If you're seeing this, SendGrid is configured correctly!</p>
                <p style="color: #666;">Sent via CommonGround email service.</p>
            </body>
            </html>
            """
        )
        return {"success": result, "message": "Email sent successfully" if result else "Email send failed"}
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

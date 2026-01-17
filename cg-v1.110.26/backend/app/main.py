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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

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
    """Health check endpoint."""
    return {"status": "healthy"}


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

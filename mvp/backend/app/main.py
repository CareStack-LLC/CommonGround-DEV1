"""
FastAPI application entry point.
"""

import os
import subprocess
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


def run_migrations():
    """Run alembic migrations on startup."""
    try:
        # Get the directory containing alembic.ini
        backend_dir = Path(__file__).parent.parent
        print(f"📦 Running database migrations from {backend_dir}...")

        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=str(backend_dir),
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout
        )

        if result.returncode == 0:
            print("✅ Database migrations completed successfully")
            if result.stdout:
                print(result.stdout)
        else:
            print(f"⚠️ Migration warning (may already be up to date): {result.stderr}")
    except subprocess.TimeoutExpired:
        print("⚠️ Migration timeout - continuing startup")
    except Exception as e:
        print(f"⚠️ Migration error (continuing startup): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    print(f"🚀 Starting {settings.APP_NAME} ({settings.ENVIRONMENT})")

    # Always run migrations on startup (safe - alembic tracks applied migrations)
    run_migrations()

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.is_development,
        log_level="debug" if settings.DEBUG else "info",
    )

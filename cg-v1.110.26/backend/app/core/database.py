"""
Database connection and session management.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.base import Base


# Create async engine
# Note: For Supabase connection pooler (Supavisor/PgBouncer):
# - statement_cache_size=0: Required because pooler doesn't support prepared statements in transaction mode
# - NullPool: Required so SQLAlchemy doesn't maintain its own pool (conflicts with Supavisor)
# - command_timeout=60: Prevents connections from hanging indefinitely
# - server_settings: Ensure proper session configuration
connect_args = {}
if "sqlite" not in settings.async_database_url:
    connect_args["statement_cache_size"] = 0
    connect_args["command_timeout"] = 60  # 60 second timeout for long queries
    # Supabase Supavisor requires these settings for stability
    connect_args["server_settings"] = {
        "application_name": "commonground_backend",
        "jit": "off",  # Disable JIT for connection pooler compatibility
    }

engine = create_async_engine(
    settings.async_database_url,
    echo=settings.DATABASE_ECHO,
    future=True,
    poolclass=NullPool,  # Always use NullPool for Supabase Supavisor compatibility
    connect_args=connect_args,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async database sessions.

    Usage in FastAPI:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize database - create all tables.

    NOTE: In production, use Alembic migrations instead.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()


# Context manager for standalone database operations
@asynccontextmanager
async def get_db_context():
    """
    Context manager for database sessions outside of FastAPI dependencies.

    Usage:
        async with get_db_context() as db:
            result = await db.execute(select(User))
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

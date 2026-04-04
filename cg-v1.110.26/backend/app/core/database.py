"""
Database connection and session management.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool

from app.core.config import settings
from app.models.base import Base

_logger = logging.getLogger("commonground.db")


def create_app_engine(
    database_url: str,
    echo: bool = False,
    app_name: str = "commonground_backend",
) -> AsyncEngine:
    """
    Create a standardised async engine for Supabase Supavisor compatibility.

    Uses QueuePool with pool_pre_ping for connection reuse (major perf win).
    statement_cache_size=0 is required for Supavisor transaction mode.
    """
    # Normalise driver prefix
    url = database_url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    connect_args: dict = {}
    if "sqlite" not in url:
        connect_args["statement_cache_size"] = 0
        connect_args["command_timeout"] = 60
        connect_args["server_settings"] = {
            "application_name": app_name,
            "jit": "off",
        }

    # Use connection pooling for performance — reuse connections instead of
    # opening/closing on every request. pool_pre_ping handles stale connections.
    # NullPool fallback available via DB_USE_NULL_POOL=true env var if needed.
    use_null_pool = getattr(settings, "DB_USE_NULL_POOL", False)

    pool_kwargs: dict = {}
    if use_null_pool or "sqlite" in url:
        pool_kwargs["poolclass"] = NullPool
    else:
        pool_kwargs["poolclass"] = AsyncAdaptedQueuePool
        pool_kwargs["pool_size"] = 15
        pool_kwargs["max_overflow"] = 20
        pool_kwargs["pool_timeout"] = 10  # Fail fast instead of queueing
        pool_kwargs["pool_recycle"] = 600  # Recycle connections every 10 min
        pool_kwargs["pool_pre_ping"] = True  # Auto-detect stale connections

    return create_async_engine(
        url,
        echo=echo,
        future=True,
        connect_args=connect_args,
        **pool_kwargs,
    )


# Main application engine & session factory
engine = create_app_engine(
    settings.async_database_url,
    echo=settings.DATABASE_ECHO,
)

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

    With QueuePool + pool_pre_ping=True, stale connection detection is
    automatic. Manual pre-ping removed for performance — saves ~500ms/request.
    """
    session = AsyncSessionLocal()
    try:
        yield session
        await session.commit()
    except Exception as exc:
        await session.rollback()
        raise
    finally:
        await session.close()


def _is_connection_error(exc: Exception) -> bool:
    """Return True for errors that indicate a broken / closed connection."""
    msg = str(exc).lower()
    keywords = ("closed", "connection", "reset", "terminated", "broken pipe", "eof")
    return any(kw in msg for kw in keywords)


# Slow query detection — log queries taking more than 1 second
import logging as _logging
import time as _time
from sqlalchemy import event as _sa_event

_db_logger = _logging.getLogger("commonground.db")

@_sa_event.listens_for(engine.sync_engine, "before_cursor_execute")
def _before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault("query_start_time", []).append(_time.time())

@_sa_event.listens_for(engine.sync_engine, "after_cursor_execute")
def _after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    start_times = conn.info.get("query_start_time", [])
    if start_times:
        elapsed = _time.time() - start_times.pop()
        if elapsed > 1.0:
            _db_logger.warning(
                "Slow query (%.2fs): %s",
                elapsed,
                statement[:300],
            )


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

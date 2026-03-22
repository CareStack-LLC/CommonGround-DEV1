"""
Database connection and session management.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

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

    Use this everywhere — main app AND workers — so all processes share
    identical connection settings (NullPool, statement_cache_size=0,
    command_timeout, jit=off).
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

    return create_async_engine(
        url,
        echo=echo,
        future=True,
        poolclass=NullPool,
        connect_args=connect_args,
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

    Includes a lightweight pre-ping (SELECT 1) to detect stale / dropped
    connections *before* the request handler runs.  If the pre-ping fails
    the engine is disposed (clearing any cached raw connections) and a
    fresh session is created — effectively a single automatic retry.
    """
    for attempt in range(2):
        session = AsyncSessionLocal()
        try:
            # Manual pre-ping — NullPool doesn't support pool_pre_ping
            await session.execute(text("SELECT 1"))
            yield session
            await session.commit()
            return
        except Exception as exc:
            await session.rollback()
            if attempt == 0 and _is_connection_error(exc):
                _logger.warning("DB pre-ping failed, disposing engine and retrying: %s", exc)
                await engine.dispose()
                await session.close()
                continue
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

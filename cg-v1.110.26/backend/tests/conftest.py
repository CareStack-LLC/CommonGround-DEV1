"""Shared test fixtures.

Integration tests need a reachable Postgres with the app schema. The URL
resolves from TEST_DATABASE_URL, then DATABASE_URL, then the docker-compose
default. Tests using `db_engine` are skipped automatically when no database
is reachable.
"""

import os
import uuid

import pytest
import pytest_asyncio

DEFAULT_TEST_DB = "postgresql+asyncpg://postgres:postgres@localhost:5432/commonground"


def _test_db_url() -> str:
    url = (
        os.environ.get("TEST_DATABASE_URL")
        or os.environ.get("DATABASE_URL")
        or DEFAULT_TEST_DB
    )
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


@pytest_asyncio.fixture
async def db_engine():
    """Async engine against the integration database; skips if unreachable."""
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(_test_db_url(), poolclass=None)
    try:
        async with engine.connect() as conn:
            pass
    except Exception as exc:  # pragma: no cover — environment-dependent
        await engine.dispose()
        pytest.skip(f"integration database unreachable: {exc}")
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def session_factory(db_engine):
    from sqlalchemy.ext.asyncio import async_sessionmaker

    return async_sessionmaker(db_engine, expire_on_commit=False)


@pytest.fixture
def unique_id():
    """Factory for unique string ids so tests never collide with dev data."""
    return lambda: str(uuid.uuid4())

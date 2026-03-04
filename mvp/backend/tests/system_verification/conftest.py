"""
Pytest configuration and shared fixtures for system verification tests.

This file provides common test fixtures and configuration for all system tests.
"""

import pytest
import asyncio
from typing import AsyncGenerator, Dict
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool, StaticPool

# Import your app components
import sys
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env")))

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User
from app.core.security import hash_password


# Test database URL (use separate test database)
# Test database URL (use separate test database)
# TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/commonground_test"
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """
    Create event loop for async tests.

    This fixture ensures all async tests share the same event loop.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


import pytest_asyncio

@pytest_asyncio.fixture
async def test_db_engine():
    """
    Create test database engine.

    Creates tables before tests and drops them after.
    Uses StaticPool for in-memory SQLite to persist data across connections.
    """
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
        echo=False  # Set to True for SQL debugging
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_db_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Provide database session for tests.

    Each test gets a fresh session with automatic rollback.
    """
    async_session = async_sessionmaker(
        test_db_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def test_client(db_session) -> AsyncGenerator[AsyncClient, None]:
    """
    Provide HTTP test client.

    Overrides the get_db dependency to use test database.
    """
    # Override database dependency
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Create test client
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    # Clean up
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session) -> Dict:
    """
    Create test user in database.

    Returns:
        Dict with user credentials and ID
    """
    # user_data = {
    #     "email": "test@example.com",
    #     "password": "TestPass123!",
    #     "first_name": "Test",
    #     "last_name": "User"
    # }

    # user = User(
    #     email=user_data["email"],
    #     hashed_password=get_password_hash(user_data["password"]),
    #     first_name=user_data["first_name"],
    #     last_name=user_data["last_name"],
    #     is_active=True,
    #     email_verified=True
    # )

    # db_session.add(user)
    # await db_session.commit()
    # await db_session.refresh(user)

    # return {
    #     "id": str(user.id),
    #     "email": user_data["email"],
    #     "password": user_data["password"],
    #     "first_name": user_data["first_name"],
    #     "last_name": user_data["last_name"]
    # }

    # Placeholder for now
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "password": "TestPass123!",
        "first_name": "Test",
        "last_name": "User"
    }


@pytest_asyncio.fixture
async def auth_headers(test_client, test_user) -> Dict[str, str]:
    """
    Provide authentication headers for requests.

    Logs in test user and returns Bearer token headers.
    """
    # Login to get token
    # response = await test_client.post(
    #     "/api/v1/auth/login",
    #     json={
    #         "email": test_user["email"],
    #         "password": test_user["password"]
    #     }
    # )

    # assert response.status_code == 200
    # token = response.json()["access_token"]

    # return {"Authorization": f"Bearer {token}"}

    # Placeholder for now
    return {"Authorization": "Bearer test-token"}


@pytest_asyncio.fixture
async def second_test_user(db_session) -> Dict:
    """
    Create second test user (for multi-user tests).

    Useful for testing case invitations, messaging, etc.
    """
    # user_data = {
    #     "email": "test2@example.com",
    #     "password": "TestPass123!",
    #     "first_name": "Test2",
    #     "last_name": "User2"
    # }

    # user = User(
    #     email=user_data["email"],
    #     hashed_password=get_password_hash(user_data["password"]),
    #     first_name=user_data["first_name"],
    #     last_name=user_data["last_name"],
    #     is_active=True,
    #     email_verified=True
    # )

    # db_session.add(user)
    # await db_session.commit()
    # await db_session.refresh(user)

    # return {
    #     "id": str(user.id),
    #     "email": user_data["email"],
    #     "password": user_data["password"]
    # }

    # Placeholder for now
    return {
        "id": "test-user-2-id",
        "email": "test2@example.com",
        "password": "TestPass123!"
    }


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "requires_ai: marks tests that require AI API (Claude/OpenAI)"
    )
    config.addinivalue_line(
        "markers", "retry: marks tests that should be retried on failure"
    )


# Pytest plugins
pytest_plugins = [
    "pytest_asyncio",
]

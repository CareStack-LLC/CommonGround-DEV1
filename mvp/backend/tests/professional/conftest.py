"""
Professional Portal Test Configuration and Fixtures.

Shared fixtures for testing professional portal services.
"""

import pytest
import pytest_asyncio
import asyncio
from datetime import datetime, timedelta
from typing import AsyncGenerator, Dict
from uuid import uuid4

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

import sys
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env")))

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.professional import (
    ProfessionalProfile,
    Firm,
    FirmMembership,
    CaseAssignment,
    ProfessionalType,
    FirmType,
    FirmRole,
    MembershipStatus,
    AssignmentRole,
    AssignmentStatus,
)
from app.models.family_file import FamilyFile

# Test database URL - use PostgreSQL to support JSONB columns
# Set TEST_DATABASE_URL env var to override (e.g., for CI)
import os
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/commonground_test"
)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def test_db_engine():
    """Create test database engine."""
    # Configure based on database type
    is_sqlite = TEST_DATABASE_URL.startswith("sqlite")

    if is_sqlite:
        engine = create_async_engine(
            TEST_DATABASE_URL,
            poolclass=StaticPool,
            connect_args={"check_same_thread": False},
            echo=False
        )
    else:
        engine = create_async_engine(
            TEST_DATABASE_URL,
            echo=False,
            pool_pre_ping=True,
        )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db(test_db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide database session for tests."""
    async_session = async_sessionmaker(
        test_db_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def test_client(db) -> AsyncGenerator[AsyncClient, None]:
    """Provide HTTP test client."""
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


# =============================================================================
# User Fixtures
# =============================================================================

@pytest_asyncio.fixture
async def test_user(db: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        id=str(uuid4()),
        supabase_id=f"supabase-{uuid4()}",
        email="attorney@lawfirm.com",
        first_name="John",
        last_name="Attorney",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def second_user(db: AsyncSession) -> User:
    """Create a second test user."""
    user = User(
        id=str(uuid4()),
        supabase_id=f"supabase-{uuid4()}",
        email="paralegal@lawfirm.com",
        first_name="Jane",
        last_name="Paralegal",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def parent_user_a(db: AsyncSession) -> User:
    """Create parent A user."""
    user = User(
        id=str(uuid4()),
        supabase_id=f"supabase-{uuid4()}",
        email="parent.a@email.com",
        first_name="Alice",
        last_name="Parent",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def parent_user_b(db: AsyncSession) -> User:
    """Create parent B user."""
    user = User(
        id=str(uuid4()),
        supabase_id=f"supabase-{uuid4()}",
        email="parent.b@email.com",
        first_name="Bob",
        last_name="Parent",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# =============================================================================
# Professional Profile Fixtures
# =============================================================================

@pytest_asyncio.fixture
async def test_profile(db: AsyncSession, test_user: User) -> ProfessionalProfile:
    """Create a professional profile."""
    profile = ProfessionalProfile(
        id=str(uuid4()),
        user_id=test_user.id,
        professional_type=ProfessionalType.ATTORNEY.value,
        license_number="CA123456",
        license_state="CA",
        license_verified=True,
        license_verified_at=datetime.utcnow(),
        credentials={"bar_number": "123456", "certifications": ["Family Law"]},
        practice_areas=["custody", "divorce"],
        is_active=True,
        onboarded_at=datetime.utcnow(),
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


@pytest_asyncio.fixture
async def second_profile(db: AsyncSession, second_user: User) -> ProfessionalProfile:
    """Create a second professional profile."""
    profile = ProfessionalProfile(
        id=str(uuid4()),
        user_id=second_user.id,
        professional_type=ProfessionalType.PARALEGAL.value,
        is_active=True,
        onboarded_at=datetime.utcnow(),
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


# =============================================================================
# Firm Fixtures
# =============================================================================

@pytest_asyncio.fixture
async def test_firm(db: AsyncSession, test_user: User) -> Firm:
    """Create a test firm."""
    firm = Firm(
        id=str(uuid4()),
        name="Smith & Associates Law Firm",
        slug="smith-associates",
        firm_type=FirmType.LAW_FIRM.value,
        email="contact@smithlaw.com",
        phone="555-123-4567",
        website="https://smithlaw.com",
        address_line1="123 Legal Avenue",
        city="Los Angeles",
        state="CA",
        zip_code="90001",
        is_public=True,
        is_active=True,
        created_by=test_user.id,
    )
    db.add(firm)
    await db.commit()
    await db.refresh(firm)
    return firm


@pytest_asyncio.fixture
async def test_membership(
    db: AsyncSession,
    test_firm: Firm,
    test_profile: ProfessionalProfile,
    test_user: User,
) -> FirmMembership:
    """Create a firm membership for test_profile as owner."""
    membership = FirmMembership(
        id=str(uuid4()),
        professional_id=test_profile.id,
        firm_id=test_firm.id,
        role=FirmRole.OWNER.value,
        status=MembershipStatus.ACTIVE.value,
        joined_at=datetime.utcnow(),
        invited_by=test_user.id,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(membership)
    return membership


# =============================================================================
# Family File Fixtures
# =============================================================================

@pytest_asyncio.fixture
async def test_family_file(
    db: AsyncSession,
    parent_user_a: User,
    parent_user_b: User,
) -> FamilyFile:
    """Create a test family file."""
    family_file = FamilyFile(
        id=str(uuid4()),
        family_file_number=f"FF-TEST-{datetime.now().strftime('%Y%m%d')}",
        title="Test Family - Alice & Bob",
        status="active",
        state="CA",
        created_by=parent_user_a.id,
        parent_a_id=parent_user_a.id,
        parent_b_id=parent_user_b.id,
        parent_a_role="parent_a",
        parent_b_role="parent_b",
    )
    db.add(family_file)
    await db.commit()
    await db.refresh(family_file)
    return family_file


# =============================================================================
# Case Assignment Fixtures
# =============================================================================

@pytest_asyncio.fixture
async def test_assignment(
    db: AsyncSession,
    test_profile: ProfessionalProfile,
    test_firm: Firm,
    test_family_file: FamilyFile,
) -> CaseAssignment:
    """Create a case assignment."""
    assignment = CaseAssignment(
        id=str(uuid4()),
        professional_id=test_profile.id,
        firm_id=test_firm.id,
        family_file_id=test_family_file.id,
        assignment_role=AssignmentRole.LEAD_ATTORNEY.value,
        representing="parent_a",
        access_scopes=["agreement", "schedule", "messages", "financials"],
        can_control_aria=True,
        can_message_client=True,
        status=AssignmentStatus.ACTIVE.value,
        assigned_at=datetime.utcnow(),
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


# =============================================================================
# Pytest Configuration
# =============================================================================

def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "professional: marks tests for professional portal"
    )


pytest_plugins = ["pytest_asyncio"]

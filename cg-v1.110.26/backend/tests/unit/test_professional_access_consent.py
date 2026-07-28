"""Consent-policy tests for professional case access.

Policy under test (see app/services/professional/access_service.py):
- A professional representing ONE parent ("parent_a"/"parent_b") needs that
  parent's approval only.
- Neutral ("both"), court-appointed ("court"), or unspecified representation
  requires BOTH parents' approval.
- Assignments are only created through the gated
  ``create_assignment_from_request`` path (consent + conflicts + case limits).
- Parents can revoke access; non-parents cannot.
- Access scopes on an assignment are enforced via ``has_scope``.

Runs against in-memory SQLite (JSONB compiled as JSON), no Postgres needed.
"""

import os
import uuid
from datetime import datetime, timedelta

# Minimal env so app.core.config Settings loads without a real environment.
os.environ.setdefault("SECRET_KEY", "test_secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/db")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test_anon")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test_service")
os.environ.setdefault("ANTHROPIC_API_KEY", "test_anthropic")
os.environ.setdefault("OPENAI_API_KEY", "test_openai")
os.environ.setdefault("STRIPE_SECRET_KEY", "test_stripe")
os.environ.setdefault("STRIPE_PUBLISHABLE_KEY", "test_stripe_pub")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "test_webhook")

import pytest
import pytest_asyncio
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.types import JSON


# Compile Postgres JSONB as plain JSON on SQLite.
@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    return compiler.visit_JSON(JSON(), **kw)


import app.models  # noqa: F401  — register all tables on Base.metadata
from app.models.base import Base
from app.models.family_file import FamilyFile
from app.models.professional import (
    AccessRequestStatus,
    AssignmentStatus,
    CaseAssignment,
    ProfessionalProfile,
)
from app.models.user import User
from app.services.professional.access_service import ProfessionalAccessService
from app.services.professional.assignment_service import CaseAssignmentService


# =============================================================================
# Fixtures
# =============================================================================

@pytest_asyncio.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


def _user(email: str) -> User:
    return User(
        id=str(uuid.uuid4()),
        supabase_id=str(uuid.uuid4()),
        email=email,
        first_name=email.split("@")[0],
        last_name="Test",
        is_active=True,
    )


@pytest_asyncio.fixture
async def family(db):
    """Two parents, a professional (with profile), and their family file."""
    parent_a = _user("parent-a@test.com")
    parent_b = _user("parent-b@test.com")
    pro_user = _user("attorney@test.com")
    db.add_all([parent_a, parent_b, pro_user])

    family_file = FamilyFile(
        id=str(uuid.uuid4()),
        family_file_number="FF-TEST-001",
        title="Test Family",
        created_by=parent_a.id,
        parent_a_id=parent_a.id,
        parent_b_id=parent_b.id,
        status="active",
    )
    db.add(family_file)

    profile = ProfessionalProfile(
        id=str(uuid.uuid4()),
        user_id=pro_user.id,
        professional_type="attorney",
    )
    db.add(profile)
    await db.commit()

    return {
        "parent_a": parent_a,
        "parent_b": parent_b,
        "pro_user": pro_user,
        "profile": profile,
        "family_file": family_file,
    }


@pytest.fixture
def service(db):
    return ProfessionalAccessService(db)


# =============================================================================
# Representation defaults
# =============================================================================

@pytest.mark.asyncio
async def test_parent_invite_defaults_representing_to_inviter(service, family):
    request = await service.invite_professional_by_email(
        family_file_id=family["family_file"].id,
        email=family["pro_user"].email,
        inviter_id=family["parent_a"].id,
    )
    assert request.representing == "parent_a"
    assert request.parent_a_approved is True
    assert request.parent_b_approved is False
    assert request.status == AccessRequestStatus.PENDING.value


@pytest.mark.asyncio
async def test_parent_b_invite_defaults_representing_to_parent_b(service, family):
    request = await service.invite_professional_by_id(
        family_file_id=family["family_file"].id,
        professional_id=family["profile"].id,
        inviter_id=family["parent_b"].id,
    )
    assert request.representing == "parent_b"
    assert request.parent_b_approved is True
    assert request.parent_a_approved is False


# =============================================================================
# Single-parent representation: retaining parent's consent is sufficient
# =============================================================================

@pytest.mark.asyncio
async def test_one_sided_assignment_created_when_pro_accepts(service, family):
    request = await service.invite_professional_by_email(
        family_file_id=family["family_file"].id,
        email=family["pro_user"].email,
        inviter_id=family["parent_a"].id,
    )
    request = await service.professional_accept_invitation(
        request.id, family["profile"].id
    )

    assert request.status == AccessRequestStatus.APPROVED.value
    assert request.case_assignment_id is not None

    assignment = await service.get_case_assignment(request.case_assignment_id)
    assert assignment.status == AssignmentStatus.ACTIVE.value
    assert assignment.representing == "parent_a"
    # One-sided representation is not a dual-consent grant.
    assert assignment.consent_both_parents is False


@pytest.mark.asyncio
async def test_wrong_parent_approval_does_not_grant_one_sided_access(
    db, service, family
):
    """A representing=parent_a request is NOT satisfied by parent B alone."""
    request = await service.request_access_to_case(
        family_file_id=family["family_file"].id,
        professional_id=family["profile"].id,
        firm_id=None,
        requested_scopes=["agreement", "messages"],
    )
    request.representing = "parent_a"
    await db.commit()

    request = await service.approve_request(request.id, family["parent_b"].id)
    assert request.parent_b_approved is True
    assert request.status == AccessRequestStatus.PENDING.value
    assert await service.consent_satisfied(request) is False

    # The represented parent's approval completes consent.
    request = await service.approve_request(request.id, family["parent_a"].id)
    assert request.status == AccessRequestStatus.APPROVED.value


# =============================================================================
# Neutral / court representation: both parents must approve
# =============================================================================

@pytest.mark.asyncio
async def test_neutral_invite_not_granted_on_accept_with_one_parent(service, family):
    request = await service.invite_professional_by_email(
        family_file_id=family["family_file"].id,
        email=family["pro_user"].email,
        inviter_id=family["parent_a"].id,
        requested_role="mediator",
        representing="both",
    )
    request = await service.professional_accept_invitation(
        request.id, family["profile"].id
    )

    # Professional accepted, but no access until parent B consents.
    assert request.professional_accepted is True
    assert request.status == AccessRequestStatus.PENDING.value
    assert request.case_assignment_id is None
    assignments = await service.get_case_assignments(family["family_file"].id)
    assert assignments == []


@pytest.mark.asyncio
async def test_neutral_granted_after_both_parents_approve(service, family):
    request = await service.invite_professional_by_email(
        family_file_id=family["family_file"].id,
        email=family["pro_user"].email,
        inviter_id=family["parent_a"].id,
        requested_role="mediator",
        representing="both",
    )
    request = await service.professional_accept_invitation(
        request.id, family["profile"].id
    )
    assert request.case_assignment_id is None

    request = await service.approve_request(request.id, family["parent_b"].id)
    assert request.status == AccessRequestStatus.APPROVED.value

    assignment = await service.create_assignment_from_request(request)
    assert assignment.status == AssignmentStatus.ACTIVE.value
    assert assignment.representing == "both"
    assert assignment.consent_both_parents is True
    assert assignment.consent_parent_a_at is not None
    assert assignment.consent_parent_b_at is not None


@pytest.mark.asyncio
async def test_court_role_blocked_with_single_parent_consent(db, service, family):
    """GAL/court assignments cannot be created from one parent's approval."""
    request = await service.invite_professional_by_email(
        family_file_id=family["family_file"].id,
        email=family["pro_user"].email,
        inviter_id=family["parent_a"].id,
        representing="court",
    )
    # Force-approve the request status to simulate a buggy/legacy caller —
    # the assignment gate must still refuse.
    request.professional_id = family["profile"].id
    request.status = AccessRequestStatus.APPROVED.value
    await db.commit()

    with pytest.raises(ValueError, match="consent"):
        await service.create_assignment_from_request(request)


@pytest.mark.asyncio
async def test_unspecified_representation_requires_both_parents(db, service, family):
    """A pro-initiated request with no representation needs both parents."""
    request = await service.request_access_to_case(
        family_file_id=family["family_file"].id,
        professional_id=family["profile"].id,
        firm_id=None,
        requested_scopes=["agreement"],
    )
    assert request.representing is None

    request = await service.approve_request(request.id, family["parent_a"].id)
    assert request.status == AccessRequestStatus.PENDING.value

    request = await service.approve_request(request.id, family["parent_b"].id)
    assert request.status == AccessRequestStatus.APPROVED.value


# =============================================================================
# Lifecycle guards
# =============================================================================

@pytest.mark.asyncio
async def test_expired_invitation_cannot_be_accepted(db, service, family):
    request = await service.invite_professional_by_email(
        family_file_id=family["family_file"].id,
        email=family["pro_user"].email,
        inviter_id=family["parent_a"].id,
    )
    request.expires_at = datetime.utcnow() - timedelta(days=1)
    await db.commit()

    with pytest.raises(ValueError, match="expired"):
        await service.professional_accept_invitation(request.id, family["profile"].id)
    assert request.status == AccessRequestStatus.EXPIRED.value


@pytest.mark.asyncio
async def test_declined_invitation_cannot_be_accepted(service, family):
    request = await service.invite_professional_by_email(
        family_file_id=family["family_file"].id,
        email=family["pro_user"].email,
        inviter_id=family["parent_a"].id,
    )
    await service.decline_request(request.id, family["parent_b"].id)

    with pytest.raises(ValueError, match="no longer open"):
        await service.professional_accept_invitation(request.id, family["profile"].id)


@pytest.mark.asyncio
async def test_case_limit_blocks_assignment(db, service, family):
    family["profile"].active_case_count = 3  # starter tier limit
    await db.commit()

    request = await service.invite_professional_by_email(
        family_file_id=family["family_file"].id,
        email=family["pro_user"].email,
        inviter_id=family["parent_a"].id,
    )
    with pytest.raises(ValueError, match="maximum"):
        await service.professional_accept_invitation(request.id, family["profile"].id)


# =============================================================================
# Revocation
# =============================================================================

async def _granted_assignment(service, family) -> CaseAssignment:
    request = await service.invite_professional_by_email(
        family_file_id=family["family_file"].id,
        email=family["pro_user"].email,
        inviter_id=family["parent_a"].id,
        requested_scopes=["agreement", "messages"],
    )
    request = await service.professional_accept_invitation(
        request.id, family["profile"].id
    )
    return await service.get_case_assignment(request.case_assignment_id)


@pytest.mark.asyncio
async def test_parent_can_revoke_access(db, service, family):
    assignment = await _granted_assignment(service, family)

    revoked = await service.revoke_professional_access(
        family_file_id=family["family_file"].id,
        assignment_id=assignment.id,
        revoker_user_id=family["parent_b"].id,
    )
    assert revoked.status == AssignmentStatus.WITHDRAWN.value

    # Revoked assignment no longer grants any scope.
    assignment_service = CaseAssignmentService(db)
    assert not await assignment_service.has_scope(
        family["profile"].id, family["family_file"].id, "messages"
    )


@pytest.mark.asyncio
async def test_non_parent_cannot_revoke_access(db, service, family):
    assignment = await _granted_assignment(service, family)

    stranger = _user("stranger@test.com")
    db.add(stranger)
    await db.commit()

    with pytest.raises(ValueError, match="not a parent"):
        await service.revoke_professional_access(
            family_file_id=family["family_file"].id,
            assignment_id=assignment.id,
            revoker_user_id=stranger.id,
        )

    fresh = await service.get_case_assignment(assignment.id)
    assert fresh.status == AssignmentStatus.ACTIVE.value


# =============================================================================
# Scope enforcement
# =============================================================================

@pytest.mark.asyncio
async def test_assignment_scopes_are_enforced(db, service, family):
    assignment = await _granted_assignment(service, family)
    assert assignment.access_scopes == ["agreement", "messages"]

    assignment_service = CaseAssignmentService(db)
    assert await assignment_service.has_scope(
        family["profile"].id, family["family_file"].id, "messages"
    )
    assert await assignment_service.has_scope(
        family["profile"].id, family["family_file"].id, "agreement"
    )
    # Scopes not granted on the request are denied.
    assert not await assignment_service.has_scope(
        family["profile"].id, family["family_file"].id, "financials"
    )
    assert not await assignment_service.has_scope(
        family["profile"].id, family["family_file"].id, "circle"
    )

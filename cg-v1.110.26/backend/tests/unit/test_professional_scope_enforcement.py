"""Post-grant scope enforcement tests for professional case access.

Covers the gaps closed in the scope-enforcement pass:
- Report generation is gated by data-category scopes (fail-closed).
- The documents list only returns categories the assignment's scopes allow.
- Successful scoped reads leave professional access-log entries.
- Parents can narrow an assignment's scopes without revoking (audited).
"""

import os
import uuid

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
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.types import JSON


@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    return compiler.visit_JSON(JSON(), **kw)


import app.models  # noqa: F401  — register all tables on Base.metadata
from app.models.agreement import Agreement
from app.models.base import Base
from app.models.family_file import FamilyFile
from app.models.professional import (
    AssignmentStatus,
    CaseAssignment,
    ProfessionalAccessLog,
    ProfessionalProfile,
)
from app.models.user import User
from app.schemas.professional import ComplianceReportCreate
from app.services.professional.access_service import ProfessionalAccessService
from app.services.professional.document_service import ProfessionalDocumentService
from app.services.professional.report_service import ComplianceReportService
from app.services.reports.report_registry import get_required_scopes


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
async def case(db):
    """Family file + professional with an ACTIVE assignment scoped to
    ["agreement", "schedule"] only (no messages/financials/compliance)."""
    parent_a = _user("parent-a@test.com")
    parent_b = _user("parent-b@test.com")
    pro_user = _user("attorney@test.com")
    db.add_all([parent_a, parent_b, pro_user])

    family_file = FamilyFile(
        id=str(uuid.uuid4()),
        family_file_number="FF-SCOPE-001",
        title="Scope Test Family",
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

    assignment = CaseAssignment(
        id=str(uuid.uuid4()),
        professional_id=profile.id,
        firm_id=None,
        family_file_id=family_file.id,
        assignment_role="lead_attorney",
        representing="parent_a",
        access_scopes=["agreement", "schedule"],
        status=AssignmentStatus.ACTIVE.value,
    )
    db.add(assignment)
    await db.commit()

    return {
        "parent_a": parent_a,
        "parent_b": parent_b,
        "profile": profile,
        "family_file": family_file,
        "assignment": assignment,
    }


# =============================================================================
# Report generation scope gate
# =============================================================================

@pytest.mark.asyncio
async def test_report_gate_blocks_unscoped_data_category(db, case):
    """No "messages" scope → cannot generate a communication report."""
    service = ComplianceReportService(db)
    with pytest.raises(ValueError, match="missing scope"):
        await service.create_report(
            case["profile"].id,
            ComplianceReportCreate(
                family_file_id=case["family_file"].id,
                report_type="communication_analysis",
            ),
        )


@pytest.mark.asyncio
async def test_report_gate_blocks_by_spec_code_too(db, case):
    """Spec codes resolve to internal types before the scope check."""
    service = ComplianceReportService(db)
    # A-3 = ARIA Intervention Log → messages data.
    with pytest.raises(ValueError, match="missing scope"):
        await service.create_report(
            case["profile"].id,
            ComplianceReportCreate(
                family_file_id=case["family_file"].id,
                report_type="A-3",
            ),
        )


@pytest.mark.asyncio
async def test_report_gate_allows_scoped_report(db, case):
    """"schedule" scope is granted → schedule-based reports generate."""
    service = ComplianceReportService(db)
    report = await service.create_report(
        case["profile"].id,
        ComplianceReportCreate(
            family_file_id=case["family_file"].id,
            report_type="exchange_compliance",
        ),
    )
    assert report.status == "pending"
    assert report.verification_number


@pytest.mark.asyncio
async def test_report_gate_fails_closed_for_unknown_types(db, case):
    """Unknown report types require the full read surface."""
    assert get_required_scopes("brand_new_unclassified_report") == {
        "messages", "schedule", "financials", "compliance", "agreement",
    }
    service = ComplianceReportService(db)
    with pytest.raises(ValueError, match="missing scope"):
        await service.create_report(
            case["profile"].id,
            ComplianceReportCreate(
                family_file_id=case["family_file"].id,
                report_type="brand_new_unclassified_report",
            ),
        )


@pytest.mark.asyncio
async def test_report_gate_requires_active_assignment(db, case):
    """A withdrawn assignment cannot generate any report."""
    case["assignment"].status = AssignmentStatus.WITHDRAWN.value
    await db.commit()

    service = ComplianceReportService(db)
    with pytest.raises(ValueError, match="No active assignment"):
        await service.create_report(
            case["profile"].id,
            ComplianceReportCreate(
                family_file_id=case["family_file"].id,
                report_type="exchange_compliance",
            ),
        )


def test_required_scope_map_covers_flagship_reports():
    assert get_required_scopes("court_investigation_package") == {
        "messages", "schedule", "financials",
    }
    assert get_required_scopes("communication") == {"messages"}
    assert get_required_scopes("expense") == {"financials"}
    assert get_required_scopes("kidspace_communication") == {"circle"}
    # Spec-code resolution
    assert "messages" in get_required_scopes("A-3")


# =============================================================================
# Documents list scoping
# =============================================================================

@pytest.mark.asyncio
async def test_documents_list_respects_scopes(db, case):
    agreement = Agreement(
        id=str(uuid.uuid4()),
        family_file_id=case["family_file"].id,
        title="Custody Agreement",
        status="active",
    )
    db.add(agreement)
    await db.commit()

    service = ProfessionalDocumentService(db)

    # "agreement" scope granted → agreement is listed.
    docs, total = await service.list_documents(
        professional_id=case["profile"].id,
        family_file_id=case["family_file"].id,
    )
    assert total == 1
    assert docs[0]["title"] == "Custody Agreement"

    # Narrow scopes to messages-only → same call returns nothing.
    case["assignment"].access_scopes = ["messages"]
    await db.commit()

    docs, total = await service.list_documents(
        professional_id=case["profile"].id,
        family_file_id=case["family_file"].id,
    )
    assert total == 0


# =============================================================================
# Audit logging on scoped reads
# =============================================================================

@pytest.mark.asyncio
async def test_document_view_leaves_audit_log(db, case):
    service = ProfessionalDocumentService(db)
    await service.list_documents(
        professional_id=case["profile"].id,
        family_file_id=case["family_file"].id,
    )

    result = await db.execute(
        select(ProfessionalAccessLog).where(
            ProfessionalAccessLog.professional_id == case["profile"].id,
            ProfessionalAccessLog.family_file_id == case["family_file"].id,
            ProfessionalAccessLog.action == "view_documents",
        )
    )
    assert result.scalars().first() is not None


# =============================================================================
# Parent scope narrowing
# =============================================================================

@pytest.mark.asyncio
async def test_parent_can_narrow_scopes(db, case):
    service = ProfessionalAccessService(db)
    updated = await service.update_assignment_scopes(
        family_file_id=case["family_file"].id,
        assignment_id=case["assignment"].id,
        new_scopes=["agreement"],
        updater_user_id=case["parent_b"].id,
    )
    assert updated.access_scopes == ["agreement"]
    assert updated.has_scope("agreement")
    assert not updated.has_scope("schedule")

    # The change is audit-logged with before/after.
    result = await db.execute(
        select(ProfessionalAccessLog).where(
            ProfessionalAccessLog.action == "scopes_updated",
            ProfessionalAccessLog.resource_id == case["assignment"].id,
        )
    )
    log = result.scalars().first()
    assert log is not None
    assert log.details["old_scopes"] == ["agreement", "schedule"]
    assert log.details["new_scopes"] == ["agreement"]
    assert log.details["updated_by_user_id"] == case["parent_b"].id


@pytest.mark.asyncio
async def test_non_parent_cannot_edit_scopes(db, case):
    stranger = _user("stranger@test.com")
    db.add(stranger)
    await db.commit()

    service = ProfessionalAccessService(db)
    with pytest.raises(ValueError, match="not a parent"):
        await service.update_assignment_scopes(
            family_file_id=case["family_file"].id,
            assignment_id=case["assignment"].id,
            new_scopes=["agreement"],
            updater_user_id=stranger.id,
        )


@pytest.mark.asyncio
async def test_unknown_scope_names_rejected(db, case):
    service = ProfessionalAccessService(db)
    with pytest.raises(ValueError, match="Unknown access scope"):
        await service.update_assignment_scopes(
            family_file_id=case["family_file"].id,
            assignment_id=case["assignment"].id,
            new_scopes=["agreement", "root_access"],
            updater_user_id=case["parent_a"].id,
        )

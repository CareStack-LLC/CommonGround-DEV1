"""
Seed script for QA Test Personas — CommonGround Platform Gap Assessment.

Creates all 8 test personas from the CommonGround_Test_Personas spec:
- F-1: Rosa Mendez & Derek Holt (High Conflict / DV)
- F-2: Priya Sharma & Liam O'Brien (Cooperative / Plus)
- F-3: Angela Foster & Travis Cole (Asymmetric / Resistant)
- F-4: Sofia Delgado & Eduardo Delgado (Complex / Multi-Child / GAL)
- P-1: Marcus Chen (Solo Attorney)
- P-2: Holstrom Block & Parke (Small Firm — 3 members)
- P-3: Janelle Williams (GAL)
- P-4: Diana Rivera (Mediator)

Run with: python -m scripts.seed_test_personas
"""

import asyncio
import json
import sys
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.family_file import FamilyFile, QuickAccord, ConflictLevel
from app.models.child import Child, ChildProfileStatus
from app.models.agreement import Agreement, AgreementSection
from app.models.message import Message, MessageFlag, MessageThread
from app.models.clearfund import Obligation, ObligationFunding
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.professional import (
    ProfessionalProfile, Firm, FirmMembership, CaseAssignment,
    ProfessionalType, ProfessionalTier, FirmType, FirmRole,
    AssignmentRole, AssignmentStatus, MembershipStatus,
)
from app.models.subscription import SubscriptionPlan
from app.models.court import CourtEvent


# ──────────────────────────────────────────────
# Standard 18 SharedCare Agreement sections
# ──────────────────────────────────────────────
SHARED_CARE_SECTIONS = [
    {"number": "1", "title": "Children", "type": "children", "required": True},
    {"number": "2", "title": "Legal Custody", "type": "legal_custody", "required": True},
    {"number": "3", "title": "Physical Custody", "type": "physical_custody", "required": True},
    {"number": "4", "title": "Parenting Time Schedule", "type": "schedule", "required": True},
    {"number": "5", "title": "Holidays & Special Days", "type": "holidays", "required": True},
    {"number": "6", "title": "Vacation Time", "type": "vacation", "required": False},
    {"number": "7", "title": "Transportation & Exchanges", "type": "transportation", "required": True},
    {"number": "8", "title": "Communication", "type": "communication", "required": True},
    {"number": "9", "title": "Education", "type": "education", "required": False},
    {"number": "10", "title": "Healthcare", "type": "healthcare", "required": False},
    {"number": "11", "title": "Extracurricular Activities", "type": "activities", "required": False},
    {"number": "12", "title": "Religious Upbringing", "type": "religion", "required": False},
    {"number": "13", "title": "Child Support", "type": "child_support", "required": True},
    {"number": "14", "title": "Expense Sharing", "type": "expenses", "required": True},
    {"number": "15", "title": "Right of First Refusal", "type": "first_refusal", "required": False},
    {"number": "16", "title": "Relocation", "type": "relocation", "required": True},
    {"number": "17", "title": "Dispute Resolution", "type": "dispute_resolution", "required": True},
    {"number": "18", "title": "Modifications", "type": "modifications", "required": True},
]


def uid() -> str:
    return str(uuid.uuid4())


def now() -> datetime:
    return datetime.utcnow()


def days_ago(n: int) -> datetime:
    return datetime.utcnow() - timedelta(days=n)


# ──────────────────────────────────────────────
# Helper: create agreement with N signed sections
# ──────────────────────────────────────────────
def make_agreement(
    agreement_id: str,
    family_file_id: str,
    title: str,
    signed_count: int = 18,
    status: str = "active",
    both_approved: bool = True,
    dispute_sections: list[int] | None = None,
) -> tuple[Agreement, list[AgreementSection]]:
    """Create an agreement with the given number of signed sections."""
    dispute_sections = dispute_sections or []

    agr = Agreement(
        id=agreement_id,
        family_file_id=family_file_id,
        title=title,
        agreement_type="shared_care",
        agreement_version="v2_standard",
        status=status,
        petitioner_approved=both_approved,
        petitioner_approved_at=days_ago(30) if both_approved else None,
        respondent_approved=both_approved,
        respondent_approved_at=days_ago(30) if both_approved else None,
        effective_date=days_ago(90),
        created_at=days_ago(120),
        updated_at=now(),
    )

    sections = []
    for i, sec in enumerate(SHARED_CARE_SECTIONS):
        sec_num = int(sec["number"])
        is_signed = sec_num <= signed_count and sec_num not in dispute_sections
        sections.append(AgreementSection(
            id=uid(),
            agreement_id=agreement_id,
            section_number=sec["number"],
            section_title=sec["title"],
            section_type=sec["type"],
            content=f"Standard {sec['title']} terms for this family." if is_signed else "",
            is_required=sec["required"],
            is_completed=is_signed,
            display_order=i,
            created_at=days_ago(120),
            updated_at=now(),
        ))

    return agr, sections


# ──────────────────────────────────────────────
# Helper: find or create a user by email
# ──────────────────────────────────────────────
async def find_or_create_user(
    session: AsyncSession,
    email: str,
    first_name: str,
    last_name: str,
) -> User:
    """Find a user by email or create a placeholder."""
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        print(f"  Found existing user: {email} (id={user.id})")
        return user

    user = User(
        id=uid(),
        supabase_id=uid(),  # Placeholder — real registration would set this
        email=email,
        first_name=first_name,
        last_name=last_name,
        is_active=True,
        email_verified=True,
        last_login=now(),
        created_at=days_ago(60),
        updated_at=now(),
    )
    session.add(user)
    await session.flush()
    print(f"  Created user: {email} (id={user.id})")
    return user


async def seed_all(session: AsyncSession):
    """Seed all test persona data."""

    print("\n" + "=" * 60)
    print("  CommonGround Test Personas — Seed Script")
    print("=" * 60)

    # ──────────────────────────────────────────
    # 1. CREATE PARENT USERS
    # ──────────────────────────────────────────
    print("\n📋 Creating parent users...")

    rosa = await find_or_create_user(session, "rosa.mendez.test@cg-qa.com", "Rosa", "Mendez")
    derek = await find_or_create_user(session, "derek.holt.test@cg-qa.com", "Derek", "Holt")
    priya = await find_or_create_user(session, "priya.sharma.test@cg-qa.com", "Priya", "Sharma")
    liam = await find_or_create_user(session, "liam.obrien.test@cg-qa.com", "Liam", "O'Brien")
    angela = await find_or_create_user(session, "angela.foster.test@cg-qa.com", "Angela", "Foster")
    travis = await find_or_create_user(session, "travis.cole.test@cg-qa.com", "Travis", "Cole")
    # Set Travis as inactive (last login 9 days ago)
    travis.last_login = days_ago(9)
    travis.last_active = days_ago(9)

    sofia = await find_or_create_user(session, "sofia.delgado.test@cg-qa.com", "Sofia", "Delgado")
    eduardo = await find_or_create_user(session, "eduardo.delgado.test@cg-qa.com", "Eduardo", "Delgado")

    # ──────────────────────────────────────────
    # 2. CREATE PROFESSIONAL USERS
    # ──────────────────────────────────────────
    print("\n⚖️  Creating professional users...")

    chen_user = await find_or_create_user(session, "marcus.chen.test@cg-qa.com", "Marcus", "Chen")
    holstrom_user = await find_or_create_user(session, "holstrom.test@cg-qa.com", "Sarah", "Holstrom")
    block_user = await find_or_create_user(session, "block.test@cg-qa.com", "James", "Block")
    parke_user = await find_or_create_user(session, "parke.test@cg-qa.com", "Mei", "Parke")
    williams_user = await find_or_create_user(session, "janelle.williams.test@cg-qa.com", "Janelle", "Williams")
    rivera_user = await find_or_create_user(session, "diana.rivera.test@cg-qa.com", "Diana", "Rivera")

    await session.flush()

    # ──────────────────────────────────────────
    # 3. FAMILY FILE F-1: Rosa & Derek (DV / High Conflict)
    # ──────────────────────────────────────────
    print("\n🔴 Creating F-1: Rosa & Derek (High Conflict / DV)...")

    ff1_id = uid()
    ff1 = FamilyFile(
        id=ff1_id,
        family_file_number="FF-DV001",
        title="Mendez-Holt Family — High Conflict DV",
        created_by=rosa.id,
        parent_a_id=rosa.id,
        parent_a_role="mother",
        parent_b_id=derek.id,
        parent_b_role="father",
        parent_b_email="derek.holt.test@cg-qa.com",
        parent_b_invited_at=days_ago(90),
        parent_b_joined_at=days_ago(88),
        status="active",
        conflict_level=ConflictLevel.HIGH.value,
        state="CA",
        county="San Diego",
        aria_enabled=True,
        aria_mode="strict",  # DV cases use strict mode
        is_dv_case=True,  # DV flag — tightens ARIA thresholds
        aria_sensitivity_level="maximum",  # Maximum sensitivity for DV
        agreement_expense_split_ratio="60/40",
        agreement_split_parent_a_percentage=60,
        created_at=days_ago(90),
        updated_at=now(),
    )
    session.add(ff1)

    # Children for F-1
    marisol = Child(
        id=uid(), family_file_id=ff1_id,
        first_name="Marisol", last_name="Mendez-Holt",
        date_of_birth=date(2018, 5, 15), gender="female",
        status=ChildProfileStatus.ACTIVE.value,
        created_by=rosa.id,
        approved_by_a=rosa.id, approved_at_a=days_ago(88),
        approved_by_b=derek.id, approved_at_b=days_ago(87),
        school_name="Vista Elementary", grade_level="3rd",
        created_at=days_ago(88), updated_at=now(),
    )
    carlos = Child(
        id=uid(), family_file_id=ff1_id,
        first_name="Carlos", last_name="Mendez-Holt",
        date_of_birth=date(2021, 2, 10), gender="male",
        status=ChildProfileStatus.ACTIVE.value,
        created_by=rosa.id,
        approved_by_a=rosa.id, approved_at_a=days_ago(88),
        approved_by_b=derek.id, approved_at_b=days_ago(87),
        created_at=days_ago(88), updated_at=now(),
    )
    session.add_all([marisol, carlos])

    # Agreement for F-1 — all 18 sections signed
    agr1_id = uid()
    agr1, agr1_sections = make_agreement(agr1_id, ff1_id, "Mendez-Holt SharedCare Agreement", signed_count=18)
    session.add(agr1)
    session.add_all(agr1_sections)

    # Custody exchange for F-1 — Friday 3pm at school
    exch1_id = uid()
    exch1 = CustodyExchange(
        id=exch1_id, family_file_id=ff1_id,
        created_by=rosa.id,
        from_parent_id=rosa.id, to_parent_id=derek.id,
        exchange_type="both",
        child_ids=json.dumps([marisol.id, carlos.id]),
        pickup_child_ids=json.dumps([marisol.id, carlos.id]),
        dropoff_child_ids=json.dumps([]),
        location="Vista Elementary School",
        location_lat=33.2000, location_lng=-117.2400,
        geofence_radius_meters=200,
        scheduled_time=datetime(2026, 3, 20, 15, 0),  # Next Friday 3pm
        duration_minutes=30,
        is_recurring=True, recurrence_pattern="weekly",
        recurrence_days=json.dumps([5]),  # Friday
        silent_handoff_enabled=True,  # DV case — silent handoff
        qr_confirmation_required=True,
        check_in_window_before_minutes=30,
        check_in_window_after_minutes=30,
        status="active",
        created_at=days_ago(60), updated_at=now(),
    )
    session.add(exch1)

    # Sample threatening message from Derek (ARIA should flag)
    thread1_id = uid()
    thread1 = MessageThread(
        id=thread1_id,
        case_id=None,
        subject="Schedule Discussion",
        thread_type="general",
        participant_ids=json.dumps([rosa.id, derek.id]),
        last_message_at=days_ago(2),
        message_count=3,
        created_at=days_ago(30), updated_at=days_ago(2),
    )
    session.add(thread1)

    msg_derek_threat = Message(
        id=uid(), family_file_id=ff1_id, thread_id=thread1_id,
        sender_id=derek.id, recipient_id=rosa.id,
        content="I'm concerned about the pickup time. Can we discuss the schedule?",
        original_content="If you keep this up I'll make sure you regret it",
        content_hash="sample_hash_001",
        message_type="text", was_flagged=True,
        sent_at=days_ago(5), created_at=days_ago(5), updated_at=days_ago(5),
    )
    session.add(msg_derek_threat)

    msg_flag = MessageFlag(
        id=uid(), message_id=msg_derek_threat.id,
        flag_type="aria_intervention",
        severity="severe",
        category="threatening",
        description="Threatening language detected — message rewritten by ARIA",
        flagged_by="aria",
        created_at=days_ago(5), updated_at=days_ago(5),
    )
    session.add(msg_flag)

    # Rosa's normal message (should pass)
    msg_rosa_ok = Message(
        id=uid(), family_file_id=ff1_id, thread_id=thread1_id,
        sender_id=rosa.id, recipient_id=derek.id,
        content="Carlos has a doctor's appointment Tuesday at 4pm. Can you confirm you'll have him back by 3:30?",
        content_hash="sample_hash_002",
        message_type="text", was_flagged=False,
        sent_at=days_ago(3), created_at=days_ago(3), updated_at=days_ago(3),
    )
    session.add(msg_rosa_ok)

    # ClearFund obligation for F-1 (disputed expense)
    obl1 = Obligation(
        id=uid(), family_file_id=ff1_id,
        source_type="request", purpose_category="medical",
        title="Marisol dental checkup copay",
        description="Regular dental checkup copay for Marisol",
        child_ids=json.dumps([marisol.id]),
        total_amount=Decimal("120.00"),
        petitioner_share=Decimal("72.00"),  # 60%
        respondent_share=Decimal("48.00"),  # 40%
        petitioner_percentage=60,
        split_from_agreement=True,
        status="open",
        verification_required=True,
        receipt_required=True,
        created_by=rosa.id,
        due_date=now() + timedelta(days=14),
        created_at=days_ago(7), updated_at=now(),
    )
    session.add(obl1)

    # ──────────────────────────────────────────
    # 4. FAMILY FILE F-2: Priya & Liam (Cooperative / Plus)
    # ──────────────────────────────────────────
    print("\n🟢 Creating F-2: Priya & Liam (Cooperative)...")

    ff2_id = uid()
    ff2 = FamilyFile(
        id=ff2_id,
        family_file_number="FF-COOP002",
        title="Sharma-O'Brien Family — Cooperative",
        created_by=priya.id,
        parent_a_id=priya.id, parent_a_role="mother",
        parent_b_id=liam.id, parent_b_role="father",
        parent_b_email="liam.obrien.test@cg-qa.com",
        parent_b_invited_at=days_ago(120),
        parent_b_joined_at=days_ago(119),
        status="active",
        conflict_level=ConflictLevel.LOW.value,
        state="CA", county="San Diego",
        aria_enabled=True, aria_mode="standard",
        agreement_expense_split_ratio="50/50",
        agreement_split_parent_a_percentage=50,
        created_at=days_ago(120), updated_at=now(),
    )
    session.add(ff2)

    zoe = Child(
        id=uid(), family_file_id=ff2_id,
        first_name="Zoe", last_name="Sharma-O'Brien",
        date_of_birth=date(2016, 8, 22), gender="female",
        status=ChildProfileStatus.ACTIVE.value,
        created_by=priya.id,
        approved_by_a=priya.id, approved_at_a=days_ago(119),
        approved_by_b=liam.id, approved_at_b=days_ago(118),
        school_name="Del Mar Heights Elementary", grade_level="5th",
        created_at=days_ago(119), updated_at=now(),
    )
    session.add(zoe)

    # Agreement for F-2 — 14/18 sections signed
    agr2_id = uid()
    agr2, agr2_sections = make_agreement(agr2_id, ff2_id, "Sharma-O'Brien SharedCare Agreement", signed_count=14)
    session.add(agr2)
    session.add_all(agr2_sections)

    # Cooperative messages (all green)
    thread2_id = uid()
    thread2 = MessageThread(
        id=thread2_id, case_id=None,
        subject="Zoe Activities",
        thread_type="general",
        participant_ids=json.dumps([priya.id, liam.id]),
        last_message_at=days_ago(1), message_count=2,
        created_at=days_ago(30), updated_at=days_ago(1),
    )
    session.add(thread2)
    session.add(Message(
        id=uid(), family_file_id=ff2_id, thread_id=thread2_id,
        sender_id=priya.id, recipient_id=liam.id,
        content="Zoe has a dance recital Saturday at 2pm. Are you coming? She'd love to have us both there.",
        content_hash="sample_hash_003", message_type="text", was_flagged=False,
        sent_at=days_ago(2), created_at=days_ago(2), updated_at=days_ago(2),
    ))
    session.add(Message(
        id=uid(), family_file_id=ff2_id, thread_id=thread2_id,
        sender_id=liam.id, recipient_id=priya.id,
        content="Absolutely, I'll be there. Should I bring flowers?",
        content_hash="sample_hash_004", message_type="text", was_flagged=False,
        sent_at=days_ago(1), created_at=days_ago(1), updated_at=days_ago(1),
    ))

    # ClearFund expense for F-2 (pending approval)
    obl2 = Obligation(
        id=uid(), family_file_id=ff2_id,
        source_type="request", purpose_category="clothing",
        title="Zoe dance shoes",
        description="New dance shoes for Zoe's recital",
        child_ids=json.dumps([zoe.id]),
        total_amount=Decimal("68.00"),
        petitioner_share=Decimal("34.00"),
        respondent_share=Decimal("34.00"),
        petitioner_percentage=50,
        split_from_agreement=True,
        status="open",
        verification_required=True,
        receipt_required=True,
        created_by=priya.id,
        due_date=now() + timedelta(days=14),
        created_at=days_ago(3), updated_at=now(),
    )
    session.add(obl2)

    # ──────────────────────────────────────────
    # 5. FAMILY FILE F-3: Angela & Travis (Asymmetric)
    # ──────────────────────────────────────────
    print("\n🔵 Creating F-3: Angela & Travis (Asymmetric)...")

    ff3_id = uid()
    ff3 = FamilyFile(
        id=ff3_id,
        family_file_number="FF-ASYM003",
        title="Foster-Cole Family — Asymmetric Tiers",
        created_by=angela.id,
        parent_a_id=angela.id, parent_a_role="mother",
        parent_b_id=travis.id, parent_b_role="father",
        parent_b_email="travis.cole.test@cg-qa.com",
        parent_b_invited_at=days_ago(36),
        parent_b_joined_at=days_ago(30),  # 6 days after invite
        status="active",
        conflict_level=ConflictLevel.MODERATE.value,
        state="CA", county="San Diego",
        aria_enabled=True, aria_mode="standard",
        agreement_expense_split_ratio="65/35",
        agreement_split_parent_a_percentage=65,
        created_at=days_ago(36), updated_at=now(),
    )
    session.add(ff3)

    jordan = Child(
        id=uid(), family_file_id=ff3_id,
        first_name="Jordan", last_name="Foster-Cole",
        date_of_birth=date(2020, 6, 3), gender="male",
        status=ChildProfileStatus.ACTIVE.value,
        created_by=angela.id,
        approved_by_a=angela.id, approved_at_a=days_ago(30),
        approved_by_b=travis.id, approved_at_b=days_ago(29),
        created_at=days_ago(30), updated_at=now(),
    )
    session.add(jordan)

    # Agreement for F-3 — 16/18 signed
    agr3_id = uid()
    agr3, agr3_sections = make_agreement(agr3_id, ff3_id, "Foster-Cole SharedCare Agreement", signed_count=16)
    session.add(agr3)
    session.add_all(agr3_sections)

    # ClearFund expense (disputed by Travis)
    obl3 = Obligation(
        id=uid(), family_file_id=ff3_id,
        source_type="request", purpose_category="clothing",
        title="Jordan new sneakers",
        description="New sneakers for Jordan",
        child_ids=json.dumps([jordan.id]),
        total_amount=Decimal("52.00"),
        petitioner_share=Decimal("33.80"),  # 65%
        respondent_share=Decimal("18.20"),  # 35%
        petitioner_percentage=65,
        split_from_agreement=True,
        status="open",
        verification_required=True,
        created_by=angela.id,
        due_date=now() + timedelta(days=14),
        notes="Travis disputes — claims he already bought shoes",
        dispute_status="disputed",
        dispute_reason="I already bought Jordan sneakers last week. This is a duplicate expense.",
        disputed_at=days_ago(3),
        disputed_by=travis.id,
        created_at=days_ago(5), updated_at=now(),
    )
    session.add(obl3)

    # ──────────────────────────────────────────
    # 6. FAMILY FILE F-4: Sofia & Eduardo (Complex / Multi-Child / GAL)
    # ──────────────────────────────────────────
    print("\n🟣 Creating F-4: Sofia & Eduardo (Complex)...")

    ff4_id = uid()
    ff4 = FamilyFile(
        id=ff4_id,
        family_file_number="FF-CMPLX004",
        title="Delgado Family — Complex Multi-Child + GAL",
        created_by=sofia.id,
        parent_a_id=sofia.id, parent_a_role="mother",
        parent_b_id=eduardo.id, parent_b_role="father",
        parent_b_email="eduardo.delgado.test@cg-qa.com",
        parent_b_invited_at=days_ago(180),
        parent_b_joined_at=days_ago(179),
        status="active",
        conflict_level=ConflictLevel.HIGH.value,
        state="CA", county="San Diego",
        aria_enabled=True, aria_mode="standard",
        agreement_expense_split_ratio="50/50",
        agreement_split_parent_a_percentage=50,
        created_at=days_ago(180), updated_at=now(),
    )
    session.add(ff4)

    # Three children with different ages
    isabella = Child(
        id=uid(), family_file_id=ff4_id,
        first_name="Isabella", last_name="Delgado",
        date_of_birth=date(2013, 3, 8), gender="female",
        status=ChildProfileStatus.ACTIVE.value,
        created_by=sofia.id,
        approved_by_a=sofia.id, approved_at_a=days_ago(179),
        approved_by_b=eduardo.id, approved_at_b=days_ago(178),
        school_name="San Diego Middle School", grade_level="7th",
        created_at=days_ago(179), updated_at=now(),
    )
    marco = Child(
        id=uid(), family_file_id=ff4_id,
        first_name="Marco", last_name="Delgado",
        date_of_birth=date(2017, 7, 20), gender="male",
        status=ChildProfileStatus.ACTIVE.value,
        created_by=sofia.id,
        approved_by_a=sofia.id, approved_at_a=days_ago(179),
        approved_by_b=eduardo.id, approved_at_b=days_ago(178),
        school_name="Del Mar Elementary", grade_level="4th",
        created_at=days_ago(179), updated_at=now(),
    )
    luna = Child(
        id=uid(), family_file_id=ff4_id,
        first_name="Luna", last_name="Delgado",
        date_of_birth=date(2021, 11, 5), gender="female",
        status=ChildProfileStatus.ACTIVE.value,
        created_by=sofia.id,
        approved_by_a=sofia.id, approved_at_a=days_ago(179),
        approved_by_b=eduardo.id, approved_at_b=days_ago(178),
        created_at=days_ago(179), updated_at=now(),
    )
    session.add_all([isabella, marco, luna])

    # Agreement for F-4 — 12/18 signed, section 16 (Relocation) in dispute
    agr4_id = uid()
    agr4, agr4_sections = make_agreement(
        agr4_id, ff4_id,
        "Delgado Family SharedCare Agreement",
        signed_count=12,
        status="pending_approval",  # Not fully active due to dispute
        both_approved=False,
        dispute_sections=[16],  # Relocation section in dispute
    )
    session.add(agr4)
    session.add_all(agr4_sections)

    # Court event — hearing March 28
    court_event = CourtEvent(
        id=uid(),
        family_file_id=ff4_id,
        event_type="hearing",
        title="Relocation Modification Hearing — Delgado",
        description="Hearing on Eduardo's request to relocate to Seattle",
        scheduled_at=datetime(2026, 3, 28, 9, 0),
        location="San Diego Superior Court, Dept 24",
        created_by=sofia.id,
        created_at=days_ago(30), updated_at=now(),
    )
    session.add(court_event)

    await session.flush()

    # ──────────────────────────────────────────
    # 7. PROFESSIONAL PROFILES
    # ──────────────────────────────────────────
    print("\n⚖️  Creating professional profiles...")

    # P-1: Marcus Chen — Solo Attorney
    chen_profile = ProfessionalProfile(
        id=uid(), user_id=chen_user.id,
        professional_type=ProfessionalType.ATTORNEY.value,
        license_number="SBN298441",
        license_state="CA",
        license_verified=True,
        is_public=True,
        headline="Family Law Attorney — Solo Practice",
        bio="14 years of family law experience specializing in high-conflict custody modifications.",
        subscription_tier=ProfessionalTier.SOLO.value,
        max_active_cases=15,
        subscription_status="active",
        created_at=days_ago(180), updated_at=now(),
    )
    session.add(chen_profile)
    await session.flush()

    # Chen's firm (solo)
    chen_firm = Firm(
        id=uid(), name="Chen Family Law",
        slug="chen-family-law",
        firm_type=FirmType.SOLO_PRACTICE.value,
        email="marcus.chen.test@cg-qa.com",
        city="Los Angeles", state="CA",
        is_active=True, is_public=True,
        created_by=chen_user.id,
        created_at=days_ago(180), updated_at=now(),
    )
    session.add(chen_firm)
    await session.flush()

    # Chen firm membership
    session.add(FirmMembership(
        id=uid(), firm_id=chen_firm.id,
        professional_id=chen_profile.id, user_id=chen_user.id,
        role=FirmRole.OWNER.value,
        status=MembershipStatus.ACTIVE.value,
        joined_at=days_ago(180),
        created_at=days_ago(180), updated_at=now(),
    ))

    # Chen assigned to F-1 (Rosa/Derek) and F-3 (Angela/Travis)
    session.add(CaseAssignment(
        id=uid(), professional_id=chen_profile.id,
        firm_id=chen_firm.id, family_file_id=ff1_id,
        assignment_role=AssignmentRole.LEAD_ATTORNEY.value,
        representing="parent_a",  # Represents Rosa
        access_scopes=json.dumps(["agreement", "schedule", "messages", "exchanges", "expenses", "reports"]),
        can_control_aria=True, can_message_client=True,
        status=AssignmentStatus.ACTIVE.value,
        assigned_at=days_ago(85),
        created_at=days_ago(85), updated_at=now(),
    ))
    session.add(CaseAssignment(
        id=uid(), professional_id=chen_profile.id,
        firm_id=chen_firm.id, family_file_id=ff3_id,
        assignment_role=AssignmentRole.LEAD_ATTORNEY.value,
        representing="parent_a",  # Represents Angela
        access_scopes=json.dumps(["agreement", "schedule", "messages", "exchanges", "expenses", "reports"]),
        can_control_aria=True, can_message_client=True,
        status=AssignmentStatus.ACTIVE.value,
        assigned_at=days_ago(30),
        created_at=days_ago(30), updated_at=now(),
    ))

    # P-2: Holstrom Block & Parke — Small Firm
    print("\n🏛️  Creating P-2: Holstrom Block & Parke firm...")

    holstrom_profile = ProfessionalProfile(
        id=uid(), user_id=holstrom_user.id,
        professional_type=ProfessionalType.ATTORNEY.value,
        license_number="SBN312087",
        license_state="CA", license_verified=True,
        is_public=True,
        headline="Managing Partner — Family Law",
        subscription_tier=ProfessionalTier.SMALL_FIRM.value,
        max_active_cases=50,
        subscription_status="active",
        created_at=days_ago(365), updated_at=now(),
    )
    session.add(holstrom_profile)

    block_profile = ProfessionalProfile(
        id=uid(), user_id=block_user.id,
        professional_type=ProfessionalType.ATTORNEY.value,
        license_number="SBN334521",
        license_state="CA", license_verified=True,
        is_public=True,
        headline="Associate Attorney — Family Law",
        subscription_tier=ProfessionalTier.SMALL_FIRM.value,
        max_active_cases=50,
        subscription_status="active",
        created_at=days_ago(200), updated_at=now(),
    )
    session.add(block_profile)

    parke_profile = ProfessionalProfile(
        id=uid(), user_id=parke_user.id,
        professional_type=ProfessionalType.PARALEGAL.value,
        is_public=False,
        headline="Paralegal",
        subscription_tier=ProfessionalTier.SMALL_FIRM.value,
        max_active_cases=50,
        subscription_status="active",
        created_at=days_ago(200), updated_at=now(),
    )
    session.add(parke_profile)
    await session.flush()

    hbp_firm = Firm(
        id=uid(), name="Holstrom Block & Parke",
        slug="holstrom-block-parke",
        firm_type=FirmType.LAW_FIRM.value,
        email="holstrom.test@cg-qa.com",
        city="Los Angeles", state="CA",
        is_active=True, is_public=True,
        created_by=holstrom_user.id,
        created_at=days_ago(365), updated_at=now(),
    )
    session.add(hbp_firm)
    await session.flush()

    # Firm memberships
    session.add(FirmMembership(
        id=uid(), firm_id=hbp_firm.id,
        professional_id=holstrom_profile.id, user_id=holstrom_user.id,
        role=FirmRole.OWNER.value,
        status=MembershipStatus.ACTIVE.value,
        joined_at=days_ago(365),
        created_at=days_ago(365), updated_at=now(),
    ))
    session.add(FirmMembership(
        id=uid(), firm_id=hbp_firm.id,
        professional_id=block_profile.id, user_id=block_user.id,
        role=FirmRole.ATTORNEY.value,
        status=MembershipStatus.ACTIVE.value,
        joined_at=days_ago(200),
        created_at=days_ago(200), updated_at=now(),
    ))
    session.add(FirmMembership(
        id=uid(), firm_id=hbp_firm.id,
        professional_id=parke_profile.id, user_id=parke_user.id,
        role=FirmRole.PARALEGAL.value,
        status=MembershipStatus.ACTIVE.value,
        joined_at=days_ago(200),
        created_at=days_ago(200), updated_at=now(),
    ))

    # Holstrom assigned to F-3 (Angela/Travis)
    session.add(CaseAssignment(
        id=uid(), professional_id=holstrom_profile.id,
        firm_id=hbp_firm.id, family_file_id=ff3_id,
        assignment_role=AssignmentRole.LEAD_ATTORNEY.value,
        representing="parent_a",  # Angela
        access_scopes=json.dumps(["agreement", "schedule", "messages", "exchanges", "expenses", "reports"]),
        can_control_aria=True, can_message_client=True,
        status=AssignmentStatus.ACTIVE.value,
        assigned_at=days_ago(30),
        created_at=days_ago(30), updated_at=now(),
    ))

    # P-3: Janelle Williams — GAL
    print("\n👩‍⚖️ Creating P-3: Janelle Williams (GAL)...")

    williams_profile = ProfessionalProfile(
        id=uid(), user_id=williams_user.id,
        professional_type=ProfessionalType.PARENTING_COORDINATOR.value,
        license_number="LCSW89203",
        license_state="CA", license_verified=True,
        is_public=True,
        headline="Licensed Clinical Social Worker — GAL",
        bio="Court-appointed Guardian ad Litem specializing in child welfare evaluations.",
        subscription_tier=ProfessionalTier.SOLO.value,
        max_active_cases=15,
        subscription_status="active",
        created_at=days_ago(60), updated_at=now(),
    )
    session.add(williams_profile)
    await session.flush()

    # Williams' solo firm
    williams_firm = Firm(
        id=uid(), name="Williams Child Advocacy",
        slug="williams-child-advocacy",
        firm_type=FirmType.SOLO_PRACTICE.value,
        email="janelle.williams.test@cg-qa.com",
        city="San Diego", state="CA",
        is_active=True, is_public=True,
        created_by=williams_user.id,
        created_at=days_ago(60), updated_at=now(),
    )
    session.add(williams_firm)
    await session.flush()

    session.add(FirmMembership(
        id=uid(), firm_id=williams_firm.id,
        professional_id=williams_profile.id, user_id=williams_user.id,
        role=FirmRole.OWNER.value,
        status=MembershipStatus.ACTIVE.value,
        joined_at=days_ago(60),
        created_at=days_ago(60), updated_at=now(),
    ))

    # Williams assigned to F-4 (Delgado) as GAL — representing court
    session.add(CaseAssignment(
        id=uid(), professional_id=williams_profile.id,
        firm_id=williams_firm.id, family_file_id=ff4_id,
        assignment_role=AssignmentRole.PARENTING_COORDINATOR.value,
        representing="court",  # GAL represents the court/children
        access_scopes=json.dumps(["schedule", "exchanges", "children"]),
        # GAL should NOT have: messages, agreement (except child-relevant sections), reports (except A-8)
        can_control_aria=False,
        can_message_client=False,  # GAL communicates through professional messaging
        status=AssignmentStatus.ACTIVE.value,
        assigned_at=days_ago(45),
        # GAL dual-parent consent tracking
        consent_both_parents=True,
        consent_parent_a_at=days_ago(46),  # Sofia consented first
        consent_parent_b_at=days_ago(45),  # Eduardo consented after
        created_at=days_ago(45), updated_at=now(),
    ))

    # P-4: Diana Rivera — Mediator
    print("\n🤝 Creating P-4: Diana Rivera (Mediator)...")

    rivera_profile = ProfessionalProfile(
        id=uid(), user_id=rivera_user.id,
        professional_type=ProfessionalType.MEDIATOR.value,
        license_number="JD-CA-78002",
        license_state="CA", license_verified=True,
        is_public=True,
        headline="Private Mediator & Parenting Coordinator",
        bio="JD + M.S. in Conflict Resolution. Specializes in custody mediation.",
        subscription_tier=ProfessionalTier.SOLO.value,
        max_active_cases=15,
        subscription_status="active",
        created_at=days_ago(90), updated_at=now(),
    )
    session.add(rivera_profile)
    await session.flush()

    rivera_firm = Firm(
        id=uid(), name="Rivera Mediation Services",
        slug="rivera-mediation",
        firm_type=FirmType.MEDIATION_PRACTICE.value,
        email="diana.rivera.test@cg-qa.com",
        city="San Diego", state="CA",
        is_active=True, is_public=True,
        created_by=rivera_user.id,
        created_at=days_ago(90), updated_at=now(),
    )
    session.add(rivera_firm)
    await session.flush()

    session.add(FirmMembership(
        id=uid(), firm_id=rivera_firm.id,
        professional_id=rivera_profile.id, user_id=rivera_user.id,
        role=FirmRole.OWNER.value,
        status=MembershipStatus.ACTIVE.value,
        joined_at=days_ago(90),
        created_at=days_ago(90), updated_at=now(),
    ))

    # Rivera assigned to F-4 (Delgado) as Mediator — representing both
    session.add(CaseAssignment(
        id=uid(), professional_id=rivera_profile.id,
        firm_id=rivera_firm.id, family_file_id=ff4_id,
        assignment_role=AssignmentRole.MEDIATOR.value,
        representing="both",  # Mediator is neutral
        access_scopes=json.dumps(["agreement", "schedule", "messages"]),
        can_control_aria=False,
        can_message_client=True,
        status=AssignmentStatus.ACTIVE.value,
        assigned_at=days_ago(30),
        created_at=days_ago(30), updated_at=now(),
    ))

    await session.flush()
    await session.commit()

    # ──────────────────────────────────────────
    # SUMMARY
    # ──────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  SEED COMPLETE — Test Persona Summary")
    print("=" * 60)
    print(f"""
  FAMILY FILES:
    FF-DV001    Rosa & Derek    (High Conflict / DV)   ✓
    FF-COOP002  Priya & Liam    (Cooperative / Plus)    ✓
    FF-ASYM003  Angela & Travis (Asymmetric / Resist)   ✓
    FF-CMPLX004 Sofia & Eduardo (Complex / GAL)         ✓

  CHILDREN:
    Marisol (8), Carlos (5)           → FF-DV001
    Zoe (10)                          → FF-COOP002
    Jordan (6)                        → FF-ASYM003
    Isabella (13), Marco (9), Luna (5) → FF-CMPLX004

  PROFESSIONALS:
    P-1  Marcus Chen      Solo Attorney    (FF-DV001, FF-ASYM003)
    P-2  Holstrom B&P     Small Firm       (FF-ASYM003)
         - Sarah Holstrom  Owner/Attorney
         - James Block     Associate
         - Mei Parke       Paralegal
    P-3  Janelle Williams GAL              (FF-CMPLX004)
    P-4  Diana Rivera     Mediator         (FF-CMPLX004)

  TEST CREDENTIALS:
    Parents:  *@cg-qa.com / Test<First>#2026
    Pros:     *@cg-qa.com / Test<Last>#2026
    HBP Firm: TestHBP#2026
""")


async def main():
    async with AsyncSessionLocal() as session:
        try:
            await seed_all(session)
        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())

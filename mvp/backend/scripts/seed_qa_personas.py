"""
Seed script for QA Test Personas — 8 personas covering every feature and edge case.

Creates:
- 4 Family Pairs (F-1 through F-4) with children, agreements, messages, exchanges
- 4 Professional Personas (P-1 through P-4) with firms, assignments, and role configs
- Full cross-referencing: attorneys assigned to families, GAL + mediator on complex case

Run with:
    cd backend
    python -m scripts.seed_qa_personas
"""

import asyncio
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.supabase import get_supabase_admin_client
from app.models.user import User, UserProfile
from app.models.family_file import FamilyFile, QuickAccord, CourtCustodyCase
from app.models.child import Child
from app.models.agreement import Agreement, AgreementSection
from app.models.professional import (
    ProfessionalProfile,
    Firm,
    FirmMembership,
    CaseAssignment,
)


# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════════════════════════
# USER DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════════

# Family parents
FAMILY_USERS = [
    # F-1: Rosa & Derek (High Conflict / DV)
    {"email": "rosa.mendez.test@cg-qa.com", "password": "TestRosa#2026", "first_name": "Rosa", "last_name": "Mendez", "tier": "family_plus", "tier_status": "active"},
    {"email": "derek.holt.test@cg-qa.com", "password": "TestDerek#2026", "first_name": "Derek", "last_name": "Holt", "tier": "starter", "tier_status": "active"},
    # F-2: Priya & Liam (Cooperative)
    {"email": "priya.sharma.test@cg-qa.com", "password": "TestPriya#2026", "first_name": "Priya", "last_name": "Sharma", "tier": "plus", "tier_status": "active"},
    {"email": "liam.obrien.test@cg-qa.com", "password": "TestLiam#2026", "first_name": "Liam", "last_name": "O'Brien", "tier": "plus", "tier_status": "active"},
    # F-3: Angela & Travis (Asymmetric)
    {"email": "angela.foster.test@cg-qa.com", "password": "TestAngela#2026", "first_name": "Angela", "last_name": "Foster", "tier": "family_plus", "tier_status": "active"},
    {"email": "travis.cole.test@cg-qa.com", "password": "TestTravis#2026", "first_name": "Travis", "last_name": "Cole", "tier": "starter", "tier_status": "active"},
    # F-4: Sofia & Eduardo (Complex)
    {"email": "sofia.delgado.test@cg-qa.com", "password": "TestSofia#2026", "first_name": "Sofia", "last_name": "Delgado", "tier": "family_plus", "tier_status": "active"},
    {"email": "eduardo.delgado.test@cg-qa.com", "password": "TestEduardo#2026", "first_name": "Eduardo", "last_name": "Delgado", "tier": "family_plus", "tier_status": "active"},
]

# Professional users
PROFESSIONAL_USERS = [
    # P-1: Marcus Chen (Solo Attorney)
    {"email": "marcus.chen.test@cg-qa.com", "password": "TestChen#2026", "first_name": "Marcus", "last_name": "Chen", "tier": "plus", "tier_status": "active"},
    # P-2: Holstrom Block & Parke (3 members)
    {"email": "holstrom.test@cg-qa.com", "password": "TestHBP#2026", "first_name": "Sarah", "last_name": "Holstrom", "tier": "plus", "tier_status": "active"},
    {"email": "block.test@cg-qa.com", "password": "TestHBP#2026", "first_name": "James", "last_name": "Block", "tier": "plus", "tier_status": "active"},
    {"email": "parke.test@cg-qa.com", "password": "TestHBP#2026", "first_name": "Mei", "last_name": "Parke", "tier": "plus", "tier_status": "active"},
    # P-3: Janelle Williams (GAL)
    {"email": "janelle.williams.test@cg-qa.com", "password": "TestWilliams#2026", "first_name": "Janelle", "last_name": "Williams", "tier": "plus", "tier_status": "active"},
    # P-4: Diana Rivera (Mediator)
    {"email": "diana.rivera.test@cg-qa.com", "password": "TestRivera#2026", "first_name": "Diana", "last_name": "Rivera", "tier": "plus", "tier_status": "active"},
]


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

async def create_supabase_user(admin_client, email: str, password: str) -> str:
    """Create user in Supabase Auth, return the user ID. Skip if exists."""
    try:
        response = admin_client.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
        })
        print(f"   ✓ Supabase auth user created: {email}")
        return response.user.id
    except Exception as e:
        err_str = str(e)
        if "already been registered" in err_str or "already exists" in err_str or "duplicate" in err_str.lower():
            # User exists — look them up
            users_response = admin_client.auth.admin.list_users()
            for u in users_response:
                # Handle both list-of-users and paginated response
                if hasattr(u, 'email') and u.email == email:
                    print(f"   → Supabase auth user exists: {email} (id={u.id})")
                    return u.id
                elif isinstance(u, list):
                    for uu in u:
                        if hasattr(uu, 'email') and uu.email == email:
                            print(f"   → Supabase auth user exists: {email} (id={uu.id})")
                            return uu.id
            raise Exception(f"User {email} exists in Supabase but could not find ID: {e}")
        raise


async def ensure_user(
    db: AsyncSession,
    admin_client,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    tier: str = "starter",
    tier_status: str = "active",
) -> User:
    """Create or find a user in both Supabase Auth and the local DB."""
    # Check if user already exists in local DB
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        print(f"   → DB user exists: {email} (id={existing.id})")
        # Update profile tier if needed
        profile_result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == existing.id)
        )
        profile = profile_result.scalar_one_or_none()
        if profile:
            profile.subscription_tier = tier
            profile.subscription_status = tier_status
        return existing

    # Create in Supabase Auth
    supabase_id = await create_supabase_user(admin_client, email, password)

    # Create in local DB
    user = User(
        id=supabase_id,
        supabase_id=supabase_id,
        email=email,
        email_verified=True,
        first_name=first_name,
        last_name=last_name,
        is_active=True,
    )
    db.add(user)

    profile = UserProfile(
        id=str(uuid4()),
        user_id=supabase_id,
        first_name=first_name,
        last_name=last_name,
        subscription_tier=tier,
        subscription_status=tier_status,
    )
    db.add(profile)

    await db.flush()
    print(f"   ✓ DB user created: {first_name} {last_name} ({email}) — tier={tier}")
    return user


def create_agreement_sections(agreement_id: str, completed_count: int = 18) -> list:
    """Create standard 18 sections, marking the first N as completed."""
    sections = []
    for i, tmpl in enumerate(SHARED_CARE_SECTIONS):
        sections.append(AgreementSection(
            id=str(uuid4()),
            agreement_id=agreement_id,
            section_number=tmpl["number"],
            section_title=tmpl["title"],
            section_type=tmpl["type"],
            content=f"[{tmpl['title']} section content]",
            display_order=i,
            is_required=tmpl["required"],
            is_completed=(i < completed_count),
        ))
    return sections


# ═══════════════════════════════════════════════════════════════════════════════
# FAMILY CREATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def create_f1_rosa_derek(db: AsyncSession, users: dict) -> dict:
    """F-1: Rosa Mendez & Derek Holt — High Conflict + DV Flag."""
    print("\n" + "─" * 60)
    print("👩 F-1: Rosa Mendez & Derek Holt (HIGH CONFLICT / DV)")
    print("─" * 60)

    rosa = users["rosa.mendez.test@cg-qa.com"]
    derek = users["derek.holt.test@cg-qa.com"]

    # Family File
    ff_id = str(uuid4())
    ff = FamilyFile(
        id=ff_id,
        family_file_number="FF-DV001-TEST",
        title="Mendez-Holt Family",
        created_by=rosa.id,
        parent_a_id=rosa.id,
        parent_a_role="mother",
        parent_b_id=derek.id,
        parent_b_role="father",
        parent_b_email=derek.email,
        parent_b_invited_at=datetime.utcnow() - timedelta(days=90),
        parent_b_joined_at=datetime.utcnow() - timedelta(days=89),
        status="active",
        conflict_level="high",
        state="CA",
        county="San Diego",
        aria_enabled=True,
        require_joint_approval=True,
    )
    db.add(ff)

    # Court Custody Case with DV flag
    court_case = CourtCustodyCase(
        id=str(uuid4()),
        family_file_id=ff_id,
        case_number="FF-DV001",
        case_type="custody",
        jurisdiction_state="CA",
        jurisdiction_county="San Diego",
        court_name="San Diego Superior Court - Vista",
        petitioner_id=rosa.id,
        respondent_id=derek.id,
        petitioner_attorney="Marcus Chen, Esq.",
        filing_date=datetime(2025, 3, 15),
        gps_checkin_required=True,
        restrictions={"dv_flag": True, "aria_threshold_adjustment": -0.15, "distress_signal_threshold": 0.45},
        status="active",
    )
    db.add(court_case)

    # Children
    marisol = Child(
        id=str(uuid4()),
        family_file_id=ff_id,
        first_name="Marisol",
        last_name="Mendez-Holt",
        date_of_birth=date(2018, 4, 12),
        gender="female",
        status="active",
        created_by=rosa.id,
        approved_by_a=rosa.id,
        approved_by_b=derek.id,
        approved_at_a=datetime.utcnow() - timedelta(days=88),
        approved_at_b=datetime.utcnow() - timedelta(days=88),
        school_name="Vista Elementary",
        grade_level="2nd",
    )
    db.add(marisol)

    carlos = Child(
        id=str(uuid4()),
        family_file_id=ff_id,
        first_name="Carlos",
        last_name="Mendez-Holt",
        date_of_birth=date(2021, 1, 8),
        gender="male",
        status="active",
        created_by=rosa.id,
        approved_by_a=rosa.id,
        approved_by_b=derek.id,
        approved_at_a=datetime.utcnow() - timedelta(days=88),
        approved_at_b=datetime.utcnow() - timedelta(days=88),
        school_name="Little Stars Preschool",
        grade_level="Pre-K",
    )
    db.add(carlos)

    # Agreement — fully signed
    agr_id = str(uuid4())
    agr = Agreement(
        id=agr_id,
        family_file_id=ff_id,
        agreement_number="SCA-DV001",
        title="Mendez-Holt Custody Agreement",
        agreement_type="shared_care",
        version=1,
        status="active",
        petitioner_approved=True,
        petitioner_approved_at=datetime.utcnow() - timedelta(days=80),
        respondent_approved=True,
        respondent_approved_at=datetime.utcnow() - timedelta(days=80),
        effective_date=datetime.utcnow() - timedelta(days=79),
        rules={
            "custody_type": "joint_legal_primary_physical",
            "primary_residence": "mother",
            "parenting_time_split": "60/40",
            "exchange_day": "friday",
            "exchange_time": "15:00",
            "exchange_location": "school",
            "dv_restrictions": True,
        },
    )
    db.add(agr)
    for s in create_agreement_sections(agr_id, completed_count=18):
        db.add(s)

    await db.flush()
    print(f"   ✓ Family File: {ff.family_file_number}")
    print(f"   ✓ Children: Marisol (8), Carlos (5)")
    print(f"   ✓ Agreement: {agr.agreement_number} (active, 18/18 sections)")
    print(f"   ✓ DV flag: ACTIVE")

    return {"family_file": ff, "rosa": rosa, "derek": derek, "children": [marisol, carlos]}


async def create_f2_priya_liam(db: AsyncSession, users: dict) -> dict:
    """F-2: Priya Sharma & Liam O'Brien — Cooperative / Both Plus."""
    print("\n" + "─" * 60)
    print("👩‍💼 F-2: Priya Sharma & Liam O'Brien (COOPERATIVE)")
    print("─" * 60)

    priya = users["priya.sharma.test@cg-qa.com"]
    liam = users["liam.obrien.test@cg-qa.com"]

    ff_id = str(uuid4())
    ff = FamilyFile(
        id=ff_id,
        family_file_number="FF-COOP002-TEST",
        title="Sharma-O'Brien Family",
        created_by=priya.id,
        parent_a_id=priya.id,
        parent_a_role="mother",
        parent_b_id=liam.id,
        parent_b_role="father",
        parent_b_email=liam.email,
        parent_b_invited_at=datetime.utcnow() - timedelta(days=120),
        parent_b_joined_at=datetime.utcnow() - timedelta(days=120),
        status="active",
        conflict_level="low",
        state="CA",
        county="San Diego",
        aria_enabled=True,
        require_joint_approval=True,
    )
    db.add(ff)

    # Child
    zoe = Child(
        id=str(uuid4()),
        family_file_id=ff_id,
        first_name="Zoe",
        last_name="Sharma-O'Brien",
        date_of_birth=date(2016, 6, 15),
        gender="female",
        status="active",
        created_by=priya.id,
        approved_by_a=priya.id,
        approved_by_b=liam.id,
        approved_at_a=datetime.utcnow() - timedelta(days=119),
        approved_at_b=datetime.utcnow() - timedelta(days=119),
        school_name="Pacific Beach Elementary",
        grade_level="4th",
        favorite_activities="Dance, soccer, reading",
    )
    db.add(zoe)

    # Agreement — 14/18 sections signed
    agr_id = str(uuid4())
    agr = Agreement(
        id=agr_id,
        family_file_id=ff_id,
        agreement_number="SCA-COOP002",
        title="Sharma-O'Brien SharedCare Agreement",
        agreement_type="shared_care",
        version=1,
        status="active",
        petitioner_approved=True,
        petitioner_approved_at=datetime.utcnow() - timedelta(days=110),
        respondent_approved=True,
        respondent_approved_at=datetime.utcnow() - timedelta(days=110),
        effective_date=datetime.utcnow() - timedelta(days=109),
        rules={
            "custody_type": "joint_legal_joint_physical",
            "schedule_type": "week_on_week_off",
            "exchange_day": "sunday",
            "exchange_time": "18:00",
            "exchange_location": "midway point",
            "holiday_rotation": True,
        },
    )
    db.add(agr)
    for s in create_agreement_sections(agr_id, completed_count=14):
        db.add(s)

    await db.flush()
    print(f"   ✓ Family File: {ff.family_file_number}")
    print(f"   ✓ Child: Zoe (10)")
    print(f"   ✓ Agreement: {agr.agreement_number} (14/18 sections)")

    return {"family_file": ff, "priya": priya, "liam": liam, "children": [zoe]}


async def create_f3_angela_travis(db: AsyncSession, users: dict) -> dict:
    """F-3: Angela Foster & Travis Cole — Asymmetric Tiers / Resistant Co-Parent."""
    print("\n" + "─" * 60)
    print("👩 F-3: Angela Foster & Travis Cole (ASYMMETRIC)")
    print("─" * 60)

    angela = users["angela.foster.test@cg-qa.com"]
    travis = users["travis.cole.test@cg-qa.com"]

    ff_id = str(uuid4())
    ff = FamilyFile(
        id=ff_id,
        family_file_number="FF-ASYM003-TEST",
        title="Foster-Cole Family",
        created_by=angela.id,
        parent_a_id=angela.id,
        parent_a_role="mother",
        parent_b_id=travis.id,
        parent_b_role="father",
        parent_b_email=travis.email,
        parent_b_invited_at=datetime.utcnow() - timedelta(days=60),
        parent_b_joined_at=datetime.utcnow() - timedelta(days=54),  # 6 days after invite
        status="active",
        conflict_level="moderate",
        state="CA",
        county="San Diego",
        aria_enabled=True,
        require_joint_approval=True,
    )
    db.add(ff)

    # Child
    jordan = Child(
        id=str(uuid4()),
        family_file_id=ff_id,
        first_name="Jordan",
        last_name="Foster-Cole",
        date_of_birth=date(2020, 3, 22),
        gender="male",
        status="active",
        created_by=angela.id,
        approved_by_a=angela.id,
        approved_by_b=travis.id,
        approved_at_a=datetime.utcnow() - timedelta(days=53),
        approved_at_b=datetime.utcnow() - timedelta(days=53),
        school_name="Escondido Elementary",
        grade_level="Kindergarten",
    )
    db.add(jordan)

    # Agreement — active
    agr_id = str(uuid4())
    agr = Agreement(
        id=agr_id,
        family_file_id=ff_id,
        agreement_number="SCA-ASYM003",
        title="Foster-Cole Custody Agreement",
        agreement_type="shared_care",
        version=1,
        status="active",
        petitioner_approved=True,
        petitioner_approved_at=datetime.utcnow() - timedelta(days=50),
        respondent_approved=True,
        respondent_approved_at=datetime.utcnow() - timedelta(days=50),
        effective_date=datetime.utcnow() - timedelta(days=49),
        rules={
            "custody_type": "joint_legal_primary_physical",
            "primary_residence": "mother",
            "parenting_time_split": "65/35",
            "exchange_day": "wednesday",
            "exchange_time": "17:00",
        },
    )
    db.add(agr)
    for s in create_agreement_sections(agr_id, completed_count=18):
        db.add(s)

    await db.flush()
    print(f"   ✓ Family File: {ff.family_file_number}")
    print(f"   ✓ Child: Jordan (6)")
    print(f"   ✓ Agreement: {agr.agreement_number} (active, 18/18)")
    print(f"   ✓ Travis activation delay: 6 days after invite")

    return {"family_file": ff, "angela": angela, "travis": travis, "children": [jordan]}


async def create_f4_sofia_eduardo(db: AsyncSession, users: dict) -> dict:
    """F-4: Sofia & Eduardo Delgado — Complex / Multi-Child / Modification Pending."""
    print("\n" + "─" * 60)
    print("👩‍👧‍👦 F-4: Sofia & Eduardo Delgado (COMPLEX)")
    print("─" * 60)

    sofia = users["sofia.delgado.test@cg-qa.com"]
    eduardo = users["eduardo.delgado.test@cg-qa.com"]

    ff_id = str(uuid4())
    ff = FamilyFile(
        id=ff_id,
        family_file_number="FF-CMPLX004-TEST",
        title="Delgado Family",
        created_by=sofia.id,
        parent_a_id=sofia.id,
        parent_a_role="mother",
        parent_b_id=eduardo.id,
        parent_b_role="father",
        parent_b_email=eduardo.email,
        parent_b_invited_at=datetime.utcnow() - timedelta(days=180),
        parent_b_joined_at=datetime.utcnow() - timedelta(days=180),
        status="active",
        conflict_level="high",
        state="CA",
        county="San Diego",
        aria_enabled=True,
        require_joint_approval=True,
    )
    db.add(ff)

    # Court Case with upcoming hearing
    court_case = CourtCustodyCase(
        id=str(uuid4()),
        family_file_id=ff_id,
        case_number="FF-CMPLX004",
        case_type="custody_modification",
        jurisdiction_state="CA",
        jurisdiction_county="San Diego",
        court_name="San Diego Superior Court",
        petitioner_id=sofia.id,
        respondent_id=eduardo.id,
        filing_date=datetime(2026, 3, 1),
        next_court_date=datetime(2026, 3, 28),
        status="active",
    )
    db.add(court_case)

    # Three children
    isabella = Child(
        id=str(uuid4()),
        family_file_id=ff_id,
        first_name="Isabella",
        last_name="Delgado",
        date_of_birth=date(2013, 2, 10),
        gender="female",
        status="active",
        created_by=sofia.id,
        approved_by_a=sofia.id,
        approved_by_b=eduardo.id,
        approved_at_a=datetime.utcnow() - timedelta(days=179),
        approved_at_b=datetime.utcnow() - timedelta(days=179),
        school_name="Del Mar Middle School",
        grade_level="7th",
    )
    db.add(isabella)

    marco = Child(
        id=str(uuid4()),
        family_file_id=ff_id,
        first_name="Marco",
        last_name="Delgado",
        date_of_birth=date(2017, 7, 3),
        gender="male",
        status="active",
        created_by=sofia.id,
        approved_by_a=sofia.id,
        approved_by_b=eduardo.id,
        approved_at_a=datetime.utcnow() - timedelta(days=179),
        approved_at_b=datetime.utcnow() - timedelta(days=179),
        school_name="Del Mar Elementary",
        grade_level="3rd",
    )
    db.add(marco)

    luna = Child(
        id=str(uuid4()),
        family_file_id=ff_id,
        first_name="Luna",
        last_name="Delgado",
        date_of_birth=date(2021, 5, 18),
        gender="female",
        status="active",
        created_by=eduardo.id,
        approved_by_a=sofia.id,
        approved_by_b=eduardo.id,
        approved_at_a=datetime.utcnow() - timedelta(days=179),
        approved_at_b=datetime.utcnow() - timedelta(days=179),
        school_name="Sunshine Preschool",
        grade_level="Pre-K",
    )
    db.add(luna)

    # Agreement — 12/18 sections complete, relocation in dispute
    agr_id = str(uuid4())
    agr = Agreement(
        id=agr_id,
        family_file_id=ff_id,
        agreement_number="SCA-CMPLX004",
        title="Delgado Family SharedCare Agreement",
        agreement_type="shared_care",
        version=1,
        status="active",
        petitioner_approved=True,
        petitioner_approved_at=datetime.utcnow() - timedelta(days=170),
        respondent_approved=True,
        respondent_approved_at=datetime.utcnow() - timedelta(days=170),
        effective_date=datetime.utcnow() - timedelta(days=169),
        rules={
            "custody_type": "joint_legal_joint_physical",
            "schedule_type": "alternating_weeks",
            "relocation_dispute": True,
            "modification_filed": "2026-03-01",
        },
    )
    db.add(agr)
    # 12/18 sections complete — relocation (section 16) is NOT completed
    for s in create_agreement_sections(agr_id, completed_count=12):
        db.add(s)

    # Quick Accord — temporary summer agreement
    qa = QuickAccord(
        id=str(uuid4()),
        family_file_id=ff_id,
        accord_number="QA-DELG001",
        title="Summer vacation schedule pending relocation hearing",
        purpose_category="vacation",
        purpose_description="Temporary agreement: Eduardo can take children to Seattle for summer vacation (6 weeks) pending final relocation hearing",
        is_single_event=False,
        start_date=datetime(2026, 6, 15),
        end_date=datetime(2026, 7, 31),
        child_ids=[str(isabella.id), str(marco.id), str(luna.id)],
        initiated_by=eduardo.id,
        status="active",
        parent_a_approved=True,
        parent_a_approved_at=datetime.utcnow() - timedelta(days=10),
        parent_b_approved=True,
        parent_b_approved_at=datetime.utcnow() - timedelta(days=9),
        attestation_text="Both parents agree to this temporary arrangement pending the court hearing on March 28, 2026.",
    )
    db.add(qa)

    await db.flush()
    print(f"   ✓ Family File: {ff.family_file_number}")
    print(f"   ✓ Children: Isabella (13), Marco (9), Luna (5)")
    print(f"   ✓ Agreement: {agr.agreement_number} (12/18 — relocation disputed)")
    print(f"   ✓ Quick Accord: Summer vacation (active)")
    print(f"   ✓ Court hearing: March 28, 2026")

    return {"family_file": ff, "sofia": sofia, "eduardo": eduardo, "children": [isabella, marco, luna]}


# ═══════════════════════════════════════════════════════════════════════════════
# PROFESSIONAL CREATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def create_p1_chen(db: AsyncSession, users: dict, f1_data: dict, f3_data: dict) -> dict:
    """P-1: Marcus Chen, Esq. — Solo Attorney on Rosa's and Angela's cases."""
    print("\n" + "─" * 60)
    print("⚖️  P-1: Marcus Chen, Esq. (SOLO ATTORNEY)")
    print("─" * 60)

    chen = users["marcus.chen.test@cg-qa.com"]

    # Create solo firm
    firm_id = str(uuid4())
    firm = Firm(
        id=firm_id,
        name="Chen Family Law",
        slug="chen-family-law",
        firm_type="solo_practice",
        email="marcus.chen.test@cg-qa.com",
        phone="(310) 555-0100",
        city="West Los Angeles",
        state="CA",
        zip_code="90025",
        is_public=True,
        is_active=True,
        subscription_tier="professional",
        subscription_status="active",
        created_by=chen.id,
    )
    db.add(firm)

    # Professional profile
    prof_id = str(uuid4())
    prof = ProfessionalProfile(
        id=prof_id,
        user_id=chen.id,
        professional_type="attorney",
        license_number="SBN298441",
        license_state="CA",
        license_verified=True,
        license_verified_at=datetime.utcnow() - timedelta(days=200),
        practice_areas=["custody", "divorce", "dv_protection"],
        professional_email="marcus.chen.test@cg-qa.com",
        is_active=True,
        onboarded_at=datetime.utcnow() - timedelta(days=200),
    )
    db.add(prof)

    # Firm membership
    membership = FirmMembership(
        id=str(uuid4()),
        professional_id=prof_id,
        firm_id=firm_id,
        role="owner",
        status="active",
        joined_at=datetime.utcnow() - timedelta(days=200),
    )
    db.add(membership)

    # Case assignment: Rosa's case (F-1)
    assign1 = CaseAssignment(
        id=str(uuid4()),
        professional_id=prof_id,
        firm_id=firm_id,
        family_file_id=f1_data["family_file"].id,
        assignment_role="lead_attorney",
        representing="parent_a",
        access_scopes=["agreement", "schedule", "messages", "financials", "compliance", "interventions"],
        can_control_aria=True,
        can_message_client=True,
        status="active",
        assigned_at=datetime.utcnow() - timedelta(days=85),
    )
    db.add(assign1)

    # Case assignment: Angela's case (F-3)
    assign2 = CaseAssignment(
        id=str(uuid4()),
        professional_id=prof_id,
        firm_id=firm_id,
        family_file_id=f3_data["family_file"].id,
        assignment_role="lead_attorney",
        representing="parent_a",
        access_scopes=["agreement", "schedule", "messages", "financials", "compliance"],
        can_control_aria=True,
        can_message_client=True,
        status="active",
        assigned_at=datetime.utcnow() - timedelta(days=55),
    )
    db.add(assign2)

    await db.flush()
    print(f"   ✓ Firm: Chen Family Law (solo)")
    print(f"   ✓ License: SBN298441 (CA, verified)")
    print(f"   ✓ Assigned to: FF-DV001 (Rosa) + FF-ASYM003 (Angela)")
    print(f"   ✓ Plan: Solo ($99/mo) — 12/15 cases")

    return {"firm": firm, "professional": prof, "user": chen}


async def create_p2_holstrom(db: AsyncSession, users: dict, f3_data: dict) -> dict:
    """P-2: Holstrom Block & Parke — Small Firm with 3 members."""
    print("\n" + "─" * 60)
    print("🏛️  P-2: Holstrom Block & Parke (SMALL FIRM)")
    print("─" * 60)

    holstrom = users["holstrom.test@cg-qa.com"]
    block = users["block.test@cg-qa.com"]
    parke = users["parke.test@cg-qa.com"]

    # Create firm
    firm_id = str(uuid4())
    firm = Firm(
        id=firm_id,
        name="Holstrom Block & Parke",
        slug="holstrom-block-parke",
        firm_type="law_firm",
        email="contact@hbp-law.com",
        phone="(213) 555-0200",
        city="Los Angeles",
        state="CA",
        zip_code="90071",
        address_line1="350 S Grand Ave, Suite 2200",
        is_public=True,
        is_active=True,
        subscription_tier="professional",
        subscription_status="active",
        created_by=holstrom.id,
    )
    db.add(firm)

    # Holstrom — firm admin / lead attorney
    holstrom_prof_id = str(uuid4())
    holstrom_prof = ProfessionalProfile(
        id=holstrom_prof_id,
        user_id=holstrom.id,
        professional_type="attorney",
        license_number="SBN312890",
        license_state="CA",
        license_verified=True,
        practice_areas=["custody", "divorce", "mediation"],
        is_active=True,
        onboarded_at=datetime.utcnow() - timedelta(days=300),
    )
    db.add(holstrom_prof)
    db.add(FirmMembership(
        id=str(uuid4()), professional_id=holstrom_prof_id, firm_id=firm_id,
        role="admin", status="active", joined_at=datetime.utcnow() - timedelta(days=300),
    ))

    # Block — associate attorney
    block_prof_id = str(uuid4())
    block_prof = ProfessionalProfile(
        id=block_prof_id,
        user_id=block.id,
        professional_type="attorney",
        license_number="SBN345102",
        license_state="CA",
        license_verified=True,
        practice_areas=["custody", "child_support"],
        is_active=True,
        onboarded_at=datetime.utcnow() - timedelta(days=250),
    )
    db.add(block_prof)
    db.add(FirmMembership(
        id=str(uuid4()), professional_id=block_prof_id, firm_id=firm_id,
        role="attorney", status="active", joined_at=datetime.utcnow() - timedelta(days=250),
    ))

    # Parke — paralegal (read-only)
    parke_prof_id = str(uuid4())
    parke_prof = ProfessionalProfile(
        id=parke_prof_id,
        user_id=parke.id,
        professional_type="paralegal",
        is_active=True,
        onboarded_at=datetime.utcnow() - timedelta(days=200),
    )
    db.add(parke_prof)
    db.add(FirmMembership(
        id=str(uuid4()), professional_id=parke_prof_id, firm_id=firm_id,
        role="paralegal", status="active", joined_at=datetime.utcnow() - timedelta(days=200),
    ))

    # Assign Holstrom to Angela's case (F-3)
    assign = CaseAssignment(
        id=str(uuid4()),
        professional_id=holstrom_prof_id,
        firm_id=firm_id,
        family_file_id=f3_data["family_file"].id,
        assignment_role="lead_attorney",
        representing="parent_a",
        access_scopes=["agreement", "schedule", "messages", "financials", "compliance", "interventions"],
        can_control_aria=True,
        can_message_client=True,
        status="active",
        assigned_at=datetime.utcnow() - timedelta(days=55),
    )
    db.add(assign)

    await db.flush()
    print(f"   ✓ Firm: Holstrom Block & Parke (small_firm)")
    print(f"   ✓ Holstrom: admin/attorney (SBN312890)")
    print(f"   ✓ Block: associate attorney (SBN345102)")
    print(f"   ✓ Parke: paralegal (read-only)")
    print(f"   ✓ Assigned to: FF-ASYM003 (Angela)")

    return {"firm": firm, "holstrom": holstrom_prof, "block": block_prof, "parke": parke_prof}


async def create_p3_williams(db: AsyncSession, users: dict, f4_data: dict) -> dict:
    """P-3: Janelle Williams, LCSW — GAL on Delgado case."""
    print("\n" + "─" * 60)
    print("👩‍⚖️ P-3: Janelle Williams, LCSW (GAL)")
    print("─" * 60)

    williams = users["janelle.williams.test@cg-qa.com"]

    # Solo firm for GAL
    firm_id = str(uuid4())
    firm = Firm(
        id=firm_id,
        name="Janelle Williams, LCSW",
        slug="williams-gal",
        firm_type="solo_practice",
        email="janelle.williams.test@cg-qa.com",
        city="San Diego",
        state="CA",
        is_active=True,
        subscription_tier="professional",
        subscription_status="active",
        created_by=williams.id,
    )
    db.add(firm)

    prof_id = str(uuid4())
    prof = ProfessionalProfile(
        id=prof_id,
        user_id=williams.id,
        professional_type="parenting_coordinator",
        license_number="LCSW89203",
        license_state="CA",
        license_verified=True,
        practice_areas=["child_welfare", "gal"],
        is_active=True,
        onboarded_at=datetime.utcnow() - timedelta(days=100),
    )
    db.add(prof)
    db.add(FirmMembership(
        id=str(uuid4()), professional_id=prof_id, firm_id=firm_id,
        role="owner", status="active", joined_at=datetime.utcnow() - timedelta(days=100),
    ))

    # GAL assignment on Delgado case (F-4) — restricted scopes
    assign = CaseAssignment(
        id=str(uuid4()),
        professional_id=prof_id,
        firm_id=firm_id,
        family_file_id=f4_data["family_file"].id,
        assignment_role="gal",
        representing="children",
        access_scopes=["child_welfare", "schedule", "agreement_sections_2_10_11_12_13"],
        can_control_aria=False,
        can_message_client=False,
        status="active",
        assigned_at=datetime.utcnow() - timedelta(days=30),
    )
    db.add(assign)

    await db.flush()
    print(f"   ✓ Profile: GAL / parenting_coordinator (LCSW89203)")
    print(f"   ✓ Assigned to: FF-CMPLX004 (Delgado) — restricted scopes")
    print(f"   ✓ Cannot view messages, cannot control ARIA")

    return {"firm": firm, "professional": prof, "user": williams}


async def create_p4_rivera(db: AsyncSession, users: dict, f4_data: dict) -> dict:
    """P-4: Diana Rivera, J.D., M.S. — Mediator on Delgado case."""
    print("\n" + "─" * 60)
    print("🤝 P-4: Diana Rivera, J.D., M.S. (MEDIATOR)")
    print("─" * 60)

    rivera = users["diana.rivera.test@cg-qa.com"]

    firm_id = str(uuid4())
    firm = Firm(
        id=firm_id,
        name="Rivera Mediation Services",
        slug="rivera-mediation",
        firm_type="mediation_practice",
        email="diana.rivera.test@cg-qa.com",
        city="San Diego",
        state="CA",
        is_active=True,
        subscription_tier="professional",
        subscription_status="active",
        created_by=rivera.id,
    )
    db.add(firm)

    prof_id = str(uuid4())
    prof = ProfessionalProfile(
        id=prof_id,
        user_id=rivera.id,
        professional_type="mediator",
        license_number="JD-CA-2005",
        license_state="CA",
        license_verified=True,
        practice_areas=["mediation", "custody", "conflict_resolution"],
        is_active=True,
        onboarded_at=datetime.utcnow() - timedelta(days=150),
    )
    db.add(prof)
    db.add(FirmMembership(
        id=str(uuid4()), professional_id=prof_id, firm_id=firm_id,
        role="owner", status="active", joined_at=datetime.utcnow() - timedelta(days=150),
    ))

    # Mediator assignment on Delgado case (F-4)
    assign = CaseAssignment(
        id=str(uuid4()),
        professional_id=prof_id,
        firm_id=firm_id,
        family_file_id=f4_data["family_file"].id,
        assignment_role="mediator",
        representing="both",
        access_scopes=["agreement", "schedule", "compliance", "messaging"],
        can_control_aria=False,
        can_message_client=True,
        status="active",
        assigned_at=datetime.utcnow() - timedelta(days=20),
    )
    db.add(assign)

    await db.flush()
    print(f"   ✓ Firm: Rivera Mediation Services")
    print(f"   ✓ Profile: mediator (JD-CA-2005)")
    print(f"   ✓ Assigned to: FF-CMPLX004 (Delgado) — neutral, can message both parents")

    return {"firm": firm, "professional": prof, "user": rivera}


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN SEED FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

async def seed_qa_personas():
    """Main seeding function for all 8 QA test personas."""
    print("\n" + "=" * 70)
    print("🌱 CommonGround QA Test Personas Seed Script")
    print("   8 Personas · 4 Family Pairs · 4 Professionals · 16 Scenarios")
    print("=" * 70)

    admin_client = get_supabase_admin_client()

    async with AsyncSessionLocal() as db:
        try:
            # ─────────────────────────────────────────────────────────
            # Step 1: Create all users in Supabase Auth + local DB
            # ─────────────────────────────────────────────────────────
            print("\n👤 Creating users in Supabase Auth + local DB...")
            users = {}

            all_user_defs = FAMILY_USERS + PROFESSIONAL_USERS
            for user_def in all_user_defs:
                user = await ensure_user(
                    db, admin_client,
                    email=user_def["email"],
                    password=user_def["password"],
                    first_name=user_def["first_name"],
                    last_name=user_def["last_name"],
                    tier=user_def["tier"],
                    tier_status=user_def["tier_status"],
                )
                users[user_def["email"]] = user

            await db.commit()
            print(f"\n   ✅ {len(users)} users ready")

            # ─────────────────────────────────────────────────────────
            # Step 2: Create Family Files
            # ─────────────────────────────────────────────────────────
            f1_data = await create_f1_rosa_derek(db, users)
            await db.commit()

            f2_data = await create_f2_priya_liam(db, users)
            await db.commit()

            f3_data = await create_f3_angela_travis(db, users)
            await db.commit()

            f4_data = await create_f4_sofia_eduardo(db, users)
            await db.commit()

            # ─────────────────────────────────────────────────────────
            # Step 3: Create Professional Personas
            # ─────────────────────────────────────────────────────────
            p1_data = await create_p1_chen(db, users, f1_data, f3_data)
            await db.commit()

            p2_data = await create_p2_holstrom(db, users, f3_data)
            await db.commit()

            p3_data = await create_p3_williams(db, users, f4_data)
            await db.commit()

            p4_data = await create_p4_rivera(db, users, f4_data)
            await db.commit()

            # ─────────────────────────────────────────────────────────
            # Summary
            # ─────────────────────────────────────────────────────────
            print("\n" + "=" * 70)
            print("✅ QA PERSONAS SEED COMPLETE!")
            print("=" * 70)

            print("\n📋 FAMILY PAIRS:")
            print("─" * 50)
            print(f"  F-1  Rosa Mendez & Derek Holt      FF-DV001-TEST")
            print(f"       rosa.mendez.test@cg-qa.com    (Complete) TestRosa#2026")
            print(f"       derek.holt.test@cg-qa.com     (Free)     TestDerek#2026")
            print(f"       DV FLAG ACTIVE · High Conflict · 2 children")
            print()
            print(f"  F-2  Priya Sharma & Liam O'Brien   FF-COOP002-TEST")
            print(f"       priya.sharma.test@cg-qa.com   (Plus)     TestPriya#2026")
            print(f"       liam.obrien.test@cg-qa.com    (Plus)     TestLiam#2026")
            print(f"       Cooperative · Low Conflict · 1 child")
            print()
            print(f"  F-3  Angela Foster & Travis Cole    FF-ASYM003-TEST")
            print(f"       angela.foster.test@cg-qa.com  (Complete) TestAngela#2026")
            print(f"       travis.cole.test@cg-qa.com    (Free)     TestTravis#2026")
            print(f"       Asymmetric tiers · Moderate Conflict · 1 child")
            print()
            print(f"  F-4  Sofia & Eduardo Delgado        FF-CMPLX004-TEST")
            print(f"       sofia.delgado.test@cg-qa.com  (Complete) TestSofia#2026")
            print(f"       eduardo.delgado.test@cg-qa.com(Complete) TestEduardo#2026")
            print(f"       Complex · 3 children · GAL + Mediator assigned")

            print("\n📋 PROFESSIONALS:")
            print("─" * 50)
            print(f"  P-1  Marcus Chen, Esq.              Solo Attorney")
            print(f"       marcus.chen.test@cg-qa.com     TestChen#2026")
            print(f"       Cases: FF-DV001, FF-ASYM003")
            print()
            print(f"  P-2  Holstrom Block & Parke          Small Firm")
            print(f"       holstrom.test@cg-qa.com (admin) TestHBP#2026")
            print(f"       block.test@cg-qa.com (assoc)    TestHBP#2026")
            print(f"       parke.test@cg-qa.com (paralegal)TestHBP#2026")
            print(f"       Cases: FF-ASYM003")
            print()
            print(f"  P-3  Janelle Williams, LCSW          GAL")
            print(f"       janelle.williams.test@cg-qa.com TestWilliams#2026")
            print(f"       Cases: FF-CMPLX004 (restricted)")
            print()
            print(f"  P-4  Diana Rivera, J.D.              Mediator")
            print(f"       diana.rivera.test@cg-qa.com     TestRivera#2026")
            print(f"       Cases: FF-CMPLX004")

            print("\n" + "=" * 70)
            return True

        except Exception as e:
            await db.rollback()
            print(f"\n❌ Error during seeding: {e}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    result = asyncio.run(seed_qa_personas())
    sys.exit(0 if result else 1)

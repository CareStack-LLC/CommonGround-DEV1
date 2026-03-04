"""
Comprehensive test data seed for Professional Portal testing.

Creates:
- 2 complete families with parents, children, messages, agreements
- 1 law firm with multiple professionals
- Professional assignments to families
- Messages that trigger ARIA interventions
- Custody exchanges
- Intake sessions

Run with:
    cd backend
    python -m scripts.seed_professional_portal_test
"""

import asyncio
import secrets
from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.models.user import User, UserProfile
from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.message import Message, MessageThread
from app.models.agreement import Agreement, AgreementSection
from app.models.custody_exchange import CustodyExchange
from app.models.professional import (
    ProfessionalProfile,
    Firm,
    FirmMembership,
    CaseAssignment,
    ProfessionalType,
    FirmType,
    FirmRole,
    AssignmentRole,
    MembershipStatus,
    AssignmentStatus,
)
from app.models.intake import IntakeSession, IntakeStatus


# =============================================================================
# Test Data Constants
# =============================================================================

# Family 1: The Johnsons - High conflict case
FAMILY1_DATA = {
    "parent_a": {
        "email": "mike.johnson@test.com",
        "password": "TestPass123!",
        "first_name": "Michael",
        "last_name": "Johnson",
        "phone": "555-0101",
    },
    "parent_b": {
        "email": "sarah.johnson@test.com",
        "password": "TestPass123!",
        "first_name": "Sarah",
        "last_name": "Johnson",
        "phone": "555-0102",
    },
    "children": [
        {"first_name": "Emma", "last_name": "Johnson", "dob": "2018-03-15", "gender": "female"},
        {"first_name": "Liam", "last_name": "Johnson", "dob": "2020-07-22", "gender": "male"},
    ],
    "state": "CA",
    "county": "Los Angeles",
}

# Family 2: The Garcias - Medium conflict case
FAMILY2_DATA = {
    "parent_a": {
        "email": "carlos.garcia@test.com",
        "password": "TestPass123!",
        "first_name": "Carlos",
        "last_name": "Garcia",
        "phone": "555-0201",
    },
    "parent_b": {
        "email": "maria.garcia@test.com",
        "password": "TestPass123!",
        "first_name": "Maria",
        "last_name": "Garcia",
        "phone": "555-0202",
    },
    "children": [
        {"first_name": "Sofia", "last_name": "Garcia", "dob": "2016-11-08", "gender": "female"},
    ],
    "state": "CA",
    "county": "San Diego",
}

# Law Firm
FIRM_DATA = {
    "name": "Family First Law Group",
    "slug": "family-first-law",
    "firm_type": FirmType.LAW_FIRM,
    "email": "contact@familyfirstlaw.com",
    "phone": "555-1000",
    "website": "https://familyfirstlaw.com",
    "city": "Los Angeles",
    "state": "CA",
    "address_line1": "123 Justice Blvd, Suite 400",
    "zip_code": "90001",
    "is_public": True,
    "practice_areas": ["custody", "divorce", "mediation", "child_support"],
}

# Professionals
PROFESSIONALS_DATA = [
    {
        "email": "jennifer.lawson@familyfirstlaw.com",
        "password": "TestPass123!",
        "first_name": "Jennifer",
        "last_name": "Lawson",
        "professional_type": ProfessionalType.ATTORNEY,
        "license_number": "CA-123456",
        "license_state": "CA",
        "firm_role": FirmRole.OWNER,
        "practice_areas": ["custody", "divorce"],
    },
    {
        "email": "david.chen@familyfirstlaw.com",
        "password": "TestPass123!",
        "first_name": "David",
        "last_name": "Chen",
        "professional_type": ProfessionalType.ATTORNEY,
        "license_number": "CA-234567",
        "license_state": "CA",
        "firm_role": FirmRole.ATTORNEY,
        "practice_areas": ["custody", "mediation"],
    },
    {
        "email": "amy.brooks@familyfirstlaw.com",
        "password": "TestPass123!",
        "first_name": "Amy",
        "last_name": "Brooks",
        "professional_type": ProfessionalType.PARALEGAL,
        "firm_role": FirmRole.PARALEGAL,
        "practice_areas": ["custody"],
    },
]

# Messages that should trigger ARIA (high-conflict)
ARIA_TRIGGER_MESSAGES = [
    {
        "content": "You're a terrible parent and the kids hate being with you. You never do anything right!",
        "flags": ["hostility", "blame"],
    },
    {
        "content": "I don't care what you think. I'm keeping the kids this weekend whether you like it or not.",
        "flags": ["controlling", "dismissive"],
    },
    {
        "content": "You're so pathetic. Everyone knows you're just trying to manipulate the situation.",
        "flags": ["hostility", "passive_aggressive"],
    },
    {
        "content": "Whatever. I guess some people just can't be bothered to actually care about their children.",
        "flags": ["passive_aggressive", "blame"],
    },
    {
        "content": "This is ridiculous. You always do this. You're impossible to work with.",
        "flags": ["hostility", "blame"],
    },
]

# Normal messages
NORMAL_MESSAGES = [
    {"content": "Can we discuss the pickup time for Saturday?"},
    {"content": "Emma has a doctor's appointment on Tuesday at 3pm. I can take her."},
    {"content": "The school sent home a permission slip for the field trip. Should I sign it?"},
    {"content": "Liam needs new shoes. His current ones are getting too small."},
    {"content": "Thank you for being flexible with the schedule change last week."},
]


# =============================================================================
# Helper Functions
# =============================================================================

async def create_user(db: AsyncSession, data: dict) -> User:
    """Create a user with profile."""
    user_id = str(uuid4())
    user = User(
        id=user_id,
        email=data["email"],
        hashed_password=hash_password(data["password"]),
        is_active=True,
        is_verified=True,
        created_at=datetime.utcnow(),
    )
    db.add(user)

    profile = UserProfile(
        id=str(uuid4()),
        user_id=user_id,
        first_name=data["first_name"],
        last_name=data["last_name"],
        phone=data.get("phone"),
        created_at=datetime.utcnow(),
    )
    db.add(profile)

    return user


async def create_family(db: AsyncSession, data: dict, parent_a: User, parent_b: User) -> FamilyFile:
    """Create a family file with children."""
    family_file = FamilyFile(
        id=str(uuid4()),
        family_file_number=f"FF-{secrets.token_hex(4).upper()}",
        title=f"{data['parent_a']['last_name']} Family",
        parent_a_id=parent_a.id,
        parent_b_id=parent_b.id,
        parent_a_role="parent_a",
        parent_b_role="parent_b",
        state=data["state"],
        county=data.get("county"),
        aria_enabled=True,
        is_complete=True,
        created_at=datetime.utcnow(),
    )
    db.add(family_file)

    # Add children
    for child_data in data["children"]:
        child = Child(
            id=str(uuid4()),
            family_file_id=family_file.id,
            first_name=child_data["first_name"],
            last_name=child_data["last_name"],
            date_of_birth=datetime.strptime(child_data["dob"], "%Y-%m-%d").date(),
            gender=child_data.get("gender"),
            status="active",
            created_at=datetime.utcnow(),
        )
        db.add(child)

    return family_file


async def create_messages(
    db: AsyncSession,
    family_file: FamilyFile,
    sender: User,
    recipient: User,
    messages: list[dict],
    include_aria_flags: bool = False,
) -> list[Message]:
    """Create messages in a family file."""
    # Create thread
    thread = MessageThread(
        id=str(uuid4()),
        family_file_id=family_file.id,
        subject="Co-parenting Communication",
        created_at=datetime.utcnow(),
    )
    db.add(thread)

    created_messages = []
    base_time = datetime.utcnow() - timedelta(days=7)

    for i, msg_data in enumerate(messages):
        # Alternate sender/recipient
        is_sender_a = i % 2 == 0
        msg_sender = sender if is_sender_a else recipient
        msg_recipient = recipient if is_sender_a else sender

        message = Message(
            id=str(uuid4()),
            thread_id=thread.id,
            family_file_id=family_file.id,
            sender_id=msg_sender.id,
            recipient_id=msg_recipient.id,
            content=msg_data["content"],
            is_read=True,
            created_at=base_time + timedelta(hours=i * 2),
        )

        # Add ARIA analysis if flagged
        if include_aria_flags and "flags" in msg_data:
            message.aria_analyzed = True
            message.aria_score = 0.75  # High toxicity
            message.aria_flags = msg_data["flags"]
            message.aria_suggested_rewrite = f"[Suggested rewrite for: {msg_data['content'][:50]}...]"

        db.add(message)
        created_messages.append(message)

    return created_messages


async def create_firm_and_professionals(db: AsyncSession) -> tuple[Firm, list[tuple[User, ProfessionalProfile]]]:
    """Create firm with professionals."""
    # Create firm
    firm = Firm(
        id=str(uuid4()),
        name=FIRM_DATA["name"],
        slug=FIRM_DATA["slug"],
        firm_type=FIRM_DATA["firm_type"],
        email=FIRM_DATA["email"],
        phone=FIRM_DATA["phone"],
        website=FIRM_DATA["website"],
        city=FIRM_DATA["city"],
        state=FIRM_DATA["state"],
        address_line1=FIRM_DATA["address_line1"],
        zip_code=FIRM_DATA["zip_code"],
        is_public=FIRM_DATA["is_public"],
        is_active=True,
        settings={"practice_areas": FIRM_DATA["practice_areas"]},
        created_at=datetime.utcnow(),
    )
    db.add(firm)

    professionals = []

    for prof_data in PROFESSIONALS_DATA:
        # Create user
        user = await create_user(db, prof_data)

        # Create professional profile
        profile = ProfessionalProfile(
            id=str(uuid4()),
            user_id=user.id,
            professional_type=prof_data["professional_type"],
            license_number=prof_data.get("license_number"),
            license_state=prof_data.get("license_state"),
            license_verified=prof_data.get("license_number") is not None,
            practice_areas=prof_data.get("practice_areas", []),
            is_active=True,
            onboarded_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.add(profile)

        # Create firm membership
        membership = FirmMembership(
            id=str(uuid4()),
            professional_id=profile.id,
            firm_id=firm.id,
            role=prof_data["firm_role"],
            status=MembershipStatus.ACTIVE,
            joined_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.add(membership)

        professionals.append((user, profile))

    # Set firm creator
    firm.created_by = professionals[0][0].id

    return firm, professionals


async def create_case_assignment(
    db: AsyncSession,
    professional: ProfessionalProfile,
    firm: Firm,
    family_file: FamilyFile,
    role: AssignmentRole = AssignmentRole.LEAD_ATTORNEY,
    representing: str = "both",
) -> CaseAssignment:
    """Create a case assignment for a professional."""
    assignment = CaseAssignment(
        id=str(uuid4()),
        professional_id=professional.id,
        firm_id=firm.id,
        family_file_id=family_file.id,
        assignment_role=role,
        representing=representing,
        access_scopes=["agreement", "schedule", "messages", "financials", "compliance", "interventions"],
        can_control_aria=True,
        can_message_client=True,
        status=AssignmentStatus.ACTIVE,
        assigned_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(assignment)
    return assignment


async def create_agreement(db: AsyncSession, family_file: FamilyFile) -> Agreement:
    """Create a draft agreement for a family file."""
    agreement = Agreement(
        id=str(uuid4()),
        family_file_id=family_file.id,
        title="Custody Agreement",
        agreement_type="custody",
        status="draft",
        current_section=1,
        version=1,
        created_at=datetime.utcnow(),
    )
    db.add(agreement)

    # Add some sections
    sections = [
        {"number": 1, "name": "parent_info", "data": {"completed": True}},
        {"number": 2, "name": "children", "data": {"completed": True}},
        {"number": 3, "name": "legal_custody", "data": {"custody_type": "joint", "completed": False}},
    ]

    for section in sections:
        s = AgreementSection(
            id=str(uuid4()),
            agreement_id=agreement.id,
            section_number=section["number"],
            section_name=section["name"],
            data=section["data"],
            created_at=datetime.utcnow(),
        )
        db.add(s)

    return agreement


async def create_intake_session(
    db: AsyncSession,
    professional: ProfessionalProfile,
    firm: Firm,
    client_name: str,
    client_email: str,
) -> IntakeSession:
    """Create an intake session."""
    session = IntakeSession(
        id=str(uuid4()),
        case_id=str(uuid4()),
        parent_id=str(uuid4()),
        professional_id=professional.id,
        firm_id=firm.id,
        status=IntakeStatus.PENDING.value,
        target_forms=["FL-311", "FL-300"],
        aria_provider="claude",
        access_token=secrets.token_urlsafe(32),
        access_link_expires_at=datetime.utcnow() + timedelta(days=7),
        messages=[
            {
                "role": "system",
                "content": f"Intake session for {client_name}. Email: {client_email}.",
            }
        ],
        created_at=datetime.utcnow(),
    )
    db.add(session)
    return session


# =============================================================================
# Main Seed Function
# =============================================================================

async def seed_data():
    """Seed comprehensive test data."""
    print("=" * 60)
    print("SEEDING PROFESSIONAL PORTAL TEST DATA")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        try:
            # Check for existing data
            existing = await db.execute(
                select(User).where(User.email == FAMILY1_DATA["parent_a"]["email"])
            )
            if existing.scalar_one_or_none():
                print("\n⚠️  Test data already exists. Skipping seed.")
                print("   To re-seed, delete existing test users first.")
                return

            # =================================================================
            # Create Firm and Professionals
            # =================================================================
            print("\n📁 Creating law firm and professionals...")
            firm, professionals = await create_firm_and_professionals(db)
            print(f"   ✓ Created firm: {firm.name}")
            for user, profile in professionals:
                print(f"   ✓ Created professional: {user.email} ({profile.professional_type.value})")

            # =================================================================
            # Create Family 1 (High Conflict)
            # =================================================================
            print("\n👨‍👩‍👧‍👦 Creating Family 1 (Johnson - High Conflict)...")
            parent_a1 = await create_user(db, FAMILY1_DATA["parent_a"])
            parent_b1 = await create_user(db, FAMILY1_DATA["parent_b"])
            family1 = await create_family(db, FAMILY1_DATA, parent_a1, parent_b1)
            print(f"   ✓ Created family file: {family1.family_file_number}")
            print(f"   ✓ Parent A: {FAMILY1_DATA['parent_a']['email']}")
            print(f"   ✓ Parent B: {FAMILY1_DATA['parent_b']['email']}")

            # Create messages with ARIA triggers
            print("   📧 Creating messages (with ARIA triggers)...")
            await create_messages(db, family1, parent_a1, parent_b1, ARIA_TRIGGER_MESSAGES, include_aria_flags=True)
            await create_messages(db, family1, parent_a1, parent_b1, NORMAL_MESSAGES)
            print(f"   ✓ Created {len(ARIA_TRIGGER_MESSAGES) + len(NORMAL_MESSAGES)} messages")

            # Create agreement
            agreement1 = await create_agreement(db, family1)
            print(f"   ✓ Created draft agreement")

            # Assign lead attorney
            lead_attorney = professionals[0]  # Jennifer Lawson
            assignment1 = await create_case_assignment(
                db, lead_attorney[1], firm, family1,
                AssignmentRole.LEAD_ATTORNEY, "both"
            )
            print(f"   ✓ Assigned {lead_attorney[0].email} as lead attorney")

            # =================================================================
            # Create Family 2 (Medium Conflict)
            # =================================================================
            print("\n👨‍👩‍👧 Creating Family 2 (Garcia - Medium Conflict)...")
            parent_a2 = await create_user(db, FAMILY2_DATA["parent_a"])
            parent_b2 = await create_user(db, FAMILY2_DATA["parent_b"])
            family2 = await create_family(db, FAMILY2_DATA, parent_a2, parent_b2)
            print(f"   ✓ Created family file: {family2.family_file_number}")
            print(f"   ✓ Parent A: {FAMILY2_DATA['parent_a']['email']}")
            print(f"   ✓ Parent B: {FAMILY2_DATA['parent_b']['email']}")

            # Create normal messages only
            await create_messages(db, family2, parent_a2, parent_b2, NORMAL_MESSAGES)
            print(f"   ✓ Created {len(NORMAL_MESSAGES)} messages")

            # Create agreement
            agreement2 = await create_agreement(db, family2)
            print(f"   ✓ Created draft agreement")

            # Assign associate attorney
            assoc_attorney = professionals[1]  # David Chen
            assignment2 = await create_case_assignment(
                db, assoc_attorney[1], firm, family2,
                AssignmentRole.ASSOCIATE, "parent_a"
            )
            print(f"   ✓ Assigned {assoc_attorney[0].email} as associate attorney")

            # =================================================================
            # Create Intake Session
            # =================================================================
            print("\n📝 Creating intake session...")
            intake = await create_intake_session(
                db, professionals[0][1], firm,
                "Robert Williams", "robert.williams@example.com"
            )
            print(f"   ✓ Created pending intake session")

            # =================================================================
            # Commit all changes
            # =================================================================
            await db.commit()

            # =================================================================
            # Summary
            # =================================================================
            print("\n" + "=" * 60)
            print("✅ SEED COMPLETE!")
            print("=" * 60)
            print("\n📋 TEST ACCOUNTS:")
            print("-" * 60)
            print("\n🏢 PROFESSIONALS (Password: TestPass123!)")
            for user, profile in professionals:
                print(f"   • {user.email} - {profile.professional_type.value}")

            print("\n👨‍👩‍👧‍👦 FAMILY 1 - Johnson (High Conflict)")
            print(f"   • Parent A: {FAMILY1_DATA['parent_a']['email']}")
            print(f"   • Parent B: {FAMILY1_DATA['parent_b']['email']}")
            print(f"   • Family File: {family1.family_file_number}")
            print(f"   • Has ARIA-flagged messages: Yes")

            print("\n👨‍👩‍👧 FAMILY 2 - Garcia (Medium Conflict)")
            print(f"   • Parent A: {FAMILY2_DATA['parent_a']['email']}")
            print(f"   • Parent B: {FAMILY2_DATA['parent_b']['email']}")
            print(f"   • Family File: {family2.family_file_number}")

            print("\n🏢 LAW FIRM")
            print(f"   • Name: {firm.name}")
            print(f"   • Slug: {firm.slug}")
            print(f"   • Directory URL: /find-professionals (search for 'Family First')")

            print("\n" + "-" * 60)
            print("🔐 All passwords: TestPass123!")
            print("-" * 60)

        except Exception as e:
            await db.rollback()
            print(f"\n❌ Error seeding data: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_data())

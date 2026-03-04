"""
Seed script to reset data and create test families.

This script:
1. Deletes ALL data except user accounts (users, user_profiles, court_professionals)
2. Creates new Family Files with proper relationships
3. Creates test children with dual approval
4. Creates active SharedCare Agreements

Test Data Created:
- Mike & Tasha Johnson Family File with one SharedCare Agreement
- Thomas & Grace Miller Family File with two SharedCare Agreements (school + summer)

Run with: python -m scripts.seed_test_data
"""

import asyncio
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
import uuid

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.family_file import FamilyFile, QuickAccord, CourtCustodyCase
from app.models.child import Child, ChildProfileStatus
from app.models.agreement import Agreement, AgreementSection, AgreementVersion, AgreementConversation
from app.models.case import Case, CaseParticipant
from app.models.message import Message, MessageFlag, MessageThread
from app.models.schedule import ScheduleEvent, ExchangeCheckIn
from app.models.my_time_collection import MyTimeCollection
from app.models.time_block import TimeBlock
from app.models.event_attendance import EventAttendance
from app.models.payment import Payment, ExpenseRequest, PaymentLedger
from app.models.clearfund import Obligation, ObligationFunding, Attestation, VerificationArtifact, VirtualCardAuthorization
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.legal import LegalAccess, CourtExport
from app.models.audit import AuditLog, EventLog
from app.models.court import CourtAccessGrant, CourtAccessLog, CourtCaseSettings, CourtEvent, CourtMessage, InvestigationReport
from app.models.export import CaseExport, ExportSection, RedactionRule
from app.models.custody_order import CustodyOrder, CustodyOrderChild, VisitationSchedule, SupervisedVisitation, ExchangeRules, HolidaySchedule, AgreementUpload
from app.models.court_form import CourtFormSubmission, CaseFormRequirement, ProofOfService, CourtHearing, RespondentAccessCode
from app.models.cubbie import CubbieItem, CubbieExchangeItem, ChildPhoto
from app.models.intake import IntakeSession, IntakeQuestion, IntakeExtraction


# Standard 18 sections for SharedCare Agreement
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


async def clear_all_data(session: AsyncSession):
    """Delete all data except users, user_profiles, and court_professionals."""
    print("\n🗑️  Clearing existing data...")

    # Use TRUNCATE CASCADE to handle foreign key constraints
    # This is much more efficient and handles circular dependencies
    tables_to_clear = [
        # Order matters less with CASCADE, but group logically
        "intake_extractions",
        "intake_questions",
        "intake_sessions",
        "cubbie_exchange_items",
        "cubbie_items",
        "child_photos",
        "respondent_access_codes",
        "court_form_submissions",
        "court_hearings",
        "proof_of_service",
        "case_form_requirements",
        "agreement_uploads",
        "holiday_schedules",
        "exchange_rules",
        "supervised_visitations",
        "visitation_schedules",
        "custody_order_children",
        "custody_orders",
        "redaction_rules",
        "export_sections",
        "case_exports",
        "investigation_reports",
        "court_messages",
        "court_events",
        "court_case_settings",
        "court_access_logs",
        "court_access_grants",
        "event_logs",
        "audit_logs",
        "court_exports",
        "legal_access",
        "virtual_card_authorizations",
        "verification_artifacts",
        "attestations",
        "obligation_fundings",
        "obligations",
        "payment_ledgers",
        "expense_requests",
        "payments",
        "event_attendance",
        "time_blocks",
        "my_time_collections",
        "exchange_check_ins",
        "custody_day_records",
        "custody_exchange_instances",
        "custody_exchanges",
        "schedule_events",
        "message_flags",
        "messages",
        "message_threads",
        "agreement_conversations",
        "agreement_sections",
        "agreement_versions",
        "agreements",
        "quick_accords",
        "court_custody_cases",
        "children",
        "case_participants",
        "cases",
        "family_files",
    ]

    # Use raw SQL with CASCADE to handle foreign key constraints
    for table_name in tables_to_clear:
        try:
            await session.execute(text(f"TRUNCATE TABLE {table_name} CASCADE"))
            print(f"   ✓ Truncated {table_name}")
        except Exception as e:
            # Table might not exist or other issue, try delete
            try:
                await session.rollback()
                await session.execute(text(f"DELETE FROM {table_name}"))
                print(f"   ✓ Deleted from {table_name}")
            except Exception as e2:
                # Table might not exist, skip
                await session.rollback()
                print(f"   ⚠️  Skipping {table_name}: {str(e2)[:50]}")

    await session.commit()
    print("   ✅ Data cleared successfully")


async def get_users(session: AsyncSession) -> dict:
    """Get existing test users by email."""
    users = {}

    # Find Mike, Tasha, Thomas, Grace
    # Map from logical name to actual email patterns
    user_mappings = {
        "mike": ["mike@tesst.com", "mike@example.com", "mike@test.com"],
        "tasha": ["tasha@tesst.com", "tasha@example.com", "tasha@test.com"],
        "thomas": ["thomas.wilform@gmail.com", "thomas@example.com", "thomas@test.com"],
        "grace": ["grace.jones@test.com", "grace@example.com", "grace@test.com"],
    }

    for logical_name, email_options in user_mappings.items():
        for email in email_options:
            result = await session.execute(
                select(User).where(User.email == email)
            )
            user = result.scalar_one_or_none()
            if user:
                users[logical_name] = user
                print(f"   ✓ Found user: {user.first_name} {user.last_name} ({email})")
                break
        else:
            print(f"   ⚠️  User not found: {logical_name} (tried: {', '.join(email_options)})")

    return users


async def create_johnson_family(session: AsyncSession, mike: User, tasha: User) -> FamilyFile:
    """Create Mike & Tasha Johnson Family File with one SharedCare Agreement."""
    print("\n👨‍👩‍👧‍👦 Creating Johnson Family...")

    # Create Family File
    family_file_id = str(uuid.uuid4())
    family_file = FamilyFile(
        id=family_file_id,
        family_file_number="FF-JOHNS1",
        title="Johnson Family",
        created_by=mike.id,
        parent_a_id=mike.id,
        parent_a_role="father",
        parent_b_id=tasha.id,
        parent_b_role="mother",
        parent_b_email=tasha.email,
        parent_b_invited_at=datetime.utcnow() - timedelta(days=30),
        parent_b_joined_at=datetime.utcnow() - timedelta(days=29),
        status="active",
        conflict_level="low",
        state="CA",
        county="Los Angeles",
        aria_enabled=True,
        require_joint_approval=True,
    )
    session.add(family_file)
    print(f"   ✓ Created Family File: {family_file.title} ({family_file.family_file_number})")

    # Create Children
    emma = Child(
        id=str(uuid.uuid4()),
        family_file_id=family_file_id,
        first_name="Emma",
        last_name="Johnson",
        date_of_birth=date(2018, 3, 15),
        gender="female",
        status=ChildProfileStatus.ACTIVE.value,
        created_by=mike.id,
        approved_by_a=mike.id,
        approved_by_b=tasha.id,
        approved_at_a=datetime.utcnow() - timedelta(days=28),
        approved_at_b=datetime.utcnow() - timedelta(days=28),
        school_name="Sunshine Elementary",
        grade_level="2nd",
        allergies="Peanuts",
        pediatrician_name="Dr. Sarah Kim",
        pediatrician_phone="(310) 555-0101",
    )
    session.add(emma)
    print(f"   ✓ Created child: Emma Johnson (age 8)")

    liam = Child(
        id=str(uuid.uuid4()),
        family_file_id=family_file_id,
        first_name="Liam",
        last_name="Johnson",
        date_of_birth=date(2021, 7, 22),
        gender="male",
        status=ChildProfileStatus.ACTIVE.value,
        created_by=tasha.id,
        approved_by_a=mike.id,
        approved_by_b=tasha.id,
        approved_at_a=datetime.utcnow() - timedelta(days=28),
        approved_at_b=datetime.utcnow() - timedelta(days=28),
        school_name="Little Stars Preschool",
        grade_level="Pre-K",
        pediatrician_name="Dr. Sarah Kim",
        pediatrician_phone="(310) 555-0101",
    )
    session.add(liam)
    print(f"   ✓ Created child: Liam Johnson (age 5)")

    # Create SharedCare Agreement
    agreement_id = str(uuid.uuid4())
    agreement = Agreement(
        id=agreement_id,
        family_file_id=family_file_id,
        agreement_number="SCA-JOHNS1",
        title="Johnson Family SharedCare Agreement",
        agreement_type="shared_care",
        version=1,
        status="active",
        petitioner_approved=True,
        petitioner_approved_at=datetime.utcnow() - timedelta(days=25),
        respondent_approved=True,
        respondent_approved_at=datetime.utcnow() - timedelta(days=25),
        effective_date=datetime.utcnow() - timedelta(days=24),
        rules={
            "custody_type": "joint_legal_joint_physical",
            "primary_residence": "mother",
            "exchange_day": "friday",
            "exchange_time": "18:00",
            "exchange_location": "children's school",
            "holiday_rotation": True,
        }
    )
    session.add(agreement)
    print(f"   ✓ Created SharedCare Agreement: {agreement.agreement_number}")

    # Create Agreement Sections
    for i, section_template in enumerate(SHARED_CARE_SECTIONS):
        section = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=agreement_id,
            section_number=section_template["number"],
            section_title=section_template["title"],
            section_type=section_template["type"],
            content=f"[Content for {section_template['title']} section - to be filled by ARIA or manually]",
            display_order=i,
            is_required=section_template["required"],
            is_completed=True,
        )
        session.add(section)
    print(f"   ✓ Created {len(SHARED_CARE_SECTIONS)} agreement sections")

    await session.flush()
    return family_file


async def create_miller_family(session: AsyncSession, thomas: User, grace: User) -> FamilyFile:
    """Create Thomas & Grace Miller Family File with two SharedCare Agreements."""
    print("\n👨‍👩‍👧‍👦 Creating Miller Family...")

    # Create Family File
    family_file_id = str(uuid.uuid4())
    family_file = FamilyFile(
        id=family_file_id,
        family_file_number="FF-MILLE1",
        title="Miller Family",
        created_by=thomas.id,
        parent_a_id=thomas.id,
        parent_a_role="father",
        parent_b_id=grace.id,
        parent_b_role="mother",
        parent_b_email=grace.email,
        parent_b_invited_at=datetime.utcnow() - timedelta(days=60),
        parent_b_joined_at=datetime.utcnow() - timedelta(days=59),
        status="active",
        conflict_level="low",
        state="CA",
        county="Orange",
        aria_enabled=True,
        require_joint_approval=True,
    )
    session.add(family_file)
    print(f"   ✓ Created Family File: {family_file.title} ({family_file.family_file_number})")

    # Create Children
    sophie = Child(
        id=str(uuid.uuid4()),
        family_file_id=family_file_id,
        first_name="Sophie",
        last_name="Miller",
        date_of_birth=date(2016, 5, 8),
        gender="female",
        status=ChildProfileStatus.ACTIVE.value,
        created_by=thomas.id,
        approved_by_a=thomas.id,
        approved_by_b=grace.id,
        approved_at_a=datetime.utcnow() - timedelta(days=58),
        approved_at_b=datetime.utcnow() - timedelta(days=58),
        school_name="Orange Grove Elementary",
        grade_level="4th",
        pediatrician_name="Dr. Michael Chen",
        pediatrician_phone="(949) 555-0202",
        favorite_activities="Soccer, reading, art",
    )
    session.add(sophie)
    print(f"   ✓ Created child: Sophie Miller (age 10)")

    oliver = Child(
        id=str(uuid.uuid4()),
        family_file_id=family_file_id,
        first_name="Oliver",
        last_name="Miller",
        date_of_birth=date(2019, 11, 3),
        gender="male",
        status=ChildProfileStatus.ACTIVE.value,
        created_by=grace.id,
        approved_by_a=thomas.id,
        approved_by_b=grace.id,
        approved_at_a=datetime.utcnow() - timedelta(days=58),
        approved_at_b=datetime.utcnow() - timedelta(days=58),
        school_name="Bright Futures Preschool",
        grade_level="Pre-K",
        pediatrician_name="Dr. Michael Chen",
        pediatrician_phone="(949) 555-0202",
        allergies="Dairy",
        has_special_needs=False,
    )
    session.add(oliver)
    print(f"   ✓ Created child: Oliver Miller (age 7)")

    # Create SharedCare Agreement #1: School Year Schedule
    agreement1_id = str(uuid.uuid4())
    agreement1 = Agreement(
        id=agreement1_id,
        family_file_id=family_file_id,
        agreement_number="SCA-MILLE1",
        title="Miller Family School Year Schedule",
        agreement_type="shared_care",
        version=1,
        status="active",
        petitioner_approved=True,
        petitioner_approved_at=datetime.utcnow() - timedelta(days=55),
        respondent_approved=True,
        respondent_approved_at=datetime.utcnow() - timedelta(days=55),
        effective_date=datetime.utcnow() - timedelta(days=54),
        expiration_date=datetime(2026, 6, 15),  # End of school year
        rules={
            "custody_type": "joint_legal_joint_physical",
            "schedule_type": "school_year",
            "week_rotation": "2-2-3",
            "exchange_day": "monday",
            "exchange_time": "after_school",
            "exchange_location": "school pickup",
            "holiday_rotation": True,
        }
    )
    session.add(agreement1)
    print(f"   ✓ Created SharedCare Agreement: {agreement1.agreement_number} (School Year)")

    # Create sections for Agreement 1
    for i, section_template in enumerate(SHARED_CARE_SECTIONS):
        section = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=agreement1_id,
            section_number=section_template["number"],
            section_title=section_template["title"],
            section_type=section_template["type"],
            content=f"[School Year schedule content for {section_template['title']}]",
            display_order=i,
            is_required=section_template["required"],
            is_completed=True,
        )
        session.add(section)

    # Create SharedCare Agreement #2: Summer Schedule
    agreement2_id = str(uuid.uuid4())
    agreement2 = Agreement(
        id=agreement2_id,
        family_file_id=family_file_id,
        agreement_number="SCA-MILLE2",
        title="Miller Family Summer Schedule",
        agreement_type="shared_care",
        version=1,
        status="active",
        petitioner_approved=True,
        petitioner_approved_at=datetime.utcnow() - timedelta(days=50),
        respondent_approved=True,
        respondent_approved_at=datetime.utcnow() - timedelta(days=50),
        effective_date=datetime(2026, 6, 16),  # Start of summer
        expiration_date=datetime(2026, 8, 31),  # End of summer
        rules={
            "custody_type": "joint_legal_joint_physical",
            "schedule_type": "summer",
            "week_rotation": "alternating_weeks",
            "exchange_day": "sunday",
            "exchange_time": "18:00",
            "exchange_location": "midway point",
            "vacation_weeks": {
                "thomas": 2,
                "grace": 2,
            }
        }
    )
    session.add(agreement2)
    print(f"   ✓ Created SharedCare Agreement: {agreement2.agreement_number} (Summer)")

    # Create sections for Agreement 2
    for i, section_template in enumerate(SHARED_CARE_SECTIONS):
        section = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=agreement2_id,
            section_number=section_template["number"],
            section_title=section_template["title"],
            section_type=section_template["type"],
            content=f"[Summer schedule content for {section_template['title']}]",
            display_order=i,
            is_required=section_template["required"],
            is_completed=True,
        )
        session.add(section)

    print(f"   ✓ Created {len(SHARED_CARE_SECTIONS) * 2} agreement sections total")

    await session.flush()
    return family_file


async def create_custody_data(
    session: AsyncSession,
    family_file: FamilyFile,
    parent_a: User,
    parent_b: User,
    children: list
):
    """
    Create custody exchanges, instances, and day records for testing reports.

    Creates 30 days of custody data with realistic patterns.
    """
    from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
    from app.models.custody_day_record import CustodyDayRecord, DeterminationMethod

    print(f"\n📊 Creating custody data for {family_file.title}...")

    # Get children for this family file
    result = await session.execute(
        select(Child).where(Child.family_file_id == family_file.id)
    )
    children = result.scalars().all()

    if not children:
        print("   ⚠️ No children found, skipping custody data")
        return

    # Create a weekly custody exchange schedule
    exchange_id = str(uuid.uuid4())
    exchange = CustodyExchange(
        id=exchange_id,
        family_file_id=family_file.id,
        from_parent_id=str(parent_a.id),
        to_parent_id=str(parent_b.id),
        child_ids=[str(c.id) for c in children],
        exchange_type="in_person",
        recurrence_rule="weekly",
        location_name="Sunshine Elementary School",
        location_address="123 School Lane, Los Angeles, CA 90210",
        location_lat=34.0522,
        location_lng=-118.2437,
        scheduled_day_of_week=4,  # Friday
        scheduled_time="18:00",
        status="active",
    )
    session.add(exchange)
    print(f"   ✓ Created weekly custody exchange schedule")

    # Create exchange instances and custody day records for the past 30 days
    today = date.today()
    instances_created = 0
    records_created = 0

    # Alternating custody pattern: Parent A gets Mon-Thu, Parent B gets Fri-Sun
    for days_ago in range(30, 0, -1):
        record_date = today - timedelta(days=days_ago)
        day_of_week = record_date.weekday()  # 0=Monday, 4=Friday, 6=Sunday

        # Determine custodial parent based on day of week
        # Parent A: Monday-Thursday (0-3)
        # Parent B: Friday-Sunday (4-6)
        if day_of_week < 4:
            custodial_parent_id = str(parent_a.id)
        else:
            custodial_parent_id = str(parent_b.id)

        # Create custody day records for each child
        for child in children:
            record = CustodyDayRecord(
                id=str(uuid.uuid4()),
                family_file_id=family_file.id,
                child_id=str(child.id),
                record_date=record_date,
                custodial_parent_id=custodial_parent_id,
                determination_method=DeterminationMethod.SCHEDULED.value,
                confidence_score=80,
            )
            session.add(record)
            records_created += 1

        # Create exchange instances on Fridays (custody transfer day)
        if day_of_week == 4:  # Friday
            instance_id = str(uuid.uuid4())

            # Alternate between different statuses for realism
            week_number = days_ago // 7
            if week_number % 5 == 0:
                instance_status = "missed"
                from_checked = False
                to_checked = False
            elif week_number % 4 == 0:
                instance_status = "cancelled"
                from_checked = False
                to_checked = False
            else:
                instance_status = "completed"
                from_checked = True
                to_checked = True

            instance = CustodyExchangeInstance(
                id=instance_id,
                exchange_id=exchange_id,
                scheduled_date=record_date,
                scheduled_time=datetime.combine(record_date, datetime.strptime("18:00", "%H:%M").time()),
                status=instance_status,
                from_parent_checked_in=from_checked,
                to_parent_checked_in=to_checked,
                from_parent_check_in_time=datetime.combine(record_date, datetime.strptime("17:55", "%H:%M").time()) if from_checked else None,
                to_parent_check_in_time=datetime.combine(record_date, datetime.strptime("18:02", "%H:%M").time()) if to_checked else None,
            )
            session.add(instance)
            instances_created += 1

    await session.flush()
    print(f"   ✓ Created {instances_created} exchange instances (4 weeks)")
    print(f"   ✓ Created {records_created} custody day records (30 days × {len(children)} children)")


async def create_my_time_collections(session: AsyncSession, family_files: list[tuple[FamilyFile, User, User]]):
    """
    Skip My Time collections for now - they depend on Cases.
    TODO: Update MyTimeCollection model to support family_file_id
    """
    print("\n📅 Skipping My Time Collections (need model update for family_file_id)")
    # MyTimeCollection currently uses case_id, not family_file_id
    # This is a future task to update the model
    pass


async def seed_test_data():
    """Main seeding function."""
    print("\n" + "="*70)
    print("🌱 CommonGround Test Data Seed Script")
    print("="*70)

    async with AsyncSessionLocal() as session:
        try:
            # Step 1: Clear all existing data
            await clear_all_data(session)

            # Step 2: Get existing users
            print("\n👤 Finding existing users...")
            users = await get_users(session)

            # Verify we have all required users
            required_users = ["mike", "tasha", "thomas", "grace"]
            missing = [name for name in required_users if name not in users]

            if missing:
                print(f"\n❌ Missing required users: {', '.join(missing)}")
                print("   Please ensure these users exist in the database before running this script.")
                return False

            mike = users["mike"]
            tasha = users["tasha"]
            thomas = users["thomas"]
            grace = users["grace"]

            # Step 3: Create Johnson Family
            johnson_family = await create_johnson_family(session, mike, tasha)

            # Step 4: Create Miller Family
            miller_family = await create_miller_family(session, thomas, grace)

            # Step 5: Create custody data for reports
            await create_custody_data(session, johnson_family, mike, tasha, [])
            await create_custody_data(session, miller_family, thomas, grace, [])

            # Step 6: Create My Time Collections
            await create_my_time_collections(session, [
                (johnson_family, mike, tasha),
                (miller_family, thomas, grace),
            ])

            # Commit all changes
            await session.commit()

            print("\n" + "="*70)
            print("✅ Seed complete!")
            print("="*70)
            print("\n📊 Summary:")
            print("   • 2 Family Files created")
            print("   • 4 Children created (Emma, Liam, Sophie, Oliver)")
            print("   • 3 SharedCare Agreements created")
            print("   • 54 Agreement Sections created")
            print("   • 2 Custody Exchange schedules created")
            print("   • ~8 Exchange Instances created (4 weeks × 2 families)")
            print("   • ~120 Custody Day Records created (30 days × 4 children)")
            print("\n🔑 Test Accounts:")
            print(f"   • Mike Johnson ({mike.email}) - Parent A in Johnson Family")
            print(f"   • Tasha Johnson ({tasha.email}) - Parent B in Johnson Family")
            print(f"   • Thomas Miller ({thomas.email}) - Parent A in Miller Family")
            print(f"   • Grace Miller ({grace.email}) - Parent B in Miller Family")
            print("="*70 + "\n")

            return True

        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error during seeding: {e}")
            import traceback
            traceback.print_exc()
            return False


async def verify_data():
    """Verify the seeded data."""
    print("\n📊 Verifying seeded data...")

    async with AsyncSessionLocal() as session:
        # Count Family Files
        result = await session.execute(select(FamilyFile))
        family_files = result.scalars().all()
        print(f"   Family Files: {len(family_files)}")

        # Count Children
        result = await session.execute(select(Child))
        children = result.scalars().all()
        print(f"   Children: {len(children)}")

        # Count Agreements
        result = await session.execute(select(Agreement))
        agreements = result.scalars().all()
        print(f"   SharedCare Agreements: {len(agreements)}")

        # Count Agreement Sections
        result = await session.execute(select(AgreementSection))
        sections = result.scalars().all()
        print(f"   Agreement Sections: {len(sections)}")

        # Count My Time Collections
        result = await session.execute(select(MyTimeCollection))
        collections = result.scalars().all()
        print(f"   My Time Collections: {len(collections)}")

        # Show family file details
        print("\n📋 Family File Details:")
        for ff in family_files:
            result = await session.execute(
                select(Child).where(Child.family_file_id == ff.id)
            )
            ff_children = result.scalars().all()

            result = await session.execute(
                select(Agreement).where(Agreement.family_file_id == ff.id)
            )
            ff_agreements = result.scalars().all()

            print(f"\n   {ff.title} ({ff.family_file_number}):")
            print(f"      Status: {ff.status}")
            print(f"      Children: {', '.join([c.first_name for c in ff_children])}")
            print(f"      Agreements: {', '.join([a.agreement_number for a in ff_agreements])}")


async def main():
    """Main entry point."""
    success = await seed_test_data()

    if success:
        await verify_data()

    return success


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)

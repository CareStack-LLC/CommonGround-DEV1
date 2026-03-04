#!/usr/bin/env python3
"""
Seed Chen-Miller Demo Family (Smart Custody V3 Verification)

This script generates a 12-month narrative for Sarah Chen and David Miller:
- Q1: Chaos ( Verbal only, high conflict)
- Q2: Implementation (QuickAccord, 2-2-3 Schedule)
- Q3: Escalation (Blocked messages, Financial disputes)
- Q4: Resolution (Compliance via Analytics)

Usage:
    python3 backend/scripts/seed_chen_miller_demo.py
"""

import sys
import asyncio
import hashlib
import os
from pathlib import Path
from datetime import datetime, timedelta, date, time as dt_time
import random
import uuid
import json

# Add parent directory for imports
sys.path.append(str(Path(__file__).parent.parent))

from supabase import create_client, Client

from sqlalchemy import select, delete, and_
from app.core.database import AsyncSessionLocal, init_db
from app.models.user import User
from app.models.family_file import FamilyFile, QuickAccord, generate_quick_accord_number
from app.models.case import Case
from app.models.child import Child
from app.models.cubbie import CubbieItem, ItemCategory, ItemLocation
from app.models.agreement import Agreement, AgreementSection, ComplianceLog
from app.models.message import Message, MessageFlag
from app.models.message_attachment import MessageAttachment
from app.models.schedule import ScheduleEvent
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.clearfund import Obligation, ObligationFunding, Attestation
from app.models.event_attendance import EventAttendance
from app.core.security import hash_password

# --- DATA CONFIGURATION ---
DEMO_FAMILY_ID = "chen-miller-demo-v3" # Deterministic ID
DEMO_CASE_ID = "la-county-2026-cm"

LOCATIONS = {
    "mom": {"addr": "707 E Ocean Blvd, Long Beach, CA 90802", "lat": 33.7667, "lng": -118.1855},
    "dad": {"addr": "889 Francisco St, Los Angeles, CA 90017", "lat": 34.0450, "lng": -118.2610},
    "starbucks": {"addr": "203 Pine Ave, Long Beach, CA", "lat": 33.7689, "lng": -118.1920}
}

START_DATE = datetime.utcnow() - timedelta(days=365) # 1 year ago

class StoryDirector:
    def __init__(self, db):
        self.db = db
        self.mom = None
        self.dad = None
        self.family_file = None
        self.agreement = None
        self.exchange_templates = {}

    async def nuke_all_data(self):
        print("☢️  NUKING SYSTEM DATA (Factory Reset)...")
        # Use raw SQL with TRUNCATE CASCADE for robust FK handling
        # This handles all dependent tables automatically
        tables_to_clear = [
            "message_flags",
            "message_attachments", 
            "messages",
            "message_threads",
            "custody_day_records",
            "custody_exchange_instances",
            "custody_exchanges",
            "compliance_logs",
            "event_attendance",
            "schedule_events",
            "obligation_funding",
            "obligations",
            "attestations",
            "agreement_sections",
            "agreement_conversations",
            "aria_agreement_conversations",
            "agreements",
            "quick_accords",
            "cubbie_items",
            "children",
            "family_files",
            "cases",
            "professional_profiles",
            "user_profiles",
            "users"
        ]
        
        from sqlalchemy import text
        
        # Try to truncate all tables at once for better FK handling
        tables_str = ", ".join(tables_to_clear)
        try:
            await self.db.execute(text(f"TRUNCATE TABLE {tables_str} CASCADE"))
            await self.db.commit()
            print("   ✅ System Wiped Clean.")
        except Exception as e:
            await self.db.rollback()
            print(f"   ⚠️  Bulk truncate failed: {e}")
            # Fallback: try each table individually with rollback
            for table in tables_to_clear:
                try:
                    await self.db.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
                    await self.db.commit()
                except Exception as table_e:
                    await self.db.rollback()
                    # Could be missing table or other issue - just skip
            print("   ✅ System Wiped Clean (fallback mode).")

    async def create_supabase_user(self, email: str, password: str) -> str:
        """Create user in Supabase Auth and return the user ID."""
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            print(f"   ⚠️  Supabase credentials missing, using mock ID for {email}")
            return str(uuid.uuid4())
        
        try:
            supabase: Client = create_client(supabase_url, supabase_key)
            
            # Create auth user
            response = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
            
            print(f"   ✅ Created Supabase user: {email}")
            return response.user.id
        except Exception as e:
            print(f"   ⚠️  Supabase error for {email}: {e}, using mock ID")
            return str(uuid.uuid4())

    async def create_cast(self):
        print("🎭 Casting Roles...")
        from sqlalchemy import select
        
        # Check if demo users already exist
        result = await self.db.execute(
            select(User).where(User.email == "sarah.chen@demo.com")
        )
        existing_mom = result.scalar_one_or_none()
        
        result = await self.db.execute(
            select(User).where(User.email == "david.miller@demo.com")
        )
        existing_dad = result.scalar_one_or_none()
        
        if existing_mom and existing_dad:
            print("   ✅ Found existing demo users!")
            self.mom = existing_mom
            self.dad = existing_dad
            
            # Sync supabase IDs with actual auth users
            mom_supabase_id = await self.create_supabase_user("sarah.chen@demo.com", "Demo2026!")
            dad_supabase_id = await self.create_supabase_user("david.miller@demo.com", "Demo2026!")
            
            self.mom.supabase_id = mom_supabase_id
            self.dad.supabase_id = dad_supabase_id
            await self.db.flush()
            
            # Ensure both parents have UserProfiles with complete subscription
            await self.ensure_user_profiles()
        else:
            # Create new users
            mom_supabase_id = await self.create_supabase_user("sarah.chen@demo.com", "Demo2026!")
            dad_supabase_id = await self.create_supabase_user("david.miller@demo.com", "Demo2026!")
            
            self.mom = User(
                id=str(uuid.uuid4()),
                email="sarah.chen@demo.com",
                first_name="Sarah",
                last_name="Chen",
                is_active=True,
                phone="555-0101",
                supabase_id=mom_supabase_id
            )
            
            self.dad = User(
                id=str(uuid.uuid4()),
                email="david.miller@demo.com",
                first_name="David",
                last_name="Miller",
                is_active=True,
                phone="555-0102",
                supabase_id=dad_supabase_id
            )
            
            self.db.add(self.mom)
            self.db.add(self.dad)
            await self.db.flush()
            print("   ✅ Created new demo users")
            
            # Create UserProfiles with complete subscription
            await self.ensure_user_profiles()
    
    async def ensure_user_profiles(self):
        """Ensure both demo parents have UserProfiles with complete subscription."""
        from app.models.user import UserProfile
        from sqlalchemy import select
        
        for user, name in [(self.mom, "Sarah"), (self.dad, "David")]:
            # Check if profile exists
            result = await self.db.execute(
                select(UserProfile).where(UserProfile.user_id == user.id)
            )
            profile = result.scalar_one_or_none()
            
            if not profile:
                # Create profile with complete subscription
                profile = UserProfile(
                    user_id=user.id,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    subscription_tier="complete",
                    subscription_status="active",
                    subscription_period_start=datetime.utcnow(),
                    subscription_period_end=datetime.utcnow() + timedelta(days=365),
                    timezone="America/Los_Angeles",
                    locale="en-US"
                )
                self.db.add(profile)
            else:
                # Update existing profile to complete subscription
                profile.subscription_tier = "complete"
                profile.subscription_status = "active"
                profile.subscription_period_start = datetime.utcnow()
                profile.subscription_period_end = datetime.utcnow() + timedelta(days=365)
        
        await self.db.flush()
        print("   ✅ Set both parents to Complete subscription (active, 1 year)")

    async def create_family_structure(self):
        print("🏠 Building Family Infrastructure...")
        
        # FamilyFile 
        self.family_file = FamilyFile(
            id=DEMO_FAMILY_ID,
            family_file_number="LA-DR-2024-5592",
            title="Chen-Miller Family",
            created_by=self.mom.id,
            parent_a_id=self.mom.id,
            parent_b_id=self.dad.id,
            status="active",
            created_at=START_DATE
        )
        self.db.add(self.family_file)
        
        # Children - ENRICHED PROFILES
        self.leo = Child(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            first_name="Leo",
            last_name="Miller",
            date_of_birth=date(2014, 5, 15), # 11/12 years old
            gender="male",
            school_name="Franklin Classical Middle",
            school_address="123 Education Blvd, Long Beach, CA",
            grade_level="6th Grade",
            teacher_name="Mr. Harrison",
            teacher_email="j.harrison@franklin.edu",
            favorite_activities="Soccer, Minecraft, Robotics",
            allergies="Peanuts (Mild)",
            blood_type="O+",
            clothing_size="Youth L",
            shoe_size="Youth 5",
            pediatrician_name="Dr. Sarah Wu",
            pediatrician_phone="555-0900",
            insurance_provider="Blue Cross CA",
            insurance_policy_number="XJ-9928-11",
            status="active",
            approved_by_a=self.mom.id,
            approved_by_b=self.dad.id
        )
        self.mia = Child(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            first_name="Mia",
            last_name="Miller",
            date_of_birth=date(2022, 2, 10), # 3/4 years old
            gender="female",
            special_needs_notes="Needs naps, car seat",
            allergies="None known",
            medications="Albuterol (Asthma - as needed)",
            pediatrician_name="Dr. Sarah Wu",
            clothing_size="4T",
            shoe_size="Toddler 9",
            favorite_activities="Finger painting, Bluey",
            comfort_items="Bunny plushie",
            bedtime_routine="Bath, Story, Nightlight",
            status="active",
            approved_by_a=self.mom.id,
            approved_by_b=self.dad.id
        )
        self.db.add_all([self.leo, self.mia])
        await self.db.flush()
        
        # Seed Cubbie Items
        await self.create_cubbie_items()

    async def create_cubbie_items(self):
        """Generates high-value items for the Cubbie."""
        print("🧸 Stocking the Cubbie...")
        
        items = [
            CubbieItem(
                id=str(uuid.uuid4()),
                family_file_id=DEMO_FAMILY_ID,
                child_id=self.leo.id,
                name="Nintendo Switch OLED",
                category=ItemCategory.ELECTRONICS.value,
                estimated_value=350.00,
                serial_number="XKW-10029384",
                current_location=ItemLocation.PARENT_A.value,
                added_by=self.mom.id,
                notes="Mario Kart cartridge in slot."
            ),
            CubbieItem(
                id=str(uuid.uuid4()),
                family_file_id=DEMO_FAMILY_ID,
                child_id=self.leo.id,
                name="Soccer Cleats (Nike)",
                category=ItemCategory.SPORTS.value,
                estimated_value=85.00,
                current_location=ItemLocation.PARENT_A.value,
                added_by=self.dad.id,
                notes="New for Fall season."
            ),
            CubbieItem(
                id=str(uuid.uuid4()),
                family_file_id=DEMO_FAMILY_ID,
                child_id=self.leo.id,
                name="School Chromebook",
                category=ItemCategory.SCHOOL.value,
                estimated_value=300.00,
                serial_number="LBS-edu-9922",
                current_location=ItemLocation.CHILD_TRAVELING.value,
                added_by=self.mom.id
            ),
            CubbieItem(
                id=str(uuid.uuid4()),
                family_file_id=DEMO_FAMILY_ID,
                child_id=self.mia.id,
                name="iPad Mini",
                category=ItemCategory.ELECTRONICS.value,
                estimated_value=400.00,
                current_location=ItemLocation.PARENT_B.value,
                added_by=self.dad.id,
                notes="Pink case. Screen protector installed."
            ),
            CubbieItem(
                id=str(uuid.uuid4()),
                family_file_id=DEMO_FAMILY_ID,
                child_id=self.mia.id,
                name="Nebulizer Machine",
                category=ItemCategory.MEDICAL.value,
                estimated_value=120.00,
                current_location=ItemLocation.PARENT_A.value,
                added_by=self.mom.id,
                notes="Must travel with her."
            )
        ]
        self.db.add_all(items)
        await self.db.flush()

    async def activate_agreement(self, activation_date):
        print("📜 Signing Smart Agreement (Full 8-Section SharedCare Agreement)...")
        
        self.agreement = Agreement(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            title="Court Ordered Parenting Plan",
            summary="Comprehensive parenting plan establishing 2-2-3 custody schedule, joint legal custody, and detailed provisions for child support, education, healthcare, and dispute resolution for Leo Chen-Miller (8) and Mia Chen-Miller (5).",
            status="active",
            version=1,
            created_at=activation_date,
            effective_date=activation_date,
            petitioner_approved=True,
            respondent_approved=True
        )
        self.db.add(self.agreement)
        await self.db.flush()
        
        # Section 1: Legal Basis
        section1 = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=self.agreement.id,
            section_type="legal",
            section_number="1",
            section_title="Legal Basis & Jurisdiction",
            display_order=1,
            content="""This Parenting Plan is entered into pursuant to California Family Code Section 3080 et seq.

Case Number: LA-DR-2024-5592
Court: Los Angeles County Superior Court

Parties:
- Petitioner: Sarah Chen (Parent A)
- Respondent: David Miller (Parent B)

This agreement supersedes all prior verbal and written agreements regarding custody and visitation of the minor children.""",
            smart_rules={"case_number": "LA-DR-2024-5592", "court": "Los Angeles County Superior Court"}
        )
        self.db.add(section1)
        
        # Section 2: Children
        section2 = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=self.agreement.id,
            section_type="children",
            section_number="2",
            section_title="Children Subject to This Agreement",
            display_order=2,
            content="""This agreement covers the following minor children:

1. Leo Chen-Miller
   - DOB: May 15, 2014 (Age 11)
   - School: Franklin Classical Middle School
   - Special Needs: None documented

2. Mia Chen-Miller  
   - DOB: February 10, 2022 (Age 3)
   - School: N/A (preschool age)
   - Special Needs: Mild asthma, requires nebulizer""",
            smart_rules={"children_ids": [self.leo.id, self.mia.id]}
        )
        self.db.add(section2)
        
        # Section 3: Physical Custody
        section3 = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=self.agreement.id,
            section_type="custody",
            section_number="3",
            section_title="Physical Custody Arrangement",
            display_order=3,
            content="""The parties shall share joint physical custody of the minor children pursuant to a 2-2-3 rotating schedule.

JOINT PHYSICAL CUSTODY is awarded to both parents.

Primary Residences:
- Parent A (Sarah): 707 E Ocean Blvd, Long Beach, CA 90802
- Parent B (David): 889 Francisco St, Los Angeles, CA 90017""",
            smart_rules={
                "custody_type": "joint_physical",
                "primary_residence_a": LOCATIONS["mom"]["addr"],
                "primary_residence_b": LOCATIONS["dad"]["addr"]
            }
        )
        self.db.add(section3)
        
        # Section 4: Regular Parenting Schedule
        section4 = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=self.agreement.id,
            section_type="schedule",
            section_number="4",
            section_title="Regular Parenting Schedule",
            display_order=4,
            content="""Parents shall follow a 2-2-3 rotating schedule:

WEEK A:
- Monday & Tuesday: Parent A (Sarah)
- Wednesday & Thursday: Parent B (David)  
- Friday, Saturday, Sunday: Parent A (Sarah)

WEEK B:
- Monday & Tuesday: Parent B (David)
- Wednesday & Thursday: Parent A (Sarah)
- Friday, Saturday, Sunday: Parent B (David)

Transitions occur at 5:00 PM on exchange days.

This schedule results in approximately equal parenting time:
- Parent A: 7 days per 14-day cycle (50%)
- Parent B: 7 days per 14-day cycle (50%)""",
            smart_rules={
                "type": "schedule_pattern",
                "cycle_length_days": 14,
                "start_date": activation_date.strftime("%Y-%m-%d"),
                "pattern_name": "2-2-3",
                "exchange_time": "17:00",
                "rules": [
                    {"days": 2, "custodian": "parent_a"},
                    {"days": 2, "custodian": "parent_b"},
                    {"days": 3, "custodian": "parent_a"},
                    {"days": 2, "custodian": "parent_b"},
                    {"days": 2, "custodian": "parent_a"},
                    {"days": 3, "custodian": "parent_b"}
                ]
            }
        )
        self.db.add(section4)
        
        # Section 5: Holiday Schedule
        section5 = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=self.agreement.id,
            section_type="holidays",
            section_number="5",
            section_title="Holiday & Special Days Schedule",
            display_order=5,
            content="""ALTERNATING HOLIDAYS (Even Years: Parent A first choice)

| Holiday | 2025 | 2026 |
|---------|------|------|
| Thanksgiving | Parent A | Parent B |
| Christmas Eve | Parent B | Parent A |
| Christmas Day | Parent A | Parent B |
| New Year's Eve | Parent B | Parent A |
| Easter | Parent A | Parent B |
| July 4th | Parent B | Parent A |

FIXED HOLIDAYS:
- Mother's Day: Always with Parent A (Sarah)
- Father's Day: Always with Parent B (David)
- Children's Birthdays: Split (morning/afternoon)

PARENT BIRTHDAYS:
- Each parent has the children on their birthday from 4pm-8pm""",
            smart_rules={
                "type": "holiday_schedule",
                "alternating_holidays": ["thanksgiving", "christmas_eve", "christmas_day", "new_years", "easter", "july_4th"],
                "fixed_holidays": {"mothers_day": "parent_a", "fathers_day": "parent_b"},
                "start_year_parent": "parent_a"
            }
        )
        self.db.add(section5)
        
        # Section 6: Transportation & Exchanges
        section6 = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=self.agreement.id,
            section_type="transportation",
            section_number="6",
            section_title="Transportation & Exchange Protocol",
            display_order=6,
            content="""EXCHANGE LOCATION:
Primary: Starbucks, 203 Pine Ave, Long Beach, CA
(Neutral public location with parking)

EXCHANGE TIME: 5:00 PM

TRANSPORTATION RESPONSIBILITY:
- Sending parent delivers children to exchange point
- Receiving parent picks up children from exchange point

GRACE PERIOD: 15 minutes
- Parent must notify if running late
- After 30 minutes with no contact, exchange is marked "missed"

SILENT HANDOFF ENABLED:
- GPS check-in required within 100m of exchange point
- Both parents confirm arrival via app
- Minimizes direct parent contact""",
            smart_rules={
                "exchange_location": {
                    "name": "Starbucks Long Beach",
                    "address": LOCATIONS["starbucks"]["addr"],
                    "lat": LOCATIONS["starbucks"]["lat"],
                    "lng": LOCATIONS["starbucks"]["lng"],
                    "geofence_radius_meters": 100
                },
                "grace_period_minutes": 15,
                "silent_handoff": True,
                "check_in_required": True
            }
        )
        self.db.add(section6)
        
        # Section 7: Financial Obligations
        section7 = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=self.agreement.id,
            section_type="financial",
            section_number="7",
            section_title="Financial Support & Shared Expenses",
            display_order=7,
            content="""CHILD SUPPORT:
Parent B (David) shall pay Parent A (Sarah) $1,500/month
Due: 1st of each month via ClearFund

SHARED EXPENSES (50/50 Split):
- Medical expenses not covered by insurance
- Extracurricular activities (sports, music, camps)
- School supplies and fees
- Clothing exceeding $100/item

EXPENSE REIMBURSEMENT:
- Submit via ClearFund within 30 days of expense
- Include receipt/documentation
- Other parent has 14 days to contest or pay

INSURANCE:
- Health: Covered by Parent A's employer plan
- Dental: Covered by Parent B's employer plan""",
            smart_rules={
                "child_support": {
                    "payer": "parent_b",
                    "recipient": "parent_a",
                    "amount": 1500,
                    "frequency": "monthly",
                    "due_day": 1
                },
                "shared_expense_split": 0.50,
                "reimbursement_window_days": 30,
                "contest_window_days": 14
            }
        )
        self.db.add(section7)
        
        # Section 8: Communication
        section8 = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=self.agreement.id,
            section_type="communication",
            section_number="8",
            section_title="Communication & Conflict Resolution",
            display_order=8,
            content="""PARENT COMMUNICATION:
- All communication via CommonGround messaging
- ARIA™ monitors for hostile language
- Emergency calls permitted for child safety

CHILD COMMUNICATION:
- Children may call either parent daily between 7-8 PM
- Video calls permitted twice per week
- Neither parent shall monitor or record calls

DISPUTE RESOLUTION:
1. Attempt to resolve via messaging (48 hours)
2. Request QuickAccord mediation
3. Escalate to professional mediator
4. Return to court as last resort

MODIFICATION REQUESTS:
- Submit via QuickAccord system
- Both parents must approve
- Changes documented in Compliance Log""",
            smart_rules={
                "messaging_platform": "commonground",
                "aria_monitoring": True,
                "call_window": {"start": "19:00", "end": "20:00"},
                "video_calls_per_week": 2,
                "dispute_resolution_hours": 48
            }
        )
        self.db.add(section8)
        
        await self.db.flush()
        print(f"   ✅ Created 8 Agreement Sections")
        
        await self.create_custody_schedules(activation_date)

    async def create_custody_schedules(self, activation_date):
        print("📍 Establishing Custody Exchange Points...")
        
        # Get child IDs
        child_ids = [self.leo.id, self.mia.id]
        
        # Items to bring list (from cubbie)
        cubbie_items = "Backpacks, homework folders, medication (Leo's inhaler)"
        
        # Wednesday Exchange at Starbucks (every week)
        # Week A: Mom drops off to Dad | Week B: Dad drops off to Mom
        self.wednesday_exchange = CustodyExchange(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            agreement_id=self.agreement.id,
            created_by=self.mom.id,
            exchange_type="dropoff",  # Parent dropping off children
            title="Wednesday Exchange",
            from_parent_id=self.mom.id,
            to_parent_id=self.dad.id,
            child_ids=child_ids,
            pickup_child_ids=[],  # No pickup, just dropoff
            dropoff_child_ids=child_ids,  # Dropping off both children
            location="Starbucks, 203 Pine Ave, Long Beach",
            location_notes="Meet inside near the pickup counter",
            location_lat=LOCATIONS["starbucks"]["lat"],
            location_lng=LOCATIONS["starbucks"]["lng"],
            geofence_radius_meters=100,
            scheduled_time=datetime.combine(activation_date, dt_time(17, 0)),
            duration_minutes=30,
            is_recurring=True,
            recurrence_pattern="weekly",
            recurrence_days=[2],  # Wednesday
            items_to_bring=cubbie_items,
            special_instructions="Kids should have eaten snack before exchange",
            silent_handoff_enabled=True,
            check_in_window_before_minutes=30,
            check_in_window_after_minutes=30
        )
        self.db.add(self.wednesday_exchange)
        
        # Friday Exchange at Starbucks (every week)
        # Week A: Dad drops off to Mom | Week B: Mom drops off to Dad
        self.friday_exchange = CustodyExchange(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            agreement_id=self.agreement.id,
            created_by=self.mom.id,
            exchange_type="dropoff",
            title="Friday Exchange",
            from_parent_id=self.dad.id,
            to_parent_id=self.mom.id,
            child_ids=child_ids,
            pickup_child_ids=[],
            dropoff_child_ids=child_ids,
            location="Starbucks, 203 Pine Ave, Long Beach",
            location_notes="Meet inside near the pickup counter",
            location_lat=LOCATIONS["starbucks"]["lat"],
            location_lng=LOCATIONS["starbucks"]["lng"],
            geofence_radius_meters=100,
            scheduled_time=datetime.combine(activation_date, dt_time(17, 0)),
            duration_minutes=30,
            is_recurring=True,
            recurrence_pattern="weekly",
            recurrence_days=[4],  # Friday
            items_to_bring=cubbie_items,
            special_instructions="Weekend bags with clothes for 2-3 days",
            silent_handoff_enabled=True,
            check_in_window_before_minutes=30,
            check_in_window_after_minutes=30
        )
        self.db.add(self.friday_exchange)
        
        # Monday Exchange at Starbucks (alternating weeks - Week B only)
        # Week B: Mom drops off to Dad (after Mom's weekend)
        self.monday_exchange = CustodyExchange(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            agreement_id=self.agreement.id,
            created_by=self.mom.id,
            exchange_type="dropoff",
            title="Monday Exchange",
            from_parent_id=self.mom.id,
            to_parent_id=self.dad.id,
            child_ids=child_ids,
            pickup_child_ids=[],
            dropoff_child_ids=child_ids,
            location="Starbucks, 203 Pine Ave, Long Beach",
            location_notes="Meet inside near the pickup counter",
            location_lat=LOCATIONS["starbucks"]["lat"],
            location_lng=LOCATIONS["starbucks"]["lng"],
            geofence_radius_meters=100,
            scheduled_time=datetime.combine(activation_date, dt_time(17, 0)),
            duration_minutes=30,
            is_recurring=True,
            recurrence_pattern="biweekly",  # Every other week
            recurrence_days=[0],  # Monday
            items_to_bring=cubbie_items,
            special_instructions="School day - ensure homework is complete",
            silent_handoff_enabled=True,
            check_in_window_before_minutes=30,
            check_in_window_after_minutes=30
        )
        self.db.add(self.monday_exchange)
        
        await self.db.flush()
        print("   ✅ Created 3 Custody Exchanges (Wed, Fri, Mon-alt)")
        
        # Generate instances for the date range
        await self.generate_exchange_instances(activation_date)
    
    async def generate_exchange_instances(self, start_date):
        """Generate CustodyExchangeInstance records for each scheduled exchange occurrence."""
        print("📅 Generating Custody Exchange Instances...")
        
        end_date = start_date + timedelta(days=275)  # ~9 months
        instance_count = 0
        
        curr = start_date
        while curr <= end_date:
            day_of_week = curr.weekday()  # 0=Mon, 2=Wed, 4=Fri
            day_in_cycle = ((curr - start_date).days) % 14
            is_week_b = day_in_cycle >= 7
            
            exchange = None
            from_parent = None
            to_parent = None
            
            if day_of_week == 2:  # Wednesday
                exchange = self.wednesday_exchange
                if is_week_b:
                    from_parent, to_parent = self.dad, self.mom
                else:
                    from_parent, to_parent = self.mom, self.dad
                    
            elif day_of_week == 4:  # Friday
                exchange = self.friday_exchange
                if is_week_b:
                    from_parent, to_parent = self.mom, self.dad
                else:
                    from_parent, to_parent = self.dad, self.mom
                    
            elif day_of_week == 0 and is_week_b:  # Monday (Week B only)
                exchange = self.monday_exchange
                from_parent, to_parent = self.mom, self.dad
            
            if exchange:
                scheduled_dt = datetime.combine(curr, dt_time(17, 0))
                window_start = scheduled_dt - timedelta(minutes=30)
                window_end = scheduled_dt + timedelta(minutes=30)
                
                # Determine status based on date
                if curr.date() < datetime.utcnow().date():
                    # Past dates - simulate outcomes
                    day_hash = hash(curr.isoformat()) % 10
                    if day_hash == 0:
                        status = "missed"
                        handoff_outcome = "missed"
                    elif day_hash < 4:
                        status = "completed"
                        handoff_outcome = "completed"
                    else:
                        status = "completed"
                        handoff_outcome = "completed"
                else:
                    status = "scheduled"
                    handoff_outcome = None
                
                instance = CustodyExchangeInstance(
                    id=str(uuid.uuid4()),
                    exchange_id=exchange.id,
                    scheduled_time=scheduled_dt,
                    status=status,
                    completed_at=scheduled_dt if status == "completed" else None,
                    window_start=window_start,
                    window_end=window_end,
                    handoff_outcome=handoff_outcome,
                    # Simulate GPS check-ins for completed exchanges
                    from_parent_checked_in=(status == "completed"),
                    from_parent_check_in_time=scheduled_dt - timedelta(minutes=5) if status == "completed" else None,
                    from_parent_check_in_lat=LOCATIONS["starbucks"]["lat"] if status == "completed" else None,
                    from_parent_check_in_lng=LOCATIONS["starbucks"]["lng"] if status == "completed" else None,
                    from_parent_in_geofence=True if status == "completed" else None,
                    from_parent_distance_meters=15.0 if status == "completed" else None,
                    to_parent_checked_in=(status == "completed"),
                    to_parent_check_in_time=scheduled_dt + timedelta(minutes=2) if status == "completed" else None,
                    to_parent_check_in_lat=LOCATIONS["starbucks"]["lat"] if status == "completed" else None,
                    to_parent_check_in_lng=LOCATIONS["starbucks"]["lng"] if status == "completed" else None,
                    to_parent_in_geofence=True if status == "completed" else None,
                    to_parent_distance_meters=20.0 if status == "completed" else None,
                )
                self.db.add(instance)
                instance_count += 1
            
            curr += timedelta(days=1)
        
        await self.db.flush()
        print(f"   ✅ Created {instance_count} Exchange Instances")
        
    async def generate_exchange_instance(self, exchange, scheduled_time, actual_time, status, parent_activity):
        """
        Generate a specific exchange instance with GPS data.
        parent_activity: dict of {parent_role: {status, location_key}}
        """
        instance = CustodyExchangeInstance(
            id=str(uuid.uuid4()),
            exchange_id=exchange.id,
            scheduled_time=scheduled_time,
            status=status,
            completed_at=actual_time if status == "completed" else None,
            
            # Silent Handoff GPS Data
            # Note: In a real scenario, we'd have precise lat/lngs.
            # Here we simulate based on "parent_activity" params.
        )
        
        # Simulate From Parent (Mom) - usually reliable
        if "from" in parent_activity:
             act = parent_activity["from"]
             instance.from_parent_checked_in = (act["status"] == "present")
             if instance.from_parent_checked_in:
                 loc = LOCATIONS[act["location"]]
                 instance.from_parent_check_in_time = scheduled_time - timedelta(minutes=5)
                 instance.from_parent_check_in_lat = loc["lat"]
                 instance.from_parent_check_in_lng = loc["lng"]
                 instance.from_parent_in_geofence = True
                 instance.from_parent_distance_meters = 5.0

        # Simulate To Parent (Dad) - variable
        if "to" in parent_activity:
             act = parent_activity["to"]
             instance.to_parent_checked_in = (act["status"] == "present")
             if instance.to_parent_checked_in:
                 loc = LOCATIONS[act["location"]]
                 # Arrival time varies
                 instance.to_parent_check_in_time = actual_time 
                 instance.to_parent_check_in_lat = loc["lat"]
                 instance.to_parent_check_in_lng = loc["lng"]
                 
                 # Check Geofence logic
                 # Using simple "is it the right key" logic for demo
                 is_at_venue = (act["location"] == "starbucks")
                 instance.to_parent_in_geofence = is_at_venue
                 instance.to_parent_distance_meters = 10.0 if is_at_venue else 15000.0

        self.db.add(instance)
        return instance

    # --- NARRATIVE GENERATORS ---

    async def generate_message(self, date_time, sender, recipient, text, flags=None):
        msg = Message(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            sender_id=sender.id,
            recipient_id=recipient.id,
            content=text,
            content_hash=hashlib.sha256(text.encode()).hexdigest(),
            sent_at=date_time,
            created_at=date_time,
            was_flagged=(flags is not None)
        )
        self.db.add(msg)
        await self.db.flush()
        
        if flags:
            flag = MessageFlag(
                id=str(uuid.uuid4()),
                message_id=msg.id,
                severity=flags.get("severity", "high"),
                categories=[flags.get("category", "hostility")],
                toxicity_score=0.95,
                user_action="rejected" if flags.get("blocked") else "sent_anyway",
                intervention_message=flags.get("reason", "Flagged by ARIA"),
                original_content_hash=msg.content_hash,
                final_content_hash=msg.content_hash, # Assuming no modification for demo
                intervention_level=3,
                created_at=date_time
            )
            self.db.add(flag)
            
            if flags.get("blocked"):
                msg.content = "[Message blocked by ARIA]"
                
        return msg

    async def generate_compliance_log(self, date_time, description, severity="info", log_type="check_in", is_verified=False, metadata=None):
        log = ComplianceLog(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            agreement_id=self.agreement.id if self.agreement else None,
            log_type=log_type,
            severity=severity,
            source_system="smart_custody_engine",
            recorded_at=date_time,
            description=description,
            is_verified=is_verified,
            metadata_json=metadata
        )
        self.db.add(log)

    async def run_q1_chaos(self):
        print("🌪️ Running Q1: Chaos (Mo 1-3)...")
        # No agreement, just random fights
        
        # 1. The Proposition
        d1 = START_DATE + timedelta(days=14, hours=22)
        await self.generate_message(d1, self.dad, self.mom, "I'll clear that credit card debt if you come over tonight.", 
                                  flags={"category": "sexual_harassment", "severity": "high", "blocked": False, "reason": "Potential coercion detected"})
        
        # 2. The Nude Photo (Simulated via text description in DB for now, assuming file storage isn't real)
        d2 = START_DATE + timedelta(days=25, hours=1)
        msg_img = await self.generate_message(d2, self.dad, self.mom, "Check this out.", 
                                            flags={"category": "nudity", "severity": "critical", "blocked": True, "reason": "Nudity detected"})
        # Attach placeholder
        att = MessageAttachment(
            id=str(uuid.uuid4()),
            message_id=msg_img.id,
            family_file_id=DEMO_FAMILY_ID,
            file_name="image.jpg",
            file_type="image/jpeg",
            file_size=1024,
            file_category="image",
            storage_path="demo/image.jpg",
            storage_url="https://demo.storage/image.jpg",
            sha256_hash=hashlib.sha256(b"demo").hexdigest(),
            virus_scanned=True,
            scan_result="clean",
            uploaded_by=self.dad.id
        )
        self.db.add(att)

        # 3. Financial Rejection
        d3 = START_DATE + timedelta(days=40, hours=9)
        await self.generate_obligation(d3, "School Uniforms", 150.00, self.mom, self.dad, status="rejected")

    async def generate_filler_chat(self, start_date, end_date, volume=10):
        """Generate mundane background noise messages."""
        common_phrases = [
            ("Did Leo eat?", "Yes, he had pizza."),
            ("Running 5 mins late.", "Ok, thanks for letting me know."),
            ("Can I call them?", "Sure, calling now."),
            ("Don't forget the soccer bag.", "I have it."),
            ("Confirming pickup time.", "See you at 5."),
            ("How was school?", "Fine."),
            ("Please send his jacket back.", "It's in the bag.")
        ]
        
        for _ in range(volume):
            # Random time during day
            msg_time = start_date + timedelta(
                days=random.randint(0, (end_date - start_date).days), 
                hours=random.randint(8, 20),
                minutes=random.randint(0, 59)
            )
            
            # 50/50 sender
            if random.choice([True, False]):
                sender, recipient = self.mom, self.dad
            else:
                sender, recipient = self.dad, self.mom
                
            pair = random.choice(common_phrases)
            
            # Q: Question
            await self.generate_message(msg_time, sender, recipient, pair[0])
            # A: Answer (1-5 mins later)
            await self.generate_message(msg_time + timedelta(minutes=random.randint(1, 5)), recipient, sender, pair[1])

    async def run_q2_implementation(self):
        print("🏗️ Running Q2: Implementation (Mo 4-6)...")
        q2_start = START_DATE + timedelta(days=90)
        q2_end = q2_start + timedelta(days=90)
        
        # Activate Rules
        await self.activate_agreement(q2_start)
        
        # 1. QuickAccord #1 (Mom) - Accepted
        # "Temporary Summer Schedule Adjustment"
        qa_date = q2_start + timedelta(days=15)
        await self.generate_quick_accord(
            title="Summer Schedule Adjustment", 
            category="schedule_swap", 
            initiator=self.mom, 
            status="active", 
            approved_by_other=True, 
            date_time=qa_date,
            end_date=qa_date + timedelta(days=60),
            description="""Temporarily modify the 2-2-3 schedule for summer break.

Sarah requests an extended week (June 15-22) to take the children to visit grandparents in San Francisco. 
David agrees in exchange for an extended week in August (Aug 10-17) for a beach vacation.

Both parents agree to transport children during their extended weeks.""",
            ai_summary="Parents agreed to swap extended summer weeks. Sarah gets June 15-22, David gets Aug 10-17."
        )
        
        # 2. QuickAccord #4: Leo's Soccer Registration (NEW)
        qa_soccer = q2_start + timedelta(days=45)
        await self.generate_quick_accord(
            title="Leo's Fall Soccer Registration",
            category="activity",
            initiator=self.dad,
            status="active",
            approved_by_other=True,
            date_time=qa_soccer,
            end_date=qa_soccer + timedelta(days=70),
            amount=185.00,
            description="""Register Leo for Fall 2025 AYSO soccer season.

League: AYSO Region 68 (Long Beach)
Season: Sep 6 - Nov 15, 2025
Practice: Tuesdays 4-5:30pm
Games: Saturdays 9am-12pm

Both parents agree to transport to games during their custody time.
Registration fee of $185 to be split 50/50 via ClearFund.""",
            ai_summary="Both parents approved Leo's soccer registration. $185 fee split 50/50."
        )
        
        # 3. QuickAccord #5: Dental Appointment (NEW)
        qa_dental = q2_start + timedelta(days=60)
        await self.generate_quick_accord(
            title="Children's Dental Checkup",
            category="medical",
            initiator=self.mom,
            status="active",
            approved_by_other=True,
            date_time=qa_dental,
            amount=75.00,
            description="""Schedule routine dental checkup for both Leo and Mia.

Provider: Dr. Martinez, Coastal Kids Dental
Date: October 15, 2025 at 3:30 PM
Location: 1250 Pine Ave, Long Beach

Sarah will take the children (falls on her day).
David to receive summary of any recommended treatment.
Copay of $75 to be split 50/50.""",
            ai_summary="Both parents approved dental appointment. Sarah to take children, share results with David."
        )
        
        # Filler Chat (Background noise)
        await self.generate_filler_chat(q2_start, q2_end, volume=30)
        
        # Generate recurring exchanges for 90 days
        # Story: "David misses 40% of his pickups"
        for day in range(90):
            current = q2_start + timedelta(days=day)
            
            if current.weekday() == 4: # Friday (Exchange Day)
                outcome = random.random()
                
                if outcome < 0.40: 
                    # 40% Late (Story says "Misses 40%", but also lists "Late at 5:45". 
                    # We'll mix Late and Missed based on "12 Late, 2 Missed" total stats)
                    # Let's align with: High freq of Lateness
                    arrival_time = datetime.combine(current, dt_time(17, 45)) # 45m late
                    
                    # 1. Generate GPS Data (Silent Handoff)
                    # Mom is there (On Time), Dad is there (Late)
                    await self.generate_exchange_instance(
                        self.friday_exchange,
                        datetime.combine(current, dt_time(17, 0)),
                        arrival_time, 
                        "completed",
                        {
                            "from": {"status": "present", "location": "starbucks"},
                            "to": {"status": "present", "location": "starbucks"} 
                        }
                    )
                    
                    # 2. Log Violation
                    await self.generate_compliance_log(
                        arrival_time, 
                        "David Miller arrived 45 mins late for exchange.", 
                        severity="violation", 
                        log_type="exchange", 
                        is_verified=True,
                        metadata={
                            "gps_lat": LOCATIONS["starbucks"]["lat"],
                            "gps_lng": LOCATIONS["starbucks"]["lng"],
                            "distance_from_zone": 5.0, # meters
                            "in_geofence": True,
                            "timestamp": arrival_time.isoformat()
                        }
                    )
                    await self.generate_message(
                        arrival_time - timedelta(minutes=10),
                        self.dad, self.mom, "Traffic is hell. Be there in 15."
                    )
                elif outcome < 0.50:
                    # 10% Missed (Total ~2 over 3 months)
                    # David is NOT at the exchange point. He is at his house.
                    
                    # 1. Generate GPS Data (Silent Handoff)
                    # Mom is there, Dad is NOT
                    await self.generate_exchange_instance(
                        self.friday_exchange,
                        datetime.combine(current, dt_time(17, 0)),
                        datetime.combine(current, dt_time(19, 0)), 
                        "missed",
                        {
                            "from": {"status": "present", "location": "starbucks"},
                            "to": {"status": "present", "location": "dad"} # At home
                        }
                    )
                    
                    # 2. Log Violation
                    await self.generate_compliance_log(
                        datetime.combine(current, dt_time(19, 0)), 
                        "Parent B failed to appear for exchange.", 
                        severity="violation", 
                        log_type="exchange_missed", 
                        is_verified=True,
                        metadata={
                            "gps_lat": LOCATIONS["dad"]["lat"], # At home!
                            "gps_lng": LOCATIONS["dad"]["lng"],
                            "distance_from_zone": 15000.0, # Far away
                            "in_geofence": False,
                            "timestamp": datetime.combine(current, dt_time(19, 0)).isoformat()
                        }
                    )
                    await self.generate_message(
                        datetime.combine(current, dt_time(18, 0)),
                        self.mom, self.dad, "Where are you? Leo is waiting."
                    )
                else:
                    # 50% On Time
                    check_in_time = datetime.combine(current, dt_time(17, 0))
                    
                    # 1. Generate GPS Data (Silent Handoff)
                    await self.generate_exchange_instance(
                        self.friday_exchange,
                        check_in_time,
                        check_in_time, 
                        "completed",
                        {
                            "from": {"status": "present", "location": "starbucks"},
                            "to": {"status": "present", "location": "starbucks"} 
                        }
                    )
                    
                    # 2. Log Check-in
                    await self.generate_compliance_log(
                        check_in_time, 
                        "Exchange completed on time.", 
                        severity="info", 
                        log_type="check_in", 
                        is_verified=True,
                        metadata={
                            "gps_lat": LOCATIONS["starbucks"]["lat"],
                            "gps_lng": LOCATIONS["starbucks"]["lng"],
                            "distance_from_zone": 2.0, # meters
                            "in_geofence": True,
                            "timestamp": check_in_time.isoformat()
                        }
                    )

    async def run_q3_escalation(self):
        print("🔥 Running Q3: Escalation (Mo 7-9)...")
        q3_start = START_DATE + timedelta(days=180)
        q3_end = q3_start + timedelta(days=90)
        
        # Filler Chat
        await self.generate_filler_chat(q3_start, q3_end, volume=20)
        
        # 1. QuickAccord #2 (Mom) - Draft/Pending
        # "Proposal: Thanksgiving Plan"
        qa_date_1 = q3_start + timedelta(days=5)
        await self.generate_quick_accord(
            title="Thanksgiving 2025 Travel Plan",
            category="travel", 
            initiator=self.mom, 
            status="pending_approval", 
            approved_by_other=False, 
            date_time=qa_date_1,
            end_date=qa_date_1 + timedelta(days=4),
            amount=450.00,
            description="""Sarah proposes to take the children to her sister's home in Sacramento for Thanksgiving (Nov 27-30, 2025).

This is Sarah's year for Thanksgiving per the holiday schedule in Section 5.

Travel details:
- Depart: Wed Nov 26 evening flight
- Return: Sun Nov 30 afternoon flight
- Flight cost: ~$450 total

David requests FaceTime with children on Thanksgiving Day at 4pm.""",
            ai_summary="Pending: Sarah requests Thanksgiving travel to Sacramento. David has not yet approved."
        )
        
        # 2. Swap Request -> Explosion
        d1 = q3_start + timedelta(days=10)
        await self.generate_message(d1, self.dad, self.mom, "I need to look good for this client dinner. Switch weekends?")
        await self.generate_message(d1 + timedelta(minutes=5), self.mom, self.dad, "No, we have plans.")
        
        # STRUCTURED SWAP REQUEST (For Analytics)
        await self.generate_swap_request(d1, self.dad, self.mom, status="rejected")
        
        # QuickAccord #3 (Dad) - Rejected/Revoked (The "Vegas Swap")
        await self.generate_quick_accord(
            title="Vegas Weekend Swap", 
            category="schedule_swap", 
            initiator=self.dad, 
            status="revoked", 
            approved_by_other=False, 
            date_time=d1,
            description="""David requests to swap his weekend (Oct 10-12) with Sarah's weekend (Oct 17-19) to attend a business conference in Las Vegas.

Reason: Important client dinner and networking event.

Sarah's response: Declined due to prior commitments (Leo's soccer tournament that weekend).""",
            ai_summary="REJECTED: David's swap request denied. Sarah has prior commitments (Leo's soccer tournament)."
        )
        
        # Toxic Explosion
        await self.generate_message(d1 + timedelta(minutes=15), self.dad, self.mom, "You ungrateful bitch. I pay for your life.",
                                  flags={"category": "profanity", "severity": "high", "blocked": True})

        # ========== COMPREHENSIVE CHILD SUPPORT HISTORY ==========
        # Monthly child support from agreement effective date
        months_data = [
            # (month_offset, status, paid_days_late)
            (0, "completed", 3),   # May - paid 3 days late
            (1, "completed", 0),   # June - on time
            (2, "completed", 5),   # July - 5 days late
            (3, "completed", 0),   # Aug - on time
            (4, "completed", 2),   # Sep - 2 days late
            (5, "open", None),     # Oct - MISSED (story escalation point)
            (6, "completed", 15),  # Nov - 15 days late after lawyer letter
            (7, "completed", 0),   # Dec - on time (Q4 resolution)
        ]
        
        q2_start = START_DATE + timedelta(days=90)  # Agreement effective date
        for month_offset, status, paid_days_late in months_data:
            month_date = q2_start + timedelta(days=month_offset * 30)
            month_name = ["May", "June", "July", "August", "September", "October", "November", "December"][month_offset]
            
            await self.generate_obligation(
                month_date, 
                f"Child Support - {month_name} 2025", 
                1500.00, 
                self.mom, 
                self.dad, 
                status=status, 
                category="child_support"
            )
        
        # Shared expenses from QuickAccords
        # Soccer registration fee (from QA #4)
        await self.generate_obligation(
            q3_start + timedelta(days=20), 
            "Leo's Soccer Registration (AYSO)", 
            185.00, 
            self.dad,  # Dad initiated the QuickAccord
            self.mom, 
            status="completed", 
            category="extracurricular"
        )
        
        # Dental copay (from QA #5)
        await self.generate_obligation(
            q3_start + timedelta(days=40), 
            "Children's Dental Checkup Copay", 
            75.00, 
            self.mom,  # Mom initiated
            self.dad, 
            status="completed", 
            category="medical"
        )
        
        # Nebulizer supplies (ongoing medical)
        await self.generate_obligation(
            q3_start + timedelta(days=25), 
            "Mia's Nebulizer Supplies", 
            65.00, 
            self.mom, 
            self.dad, 
            status="completed", 
            category="medical"
        )
        
        # Back to school supplies
        await self.generate_obligation(
            q3_start + timedelta(days=35), 
            "Back to School Supplies", 
            220.00, 
            self.mom, 
            self.dad, 
            status="completed", 
            category="education"
        )
        
        # 3. Large Expense Rejection (already in story - Leo's Braces)
        d2 = q3_start + timedelta(days=30)
        await self.generate_obligation(d2, "Leo's Orthodontist (Braces)", 3000.00, self.mom, self.dad, status="disputed", category="medical")

    async def run_q4_resolution(self):
        print("🕊️ Running Q4: Resolution (Mo 10-12)...")
        q4_start = START_DATE + timedelta(days=270)
        q4_end = START_DATE + timedelta(days=365) # Now
        
        # Filler Chat (Transactional)
        await self.generate_filler_chat(q4_start, q4_end, volume=40)
        
        # Mediation event simulated by message change
        d1 = q4_start + timedelta(days=5)
        await self.generate_message(d1, self.dad, self.mom, "My lawyer showed me the logs. I will be on time.")
        
        # Perfect Compliance Loop
        for day in range(60):
             current = q4_start + timedelta(days=day)
             if current.weekday() == 4: # Friday
                 arrival = datetime.combine(current, dt_time(17, 0)) # On Time
                 
                 # 1. Generate GPS Data (Silent Handoff)
                 await self.generate_exchange_instance(
                    self.friday_exchange,
                    arrival,
                    arrival, 
                    "completed",
                    {
                        "from": {"status": "present", "location": "starbucks"},
                        "to": {"status": "present", "location": "starbucks"} 
                    }
                 )
                 
                 # 2. Log Check-in
                 await self.generate_compliance_log(
                     arrival,
                     "Exchange completed on schedule.",
                     severity="info",
                     log_type="exchange",
                     is_verified=True
                 )

        # Pay the Braces
        d2 = q4_start + timedelta(days=15)
        # Close the PREVIOUSLY disputed item?
        # For demo simplicity, we create a 'Paid' record to show up in recent history
        await self.generate_obligation(d2, "Leo's Orthodontist (Braces) - Resolution", 3000.00, self.mom, self.dad, status="completed", was_disputed=True, category="medical")


    async def generate_obligation(self, date_time, title, amount, creator, debtor, status="pending", was_disputed=False, category="other"):
        obl = Obligation(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            title=title,
            total_amount=amount,
            petitioner_share=amount/2,
            respondent_share=amount/2,
            status=status,
            created_by=creator.id,
            created_at=date_time,
            source_type="request",
            purpose_category=category
        )
        self.db.add(obl)
        if status == "completed":
            funding = ObligationFunding(
                id=str(uuid.uuid4()),
                obligation_id=obl.id,
                parent_id=debtor.id,
                amount_required=amount/2,
                amount_funded=amount/2,
                is_fully_funded=True,
                funded_at=date_time + timedelta(days=2),
                created_at=date_time
            )
            self.db.add(funding)

    async def generate_quick_accord(self, title, category, initiator, status, approved_by_other=False, date_time=None, 
                                     description=None, amount=0, ai_summary=None, end_date=None):
        """Generates a QuickAccord (Lightweight Agreement) with full description."""
        accord_num = generate_quick_accord_number()
        other_parent = self.dad if initiator.id == self.mom.id else self.mom
        
        qa = QuickAccord(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            accord_number=accord_num,
            title=title,
            purpose_category=category,
            purpose_description=description,
            initiated_by=initiator.id,
            status=status,
            start_date=date_time,
            end_date=end_date,
            created_at=date_time or datetime.utcnow(),
            
            # Financial
            has_shared_expense=(amount > 0),
            estimated_amount=amount if amount > 0 else None,
            
            # AI Summary
            ai_summary=ai_summary,
            
            # Approval
            parent_a_approved=True,  # Initiator implicitly approves
            parent_a_approved_at=date_time,
            
            parent_b_approved=approved_by_other,
            parent_b_approved_at=date_time if approved_by_other else None
        )
        self.db.add(qa)
        await self.db.flush()
        return qa

    async def generate_calendar_events(self, start_date, end_date):
        """
        Generates EXCHANGE-ONLY schedule events for the 2-2-3 agreement.
        
        Exchange days:
        - Wednesday (every week): custody transfer
        - Friday (every week): custody transfer  
        - Monday (alternating weeks - Week B only): custody transfer
        
        2-2-3 Pattern (14-day cycle):
        Week A: Mon Tue (A) | Wed Thu (B) | Fri Sat Sun (A)
        Week B: Mon Tue (B) | Wed Thu (A) | Fri Sat Sun (B)
        """
        print("📅 Populating Calendar (Exchange Events Only)...")
        
        curr = start_date
        days_to_gen = (end_date - start_date).days
        exchange_count = 0
        
        # Determine which week we're starting in (need to align to cycle)
        # We'll treat the start_date as Day 0 of Week A
        
        for i in range(days_to_gen):
            day_of_week = curr.weekday()  # 0=Mon, 2=Wed, 4=Fri
            day_in_cycle = i % 14  # 0-13 for the 14-day cycle
            is_week_b = day_in_cycle >= 7
            
            # Determine if this is an exchange day
            is_exchange_day = False
            from_parent = None
            to_parent = None
            exchange_title = None
            
            if day_of_week == 2:  # Wednesday - every week
                is_exchange_day = True
                if is_week_b:
                    # Week B Wed: Dad → Mom
                    from_parent = self.dad
                    to_parent = self.mom
                else:
                    # Week A Wed: Mom → Dad
                    from_parent = self.mom
                    to_parent = self.dad
                exchange_title = "Wednesday Custody Exchange"
                    
            elif day_of_week == 4:  # Friday - every week
                is_exchange_day = True
                if is_week_b:
                    # Week B Fri: Mom → Dad
                    from_parent = self.mom
                    to_parent = self.dad
                else:
                    # Week A Fri: Dad → Mom
                    from_parent = self.dad
                    to_parent = self.mom
                exchange_title = "Friday Custody Exchange"
                    
            elif day_of_week == 0 and is_week_b:  # Monday - Week B only
                is_exchange_day = True
                # Week B Mon: Mom → Dad (after Mom's weekend in Week A)
                from_parent = self.mom
                to_parent = self.dad
                exchange_title = "Monday Custody Exchange"
            
            if is_exchange_day:
                evt = ScheduleEvent(
                    id=str(uuid.uuid4()),
                    family_file_id=DEMO_FAMILY_ID,
                    agreement_id=self.agreement.id,
                    title=exchange_title,
                    event_type="exchange",
                    is_exchange=True,
                    start_time=datetime.combine(curr, dt_time(17, 0)),  # 5 PM
                    end_time=datetime.combine(curr, dt_time(17, 30)),   # 30 min window
                    all_day=False,
                    custodial_parent_id=to_parent.id,  # Who is receiving
                    transition_from_id=from_parent.id,
                    transition_to_id=to_parent.id,
                    exchange_location="Starbucks, 203 Pine Ave, Long Beach",
                    exchange_lat=LOCATIONS["starbucks"]["lat"],
                    exchange_lng=LOCATIONS["starbucks"]["lng"],
                    child_ids=[],
                    created_by=self.mom.id,
                    status="scheduled",
                    is_agreement_derived=True
                )
                self.db.add(evt)
                exchange_count += 1
            
            curr += timedelta(days=1)
        
        await self.db.flush()
        print(f"   ✅ Created {exchange_count} Exchange Events")

    async def generate_swap_request(self, date_time, requester, approver, status="rejected"):
        """Generates a structured Swap Request (Schedule Modification)."""
        # Find a regular event to "modify" or create a request wrapper
        # For analytics, we need an event with is_modification=True
        
        req_start = date_time + timedelta(days=5) # Requesting for next weekend
        
        evt = ScheduleEvent(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            title=f"Swap Request: {requester.first_name} for Vegas Trip",
            event_type="regular", # Base type
            is_modification=True, # Critical flag
            modification_requested_by=requester.id,
            modification_approved=(status == "approved"),
            modification_approved_by=approver.id if status == "approved" else None,
            start_time=req_start,
            end_time=req_start + timedelta(days=2),
            custodial_parent_id=requester.id,
            child_ids=[],
            created_by=requester.id,
            status="cancelled" if status == "rejected" else "scheduled",
            cancellation_reason="Rejected by co-parent" if status == "rejected" else None
        )
        self.db.add(evt)


    async def generate_custody_reports(self, start_date, end_date):
        """
        Generates daily CustodyDayRecord entries for BOTH children.
        
        2-2-3 Pattern (aligned to start on Monday):
        Week A: Mon(A) Tue(A) Wed(B) Thu(B) Fri(A) Sat(A) Sun(A)
        Week B: Mon(B) Tue(B) Wed(A) Thu(A) Fri(B) Sat(B) Sun(B)
        
        A = Mom (Sarah), B = Dad (David)
        """
        print("📊 Generating Custody Day Records (The Truth Layer)...")
        from app.models.custody_day_record import CustodyDayRecord, DeterminationMethod
        from sqlalchemy import delete
        
        # Clear existing CDRs for fresh run
        await self.db.execute(delete(CustodyDayRecord).where(
            CustodyDayRecord.family_file_id == DEMO_FAMILY_ID
        ))
        
        # Align start_date to previous Monday for proper 2-2-3 cycle
        days_from_monday = start_date.weekday()  # 0=Mon, 1=Tue, etc.
        cycle_start = start_date - timedelta(days=days_from_monday)
        
        # 2-2-3 pattern for a 14-day cycle (starting Monday)
        # Week A: A A B B A A A (indices 0-6)
        # Week B: B B A A B B B (indices 7-13)
        pattern = ["A", "A", "B", "B", "A", "A", "A", "B", "B", "A", "A", "B", "B", "B"]
        
        curr = start_date
        days_to_gen = (end_date - start_date).days
        cdr_count = 0
        
        # Get both children
        children = [self.leo, self.mia]
        
        for i in range(days_to_gen):
            # Calculate position in the 14-day cycle based on actual day
            days_since_cycle_start = (curr - cycle_start).days
            cycle_idx = days_since_cycle_start % 14
            
            day_role = pattern[cycle_idx]
            scheduled_custodian = self.mom if day_role == "A" else self.dad
            actual_custodian = scheduled_custodian
            determination = DeterminationMethod.SCHEDULED
            
            # Simulate some missed exchanges in Q2/Q3 period
            # Q2 starts at day 90, Q3 ends at day 270
            days_from_start = (curr - start_date).days
            is_q2_or_q3 = 0 <= days_from_start <= 180  # First 6 months
            is_exchange_day = curr.weekday() in [0, 2, 4]  # Mon, Wed, Fri
            
            if is_q2_or_q3 and is_exchange_day and day_role == "B":
                # 10% chance of missed exchange (Dad no-show)
                day_hash = hash(curr.isoformat()) % 10
                if day_hash == 0:
                    actual_custodian = self.mom  # Mom keeps custody
                    determination = DeterminationMethod.MANUAL_OVERRIDE
            
            # Create CDR for EACH child
            for child in children:
                rec = CustodyDayRecord(
                    id=str(uuid.uuid4()),
                    family_file_id=DEMO_FAMILY_ID,
                    child_id=child.id,
                    record_date=curr,
                    custodial_parent_id=actual_custodian.id,
                    determination_method=determination,
                    confidence_score=100
                )
                self.db.add(rec)
                cdr_count += 1
            
            curr += timedelta(days=1)
        
        await self.db.flush()
        print(f"   ✅ Created {cdr_count} Custody Day Records ({cdr_count // 2} days × 2 children)")

    async def generate(self):
        await self.nuke_all_data()
        await self.create_cast()
        await self.create_family_structure()
        
        await self.run_q1_chaos()
        await self.run_q2_implementation()
        
        # Generate Calendar Background (Q2-Q4) - CRITICAL: Both must use same start date
        q2_start = START_DATE + timedelta(days=90)
        end_date = START_DATE + timedelta(days=365)
        await self.generate_calendar_events(q2_start, end_date)
        
        await self.run_q3_escalation()
        await self.run_q4_resolution()
        
        # FINAL: Generate the Truth Layer for Custody Stats
        # CRITICAL FIX: CDR must start from same date as calendar events (q2_start)
        # to ensure schedule and CDR are in sync
        await self.generate_custody_reports(q2_start, end_date)
        
        await self.db.commit()
        print("✨ Scene Complete.")

async def main():
    await init_db()
    async with AsyncSessionLocal() as db:
        director = StoryDirector(db)
        await director.generate()

if __name__ == "__main__":
    asyncio.run(main())

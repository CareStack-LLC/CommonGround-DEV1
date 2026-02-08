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
from pathlib import Path
from datetime import datetime, timedelta, date, time as dt_time
import random
import uuid
import json

# Add parent directory for imports
sys.path.append(str(Path(__file__).parent.parent))

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
        # Top-level Deletions
        await self.db.execute(delete(MessageFlag))
        await self.db.execute(delete(MessageAttachment))
        await self.db.execute(delete(Message))
        
        await self.db.execute(delete(CustodyExchangeInstance))
        await self.db.execute(delete(CustodyExchange))
        await self.db.execute(delete(ComplianceLog))
        await self.db.execute(delete(ScheduleEvent))
        
        await self.db.execute(delete(ObligationFunding))
        await self.db.execute(delete(Obligation))
        
        await self.db.execute(delete(AgreementSection))
        await self.db.execute(delete(Agreement))
        
        await self.db.execute(delete(Child))
        await self.db.execute(delete(FamilyFile))
        await self.db.execute(delete(Case))
        await self.db.execute(delete(User))
        
        await self.db.commit()
        print("   ✅ System Wiped Clean.")

    async def create_cast(self):
        print("🎭 Casting Roles...")
        # Mother
        self.mom = User(
            id=str(uuid.uuid4()),
            email="sarah.chen@demo.com",
            first_name="Sarah",
            last_name="Chen",
            is_active=True,
            phone="555-0101",
            supabase_id=str(uuid.uuid4()) # Fake Supabase ID
        )
        
        # Father
        self.dad = User(
            id=str(uuid.uuid4()),
            email="david.miller@demo.com",
            first_name="David",
            last_name="Miller",
            is_active=True,
            phone="555-0102",
            supabase_id=str(uuid.uuid4()) # Fake Supabase ID
        )
        
        self.db.add(self.mom)
        self.db.add(self.dad)
        await self.db.flush()

    async def create_family_structure(self):
        print("🏠 Building Family Infrastructure...")
        
        # FamilyFile with Smart Config
        self.family_file = FamilyFile(
            id=DEMO_FAMILY_ID,
            family_file_number="LA-DR-2024-5592",
            title="Chen-Miller Family",
            created_by=self.mom.id,
            parent_a_id=self.mom.id,
            parent_b_id=self.dad.id,
            status="active",
            created_at=START_DATE,
            smart_config={
                "exchange_protocol": {"grace_period_mins": 15},
                "holidays": ["Thanksgiving", "Christmas"]
            }
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
        print("📜 Signing Smart Agreement (2-2-3)...")
        
        self.agreement = Agreement(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            title="Court Ordered Parenting Plan",
            status="active",
            version="1.0",
            created_at=activation_date,
            effective_date=activation_date,
            petitioner_approved=True,
            respondent_approved=True
        )
        self.db.add(self.agreement)
        
        # Schedule Section with Smart Rules
        schedule_section = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=self.agreement.id,
            section_type="schedule",
            section_number="4",
            section_title="Regular Parenting Schedule",
            content="Parents shall follow a 2-2-3 schedule per the stored logic.",
            smart_rules={
                "type": "schedule_pattern",
                "cycle_length_days": 14,
                "start_date": activation_date.strftime("%Y-%m-%d"),
                "pattern_name": "2-2-3",
                "rules": [
                    {"days": 2, "custodian": "parent_a"}, # Mom Mon/Tue
                    {"days": 2, "custodian": "parent_b"}, # Dad Wed/Thu
                    {"days": 3, "custodian": "parent_a"}, # Mom Fri/Sat/Sun
                    {"days": 2, "custodian": "parent_b"}, # Dad Mon/Tue
                    {"days": 2, "custodian": "parent_a"}, # Mom Wed/Thu
                    {"days": 3, "custodian": "parent_b"}  # Dad Fri/Sat/Sun
                ]
            }
        )
        self.db.add(schedule_section)
        await self.db.flush()
        
        await self.create_custody_schedules(activation_date)

    async def create_custody_schedules(self, activation_date):
        print("📍 establishing Custody Exchange Points...")
        # Friday Exchange at Starbucks
        self.friday_exchange = CustodyExchange(
            id=str(uuid.uuid4()),
            case_id=DEMO_CASE_ID, # Optional link
            family_file_id=DEMO_FAMILY_ID,
            agreement_id=self.agreement.id,
            created_by=self.mom.id,
            exchange_type="both", # Mom drops, Dad picks up (or vice versa depending on week)
            title="Friday Exchange at Starbucks",
            from_parent_id=self.mom.id, # Default flow
            to_parent_id=self.dad.id,
            location="Starbucks, 203 Pine Ave, Long Beach",
            location_lat=LOCATIONS["starbucks"]["lat"],
            location_lng=LOCATIONS["starbucks"]["lng"],
            geofence_radius_meters=100,
            scheduled_time=datetime.combine(activation_date, dt_time(17, 0)),
            is_recurring=True,
            recurrence_pattern="weekly",
            recurrence_days=[4], # Friday
            silent_handoff_enabled=True,
            check_in_window_before_minutes=30,
            check_in_window_after_minutes=30
        )
        self.db.add(self.friday_exchange)
        await self.db.flush()
        
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
            "Summer Schedule Adjustment", 
            "schedule_swap", 
            self.mom, 
            "active", 
            approved_by_other=True, 
            date_time=qa_date
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
            "Proposed Thanksgiving Plan", 
            "travel", 
            self.mom, 
            "pending_approval", 
            approved_by_other=False, 
            date_time=qa_date_1
        )
        
        # 2. Swap Request -> Explosion
        d1 = q3_start + timedelta(days=10)
        await self.generate_message(d1, self.dad, self.mom, "I need to look good for this client dinner. Switch weekends?")
        await self.generate_message(d1 + timedelta(minutes=5), self.mom, self.dad, "No, we have plans.")
        
        # STRUCTURED SWAP REQUEST (For Analytics)
        await self.generate_swap_request(d1, self.dad, self.mom, status="rejected")
        
        # QuickAccord #3 (Dad) - Rejected/Revoked (The "Vegas Swap")
        await self.generate_quick_accord(
            "Vegas Weekend Swap", 
            "schedule_swap", 
            self.dad, 
            "revoked", 
            approved_by_other=False, 
            date_time=d1
        )
        
        # Toxic Explosion
        await self.generate_message(d1 + timedelta(minutes=15), self.dad, self.mom, "You ungrateful bitch. I pay for your life.",
                                  flags={"category": "profanity", "severity": "high", "blocked": True})

        # 2. Financial Abuse (Missed Child Support)
        d_cs = q3_start + timedelta(days=15)
        # We model Child Support as a recurring obligation that gets IGNORED
        await self.generate_obligation(d_cs, "Child Support - October", 1500.00, self.mom, self.dad, status="open", category="child_support")
        
        # 3. Large Expense Rejection
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

    async def generate_quick_accord(self, title, category, initiator, status, approved_by_other=False, date_time=None):
        """Generates a QuickAccord (Lightweight Agreement)."""
        accord_num = generate_quick_accord_number()
        other_parent = self.dad if initiator.id == self.mom.id else self.mom
        
        qa = QuickAccord(
            id=str(uuid.uuid4()),
            family_file_id=DEMO_FAMILY_ID,
            accord_number=accord_num,
            title=title,
            purpose_category=category,
            initiated_by=initiator.id,
            status=status,
            start_date=date_time,
            created_at=date_time or datetime.utcnow(),
            
            # Approval
            parent_a_approved=True, # Initiator implicitly approves
            parent_a_approved_at=date_time,
            
            parent_b_approved=approved_by_other,
            parent_b_approved_at=date_time if approved_by_other else None
        )
        self.db.add(qa)
        await self.db.flush() # Ensure ID is generated
        return qa

    async def generate_calendar_events(self, start_date, end_date):
        """Generates 2-2-3 Schedule Events for the Agreement."""
        print("📅 Populating Calendar (2-2-3 Schedule)...")
        # 2-2-3 Pattern: 
        # A, A, B, B, A, A, A
        # B, B, A, A, B, B, B
        pattern = ["A", "A", "B", "B", "A", "A", "A", "B", "B", "A", "A", "B", "B", "B"]
        curr = start_date
        
        # Sync with cycle start (ensure consistent rotation)
        cycle_idx = 0
        
        days_to_gen = (end_date - start_date).days
        
        events = []
        for i in range(days_to_gen):
            day_role = pattern[cycle_idx % 14]
            custodian = self.mom if day_role == "A" else self.dad
            
            # Create All-Day Event for Custody
            evt = ScheduleEvent(
                id=str(uuid.uuid4()),
                family_file_id=DEMO_FAMILY_ID,
                agreement_id=self.agreement.id,
                title=f"{custodian.first_name}'s Parenting Time",
                event_type="regular",
                start_time=datetime.combine(curr, dt_time(9, 0)), # 9 AM start for visual simplicity
                end_time=datetime.combine(curr, dt_time(20, 0)),
                all_day=True,
                custodial_parent_id=custodian.id,
                child_ids=[child.id for child in [self.mom] if False], # Placeholder
                created_by=self.mom.id, # Admin/System
                status="scheduled"
            )
            self.db.add(evt)
            
            curr += timedelta(days=1)
            cycle_idx += 1
            
        await self.db.flush()

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
        Generates daily CustodyDayRecord entries.
        Crucial for the 'Custody Tracker' to show actual vs scheduled.
        Logic: Start with 2-2-3, then apply 'Missed Exchange' overrides.
        """
        print("📊 Generating Custody Day Records (The Truth Layer)...")
        from app.models.custody_day_record import CustodyDayRecord, DeterminationMethod
        
        # 2-2-3 Pattern: Mon/Tue(A), Wed/Thu(B), Fri/Sat/Sun(A), Mon/Tue(B), Wed/Thu(A), Fri/Sat/Sun(B)
        # A = Mom, B = Dad
        pattern = ["A", "A", "B", "B", "A", "A", "A", "B", "B", "A", "A", "B", "B", "B"]
        curr = start_date
        cycle_idx = 0
        days_to_gen = (end_date - start_date).days
        
        from sqlalchemy import delete
        await self.db.execute(delete(CustodyDayRecord)) # Clear for fresh run
        
        current_custodian = self.mom # Start with Mom
        
        for i in range(days_to_gen):
            # 1. Determine Scheduled Custodian
            day_role = pattern[cycle_idx % 14]
            scheduled_custodian = self.mom if day_role == "A" else self.dad
            
            # 2. Check for Deviations (Logic from Q2/Q3 runs)
            # We treat the schedule as the baseline, but "Missed" exchanges mean NO TRANSFER.
            # However, simpler for seed: Just rely on "Actual" logic.
            # If today is Friday (Exchange Day) AND it's a "Missed" day...
            
            actual_custodian = scheduled_custodian
            determination = DeterminationMethod.SCHEDULED
            
            # Q2/Q3 Logic Simulation:
            # If it's a Friday in Q2/Q3, there's a chance Dad missed it.
            # If Dad missed pickup (Mom -> Dad), Mom KEEPS custody for the weekend.
            
            is_exchange_day = (curr.weekday() == 4) # Friday
            is_q2_or_q3 = (start_date + timedelta(days=90)) <= curr <= (start_date + timedelta(days=270))
            
            # Deterministic "Missed" logic matching the loops
            # In Q2 loop, we used random.random(). Here we need to align or over-write.
            # Let's say: If Dad is scheduled to have them (B), but it matches our "Missed" criteria:
            if is_q2_or_q3 and is_exchange_day and day_role == "B":
                 # In run_q2, we had 10% missed.
                 # Let's bake in specific dates for missed pickups to be consistent.
                 # Using a simple hash to deterministicly pick "bad days"
                 day_hash = hash(curr.isoformat()) % 10
                 if day_hash == 0: # 1 in 10 chance
                     actual_custodian = self.mom # Mom keeps them!
                     determination = DeterminationMethod.MANUAL_OVERRIDE
                     
            # Create Record
            rec = CustodyDayRecord(
                id=str(uuid.uuid4()),
                family_file_id=DEMO_FAMILY_ID,
                child_id=self.leo.id, 
                record_date=curr,
                custodial_parent_id=actual_custodian.id,
                determination_method=determination,
                confidence_score=100
            )
            # Hack: Need to fetch child IDs properly or store them on self
            # For now, let's fetch Leo again or store him in __init__
            # Just committing raw sql valid ID? No, use self.db query if needed
            # Better: Store children in self during create_family_structure
            
            self.db.add(rec)
            
            curr += timedelta(days=1)
            cycle_idx += 1
            
        await self.db.flush()

    async def generate(self):
        await self.nuke_all_data()
        await self.create_cast()
        await self.create_family_structure()
        
        await self.run_q1_chaos()
        await self.run_q2_implementation()
        
        # Generate Calendar Background (Q2-Q4)
        q2_start = START_DATE + timedelta(days=90)
        await self.generate_calendar_events(q2_start, START_DATE + timedelta(days=365))
        
        await self.run_q3_escalation()
        await self.run_q4_resolution()
        
        # FINAL: Generate the Truth Layer for Custody Stats
        # We access self.leo which we will stash in create_family_structure
        await self.generate_custody_reports(START_DATE, START_DATE + timedelta(days=365))
        
        await self.db.commit()
        print("✨ Scene Complete.")

async def main():
    await init_db()
    async with AsyncSessionLocal() as db:
        director = StoryDirector(db)
        await director.generate()

if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
Seed Test Data for Brown Family (Marcus & Tasha) Reports

This script creates realistic test data for generating compliance reports:
- Custody exchanges with GPS check-ins
- Messages with ARIA interventions
- Payments
- Agreements

Family File ID: ffb3296b-8723-483d-b7b2-7b6139101477
"""

import sys
import asyncio
from pathlib import Path
from datetime import datetime, timedelta
import random
import uuid

# Add parent directory for imports
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import select, or_
from app.core.database import get_db_context, AsyncSessionLocal
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.message import Message, MessageFlag
from app.models.agreement import Agreement, AgreementSection
from app.models.clearfund import Obligation, ObligationFunding
from app.models.schedule import ScheduleEvent

# Brown Family Details - Tasha & Marcus Brown
# Use d491d4f6-da26-4b27-a12f-b8c52e9fbdab (or c6a0cee5-2a71-4b38-bb9b-8b303197b855)
FAMILY_FILE_ID = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"

# Exchange location (SF area)
EXCHANGE_LOCATION = {
    "address": "1901 Market St, San Francisco, CA 94103",
    "lat": 37.7697,
    "lng": -122.4269,
    "geofence_radius": 100
}


async def get_family_info(db):
    """Fetch Marcus & Tasha's family file info."""
    result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == FAMILY_FILE_ID)
    )
    family = result.scalar_one_or_none()
    
    if not family:
        print(f"❌ Family file {FAMILY_FILE_ID} not found")
        return None, None, None
    
    # Get parents
    parent1_result = await db.execute(
        select(User).where(User.id == family.parent_a_id)
    )
    parent1 = parent1_result.scalar_one_or_none()
    
    parent2_result = await db.execute(
        select(User).where(User.id == family.parent_b_id)
    )
    parent2 = parent2_result.scalar_one_or_none()
    
    return family, parent1, parent2


async def create_custody_exchanges(db, family, marcus, tasha):
    """Create custody exchange templates and instances with GPS data."""
    print("\n🔄 Creating custody exchanges...")
    
    # Check for existing exchanges
    existing = await db.execute(
        select(CustodyExchange).where(CustodyExchange.family_file_id == FAMILY_FILE_ID)
    )
    if existing.scalars().first():
        print("   ⚠️ Exchanges already exist, skipping...")
        return
    
    # Create recurring exchange template
    exchange = CustodyExchange(
        id=str(uuid.uuid4()),
        family_file_id=FAMILY_FILE_ID,
        case_id=family.case_id if hasattr(family, 'case_id') else None,
        title="Weekly Friday Pickup",
        exchange_type="pickup",
        location=EXCHANGE_LOCATION["address"],
        location_lat=EXCHANGE_LOCATION["lat"],
        location_lng=EXCHANGE_LOCATION["lng"],
        geofence_radius_meters=EXCHANGE_LOCATION["geofence_radius"],
        from_parent_id=marcus.id,
        to_parent_id=tasha.id,
        created_by=marcus.id,
        silent_handoff_enabled=True,
        check_in_window_before_minutes=60,
        check_in_window_after_minutes=60,
        status="active",
        recurrence_rule="FREQ=WEEKLY;BYDAY=FR",
        created_at=datetime.utcnow() - timedelta(days=60),
    )
    db.add(exchange)
    await db.flush()
    
    # Create 8 exchange instances over the past 30 days
    instances_created = 0
    for i in range(8):
        days_ago = i * 4
        scheduled = datetime.utcnow() - timedelta(days=days_ago, hours=-18)  # 6 PM
        
        # Vary the GPS positions slightly
        marcus_lat = EXCHANGE_LOCATION["lat"] + random.uniform(-0.0002, 0.0002)
        marcus_lng = EXCHANGE_LOCATION["lng"] + random.uniform(-0.0002, 0.0002)
        tasha_lat = EXCHANGE_LOCATION["lat"] + random.uniform(-0.0002, 0.0002)
        tasha_lng = EXCHANGE_LOCATION["lng"] + random.uniform(-0.0002, 0.0002)
        
        # 80% of exchanges are on-time and in geofence
        is_compliant = random.random() > 0.2
        
        # Sometimes one parent is late or outside geofence
        marcus_in_geofence = True
        tasha_in_geofence = True
        marcus_distance = random.uniform(5, 80)
        tasha_distance = random.uniform(5, 80)
        
        if not is_compliant:
            # 50/50 chance of which parent is non-compliant
            if random.random() > 0.5:
                marcus_distance = random.uniform(150, 300)
                marcus_in_geofence = False
                marcus_lat = EXCHANGE_LOCATION["lat"] + 0.002  # ~220m away
            else:
                tasha_distance = random.uniform(150, 300)
                tasha_in_geofence = False
                tasha_lat = EXCHANGE_LOCATION["lat"] + 0.002
        
        # Check-in timing
        window_start = scheduled - timedelta(minutes=60)
        window_end = scheduled + timedelta(minutes=60)
        
        marcus_check_in_time = scheduled - timedelta(minutes=random.randint(-30, 30))
        tasha_check_in_time = scheduled + timedelta(minutes=random.randint(-15, 45))
        
        status = "completed" if i > 0 else "scheduled"
        outcome = "completed" if is_compliant else "one_party_present" if random.random() > 0.5 else "disputed"
        
        instance = CustodyExchangeInstance(
            id=str(uuid.uuid4()),
            exchange_id=exchange.id,
            scheduled_time=scheduled,
            status=status,
            # Marcus (from parent) check-in
            from_parent_checked_in=True,
            from_parent_check_in_time=marcus_check_in_time,
            from_parent_check_in_lat=marcus_lat,
            from_parent_check_in_lng=marcus_lng,
            from_parent_device_accuracy=random.uniform(3, 15),
            from_parent_distance_meters=marcus_distance,
            from_parent_in_geofence=marcus_in_geofence,
            # Tasha (to parent) check-in
            to_parent_checked_in=True,
            to_parent_check_in_time=tasha_check_in_time,
            to_parent_check_in_lat=tasha_lat,
            to_parent_check_in_lng=tasha_lng,
            to_parent_device_accuracy=random.uniform(3, 15),
            to_parent_distance_meters=tasha_distance,
            to_parent_in_geofence=tasha_in_geofence,
            # Completion status
            completed_at=tasha_check_in_time if status == "completed" else None,
            handoff_outcome=outcome if status == "completed" else None,
            window_start=window_start,
            window_end=window_end,
            created_at=scheduled - timedelta(days=7),
        )
        db.add(instance)
        instances_created += 1
    
    print(f"   ✅ Created 1 exchange template with {instances_created} instances")


async def create_messages(db, family, marcus, tasha):
    """Create sample messages with ARIA flags."""
    print("\n💬 Creating messages...")
    
    # Check for existing messages
    existing = await db.execute(
        select(Message).where(Message.family_file_id == FAMILY_FILE_ID).limit(1)
    )
    if existing.scalars().first():
        print("   ⚠️ Messages already exist, skipping...")
        return
    
    # Sample messages
    neutral_messages = [
        "Jayden did great at school today!",
        "Confirming pickup at 6pm Friday",
        "He needs his soccer cleats for practice tomorrow",
        "Thanks for sending his homework folder",
        "Just dropped him off at practice",
    ]
    
    flagged_messages = [
        ("You're always late!", "I noticed the pickup was delayed. Can we discuss ensuring timely exchanges?"),
        ("You never follow the schedule", "There seem to be some schedule inconsistencies. Can we review the agreement?"),
        ("This is ridiculous", "I have some concerns I'd like to discuss calmly."),
    ]
    
    messages_created = 0
    flags_created = 0
    
    # Create 30 neutral messages
    for i in range(30):
        sender = marcus if i % 2 == 0 else tasha
        content = random.choice(neutral_messages)
        days_ago = random.randint(1, 30)
        
        msg = Message(
            id=str(uuid.uuid4()),
            family_file_id=FAMILY_FILE_ID,
            case_id=family.case_id if hasattr(family, 'case_id') else None,
            sender_id=sender.id,
            content=content,
            channel="in_app",
            sent_at=datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(8, 20)),
            created_at=datetime.utcnow() - timedelta(days=days_ago),
        )
        db.add(msg)
        messages_created += 1
    
    # Create 5 messages with ARIA interventions
    for original, rewritten in flagged_messages:
        sender = random.choice([marcus, tasha])
        days_ago = random.randint(5, 25)
        
        msg = Message(
            id=str(uuid.uuid4()),
            family_file_id=FAMILY_FILE_ID,
            case_id=family.case_id if hasattr(family, 'case_id') else None,
            sender_id=sender.id,
            content=rewritten,  # ARIA rewrote it
            original_content=original,  # Original hostile message
            channel="in_app",
            is_aria_modified=True,
            sent_at=datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(8, 20)),
            created_at=datetime.utcnow() - timedelta(days=days_ago),
        )
        db.add(msg)
        await db.flush()
        
        # Create ARIA flag for this message
        flag = MessageFlag(
            id=str(uuid.uuid4()),
            message_id=msg.id,
            flag_type="tone_warning",
            reason="Hostile language detected",
            original_text=original,
            suggested_text=rewritten,
            toxicity_score=random.uniform(0.6, 0.9),
            categories=["hostility"],
            user_action="accepted" if random.random() > 0.3 else "rejected",
            created_at=msg.created_at,
        )
        db.add(flag)
        messages_created += 1
        flags_created += 1
    
    print(f"   ✅ Created {messages_created} messages with {flags_created} ARIA flags")


async def create_payments(db, family, marcus, tasha):
    """Create sample payment obligations and funding records."""
    print("\n💰 Creating payments...")
    
    # Check for existing obligations
    existing = await db.execute(
        select(Obligation).where(Obligation.family_file_id == FAMILY_FILE_ID).limit(1)
    )
    if existing.scalars().first():
        print("   ⚠️ Payments already exist, skipping...")
        return
    
    # Create monthly child support obligation
    obligation = Obligation(
        id=str(uuid.uuid4()),
        family_file_id=FAMILY_FILE_ID,
        payer_id=marcus.id,
        payee_id=tasha.id,
        title="Monthly Child Support",
        amount=1200.00,
        frequency="monthly",
        due_day=1,
        status="active",
        created_at=datetime.utcnow() - timedelta(days=90),
    )
    db.add(obligation)
    await db.flush()
    
    payments_created = 0
    
    # Create 3 months of funding records
    for i in range(3):
        payment_date = datetime.utcnow() - timedelta(days=30 * (i + 1))
        
        funding = ObligationFunding(
            id=str(uuid.uuid4()),
            obligation_id=obligation.id,
            payer_id=marcus.id,
            amount=1200.00,
            payment_method="stripe_transfer",
            stripe_payment_intent_id=f"pi_test_{uuid.uuid4().hex[:12]}",
            funded_at=payment_date,
            created_at=payment_date,
        )
        db.add(funding)
        payments_created += 1
    
    print(f"   ✅ Created 1 obligation with {payments_created} funding records")



async def create_events(db, family, marcus, tasha):
    """Create sample schedule events."""
    print("\n📅 Creating events...")
    
    # Check for existing events
    existing = await db.execute(
        select(ScheduleEvent).where(ScheduleEvent.family_file_id == FAMILY_FILE_ID).limit(1)
    )
    if existing.scalars().first():
        print("   ⚠️ Events already exist, skipping...")
        return
    
    event_templates = [
        ("Jayden's Soccer Practice", "sports", "Soccer Fields, Golden Gate Park"),
        ("Jayden's Doctor Appointment", "medical", "Pediatrics Clinic"),
        ("Parent-Teacher Conference", "school", "Roosevelt Elementary School"),
        ("Jayden's Birthday Party", "social", "Chuck E. Cheese"),
    ]
    
    events_created = 0
    
    for title, event_type, location in event_templates:
        days_offset = random.randint(-10, 15)
        
        event = ScheduleEvent(
            id=str(uuid.uuid4()),
            family_file_id=FAMILY_FILE_ID,
            title=title,
            event_type=event_type,
            location=location,
            start_time=datetime.utcnow() + timedelta(days=days_offset, hours=random.randint(9, 17)),
            end_time=datetime.utcnow() + timedelta(days=days_offset, hours=random.randint(18, 20)),
            created_by=random.choice([marcus.id, tasha.id]),
            visibility="both_parents",
            status="scheduled" if days_offset > 0 else "completed",
            created_at=datetime.utcnow() - timedelta(days=max(0, -days_offset) + 7),
        )
        db.add(event)
        events_created += 1
    
    print(f"   ✅ Created {events_created} events")


async def main():
    """Main execution."""
    print("=" * 60)
    print("SEEDING TEST DATA FOR BROWN FAMILY REPORTS")
    print(f"Family File: {FAMILY_FILE_ID}")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        try:
            # Get family info
            family, marcus, tasha = await get_family_info(db)
            
            if not family:
                print("❌ Cannot proceed without family file")
                return
            
            print(f"\n👨‍👩‍👦 Family: {family.id}")
            print(f"   Marcus: {marcus.first_name} {marcus.last_name} ({marcus.id})" if marcus else "   Marcus: Not found")
            print(f"   Tasha: {tasha.first_name} {tasha.last_name} ({tasha.id})" if tasha else "   Tasha: Not found")
            
            if not marcus or not tasha:
                print("❌ Both parents required")
                return
            
            # Create test data
            await create_custody_exchanges(db, family, marcus, tasha)
            await create_messages(db, family, marcus, tasha)
            await create_payments(db, family, marcus, tasha)
            await create_events(db, family, marcus, tasha)
            
            # Commit all changes
            await db.commit()
            
            print("\n" + "=" * 60)
            print("✅ TEST DATA SEEDING COMPLETE")
            print("=" * 60)
            print("\nYou can now generate compliance reports for this family.")
            
        except Exception as e:
            await db.rollback()
            print(f"\n❌ Error: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())

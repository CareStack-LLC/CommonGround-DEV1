import asyncio
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

# Set up path to backend root
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from app.core.database import get_db_context
from app.models.family_file import FamilyFile
from app.models.schedule import ScheduleEvent
from app.models.user import User

async def seed_events():
    print(f"🔧 Using backend directory: {backend_dir}")
    async with get_db_context() as db:
        print("🌱 Seeding Brown Family Events...")
        
        # Get Family File
        family_file_id = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"
        result = await db.execute(select(FamilyFile).where(FamilyFile.id == family_file_id))
        ff = result.scalars().first()
        if not ff:
            print(f"❌ Family File {family_file_id} not found.")
            # Fallback: list all family files
            files = (await db.execute(select(FamilyFile))).scalars().all()
            print("Available Family Files:")
            for f in files:
                print(f" - {f.title} ({f.id})")
            return

        print(f"Found Family File: {ff.id}")
        
        # Get Parents
        parent_a = await db.get(User, ff.parent_a_id)
        parent_b = await db.get(User, ff.parent_b_id)
        
        now = datetime.utcnow()
        
        events = [
            # School Events
            ScheduleEvent(
                title="Parent-Teacher Conference",
                event_type="regular",
                event_category="school",
                start_time=now - timedelta(days=45, hours=4),
                end_time=now - timedelta(days=45, hours=3),
                family_file_id=ff.id,
                created_by=parent_a.id,
                custodial_parent_id=parent_a.id,
                child_ids=[],
                location="Lincoln Elementary, Room 3B",
                is_exchange=False
            ),
            ScheduleEvent(
                title="Spring Concert",
                event_type="regular",
                event_category="school",
                start_time=now - timedelta(days=120, hours=2),
                end_time=now - timedelta(days=120, hours=0),
                family_file_id=ff.id,
                created_by=parent_a.id,
                custodial_parent_id=parent_a.id,
                child_ids=[],
                location="School Auditorium",
                is_exchange=False
            ),
            
            # Medical
            ScheduleEvent(
                title="Dentist Appointment (Terry)",
                event_type="regular",
                event_category="medical",
                start_time=now - timedelta(days=15, hours=5),
                end_time=now - timedelta(days=15, hours=4),
                family_file_id=ff.id,
                created_by=parent_b.id,
                custodial_parent_id=parent_b.id,
                child_ids=[],
                location="Smile Kids Dentistry",
                is_exchange=False
            ),
             ScheduleEvent(
                title="Annual Physical",
                event_type="regular",
                event_category="medical",
                start_time=now - timedelta(days=200, hours=1),
                end_time=now - timedelta(days=200, hours=0),
                family_file_id=ff.id,
                created_by=parent_a.id,
                custodial_parent_id=parent_a.id,
                child_ids=[],
                location="Pediatric Center",
                is_exchange=False
            ),
            
            # Activities
            ScheduleEvent(
                title="Soccer Practice",
                event_type="regular",
                event_category="activity",
                start_time=now - timedelta(days=3, hours=1),
                end_time=now - timedelta(days=3, hours=0),
                family_file_id=ff.id,
                created_by=parent_b.id,
                custodial_parent_id=parent_b.id,
                child_ids=[],
                location="Community Field",
                is_exchange=False
            ),
            
            # Modifications
            ScheduleEvent(
                title="Swap Weekend Request",
                event_type="vacation",
                event_category="general",
                start_time=now - timedelta(days=10),
                end_time=now - timedelta(days=8),
                family_file_id=ff.id,
                created_by=parent_a.id,
                custodial_parent_id=parent_a.id,
                child_ids=[],
                is_exchange=False,
                is_modification=True,
                modification_requested_by=parent_a.id,
                modification_approved=True,
                modification_approved_by=parent_b.id,
                status="completed"
            ),
            ScheduleEvent(
                title="Late Dropoff Request",
                event_type="one_time",
                event_category="general",
                start_time=now + timedelta(days=5),
                end_time=now + timedelta(days=5, hours=1),
                family_file_id=ff.id,
                created_by=parent_b.id,
                custodial_parent_id=parent_b.id,
                child_ids=[],
                is_exchange=False,
                is_modification=True,
                modification_requested_by=parent_b.id,
                modification_approved=False,
                status="pending"
            )
        ]
        
        for e in events:
            db.add(e)
            
        await db.commit()
        print(f"✅ Created {len(events)} sample events.")

if __name__ == "__main__":
    asyncio.run(seed_events())

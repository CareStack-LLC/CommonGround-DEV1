#!/usr/bin/env python3
"""
Create Case for Brown Family and Link All Data

This script:
1. Creates a Case record for the Brown family
2. Creates CaseParticipants for Marcus and Tasha
3. Updates all existing data (exchanges, messages, etc.) with the case_id
"""

import sys
import asyncio
from pathlib import Path
from datetime import datetime
import uuid

# Add parent directory for imports
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.case import Case, CaseParticipant
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.message import Message
from app.models.schedule import ScheduleEvent
from app.models.clearfund import Obligation

# Brown Family Details
FAMILY_FILE_ID = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"


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


async def create_case(db, family, marcus, tasha):
    """Create a Case for the Brown family."""
    print("\n⚖️ Creating Case for Brown Family...")
    
    # Check if case already exists
    existing = await db.execute(
        select(Case).where(Case.family_file_id == FAMILY_FILE_ID)
    )
    existing_case = existing.scalar_one_or_none()
    
    if existing_case:
        print(f"   ⚠️ Case already exists: {existing_case.id}")
        return existing_case
    
    # Create new case
    case = Case(
        id=str(uuid.uuid4()),
        case_number=f"SF-2026-{FAMILY_FILE_ID[:8].upper()}",
        case_name=f"Brown v. Brown (Marcus & Tasha)",
        state="CA",
        county="San Francisco",
        court="San Francisco Superior Court - Family Division",
        status="active",
        family_file_id=FAMILY_FILE_ID,
        aria_enabled=True,
        aria_provider="claude",
        created_at=datetime.utcnow(),
    )
    db.add(case)
    await db.flush()
    
    print(f"   ✅ Created Case: {case.id}")
    print(f"   Case Number: {case.case_number}")
    
    return case


async def create_participants(db, case, marcus, tasha):
    """Create CaseParticipants for both parents."""
    print("\n👨‍👩‍👧 Creating Case Participants...")
    
    # Check if participants exist
    existing = await db.execute(
        select(CaseParticipant).where(CaseParticipant.case_id == case.id)
    )
    if existing.scalars().first():
        print("   ⚠️ Participants already exist, skipping...")
        return
    
    # Create Marcus as petitioner
    marcus_participant = CaseParticipant(
        id=str(uuid.uuid4()),
        case_id=case.id,
        user_id=marcus.id,
        role="petitioner",
        parent_type="father",
        is_active=True,
        joined_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(marcus_participant)
    
    # Create Tasha as respondent
    tasha_participant = CaseParticipant(
        id=str(uuid.uuid4()),
        case_id=case.id,
        user_id=tasha.id,
        role="respondent",
        parent_type="mother",
        is_active=True,
        joined_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(tasha_participant)
    
    print(f"   ✅ Marcus Brown as Petitioner")
    print(f"   ✅ Tasha Brown as Respondent")


async def link_data_to_case(db, case):
    """Update all existing data with the case_id."""
    print("\n🔗 Linking existing data to case...")
    
    # Update custody exchanges
    exchange_result = await db.execute(
        update(CustodyExchange)
        .where(CustodyExchange.family_file_id == FAMILY_FILE_ID)
        .where(CustodyExchange.case_id == None)
        .values(case_id=case.id)
    )
    print(f"   ✅ Updated {exchange_result.rowcount} custody exchanges")
    
    # Update messages
    message_result = await db.execute(
        update(Message)
        .where(Message.family_file_id == FAMILY_FILE_ID)
        .where(Message.case_id == None)
        .values(case_id=case.id)
    )
    print(f"   ✅ Updated {message_result.rowcount} messages")
    
    # Update schedule events
    event_result = await db.execute(
        update(ScheduleEvent)
        .where(ScheduleEvent.family_file_id == FAMILY_FILE_ID)
        .where(ScheduleEvent.case_id == None)
        .values(case_id=case.id)
    )
    print(f"   ✅ Updated {event_result.rowcount} schedule events")
    
    # Update obligations
    obligation_result = await db.execute(
        update(Obligation)
        .where(Obligation.family_file_id == FAMILY_FILE_ID)
        .where(Obligation.case_id == None)
        .values(case_id=case.id)
    )
    print(f"   ✅ Updated {obligation_result.rowcount} obligations")


async def main():
    """Main execution."""
    print("=" * 60)
    print("CREATING CASE FOR BROWN FAMILY")
    print(f"Family File: {FAMILY_FILE_ID}")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        try:
            # Get family info
            family, parent1, parent2 = await get_family_info(db)
            
            if not family:
                print("❌ Cannot proceed without family file")
                return
            
            # Determine which is Marcus and Tasha
            marcus = None
            tasha = None
            for p in [parent1, parent2]:
                if p:
                    if p.first_name and p.first_name.lower() == "marcus":
                        marcus = p
                    elif p.first_name and p.first_name.lower() == "tasha":
                        tasha = p
            
            if not marcus:
                marcus = parent1 or parent2
            if not tasha:
                tasha = parent2 or parent1
            
            print(f"\n👨‍👩‍👦 Family: {family.id}")
            print(f"   Marcus: {marcus.first_name} {marcus.last_name} ({marcus.id})")
            print(f"   Tasha: {tasha.first_name} {tasha.last_name} ({tasha.id})")
            
            # Create case
            case = await create_case(db, family, marcus, tasha)
            
            # Create participants
            await create_participants(db, case, marcus, tasha)
            
            # Link data to case
            await link_data_to_case(db, case)
            
            # Commit all changes
            await db.commit()
            
            print("\n" + "=" * 60)
            print("✅ CASE CREATION COMPLETE")
            print("=" * 60)
            print(f"\nCase ID: {case.id}")
            print(f"Case Number: {case.case_number}")
            print("\nYou can now generate full compliance reports.")
            
        except Exception as e:
            await db.rollback()
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())

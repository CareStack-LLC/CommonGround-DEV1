
import asyncio
import sys
from pathlib import Path
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance

FAMILY_FILE_ID = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"
CASE_ID = "374e607c-edc1-4ae9-8e04-0ed682f1d1a7"

async def main():
    async with AsyncSessionLocal() as db:
        print("🔍 Searching for Missed Exchanges...")
        
        # 1. Get Parents for name mapping
        ff = await db.get(FamilyFile, FAMILY_FILE_ID)
        p1 = await db.get(User, ff.parent_a_id)
        p2 = await db.get(User, ff.parent_b_id)
        
        # Define Marcus/Tasha
        if p1.first_name.lower() == "marcus":
            marcus, tasha = p1, p2
        else:
            marcus, tasha = p2, p1
            
        parent_map = {marcus.id: marcus.first_name, tasha.id: tasha.first_name}

        # 2. Find Missed Instances
        stmt = (
            select(CustodyExchangeInstance)
            .join(CustodyExchange)
            .where(
                and_(
                    CustodyExchange.case_id == CASE_ID,
                    CustodyExchangeInstance.status == 'missed'
                )
            )
            .options(selectinload(CustodyExchangeInstance.exchange))
            .order_by(CustodyExchangeInstance.scheduled_time.desc())
        )
        
        result = await db.execute(stmt)
        missed_instances = result.scalars().all()
        
        if not missed_instances:
            print("✅ No missed exchanges found.")
            return

        print(f"\nFound {len(missed_instances)} missed exchanges:\n")
        print(f"{'Date':<12} | {'Time':<10} | {'Parent Responsible':<20} | {'Notes'}")
        print("-" * 80)
        
        for instance in missed_instances:
            exchange = instance.exchange
            date_str = instance.scheduled_time.strftime("%Y-%m-%d")
            time_str = instance.scheduled_time.strftime("%I:%M %p")
            
            # Determine who missed
            responsible = []
            
            # Check From Parent
            if not instance.from_parent_checked_in:
                name = parent_map.get(exchange.from_parent_id, "Unknown")
                responsible.append(f"{name} (From)")
                
            # Check To Parent
            if not instance.to_parent_checked_in:
                name = parent_map.get(exchange.to_parent_id, "Unknown")
                responsible.append(f"{name} (To)")
            
            resp_str = ", ".join(responsible) if responsible else "Unknown (System?)"
            notes = instance.notes or "No notes"
            
            print(f"{date_str:<12} | {time_str:<10} | {resp_str:<20} | {notes}")

if __name__ == "__main__":
    asyncio.run(main())

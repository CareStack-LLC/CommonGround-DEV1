
import asyncio
import os
import sys
from datetime import datetime, timedelta

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.core.database import get_db_context
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.family_file import FamilyFile
from app.models.professional import ProfessionalProfile, CaseAssignment
from app.models.user import User

async def debug_schedule():
    family_file_id = "efc1b35e-7153-4622-ac16-784a5aef13ea"
    professional_user_id = "b0b00002-0000-4000-a000-000000000000"
    
    async with get_db_context() as db:
        print(f"\n--- Debugging Schedule for Family {family_file_id} ---\n")
        
        # 1. Check Family File
        ff = await db.get(FamilyFile, family_file_id)
        if ff:
            print(f"Family File found: {ff.id}")
            print(f"Legacy Case ID: {ff.legacy_case_id}")
        else:
            print("ERROR: Family File not found!")
            return

        # 2. Check Exchanges (Series)
        query = select(CustodyExchange).where(CustodyExchange.family_file_id == family_file_id)
        result = await db.execute(query)
        exchanges = result.scalars().all()
        print(f"\nTotal Exchanges Found: {len(exchanges)}")
        
        # 3. Check Instances (Actual Events) within broad range (+/- 100 days)
        now = datetime.utcnow()
        start_date = now - timedelta(days=100)
        end_date = now + timedelta(days=100)
        
        query_inst = (
            select(CustodyExchangeInstance)
            .join(CustodyExchange)
            .where(
                and_(
                    CustodyExchange.family_file_id == family_file_id,
                    CustodyExchangeInstance.scheduled_time >= start_date,
                    CustodyExchangeInstance.scheduled_time <= end_date
                )
            )
            .order_by(CustodyExchangeInstance.scheduled_time)
        )
        result_inst = await db.execute(query_inst)
        instances = result_inst.scalars().all()
        
        print(f"\nInstances found in +/- 100 days: {len(instances)}")

        # 4. Find Assigned Professional
        print(f"\n--- Finding Assigned Professional for Family {family_file_id} ---")
        
        assignments_result = await db.execute(
            select(CaseAssignment)
            .options(selectinload(CaseAssignment.professional).selectinload(ProfessionalProfile.user))
            .where(CaseAssignment.family_file_id == family_file_id)
        )
        assignments = assignments_result.scalars().all()
        
        if not assignments:
            print("No professionals assigned to this family file.")
        else:
            for assign in assignments:
                prof_user = assign.professional.user
                print(f"Found Assignment: Professional={assign.professional_id}, User={prof_user.id}, Status={assign.status}")
                
                # 5. Simulate Service Call for this Professional
                print(f"\n--- Simulating Service Call for Professional User {prof_user.id} ---")
                
                from app.services.custody_exchange import CustodyExchangeService
                try:
                    service_instances = await CustodyExchangeService.get_instances_in_range(
                        db=db,
                        case_id=family_file_id,
                        viewer_id=str(prof_user.id),
                        start_date=start_date,
                        end_date=end_date
                    )
                    print(f"Service returned {len(service_instances)} instances.")
                except Exception as e:
                    print(f"Service call FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(debug_schedule())


import asyncio
import os
import sys
from datetime import datetime, timedelta

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))

from app.core.database import get_db_context
from app.services.custody_exchange import CustodyExchangeService
from app.services.clearfund import ClearFundService
from app.schemas.clearfund import ObligationFilters
from app.models.user import User

async def debug_errors():
    case_id = "efc1b35e-7153-4622-ac16-784a5aef13ea"
    professional_user_id = "5605f25a-4b0d-4581-8848-038290317e07" # Copied from previous logs/context if available, otherwise need to find one.
    # Actually, I'll fetch the professional user who is assigned to this case to be realistic.

    async with get_db_context() as db:
        print(f"Debugging Case ID: {case_id}")

        # 1. Find a professional user assigned to this case to simulate the request
        from app.models.professional import CaseAssignment
        from sqlalchemy import select
        result = await db.execute(select(CaseAssignment).where(CaseAssignment.family_file_id == case_id))
        assignment = result.scalars().first()
        
        if not assignment:
            print("No professional assigned to this case found. Cannot simulate exact user.")
            return

        print(f"Found assigned professional: {assignment.professional_id}")
        
        # Get the User object for this professional
        from app.models.professional import ProfessionalProfile
        prof_result = await db.execute(select(ProfessionalProfile).where(ProfessionalProfile.id == assignment.professional_id))
        profile = prof_result.scalar_one()
        
        user_result = await db.execute(select(User).where(User.id == profile.user_id))
        current_user = user_result.scalar_one()
        print(f"Simulating as User: {current_user.email} ({current_user.id})")

        # 2. Reproduce 500 Error on /exchanges/case/{id}/history
        print("\n--- Testing Exchange History ---")
        try:
            now = datetime.utcnow()
            start_date = now - timedelta(days=30)
            end_date = now + timedelta(days=30)
            
            instances = await CustodyExchangeService.get_instances_in_range(
                db=db,
                case_id=case_id,
                viewer_id=current_user.id,
                start_date=start_date,
                end_date=end_date
            )
            print(f"Success! Retrieved {len(instances)} instances.")
        except Exception as e:
            print(f"CAUGHT EXPECTED ERROR (Exchange History): {e}")
            import traceback
            traceback.print_exc()
        # 4. Reproduce 500 Error on /professional/cases/{id}/timeline/summary
        print("\n--- Testing Timeline Summary ---")
        try:
            from app.services.professional.timeline_service import CaseTimelineService
            timeline_service = CaseTimelineService(db)
            summary = await timeline_service.get_timeline_summary(
                family_file_id=case_id,
                professional_id=profile.id,
                days=30
            )
            print(f"Success! Retrieved timeline summary: {summary}")
        except Exception as e:
            print(f"CAUGHT EXPECTED ERROR (Timeline): {e}")
            import traceback
            traceback.print_exc()
        # 3. Reproduce 403 Error on /clearfund/obligations
        print("\n--- Testing ClearFund Obligations ---")
        try:
            service = ClearFundService(db)
            filters = ObligationFilters()
            obligations, total = await service.list_obligations(
                case_id=case_id,
                filters=filters,
                page=1,
                page_size=20,
                user=current_user
            )
            print(f"Success! Retrieved {total} obligations.")
        except Exception as e:
            print(f"CAUGHT EXPECTED ERROR (ClearFund): {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_errors())

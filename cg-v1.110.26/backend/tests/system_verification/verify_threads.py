import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from app.core.database import get_db_context
from app.services.professional.communications_service import CommunicationsService
from app.models.professional import CaseAssignment, AssignmentStatus

async def verify_threads():
    async with get_db_context() as db:
        print("Finding a valid professional assignment...")
        # Get an active assignment
        result = await db.execute(
            select(CaseAssignment)
            .where(CaseAssignment.status == AssignmentStatus.ACTIVE.value)
            .limit(1)
        )
        assignment = result.scalar_one_or_none()
        
        if not assignment:
            print("No active case assignments found.")
            return

        print(f"Found assignment: Prof {assignment.professional_id} -> Family {assignment.family_file_id}")
        
        # Check permissions
        print(f"Scopes: {assignment.access_scopes}")
        if "messages" not in (assignment.access_scopes or []):
            print("WARNING: Assignment missing 'messages' scope. Updating...")
            assignment.access_scopes = (assignment.access_scopes or []) + ["messages"]
            db.add(assignment)
            await db.commit()
            print("Added 'messages' scope.")

        service = CommunicationsService(db)
        
        print(f"\nCalling get_threads for family_file_id={assignment.family_file_id}...")
        try:
            threads = await service.get_threads(
                family_file_id=assignment.family_file_id,
                professional_id=assignment.professional_id
            )
            print(f"Threads result: {threads}")
        except Exception as e:
            print(f"Error calling get_threads: {e}")
            import traceback
            traceback.print_exc()

        print(f"\nCalling get_communication_stats for family_file_id={assignment.family_file_id}...")
        try:
            stats = await service.get_communication_stats(
                family_file_id=assignment.family_file_id,
                professional_id=assignment.professional_id
            )
            print(f"Stats result keys: {stats.keys()}")
            print(f"Flag Categories: {stats.get('flag_categories')}")
            print(f"Good Faith Scores: {stats.get('good_faith_scores')}")
            
            if 'flag_categories' not in stats:
                print("ERROR: flag_categories missing from stats")
            if 'good_faith_scores' not in stats:
                print("ERROR: good_faith_scores missing from stats")
                
        except Exception as e:
            print(f"Error calling get_communication_stats: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_threads())


import asyncio
import os
import sys
from uuid import uuid4
from dotenv import load_dotenv

# Load environment variables from backend/.env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env"))
load_dotenv(env_path)

from app.core.database import AsyncSessionLocal
from app.services.professional.intake_service import ProfessionalIntakeService
from app.models.professional import ProfessionalProfile
from sqlalchemy import select

async def reproduce_list_error():
    async with AsyncSessionLocal() as db:
        print("Authenticating as a professional...")
        # Find a professional profile
        result = await db.execute(select(ProfessionalProfile).limit(1))
        profile = result.scalar_one_or_none()
        
        if not profile:
            print("No professional profile found. creating dummy one?")
            return

        print(f"Found professional: {profile.id}")
        
        service = ProfessionalIntakeService(db)

        print("Attempting to list intake sessions...")
        try:
            sessions, total = await service.list_sessions(
                professional_id=profile.id,
                limit=100
            )
            print(f"SUCCESS: Found {total} sessions.")
            for s in sessions:
                print(f" - {s.id} (Status: {s.status})")
                # access fields to trigger lazy loading if any
                print(f"   Case: {s.case_id}, Parent: {s.parent_id}, Firm: {s.firm_id}")
                
        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(reproduce_list_error())

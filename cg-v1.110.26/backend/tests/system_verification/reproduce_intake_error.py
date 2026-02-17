import asyncio
import os
import sys
from uuid import uuid4

# Add the project root to the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

from app.core.database import AsyncSessionLocal
from app.services.professional.intake_service import ProfessionalIntakeService
from app.models.professional import ProfessionalProfile
from sqlalchemy import select

async def reproduce_error():
    async with AsyncSessionLocal() as db:
        print("Authenticating as a professional...")
        # Get a professional
        result = await db.execute(select(ProfessionalProfile).limit(1))
        profile = result.scalar_one_or_none()
        
        if not profile:
            print("No professional profile found. Cannot test.")
            return

        print(f"Testing with Professional ID: {profile.id}")
        
        service = ProfessionalIntakeService(db)
        
        print("Attempting to create intake session (Standalone)...")
        # Mimic data from frontend for a new client
        session = await service.create_session(
            professional_id=profile.id,
            client_name="Test Client",
            client_email=f"test_client_{uuid4()}@example.com", # Random email to ensure no user exists
            client_phone="555-0123",
            intake_type="custody",
            notes="Test notes"
        )
        print("SUCCESS: Session created!")
        print(f"Session ID: {session.id}")
        print(f"Intake Link: {session.intake_link}")
            
if __name__ == "__main__":
    asyncio.run(reproduce_error())

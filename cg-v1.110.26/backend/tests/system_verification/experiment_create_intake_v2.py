
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


async def reproduce_creation_error():
    async with AsyncSessionLocal() as db:
        print("Authenticating as a professional...")
        result = await db.execute(select(ProfessionalProfile).limit(1))
        profile = result.scalar_one_or_none()
        
        if not profile:
            print("No professional profile found.")
            return

        print(f"Found professional: {profile.id}")
        service = ProfessionalIntakeService(db)

        # Import detail serializer
        try:
            from app.api.v1.endpoints.professional import _intake_session_to_detail
            print("Imported _intake_session_to_detail.")
        except ImportError:
            print("FAILED to import _intake_session_to_detail.")
            return

        print("Attempting to create intake session...")
        try:
            # firm_id is optional in endpoint, simulating that
            # Case ID/Parent ID optional too
            session = await service.create_session(
                professional_id=profile.id,
                client_name="Test Creation Client",
                client_email="create_test@example.com",
                intake_type="custody",
                firm_id=None, 
            )
            print(f"Created session: {session.id}")
            
            print("Attempting serialization to Detail response...")
            try:
                detail = _intake_session_to_detail(session)
                print("SUCCESS: Serialized to Detail.")
                # print(detail.model_dump_json(indent=2)) # noisy
            except Exception as ser_err:
                print(f"SERIALIZATION ERROR: {ser_err}")
                import traceback
                traceback.print_exc()

        except Exception as e:
            print(f"CREATION ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(reproduce_creation_error())

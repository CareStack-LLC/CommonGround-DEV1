
import asyncio
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

from app.db.session import AsyncSessionLocal
from app.services.professional.intake_service import ProfessionalIntakeService
from app.models.professional import ProfessionalProfile
from sqlalchemy import select
from app.api.v1.endpoints.professional import _intake_session_to_detail

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

        print("Attempting to create intake session...")
        try:
            session = await service.create_session(
                professional_id=profile.id,
                client_name="Test Client",
                client_email="test@example.com",
                intake_type="custody",
                firm_id=None, # firm_id is optional in endpoint
            )
            print(f"Created session: {session.id}")
            
            print("Attempting serialization to Detail response...")
            try:
                # This mimics the endpoint logic: return _intake_session_to_detail(session)
                detail = _intake_session_to_detail(session)
                print("SUCCESS: Serialized to Detail.")
                print(detail.model_dump_json(indent=2))
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

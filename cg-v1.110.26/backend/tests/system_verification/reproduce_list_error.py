
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
            print("No professional profile found.")
            return

        print(f"Found professional: {profile.id}")
        
        service = ProfessionalIntakeService(db)

        # Create a session if needed to verify serialization
        from app.models.intake import IntakeSession, IntakeStatus, generate_session_number
        from datetime import datetime, timedelta
        
        # Check existing
        sessions, total = await service.list_sessions(professional_id=profile.id)
        if total == 0:
            print("Creating dummy session to test serialization...")
            new_session = IntakeSession(
                session_number=generate_session_number(),
                professional_id=profile.id,
                status=IntakeStatus.PENDING.value,
                access_link_expires_at=datetime.utcnow() + timedelta(days=7),
                # Minimal fields to satisfy model
            )
            db.add(new_session)
            await db.commit()
            print(f"Created session: {new_session.id}")


        print("Attempting to list intake sessions again...")
        try:
            sessions, total = await service.list_sessions(
                professional_id=profile.id,
                limit=100
            )
            print(f"SUCCESS: Found {total} sessions.")
            
            # Import the actual serialization function from professional endpoint
            try:
                from app.api.v1.endpoints.professional import _intake_session_to_list_item
                print("Successfully imported _intake_session_to_list_item")
            except ImportError:
                print("Could not import _intake_session_to_list_item directly. Skipping check.")
                return


            # Test edge cases for client_name extraction
            from app.models.intake import IntakeSession, IntakeStatus, generate_session_number
            from datetime import datetime, timedelta
            import uuid
            
            edge_cases = [
                {"msg": [], "desc": "Empty messages list"},
                {"msg": None, "desc": "None messages"},
                {"msg": [{"role": "user", "content": "Hi"}], "desc": "User message only"},
                {"msg": [{"role": "system", "content": "No pattern matching."}], "desc": "System message no pattern"},
                {"msg": [{"role": "system"}], "desc": "System message no content"},
                {"msg": "Not a list", "desc": "Invalid type (str)"},
            ]

            print("\nTesting edge cases for client_name extraction...")
            for case in edge_cases:
                print(f"  Testing: {case['desc']}")
                # create temp session object in memory (mock)
                # We can't use DB session easily without flushing, so we mock attributes
                class MockSession:
                    def __init__(self, messages):
                        self.id = str(uuid.uuid4())
                        self.session_number = "S-MOCK"
                        self.created_at = datetime.utcnow()
                        self.updated_at = datetime.utcnow()
                        self.started_at = None
                        self.completed_at = None
                        self.messages = messages
                        self.target_forms = []
                        self.custom_questions = []
                        self.status = "pending"
                        self.message_count = 0
                        self.aria_summary = None
                        self.extracted_data = None
                        self.parent_confirmed = False
                        self.professional_reviewed = False
                        self.clarification_requested = False
                        self.firm_id = None
                        self.family_file_id = None
                        self.case_assignment_id = None
                        self.access_link_expires_at = datetime.utcnow()
                        # Missing firm_id? No, added.

                mock_s = MockSession(case['msg'])
                try:
                    item = _intake_session_to_list_item(mock_s)
                    print(f"    Pass. Name: {item.client_name}")
                except Exception as e:
                    print(f"    FAIL: {e}")
                    import traceback
                    traceback.print_exc()

                
        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(reproduce_list_error())

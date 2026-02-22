"""Reproduce the 500 error on GET /professional/intake/sessions/{session_id}"""
import os, sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from sqlalchemy import select, and_, or_
from app.core.database import AsyncSessionLocal
from app.models.intake import IntakeSession
from app.models.professional import ProfessionalProfile
from app.schemas.professional import IntakeSessionListItem, IntakeSessionDetail
import asyncio
import re

SESSION_ID = "3dbc9538-ea21-412e-8f66-6019303026c7"
PROFESSIONAL_ID = "b0b00002-0000-4000-a000-000000000000"

async def reproduce():
    async with AsyncSessionLocal() as db:
        # 1. Fetch session exactly as the service does
        print("--- Step 1: Fetch session ---")
        profile_result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.id == PROFESSIONAL_ID)
        )
        profile = profile_result.scalar_one_or_none()
        print(f"  Profile: {profile}")
        print(f"  court_professional_id: {profile.court_professional_id if profile else 'N/A'}")

        access_conditions = [IntakeSession.id == SESSION_ID]
        if profile and profile.court_professional_id:
            access_conditions.append(
                or_(
                    IntakeSession.professional_id == profile.court_professional_id,
                    IntakeSession.professional_id == PROFESSIONAL_ID,
                )
            )
        else:
            access_conditions.append(IntakeSession.professional_id == PROFESSIONAL_ID)

        result = await db.execute(
            select(IntakeSession).where(and_(*access_conditions))
        )
        session = result.scalar_one_or_none()

        if not session:
            print("❌ Session NOT FOUND (would return 404)")
            return

        print(f"  ✅ Session found: {session.id} (status={session.status})")

        # 2. Try _intake_session_to_list_item
        print("\n--- Step 2: Build IntakeSessionListItem ---")
        try:
            client_name = None
            client_email = None
            if session.messages and len(session.messages) > 0:
                first_msg = session.messages[0]
                if isinstance(first_msg, dict) and first_msg.get("role") == "system":
                    content = first_msg.get("content", "")
                    name_match = re.search(r"Intake session for ([^.]+)", content)
                    email_match = re.search(r"Email: ([^.]+)", content)
                    if name_match:
                        client_name = name_match.group(1).strip()
                    if email_match:
                        client_email = email_match.group(1).strip()

            print(f"  client_name={client_name}, client_email={client_email}")
            print(f"  session.message_count={session.message_count}")
            print(f"  session.messages count={len(session.messages or [])}")
            print(f"  session.target_forms={session.target_forms}")
            print(f"  session.created_at={session.created_at}, type={type(session.created_at)}")
            print(f"  session.updated_at={session.updated_at}, type={type(session.updated_at)}")
            print(f"  session.access_link_expires_at={session.access_link_expires_at}")
            print(f"  session.access_token={session.access_token}")

            # Check intake_link property
            try:
                link = session.intake_link
                print(f"  session.intake_link={link}")
            except Exception as e:
                print(f"  ❌ session.intake_link CRASHED: {e}")

            list_item = IntakeSessionListItem(
                id=session.id,
                session_number=session.session_number,
                client_name=client_name,
                client_email=client_email,
                status=session.status,
                intake_type=session.target_forms[0] if session.target_forms else "custody",
                message_count=session.message_count or len(session.messages or []),
                has_summary=session.aria_summary is not None,
                has_extracted_data=session.extracted_data is not None,
                parent_confirmed=session.parent_confirmed,
                professional_reviewed=session.professional_reviewed,
                clarification_requested=session.clarification_requested,
                firm_id=session.firm_id,
                family_file_id=session.family_file_id,
                case_assignment_id=session.case_assignment_id,
                created_at=session.created_at,
                updated_at=session.updated_at,
                started_at=session.started_at,
                completed_at=session.completed_at,
                access_link_expires_at=session.access_link_expires_at,
                access_token=session.access_token,
                intake_link=session.intake_link,
                target_forms=session.target_forms or [],
            )
            print(f"  ✅ IntakeSessionListItem built successfully")
        except Exception as e:
            print(f"  ❌ IntakeSessionListItem FAILED: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return

        # 3. Try _intake_session_to_detail
        print("\n--- Step 3: Build IntakeSessionDetail ---")
        try:
            detail = IntakeSessionDetail(
                **list_item.model_dump(),
                custom_questions=session.custom_questions,
                aria_provider=session.aria_provider,
                aria_summary=session.aria_summary,
                extracted_data=session.extracted_data,
                draft_form_url=session.draft_form_url,
                draft_form_generated_at=session.draft_form_generated_at,
                parent_confirmed_at=session.parent_confirmed_at,
                parent_edits=session.parent_edits,
                professional_reviewed_at=session.professional_reviewed_at,
                professional_notes=session.professional_notes,
                clarification_request=session.clarification_request,
                clarification_response=session.clarification_response,
            )
            print(f"  ✅ IntakeSessionDetail built successfully")
        except Exception as e:
            print(f"  ❌ IntakeSessionDetail FAILED: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(reproduce())

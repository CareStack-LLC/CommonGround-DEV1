import asyncio
import os
import sys

# Manually set environment variables BEFORE importing app config
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres.qqttugwxmkbnrgzgqbkz:ozXOnwqMOzIqvqHx@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
os.environ["SUPABASE_URL"] = "https://qqttugwxmkbnrgzgqbkz.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "key" # Placeholder
os.environ["SUPABASE_SERVICE_KEY"] = "key" # Placeholder
os.environ["ANTHROPIC_API_KEY"] = "key"
os.environ["OPENAI_API_KEY"] = "key"
os.environ["STRIPE_SECRET_KEY"] = "key"
os.environ["STRIPE_PUBLISHABLE_KEY"] = "key"
os.environ["STRIPE_WEBHOOK_SECRET"] = "key"
os.environ["SECRET_KEY"] = "dummy"

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal as async_session_factory
from app.models.intake import IntakeSession
from app.schemas.intake import IntakeSessionListItem

async def check_intake_data():
    try:
        async with async_session_factory() as db:
            print("Fetching sessions...")
            result = await db.execute(select(IntakeSession))
            sessions = result.scalars().all()
            print(f"Found {len(sessions)} sessions. Validating against schema...")

            for s in sessions:
                try:
                    # Mimic the logic in list_intake_sessions
                    client_name = "Unknown Client"
                    if isinstance(s.messages, list) and s.messages and isinstance(s.messages[0], dict):
                        client_name = s.messages[0].get("content", "").split(".")[0].replace("Intake session for ", "")

                    item_dict = {
                        "id": s.id,
                        "session_number": s.session_number,
                        "case_id": s.case_id,
                        "parent_id": s.parent_id,
                        "firm_id": s.firm_id,
                        "case_assignment_id": s.case_assignment_id,
                        "family_file_id": s.family_file_id,
                        "target_forms": s.target_forms or [],
                        "status": s.status,
                        "message_count": s.message_count or 0,
                        "parent_confirmed": s.parent_confirmed or False,
                        "professional_reviewed": s.professional_reviewed or False,
                        "clarification_requested": s.clarification_requested or False,
                        "access_link_expires_at": s.access_link_expires_at, # This was missing before
                        "has_summary": bool(s.aria_summary),
                        "created_at": s.created_at,
                        "updated_at": s.updated_at,
                        "completed_at": s.completed_at,
                        "client_name": client_name,
                        "client_email": None,
                        "intake_type": "custody",
                    }
                    
                    # Validate
                    IntakeSessionListItem(**item_dict)
                    print(f"Session {s.id} OK")
                    
                except Exception as e:
                    print(f"Session {s.id} FAILED VALIDATION: {e}")

    except Exception as e:
        print(f"Error checking data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_intake_data())

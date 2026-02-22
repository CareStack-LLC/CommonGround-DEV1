import sys
import os
import asyncio
from dotenv import load_dotenv

# Add backend to path and load env
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.intake import IntakeSession
from app.models.professional import ProfessionalProfile

async def deep_dive_session(session_id):
    async with AsyncSessionLocal() as db:
        print(f"\n--- Inspecting Session: {session_id} ---")
        
        # 1. Get Session
        result = await db.execute(select(IntakeSession).where(IntakeSession.id == session_id))
        session = result.scalar_one_or_none()
        
        if not session:
            print("❌ Session NOT FOUND in database.")
            return

        print(f"✅ Session Found!")
        print(f"  ID: {session.id}")
        print(f"  Status: {session.status}")
        print(f"  Professional ID (on session): {session.professional_id}")
        
        # 2. Check Professional Profile from Session
        prof_result = await db.execute(select(ProfessionalProfile).where(ProfessionalProfile.id == session.professional_id))
        session_prof = prof_result.scalar_one_or_none()
        
        if session_prof:
            print(f"\n✅ Session linked to Profile: {session_prof.id}")
            print(f"  User ID: {session_prof.user_id}")
            print(f"  Court Professional ID: {session_prof.court_professional_id}")
            
            # 3. Check for OTHER profiles for this user
            print(f"\n--- Checking ALL profiles for User {session_prof.user_id} ---")
            user_profs = await db.execute(select(ProfessionalProfile).where(ProfessionalProfile.user_id == session_prof.user_id))
            for p in user_profs.scalars():
                print(f"  Profile ID: {p.id}")
                print(f"    - Court Prof ID: {p.court_professional_id}")
                print(f"    - Firm ID: {p.firm_id}")
                
                # Check access for EACH profile
                can_access = False
                if p.court_professional_id:
                     if session.professional_id == p.court_professional_id or session.professional_id == p.id:
                         can_access = True
                else:
                    if session.professional_id == p.id:
                        can_access = True
                
                print(f"    -> Can Access Session? {'YES' if can_access else 'NO'}")

        else:
             print(f"❌ Session linked to non-existent Profile {session.professional_id}")

if __name__ == "__main__":
    session_id = "3dbc9538-ea21-412e-8f66-6019303026c7"
    asyncio.run(deep_dive_session(session_id))

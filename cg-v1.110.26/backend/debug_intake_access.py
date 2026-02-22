import sys
import os
import asyncio
from dotenv import load_dotenv

# Add backend to path and load env
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from sqlalchemy import select, and_, or_
from app.core.database import AsyncSessionLocal
from app.models.intake import IntakeSession
from app.models.professional import ProfessionalProfile, FirmMembership

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
        from sqlalchemy.orm import selectinload
        prof_result = await db.execute(
            select(ProfessionalProfile)
            .where(ProfessionalProfile.id == session.professional_id)
            .options(selectinload(ProfessionalProfile.firm_memberships))
        )
        session_prof = prof_result.scalar_one_or_none()
        
        if session_prof:
            print(f"\n✅ Session linked to Profile: {session_prof.id}")
            print(f"  User ID: {session_prof.user_id}")
            print(f"  Court Professional ID: {session_prof.court_professional_id}")
            
            # 3. Check for OTHER profiles for this user
            print(f"\n--- Checking ALL profiles for User {session_prof.user_id} ---")
            user_profs = await db.execute(
                select(ProfessionalProfile)
                .where(ProfessionalProfile.user_id == session_prof.user_id)
                .options(selectinload(ProfessionalProfile.firm_memberships))
            )
            for p in user_profs.scalars():
                print(f"  Profile ID: {p.id}")
                print(f"    - Court Prof ID: {p.court_professional_id}")
                print(f"    - Firms: {[m.firm_id for m in p.firm_memberships]}")
                
                # Check access logic as used in the service
                # access_conditions.append(IntakeSession.professional_id == professional_id)
                # OR if profile.court_professional_id:
                #    OR(professional_id == court_professional_id, professional_id == professional_id)
                
                can_access = False
                if p.court_professional_id:
                     if session.professional_id == p.court_professional_id or session.professional_id == p.id:
                         can_access = True
                else:
                    if session.professional_id == p.id:
                        can_access = True
                
                print(f"    -> Can Access Session? {'YES' if can_access else 'NO'}")

        # 4. Simulate EXACT service query
        print(f"\n--- Simulating Service Query for session_id='{session_id}' and professional_id='{session.professional_id}' ---")
        
        # Exact code from ProfessionalIntakeService.get_session
        professional_id = session.professional_id
        profile_query = await db.execute(
            select(ProfessionalProfile).where(
                ProfessionalProfile.id == professional_id
            )
        )
        profile = profile_query.scalar_one_or_none()
        
        access_conditions = [IntakeSession.id == session_id]
        if profile and profile.court_professional_id:
            access_conditions.append(
                or_(
                    IntakeSession.professional_id == profile.court_professional_id,
                    IntakeSession.professional_id == professional_id,
                )
            )
        else:
            access_conditions.append(IntakeSession.professional_id == professional_id)

        sim_query = select(IntakeSession).where(and_(*access_conditions))
        print(f"  SQL: {sim_query}")
        
        sim_result = await db.execute(sim_query)
        sim_session = sim_result.scalar_one_or_none()
        
        if sim_session:
            print(f"✅ Simulation SUCCESS: Found session {sim_session.id}")
        else:
            print("❌ Simulation FAILED: Session not found with these conditions.")

        # 5. List ALL sessions for this professional
        print(f"\n--- Listing ALL sessions for Professional {session.professional_id} ---")
        all_sessions_query = select(IntakeSession).where(IntakeSession.professional_id == session.professional_id)
        all_sessions_res = await db.execute(all_sessions_query)
        sessions = all_sessions_res.scalars().all()
        print(f"  Count: {len(sessions)}")
        for s in sessions:
            print(f"  - Session ID: {s.id} (Status: {s.status}, Client: {s.client_name if hasattr(s, 'client_name') else 'N/A'})")
            # Re-check: IntakeSession DOES NOT have a client_name column in the model I saw earlier?
            # Wait, let me check IntakeSession model again.
            
        # 6. Check for exact ID match (case-sensitivity check)
        print(f"\n--- Checking for exact ID match (case-sensitivity check) ---")
        res2 = await db.execute(select(IntakeSession).where(IntakeSession.id.ilike(session_id)))
        if res2.scalar_one_or_none():
            print("  Note: ilike matched.")
        else:
            print("  Note: ilike did NOT match.")

        # 7. Check User record
        from app.models.user import User
        user_res = await db.execute(select(User).where(User.id == session_prof.user_id))
        user = user_res.scalar_one_or_none()
        if user:
            print(f"\n--- User Record for {session_prof.user_id} ---")
            print(f"  Name: {user.first_name} {user.last_name}")
            print(f"  Email: {user.email}")
        else:
            print(f"\n❌ User NOT FOUND for ID {session_prof.user_id}")

        # 8. Test Cross-Professional Access in Same Firm
        print(f"\n--- Testing Cross-Professional Access (Same Firm) ---")
        # Find another professional in the same firm (ca5e0002)
        other_prof_query = await db.execute(
            select(ProfessionalProfile)
            .join(FirmMembership)
            .where(
                and_(
                    FirmMembership.firm_id == 'ca5e0002-0000-4000-a000-000000000000',
                    ProfessionalProfile.id != session.professional_id
                )
            )
            .limit(1)
        )
        other_prof = other_prof_query.scalar_one_or_none()
        
        if other_prof:
            print(f"  Found other professional: {other_prof.id}")
            # Simulate get_session for OTHER professional
            access_conditions = [IntakeSession.id == session_id]
            if other_prof.court_professional_id:
                access_conditions.append(
                    or_(
                        IntakeSession.professional_id == other_prof.court_professional_id,
                        IntakeSession.professional_id == other_prof.id,
                    )
                )
            else:
                access_conditions.append(IntakeSession.professional_id == other_prof.id)

            other_sim_query = select(IntakeSession).where(and_(*access_conditions))
            other_sim_res = await db.execute(other_sim_query)
            if other_sim_res.scalar_one_or_none():
                print("  ✅ Access SUCCESS (Puzzlingly, since we expect failure)")
            else:
                print("  ❌ Access FAILED (As expected if firm-wide access is missing)")
        else:
            print("  (Could not find another professional in the same firm to test)")

if __name__ == "__main__":
    session_id = "3dbc9538-ea21-412e-8f66-6019303026c7"
    asyncio.run(deep_dive_session(session_id))

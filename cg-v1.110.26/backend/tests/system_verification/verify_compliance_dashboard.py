import asyncio
import os
import sys
from datetime import datetime

# Add the project root to the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))
print(f"DEBUG: sys.path: {sys.path}")
print(f"DEBUG: backend contents: {os.listdir(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))}")

from app.core.database import AsyncSessionLocal
from app.services.professional.compliance_service import ProfessionalComplianceService
from sqlalchemy import select
from app.models.family_file import FamilyFile
from app.models.professional import ProfessionalProfile, CaseAssignment

async def verify_compliance_dashboard():
    print("Starting Compliance Dashboard Verification...")
    
    async with AsyncSessionLocal() as db:
        # 1. Find a FamilyFile (ideally one without a legacy_case_id if possible, or any active one)
        result = await db.execute(select(FamilyFile).limit(1))
        family_file = result.scalar_one_or_none()
        
        if not family_file:
            print("No FamilyFile found. Cannot verify.")
            return

        print(f"Testing with FamilyFile ID: {family_file.id}")
        
        # 2. Find a Professional assigned to this case (or create a mock assignment for testing)
        # For verification, we might need to mock permissions if we don't have a real pro user handy
        # But let's try to find an existing assignment first
        result = await db.execute(
            select(CaseAssignment)
            .where(CaseAssignment.family_file_id == family_file.id)
            .limit(1)
        )
        assignment = result.scalar_one_or_none()
        
        professional_id = None
        if assignment:
            professional_id = assignment.professional_id
            print(f"Found existing assignment for Professional ID: {professional_id}")
            # Ensure compliance scope
            if "compliance" not in (assignment.access_scopes or []):
                print("Adding 'compliance' scope to assignment for testing...")
                assignment.access_scopes = (assignment.access_scopes or []) + ["compliance"]
                await db.commit()
        else:
             # Find ANY professional
            result = await db.execute(select(ProfessionalProfile).limit(1))
            pro = result.scalar_one_or_none()
            if pro:
                professional_id = pro.user_id
                print(f"Creating temporary assignment for Professional ID: {professional_id}")
                new_assignment = CaseAssignment(
                    professional_id=professional_id,
                    family_file_id=family_file.id,
                    status="active",
                    access_scopes=["compliance"],
                    assigned_at=datetime.utcnow()
                )
                db.add(new_assignment)
                await db.commit()
            else:
                print("No professional profile found. Cannot continue.")
                return

        # 3. Call get_compliance_dashboard
        service = ProfessionalComplianceService(db)
        try:
            dashboard = await service.get_compliance_dashboard(
                family_file_id=family_file.id,
                professional_id=professional_id,
                days=30
            )
            
            print("\nDashboard Data Retrieved Successfully!")
            
            # 4. Verify Structure
            print("\nVerifying Exchange Compliance Structure:")
            exc = dashboard.get("exchange_compliance", {})
            print(f"  - total_exchanges: {exc.get('total_exchanges')} (Expected: defined)")
            if exc.get("total_exchanges") is None:
                print("  [FAIL] total_exchanges is None or missing!")
            else:
                print("  [PASS] total_exchanges present")
                
            print("\nVerifying Financial Compliance Structure:")
            fin = dashboard.get("financial_compliance", {})
            required_fields = [
                "total_obligations", "paid_on_time", "paid_late", "outstanding",
                "total_amount_due", "total_amount_paid", "payment_rate", "by_parent"
            ]
            
            all_passed = True
            for field in required_fields:
                val = fin.get(field)
                print(f"  - {field}: {val}")
                if val is None:
                    print(f"  [FAIL] {field} is missing!")
                    all_passed = False
            
            if all_passed:
                print("  [PASS] All financial fields present")

            # 5. Verify Exchange by_parent
            print("\nVerifying Exchange by_parent Structure:")
            exc_parent = exc.get("by_parent", {})
            if "parent_a" in exc_parent and "parent_b" in exc_parent:
                 print("  [PASS] parent_a and parent_b present in exchange_compliance")
            else:
                 print(f"  [FAIL] Missing parent_a/b in exchange_compliance: {exc_parent.keys()}")

            # 6. Verify Communication by_parent
            print("\nVerifying Communication by_parent Structure:")
            comm = dashboard.get("communication_compliance", {})
            comm_parent = comm.get("by_parent", {})
            if "parent_a" in comm_parent and "parent_b" in comm_parent:
                 print("  [PASS] parent_a and parent_b present in communication_compliance")
            else:
                 print(f"  [FAIL] Missing parent_a/b in communication_compliance: {comm_parent.keys()}")

        except Exception as e:
            print(f"\n[ERROR] Failed to get dashboard: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_compliance_dashboard())

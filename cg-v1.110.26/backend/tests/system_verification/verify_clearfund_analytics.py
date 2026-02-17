
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.database import get_db_context
from app.services.professional.compliance_service import ProfessionalComplianceService

async def verify_clearfund_analytics():
    family_file_id = "efc1b35e-7153-4622-ac16-784a5aef13ea"
    professional_id = "b0b00002-0000-4000-a000-000000000000"

    async with get_db_context() as db:
        service = ProfessionalComplianceService(db)
        
        print("\n--- Getting Financial Compliance Stats ---")
        try:
            stats = await service.get_financial_compliance(
                family_file_id=family_file_id,
                professional_id=professional_id,
                days=30
            )
            
            print("Response keys:", stats.keys())
            
            # Check for new fields
            new_fields = ["top_category", "child_support_paid_pct"]
            missing = [f for f in new_fields if f not in stats]
            
            if missing:
                print(f"FAILURE: Missing new fields: {missing}")
            else:
                print(f"SUCCESS: New fields present.")
                print(f"Top Category: {stats['top_category']}")
                print(f"Child Support Paid %: {stats['child_support_paid_pct']}")

            # Check for NaN values (simulated by checking if they are valid numbers)
            print("\nChecking for valid numbers:")
            for key, value in stats.items():
                if isinstance(value, float):
                    print(f"{key}: {value}")
                    if value != value: # NaN check
                         print(f"FAILURE: {key} is NaN!")
                elif isinstance(value, (int, str)):
                     print(f"{key}: {value}")

        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(verify_clearfund_analytics())

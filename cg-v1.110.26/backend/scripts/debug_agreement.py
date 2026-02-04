import asyncio
import os
import sys



from app.core.database import get_db_context
from app.services.reports.parent_report_service import ParentReportService
from sqlalchemy import select
from app.models.agreement import Agreement

FAMILY_FILE_ID = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"

async def main():
    async with get_db_context() as db:
        service = ParentReportService(db)
        target_id = "ffb3296b-8723-483d-b7b2-7b6139101477"
        
        print(f"Checking Agreement ID: {target_id}")
        
        # Get specific agreement
        result = await db.execute(select(Agreement).where(Agreement.id == target_id))
        agreement = result.scalars().first()
        
        if not agreement:
            print("❌ Agreement not found.")
            return

        print(f"✅ Agreement Found: {agreement.title}")
        print(f" - Status: {agreement.status}")
        print(f" - Effective Date: {agreement.effective_date}")
        print(f" - Petitioner Approved At: {agreement.petitioner_approved_at}")
        print(f" - Respondent Approved At: {agreement.respondent_approved_at}")
        print(f" - Created At: {agreement.created_at}")
        print(f" - Updated At: {agreement.updated_at}")
        
        # 2. Check Key Terms Extraction
        print("\n--- Extracting Key Terms ---")
        key_terms = await service._extract_key_terms(agreement)
        if not key_terms:
            print("⚠️ No key terms extracted.")
        else:
            for key, value in key_terms.items():
                print(f" - {key}: {value}")
                
        print("\n--- Approval Verification ---")
        print(f"Agreement ID: {agreement.id}")
        print(f"Petitioner Approved: {agreement.petitioner_approved} at {agreement.petitioner_approved_at}")
        print(f"Respondent Approved: {agreement.respondent_approved} at {agreement.respondent_approved_at}")
        
        overall_approval = None
        if agreement.petitioner_approved_at and agreement.respondent_approved_at:
             overall_approval = max(agreement.petitioner_approved_at, agreement.respondent_approved_at)
        print(f"Combined Approval Date (Effective): {overall_approval}")
                
        # 3. Check Raw Content (if needed for extraction debugging)
        # print("\n--- Raw Agreement Content (Snippet) ---")
        # print(str(agreement.content)[:500] if agreement.content else "No content")
        
        # 4. Check Summary
        print("\n--- Agreement Summary ---")
        summary = await service._get_agreement_summary(agreement)
        print(summary)

if __name__ == "__main__":
    asyncio.run(main())

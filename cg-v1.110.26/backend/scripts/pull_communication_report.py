
import asyncio
import os
import sys
from datetime import date, datetime, timedelta
from dotenv import load_dotenv

# Load env before importing app modules
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import get_db_context
from app.services.reports import ParentReportService
from app.models.family_file import FamilyFile
from sqlalchemy import select

async def main():
    family_file_id = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"
    
    async with get_db_context() as db:
        # Verify family file exists
        result = await db.execute(select(FamilyFile).where(FamilyFile.id == family_file_id))
        family_file = result.scalar_one_or_none()
        
        if not family_file:
            print(f"Family file {family_file_id} not found!")
            return

        print(f"Found family file: {family_file.title}")
        
        user_id = family_file.parent_a_id if family_file.parent_a_id else family_file.parent_b_id
        if not user_id:
             print("No parent ID found to attribute export.")
             return

        service = ParentReportService(db)
        
        # Date range: Last 90 days for investigation
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=90)
        
        print(f"Generating Communication Report from {start_date} to {end_date}...")
        
        try:
            pdf_bytes = await service.generate_report(
                report_type="communication",
                family_file_id=family_file_id,
                date_start=start_date,
                date_end=end_date,
                user_id=user_id
            )
            
            output_filename = f"Communication_Analysis_{family_file_id}_{end_date}.pdf"
            with open(output_filename, "wb") as f:
                f.write(pdf_bytes)
                
            print(f"Report generated successfully!")
            print(f"Saved to: {os.path.abspath(output_filename)}")
            print(f"Size: {len(pdf_bytes)} bytes")
            
        except Exception as e:
            print(f"Error generating report: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())

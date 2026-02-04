import asyncio
import sys
import dataclasses
from pathlib import Path
from datetime import date, timedelta
import os

# Add parent directory for imports
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.services.reports.parent_report_service import ParentReportService
from app.models.family_file import FamilyFile
from sqlalchemy import select

FAMILY_FILE_ID = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"
OUTPUT_DIR = Path(__file__).parent.parent / "documents" / "brown_family_reports"

async def main():
    print("=" * 60)
    print("GENERATING TASHA'S COMMUNICATION SUMMARY REPORT")
    print(f"Family File: {FAMILY_FILE_ID}")
    print("=" * 60)
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    async with AsyncSessionLocal() as db:
        # Get family info
        ff = await db.execute(select(FamilyFile).where(FamilyFile.id == FAMILY_FILE_ID))
        family = ff.scalar_one_or_none()
        
        if not family:
            print("❌ Family file not found")
            return

        tasha_id = family.parent_b_id
        print(f"User ID (Tasha): {tasha_id}")

        print(f"\n📊 Generating Communication Summary Report (Last 9 Months)...")
        report_service = ParentReportService(db)
        
        try:
            pdf_bytes = await report_service.generate_report(
                report_type="communication",
                family_file_id=FAMILY_FILE_ID,
                date_start=date.today() - timedelta(days=270),
                date_end=date.today(),
                user_id=tasha_id
            )
            
            filename = f"tasha_communication_summary_{date.today()}.pdf"
            filepath = OUTPUT_DIR / filename
            
            with open(filepath, "wb") as f:
                f.write(pdf_bytes)
            print(f"   ✅ Saved: {filename} ({len(pdf_bytes)} bytes)")
            print(f"   📂 Path: {filepath}")
            
        except Exception as e:
            print(f"   ❌ Error generating report: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
Generate Tasha's Expense Summary Report (Last 9 Months)

Family File: d491d4f6-da26-4b27-a12f-b8c52e9fbdab
Tasha (User): eb9a2b70-76ed-4cb5-b8fb-23e1776423ee
"""

import sys
import asyncio
from pathlib import Path
from datetime import datetime, timedelta

# Add parent directory for imports
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.services.reports.parent_report_service import ParentReportService

async def generate_tasha_expense_report():
    print("============================================================")
    print("GENERATING TASHA'S EXPENSE SUMMARY REPORT")
    print("Family File: d491d4f6-da26-4b27-a12f-b8c52e9fbdab")
    print("============================================================")
    
    family_file_id = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"
    tasha_id = "eb9a2b70-76ed-4cb5-b8fb-23e1776423ee"
    
    print(f"User ID (Tasha): {tasha_id}")
    
    async with AsyncSessionLocal() as db:
        service = ParentReportService(db)
        
        # Date range: Last 9 months
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(weeks=39)
        
        print("\n📊 Generating Schedule History Report (Last 9 Months)...")
        
        try:
            pdf_bytes = await service.generate_report(
                family_file_id=family_file_id,
                user_id=tasha_id,
                report_type="schedule", 
                date_start=start_date,
                date_end=end_date
            )
            
            # Save to documents/brown_family_reports
            output_dir = Path(__file__).parent.parent / "documents" / "brown_family_reports"
            output_dir.mkdir(parents=True, exist_ok=True)
            
            filename = f"tasha_schedule_history_{end_date.strftime('%Y-%m-%d')}.pdf"
            output_path = output_dir / filename
            
            with open(output_path, "wb") as f:
                f.write(pdf_bytes)
                
            print(f"   ✅ Saved: {filename} ({len(pdf_bytes)} bytes)")
            print(f"   📂 Path: {output_path}")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(generate_tasha_expense_report())

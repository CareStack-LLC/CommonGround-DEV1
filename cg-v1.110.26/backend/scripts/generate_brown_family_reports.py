import asyncio
import sys
import json
import dataclasses
from pathlib import Path
from datetime import date, timedelta
import os

# Add parent directory for imports
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.services.export.generators.base import GeneratorContext
from app.services.export.redaction import RedactionService
from app.services.reports.parent_report_service import ParentReportService
from app.services.export.generators import get_registry
from app.services.export.case_export_service import CaseExportService
from app.models.family_file import FamilyFile
from app.models.case import Case
from sqlalchemy import select

FAMILY_FILE_ID = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"
OUTPUT_DIR = Path(__file__).parent.parent / "documents" / "brown_family_reports"

async def main():
    print("=" * 60)
    print("GENERATING COMPLIANCE REPORTS FOR BROWN FAMILY")
    print(f"Family File: {FAMILY_FILE_ID}")
    print("=" * 60)
    
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\n📁 Output Directory: {OUTPUT_DIR}")
    
    async with AsyncSessionLocal() as db:
        # Get family info
        ff = await db.execute(select(FamilyFile).where(FamilyFile.id == FAMILY_FILE_ID))
        family = ff.scalar_one_or_none()
        
        if not family:
            print("❌ Family file not found")
            return

        # Get Case info
        case_result = await db.execute(select(Case).where(Case.family_file_id == FAMILY_FILE_ID))
        case = case_result.scalar_one_or_none() # Could be multiple, but let's take one
        
        case_id = case.id if case else None
        
        print(f"\n👨‍👩‍👦 Family: {family.id}")
        if case_id:
            print(f"   Case ID: {case_id}")
            print(f"   Case Number: {case.case_number}")
        else:
            print("   ⚠️ No Case ID found for family")
            
        # Create redaction service
        redaction_service = RedactionService(db=db, level="standard")
        
        # 1. Section Reports (JSON)
        # These require a case_id because they query CaseParticipant/etc
        if case_id:
            print(f"\n📋 Generating Individual Section JSON Reports...")
            
            context = GeneratorContext(
                db=db,
                case_id=case_id,
                date_start=date.today() - timedelta(days=270), # 9 months
                date_end=date.today(),
                redaction_service=redaction_service,
                message_content_redacted=False
            )
            
            registry = get_registry()
            
            sections = [
                "agreement_overview",
                "compliance_summary",
                "parenting_time",
                "financial_compliance",
                "communication_compliance",
                "intervention_log",
                "parent_impact",
                "chain_of_custody",
                "item_tracking",
                "exchange_gps_verification",
            ]
            
            for section in sections:
                try:
                    print(f"   Generating {section}...")
                    generator = registry.get(section)
                    
                    if not generator:
                        print(f"   ⚠️ Generator not found for {section}")
                        continue
                        
                    data = await generator.generate(context)
                    
                    filename = f"section_{section}_{date.today()}.json"
                    filepath = OUTPUT_DIR / filename
                    
                    with open(filepath, "w") as f:
                        json.dump(dataclasses.asdict(data), f, indent=2, default=str)
                    print(f"   ✅ Saved: {filename} (evidence: {data.evidence_count})")
                    
                except Exception as e:
                    print(f"   ❌ Error generating {section}: {e}")
                    import traceback
                    traceback.print_exc()

        # 2. Parent Reports (PDF)
        print(f"\n📊 Generating Parent Reports (Last 9 Months)...")
        report_service = ParentReportService(db)
        
        report_types = ["custody_time", "communication", "expense", "schedule"]
        
        for report_type in report_types:
            try:
                print(f"   Generating {report_type} report...")
                pdf_bytes = await report_service.generate_report(
                    report_type=report_type,
                    family_file_id=FAMILY_FILE_ID,
                    date_start=date.today() - timedelta(days=270),
                    date_end=date.today(),
                    user_id=family.parent_a_id # Requester
                )
                
                filename = f"parent_{report_type}_report_{date.today()}.pdf"
                filepath = OUTPUT_DIR / filename
                
                with open(filepath, "wb") as f:
                    f.write(pdf_bytes)
                print(f"   ✅ Saved: {filename} ({len(pdf_bytes)} bytes)")
                
            except Exception as e:
                print(f"   ❌ Error generating {report_type}: {e}")
                import traceback
                traceback.print_exc()
                

        # ------------------------------------------------------------------
        # FULL COURT EXPORT PACKAGE
        # ------------------------------------------------------------------
        if case_id:
            print("\n⚖️ Generating Full Court Export Package...")
            
            # Define report period (9 months)
            date_end = date.today()
            date_start = date_end - timedelta(days=270)
            
            case_export_service = CaseExportService(db)
            
            try:
                # Use Parent A as valid user ID
                generator_user_id = family.parent_a_id
                
                export = await case_export_service.create_export(
                    case_id=str(case_id),
                    user_id=str(generator_user_id),
                    package_type="court",
                    date_start=date_start,
                    date_end=date_end,
                    generator_name="System Admin",
                    redaction_level="standard"
                )
                
                print(f"   ✅ Court Export Generated: {export.export_number}")
                
                # Copy the file to our output dir
                if export.file_url:
                    filename = os.path.basename(export.file_url)
                    # CaseExportService stores in "exports" dir by default
                    source_path = Path("exports") / filename
                    
                    if source_path.exists():
                        import shutil
                        target_path = OUTPUT_DIR / filename
                        shutil.copy2(source_path, target_path)
                        print(f"   📂 Copied to: {target_path}")
                    else:
                        print(f"   ⚠️ Source file not found at {source_path}")
                else:
                    print(f"   ⚠️ No file URL in export record")
                    
            except Exception as e:
                print(f"   ❌ Failed to generate court export: {e}")
                import traceback
                traceback.print_exc()

    print("\n" + "=" * 60)
    print("✅ REPORT GENERATION COMPLETE")
    print("=" * 60)
    print(f"\n📂 Reports saved to: {OUTPUT_DIR}")

if __name__ == "__main__":
    asyncio.run(main())


import asyncio
import sys
from datetime import date, timedelta
from pathlib import Path
from sqlalchemy import select, delete

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.models.case import Case
from app.models.child import Child
from app.models.user import User
from app.models.custody_day_record import CustodyDayRecord, DeterminationMethod

CASE_ID = "374e607c-edc1-4ae9-8e04-0ed682f1d1a7" # Brown Family
START_DATE = date(2025, 5, 1)
END_DATE = date(2026, 2, 1)

async def main():
    async with AsyncSessionLocal() as db:
        print(f"Seeding Custody Tracking for Case {CASE_ID}...")

        # 1. Get Case & Family File ID
        case = await db.get(Case, CASE_ID)
        if not case:
            print("Case not found.")
            return
        family_file_id = case.family_file_id
        print(f"Family File ID: {family_file_id}")

        # 2. Get Children
        print(f"Searching for children in Case {CASE_ID}...")
        c_result = await db.execute(select(Child).where(Child.case_id == CASE_ID))
        children = c_result.scalars().all()
        
        if not children:
             print(" - None found by Case ID. Trying Family File ID...")
             c_result = await db.execute(select(Child).where(Child.family_file_id == family_file_id))
             children = c_result.scalars().all()

        if not children:
            print("❌ No children found via Case OR Family File.")
            # Debug: List all children
            all_c = await db.execute(select(Child))
            print(f"Debug: Total Children in DB: {len(all_c.scalars().all())}")
            return
        
        print(f"✅ Found {len(children)} children.")
        
        # 3. Get Parents (Petitioner vs Respondent)
        # We need to map them. Let's assume from participants.
        # Petitioner (Parent A), Respondent (Parent B)
        # We need their user_ids.
        # Let's fetch participants from Case
        # OR fetch users by email/name if known from previous artifacts
        # Using a query on CaseParticipant is safer
        await db.refresh(case, ["participants"])
        petitioner = None
        respondent = None
        
        for p in case.participants:
            if p.role == 'petitioner':
                petitioner = p
            elif p.role == 'respondent':
                respondent = p
                
        if not petitioner or not respondent:
            print("Could not identify Petitioner and Respondent.")
            return

        print(f"Petitioner: {petitioner.user_id}")
        print(f"Respondent: {respondent.user_id}")

        # 4. Clear existing records for this period (to allow re-running)
        print("Clearing existing records...")
        stmt = delete(CustodyDayRecord).where(
            CustodyDayRecord.family_file_id == family_file_id,
            CustodyDayRecord.record_date >= START_DATE,
            CustodyDayRecord.record_date <= END_DATE
        )
        await db.execute(stmt)

        # 5. Generate Records
        # Logic: 2-2-3 schedule or similar?
        # Let's do a simple alternating week or split week pattern.
        # Mon/Tue (Petitioner), Wed/Thu (Respondent), Fri/Sat/Sun (Alternate)
        # Actually user said "Parent A 80%, Parent B 20%" in the summary!
        # "Parent A will have the children 80% of the time, while Parent B will have them 20%"
        # Let's simulate that: Parent A (Petitioner) gets Mon-Fri, Parent B (Respondent) gets Sat-Sun? That's 5/7 = 71%.
        # Or A: Mon-Thu + Alt Fri/Sat/Sun.
        # Let's do: A has Mon,Tue,Wed,Thu,Fri. B has Sat,Sun.
        # That is 5 days vs 2 days. 5/7 = 71%.
        # To get 80/20, B needs less. Maybe B only every other weekend?
        # Every other weekend = 2 days every 14 days = 14%. That's close to 20%.
        # Let's go with B has EOWE (Every Other Weekend) - Sat, Sun.
        # Rest is A.
        
        current_date = START_DATE
        records = []
        
        # Week 1 seed: Start with A.
        # We need a reference for "Every Other Weekend".
        # Let's say first weekend of May 2025 is Parent B.
        # May 1, 2025 is a Thursday.
        # May 3 (Sat), May 4 (Sun) -> Parent B?
        
        while current_date <= END_DATE:
            # Determine custodial parent
            # Simple EOWE logic
            # isoweekday: 1=Mon...7=Sun
            wd = current_date.isoweekday()
            
            is_parent_b_weekend = False
            # Calculate week number to alternate
            # Epoch week?
            # Week number from start
            days_from_start = (current_date - START_DATE).days
            week_num = days_from_start // 7
            
            # Let's say Parent B has EVEN weekends
            if wd in [6, 7] and (week_num % 2 == 0):
                custodial_id = respondent.user_id
            else:
                custodial_id = petitioner.user_id
            
            # Create record for EACH child
            for child in children:
                rec = CustodyDayRecord(
                    family_file_id=family_file_id,
                    child_id=child.id,
                    record_date=current_date,
                    custodial_parent_id=custodial_id,
                    determination_method=DeterminationMethod.SCHEDULED.value,
                    confidence_score=90
                )
                db.add(rec)
            
            current_date += timedelta(days=1)
        
        await db.commit()
        print("✅ Seeding Complete.")

if __name__ == "__main__":
    asyncio.run(main())

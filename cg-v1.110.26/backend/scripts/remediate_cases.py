import os
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models import FamilyFile, CourtCustodyCase

async def fix_missing_cases():
    engine = create_async_engine(os.environ["DATABASE_URL"], connect_args={"statement_cache_size": 0})
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        # Find FF missing cases
        ff_result = await db.execute(select(FamilyFile).outerjoin(CourtCustodyCase, FamilyFile.id == CourtCustodyCase.family_file_id).where(CourtCustodyCase.id == None))
        ff_missing_cases = ff_result.scalars().all()
        
        print(f"Found {len(ff_missing_cases)} Family Files missing Cases.")
        
        for ff in ff_missing_cases:
            print(f"Creating CourtCustodyCase for Family File: {ff.id} ({ff.title})")
            new_case = CourtCustodyCase(
                family_file_id=ff.id,
                case_number=f"CRT-{ff.family_file_number.split('-')[1]}",
                status="active",
                jurisdiction_state=ff.state or "CA",
                jurisdiction_county=ff.county or "San Diego",
                petitioner_id=ff.parent_a_id,
                respondent_id=ff.parent_b_id
            )
            db.add(new_case)
        
        await db.commit()
        print("Remediation complete.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_missing_cases())

import asyncio
import os
import sys

# Use the real staging Supabase DB URL
DB_URL = "postgresql://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

os.environ.setdefault("SECRET_KEY", "mock_secret_key")
os.environ.setdefault("DATABASE_URL", DB_URL)
os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "mock_anon_key")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "mock_service_key")
os.environ.setdefault("OPENAI_API_KEY", "mock_openai_key")
os.environ.setdefault("NEXT_PUBLIC_SITE_URL", "http://localhost:3000")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.agreement import Agreement

STACY_FF_ID = "d6f08c5a-e65c-4dbe-8b65-f128167c9f3f"

CORRECTED_SUMMARY = "This custody agreement is between Mya (Mother) and Eric (Father) concerning their daughter, Stacy, who primarily resides with Mya. Mya has primary physical custody, while Eric sees Stacy only one weekend a month (specifically the 1st weekend of every month). The exchange takes place at Carson Park, with drop-off on Fridays at 6:00 PM and pick-up on Sundays at 7:00 PM. Mya is responsible for transporting Stacy to and from this location, and Eric is not allowed to visit Mya's residence in Long Beach. During school breaks, Stacy will remain with Mya. Mya is the major decision-maker regarding religious upbringing and extracurricular activities. Eric is responsible for all medical and educational expenses. Communication between Mya and Eric is restricted to the CommonGround platform with no video calls allowed per a LA County Court Order. Any travel plans by Eric require Mya's written consent, and Mya must provide a 60-day notice for relocation."

async def run():
    url = DB_URL.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(url, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(
            select(Agreement).where(Agreement.family_file_id == STACY_FF_ID)
        )
        agreements = result.scalars().all()
        
        updated = 0
        for agreement in agreements:
            print(f"Updating summary for agreement ID: {agreement.id}")
            agreement.summary = CORRECTED_SUMMARY
            session.add(agreement)
            updated += 1
            
        await session.commit()
        print(f"Updated {updated} agreements.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())

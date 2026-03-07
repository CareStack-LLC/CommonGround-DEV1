import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

sys.path.append(os.getcwd())

from app.models.agreement import Agreement
from app.models.custody_exchange import CustodyExchange
from app.models.clearfund import Obligation

LEO_FF_ID = "d6f08c5a-e65c-4dbe-8b65-f128167c9f3f"

async def run():
    url = os.environ.get("DATABASE_URL")
    engine = create_async_engine(url, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print(f"\n--- Verifying Derived Records for Family File {LEO_FF_ID} ---\n")
        
        # 1. Check Agreement
        res = await session.execute(select(Agreement).where(Agreement.family_file_id == LEO_FF_ID))
        agreements = res.scalars().all()
        for a in agreements:
            print(f"Agreement ID: {a.id}, Title: {a.title}, Status: {a.status}")

        # 2. Check Custody Exchanges
        res = await session.execute(select(CustodyExchange).where(CustodyExchange.family_file_id == LEO_FF_ID))
        exchanges = res.scalars().all()
        print(f"\nCustody Exchanges: {len(exchanges)}")
        for e in exchanges:
            print(f"  ID: {e.id}, Is Recurring: {e.is_recurring}")

        # 3. Check Obligations
        res = await session.execute(select(Obligation).where(Obligation.family_file_id == LEO_FF_ID))
        obligations = res.scalars().all()
        templates = [o for o in obligations if o.status == "template"]
        instances = [o for o in obligations if o.status == "open"]
        print(f"\nObligations: {len(obligations)} Total ({len(templates)} Templates, {len(instances)} Instances)")
        for t in templates:
            print(f"  Template: {t.title} - Amount: {t.total_amount}")
        print(f"  (Sample Instances)")
        for i in instances[:5]:
            print(f"  Instance: {i.title} - Amount: {i.total_amount} - Due: {i.due_date}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())

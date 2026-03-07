import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

sys.path.append(os.getcwd())

from app.models.agreement import Agreement, AgreementSection

LEO_FF_ID = "d6f08c5a-e65c-4dbe-8b65-f128167c9f3f"

async def run():
    url = os.environ.get("DATABASE_URL")
    engine = create_async_engine(url, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # 1. Check Agreement
        res = await session.execute(select(Agreement).where(Agreement.family_file_id == LEO_FF_ID))
        agreement = res.scalars().first()
        if not agreement:
            print("Agreement not found!")
            return
            
        print(f"Agreement ID: {agreement.id}, Title: {agreement.title}\n")

        # 2. Check Sections
        res = await session.execute(
            select(AgreementSection)
            .where(AgreementSection.agreement_id == agreement.id)
            .order_by(AgreementSection.display_order)
        )
        sections = res.scalars().all()
        for idx in [0, 4, 9, 13]:  # Print a sample of sections
            if idx < len(sections):
                s = sections[idx]
                print(f"--- Section {s.section_number}: {s.section_title} ---")
                print(f"Content length: {len(s.content)}")
                print(f"Content sample: {s.content[:100]}...\n")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())

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
from app.models.agreement import Agreement, AgreementSection
from app.services.agreement import AgreementService

LEO_FF_ID = "b9c6031c-8084-4d72-b0ca-080358b7f711"
STACY_FF_ID = "d6f08c5a-e65c-4dbe-8b65-f128167c9f3f"

async def get_quick_facts(session, ff_id, name):
    print(f"\n--- Quick Facts for {name} ---")
    result = await session.execute(
        select(Agreement).where(Agreement.family_file_id == ff_id).order_by(Agreement.created_at.desc())
    )
    agreement = result.scalars().first()
    if not agreement:
        print("No agreement found!")
        return
        
    result = await session.execute(
        select(AgreementSection)
        .where(AgreementSection.agreement_id == agreement.id)
        .order_by(AgreementSection.display_order)
    )
    sections = result.scalars().all()
    
    section_dict = {}
    for section in sections:
        if section.is_completed and section.content:
            if section.section_type not in section_dict:
                section_dict[section.section_type] = {
                    "title": section.section_title,
                    "content": section.content
                }
            else:
                section_dict[section.section_type]["content"] += f"\n\n{section.content}"

    service = AgreementService(session)
    key_points_data = service.extract_key_points_from_sections(section_dict, agreement)
    
    for point in key_points_data.get("key_points", []):
        print(point)

async def run():
    url = DB_URL.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(url, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        await get_quick_facts(session, LEO_FF_ID, "Leo")
        await get_quick_facts(session, STACY_FF_ID, "Stacy")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())

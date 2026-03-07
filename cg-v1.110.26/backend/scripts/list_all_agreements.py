from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, load_only
from sqlalchemy import select
import sys
import os

# Use the real staging Supabase DB URL found in test_db.py
DB_URL = "postgresql://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

# Mock env vars for Pydantic Settings validation so we can connect
os.environ.setdefault("SECRET_KEY", "mock_secret_key")
os.environ.setdefault("DATABASE_URL", DB_URL)
os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "mock_anon_key")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "mock_service_key")
os.environ.setdefault("OPENAI_API_KEY", "mock_openai_key")
os.environ.setdefault("NEXT_PUBLIC_SITE_URL", "http://localhost:3000")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

sys.path.append(os.getcwd())

from app.models.agreement import Agreement
from app.core.config import settings

async def run():
    url = settings.DATABASE_URL
    if url and url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://")

    connect_args = {
        "server_settings": {"search_path": "public, clearfund"},
        "statement_cache_size": 0
    }
    engine = create_async_engine(url, connect_args=connect_args)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(
            select(Agreement)
            .options(load_only(Agreement.id, Agreement.title, Agreement.family_file_id))
        )
        agreements = result.scalars().all()
        print(f"Total Agreements: {len(agreements)}")
        for a in agreements:
            print(f"Title: '{a.title}' | ID: {a.id} | FF_ID: {a.family_file_id}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run())

import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

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

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, load_only
from sqlalchemy import select, update
sys.path.append(os.getcwd())

from app.models.agreement import Agreement
from app.models.family_file import FamilyFile
from app.models.custody_exchange import CustodyExchange
from app.models.clearfund import Obligation

from dotenv import dotenv_values
import configparser

OLD_FF_ID = "d6f08c5a-e65c-4dbe-8b65-f128167c9f3f"
NEW_FF_ID = "b9c6031c-8084-4d72-b0ca-080358b7f711"

async def run():
    # config = configparser.ConfigParser()
    # config.read('alembic.ini')
    # url = config.get('alembic', 'sqlalchemy.url')
    url = DB_URL
    
    # Alembic usually uses asyncpg for async actions so alter if necessary
    if url and url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://")

    if not url:
        print("Error: DATABASE_URL not found in alembic.ini")
        return
        
    print(f"Connecting to database at {url.split('@')[0]}@...")
    # Ensure correct search path is used as the app typically does
    connect_args = {
        "server_settings": {"search_path": "public, clearfund"},
        "statement_cache_size": 0
    }
    engine = create_async_engine(url, connect_args=connect_args)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Avoid loading columns like 'summary' that don't exist yet by just loading needed fields
        # Find the agreement in the old Family File that relates to Leo
        result = await session.execute(
            select(Agreement)
            .options(load_only(Agreement.id, Agreement.title, Agreement.family_file_id))
            .where(Agreement.title.like("%Leo%"))
        )
        agreement = result.scalar_one_or_none()
        
        if not agreement:
            print(f"Could not find Leo's agreement anywhere in the database!")
            return
            
        print(f"Found Agreement: {agreement.title} (ID: {agreement.id}) under old FF ID: {agreement.family_file_id}")
        
        actual_old_ff_id = agreement.family_file_id
        
        # 1. Update the Agreement's family_file_id
        agreement.family_file_id = NEW_FF_ID
        session.add(agreement)
        
        # 2. Update all associated CustodyExchanges mapped to this agreement
        result = await session.execute(
            select(CustodyExchange)
            .where(CustodyExchange.family_file_id == actual_old_ff_id)
            .where(CustodyExchange.agreement_id == agreement.id)
        )
        exchanges = result.scalars().all()
        for ex in exchanges:
            ex.family_file_id = NEW_FF_ID
            session.add(ex)
            
        print(f"Updated {len(exchanges)} Custody Exchanges.")
        
        # 3. Update all associated Obligations mapped to this family file
        # We assume all active obligations currently in the old FF belong to this agreement's activation since it's a clean slate
        result = await session.execute(
            select(Obligation)
            .where(Obligation.family_file_id == actual_old_ff_id)
        )
        obligations = result.scalars().all()
        for ob in obligations:
            ob.family_file_id = NEW_FF_ID
            session.add(ob)
            
        print(f"Updated {len(obligations)} Obligations.")

        await session.commit()
        print(f"Successfully moved all records to Family File {NEW_FF_ID}")

if __name__ == "__main__":
    asyncio.run(run())

import os
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
os.environ["SECRET_KEY"] = "secret"
os.environ["SUPABASE_URL"] = "https://mtcdoewgywxrlsogtmzi.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "dummy"
os.environ["SUPABASE_SERVICE_KEY"] = "dummy"

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models import User, FamilyFile, Agreement
from app.api.v1.endpoints.dashboard import get_dashboard_summary

async def test_dashboard():
    engine = create_async_engine(os.environ["DATABASE_URL"], connect_args={"statement_cache_size": 0})
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    family_file_id = "d6f08c5a-e65c-4dbe-8b65-f128167c9f3f"
    
    async with AsyncSessionLocal() as db:
        # We need a user object for dependency injection if it uses get_current_user
        # but here we can just call the service logic or the endpoint directly if it takes db and ff_id
        try:
            from app.api.v1.endpoints.dashboard import get_dashboard_summary
            # Note: get_dashboard_summary usually takes (family_file_id, current_user, db)
            # Let's just try to query the agreements table like the error did
            result = await db.execute(
                select(Agreement).where(
                    Agreement.family_file_id == family_file_id,
                    Agreement.status == "pending_approval"
                )
            )
            agreements = result.scalars().all()
            print(f"Successfully queried agreements. Count: {len(agreements)}")
            if len(agreements) > 0:
                print(f"First agreement summary: {agreements[0].summary}")
        except Exception as e:
            print(f"Error querying dashboard data: {e}")
            
    await engine.dispose()

asyncio.run(test_dashboard())

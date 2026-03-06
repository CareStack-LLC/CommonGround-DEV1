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
from app.models import User, PartnerStaff
from app.core.security import create_access_token

async def verify_mya():
    engine = create_async_engine(os.environ["DATABASE_URL"], connect_args={"statement_cache_size": 0})
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        # Check user
        result = await db.execute(select(User).where(User.email == "mya@email.com"))
        user = result.scalar_one_or_none()
        if not user:
            print("User mya@email.com NOT found")
            return
        
        print(f"User found: {user.email} (ID: {user.id})")
        
        # Check partner access
        result = await db.execute(select(PartnerStaff).where(PartnerStaff.user_id == user.id))
        staff_access = result.scalars().all()
        print(f"Partner access count: {len(staff_access)}")
        
    await engine.dispose()

asyncio.run(verify_mya())

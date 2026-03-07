import os
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def list_tables():
    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with engine.connect() as conn:
        print("Listing all tables:")
        result = await conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';"))
        tables = result.fetchall()
        for t in tables:
            print(f"- {t[0]}")
    await engine.dispose()

asyncio.run(list_tables())

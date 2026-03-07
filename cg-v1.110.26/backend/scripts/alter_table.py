import os
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def alter_db():
    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with engine.begin() as conn:
        try:
            print("Altering table...")
            await conn.execute(text("ALTER TABLE family_files ADD COLUMN smart_config JSONB;"))
            print("done.")
        except Exception as e:
            print(f"Error: {e}")
    await engine.dispose()

asyncio.run(alter_db())

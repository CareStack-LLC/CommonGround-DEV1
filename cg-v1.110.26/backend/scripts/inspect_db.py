import os
db_url = "postgresql+asyncpg://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def inspect_db():
    # Explicitly disable statement cache for pgbouncer
    engine = create_async_engine(db_url, connect_args={"statement_cache_size": 0})
    async with engine.connect() as conn:
        tables = ["agreements", "partners", "partner_staff", "family_files", "users", "user_profiles"]
        for table in tables:
            print(f"\n--- Columns in {table} ---")
            try:
                result = await conn.execute(text(f"""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}' AND table_schema = 'public'
                    ORDER BY column_name;
                """))
                columns = result.fetchall()
                if not columns:
                    print(f"  No columns found for table '{table}' in public schema.")
                    exists_result = await conn.execute(text(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table}' AND table_schema = 'public');"))
                    exists = exists_result.scalar()
                    print(f"  Table exists: {exists}")
                for col in columns:
                    print(f"  {col[0]} ({col[1]})")
            except Exception as e:
                print(f"  Error inspecting {table}: {e}")
    await engine.dispose()

asyncio.run(inspect_db())

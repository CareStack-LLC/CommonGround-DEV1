
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import sys
import os

# Add backend to path for ARIA imports
sys.path.append(os.path.abspath("cg-v1.110.26/backend"))

async def check_attachments():
    url = "postgresql+asyncpg://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
    engine = create_async_engine(url, connect_args={"statement_cache_size": 0})
    
    async with engine.connect() as conn:
        print("Checking message_attachments table...")
        query = text("SELECT id, message_id, file_name, storage_path, storage_url FROM message_attachments LIMIT 10;")
        results = (await conn.execute(query)).fetchall()
        
        print(f"Found {len(results)} attachments.")
        for row in results:
            print(f"ID: {row[0]}")
            print(f"File: {row[2]}")
            print(f"Path: {row[3]}")
            print("-" * 20)
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_attachments())

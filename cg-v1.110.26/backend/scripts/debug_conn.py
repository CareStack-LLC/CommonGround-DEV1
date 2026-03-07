import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

async def run():
    url = os.environ.get("DATABASE_URL")
    print(f"Connecting to database (length: {len(url)})")
    
    engine = create_async_engine(
        url,
        echo=True,
        connect_args={
            "command_timeout": 30,
            "statement_cache_size": 0
        }
    )
    print("Engine created. Attempting to connect...")
    
    try:
        async with engine.connect() as conn:
            print("Connected! Running simple query...")
            res = await conn.execute(text("SELECT 1"))
            print(f"Result: {res.scalar()}")
    except Exception as e:
        print(f"Connection failed: {e}")
    finally:
        await engine.dispose()
        print("Engine disposed.")

if __name__ == "__main__":
    asyncio.run(run())

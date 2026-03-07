import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    url = "postgresql+asyncpg://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT email FROM users;"))
            users = result.fetchall()
            print(f"ASYNC SUCCESS! Users: {users}")
    except Exception as e:
        print(f"ASYNC ERROR: {e}")
    finally:
        await engine.dispose()

asyncio.run(check())

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def check():
    url = settings.async_database_url
    print(f"Connecting to: {url}")
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT email FROM users;"))
            users = result.fetchall()
            print(f"SUCCESS! Accounts in Database: {users}")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        await engine.dispose()

asyncio.run(check())

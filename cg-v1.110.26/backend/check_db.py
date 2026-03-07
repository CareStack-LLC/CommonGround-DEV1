import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

async def check_users():
    url = os.environ.get("DATABASE_URL")
    engine = create_async_engine(url)
    
    async with engine.connect() as conn:
        print("Checking users table...")
        result = await conn.execute(text("SELECT id, email, supabase_id FROM users;"))
        users = result.fetchall()
        for u in users:
            print(f"- User: {u}")
            
        print("\nChecking user_profiles table...")
        result = await conn.execute(text("SELECT user_id, first_name, last_name FROM user_profiles;"))
        profiles = result.fetchall()
        for p in profiles:
            print(f"- Profile: {p}")
            
    await engine.dispose()

asyncio.run(check_users())

import os
import sys
import asyncio
import re
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Dummy env vars (replicated from previous test just in case, though we will use real DB URL if available)
# In this environment, we usually don't have the real DB URL in env regex.
# I will check if I can find the DB URL from the project config or assuming localhost.
# However, usually there is a .env file.
# For now, I will assume the standard test/dev db url might be needed, 
# BUT wait, I need to know the database connection string. 
# `backend/app/core/config.py` usually loads it.

# Let's try to import settings to get the DB URL.
# If that fails due to missing env vars, I will have to rely on the user providing it or standard defaults.
# The user's metadata doesn't show .env files.
# I'll try to find .env or assume a default for the script if settings fails.

# For this script, I'll try to read the file content and print instructions if I can't connect,
# but ideally I want to run it. 
# I'll try to load settings with the dummy values EXCEPT Database URL, relying on system env if present,
# otherwise I might need to ask or use a hardcoded default typical for this user (e.g. localhost inference).

# ACTUALLY, I will write a script that attempts to load from .env file manually if settings fail.

async def apply_schema():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not set. Cannot apply schema.")
        # Try to find .env file
        env_path = os.path.join(os.getcwd(), 'backend', '.env')
        if os.path.exists(env_path):
            print(f"Found .env at {env_path}, parsing...")
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL='):
                        database_url = line.split('=', 1)[1].strip().strip('"').strip("'")
                        print(f"Loaded DATABASE_URL from .env")
                        break
    
    if not database_url:
        print("Could not determine DATABASE_URL. Please set it and run again.")
        return

    # Fix for sqlalchemy async
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

    try:
        # Disable prepared statements for Supabase transaction pooling compatibility
        engine = create_async_engine(
            database_url, 
            echo=True,
            connect_args={"statement_cache_size": 0} 
        )
        
        schema_path = os.path.join(os.path.dirname(__file__), 'app/db/pro/aria_v3_schema.sql')
        with open(schema_path, 'r') as f:
            sql_script = f.read()

        async with engine.begin() as conn:
            # asyncpg requirement: cannot use multiple statements in one execute call
            # We split by semicolon, but need to be careful about real contents. 
            # Given the simple schema, splitting by ";\n" or just ";" should work well enough.
            # Split by unique delimiter to avoid breaking multi-line blocks
            statements = sql_script.split('-- @@@')
            
            print(f"Found {len(statements)} statements to execute.")
            
            for statement in statements:
                stmt_clean = statement.strip()
                if stmt_clean:
                    print(f"Executing: {stmt_clean[:50]}...")
                    try:
                        await conn.execute(text(stmt_clean))
                    except Exception as e:
                        # Ignore "type/table already exists" errors to be idempotent-ish
                        if "already exists" in str(e):
                            print(f"  -> Object already exists, skipping.")
                        else:
                            raise e
            
            print("✅ Schema applied successfully.")
            
        await engine.dispose()
    except Exception as e:
        print(f"❌ Error applying schema: {e}")

if __name__ == "__main__":
    asyncio.run(apply_schema())

import asyncio
import os
import sys
from sqlalchemy import text

# Add the project root (backend) to the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

from app.core.database import AsyncSessionLocal

async def apply_migration():
    print("Applying migration steps (Drop professional_id FK)...")
    
    # We need to find the constraint name first, but usually we can try common names.
    # Postgres names FKs as: <table>_<column>_fkey usually.
    # Here: intake_sessions_professional_id_fkey
    
    # OR we can retrieve it from information_schema.

    find_constraint_sql = """
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'intake_sessions' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%professional_id%';
    """

    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(text(find_constraint_sql))
            constraints = result.fetchall()
            
            if not constraints:
                print("No FK constraint found on professional_id (or could not find by name).")
            
            for row in constraints:
                constraint_name = row[0]
                print(f"Dropping constraint: {constraint_name}")
                drop_sql = f"ALTER TABLE intake_sessions DROP CONSTRAINT {constraint_name};"
                await session.execute(text(drop_sql))
                await session.commit()
                print("Dropped successfully.")
                
        except Exception as e:
            print(f"Error: {e}")
            await session.rollback()

    print("Migration finished.")

if __name__ == "__main__":
    asyncio.run(apply_migration())


import asyncio
import sys
from pathlib import Path

# Add parent directory
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal, engine
from app.models.clearfund import Obligation
from sqlalchemy import text, inspect

async def main():
    print("🔮 Debugging Schema...")
    
    # 1. Print Model Definition
    print("\n1. SQLAlchemy Model Columns:")
    for col in Obligation.__table__.columns:
        print(f"   - {col.name}")
        
    # 2. Print SQL Schema from DB
    async with engine.connect() as conn:
        print("\n2. Database Table Columns (PRAGMA):")
        result = await conn.execute(text("PRAGMA table_info(obligations)"))
        rows = result.fetchall()
        for row in rows:
            print(f"   - {row[1]} (cid: {row[0]}, type: {row[2]}, notnull: {row[3]})")

    # 3. Try to Identify the specific error trigger
    # Check if 'original_amount' is in the list
    cols = [col.name for col in Obligation.__table__.columns]
    if 'original_amount' in cols:
        print("\n🚨 FOUND 'original_amount' in Model!")
    else:
        print("\n✅ 'original_amount' NOT in Model.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

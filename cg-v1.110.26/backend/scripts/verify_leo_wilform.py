import os
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models import Child, FamilyFile, User

async def verify_child():
    engine = create_async_engine(os.environ["DATABASE_URL"], connect_args={"statement_cache_size": 0})
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        # Search for Leo Wilform
        result = await db.execute(select(Child).where(Child.first_name == "Leo"))
        children = result.scalars().all()
        
        if not children:
            print("Child 'Leo' not found.")
            return
            
        print(f"Found {len(children)} children named 'Leo':")
        for child in children:
            print(f"\n--- Child: {child.first_name} {child.last_name} (ID: {child.id}) ---")
            print(f"Family File ID: {child.family_file_id}")
            
            if child.family_file_id:
                ff_result = await db.execute(select(FamilyFile).where(FamilyFile.id == child.family_file_id))
                ff = ff_result.scalar_one_or_none()
                if ff:
                    print(f"Family File Title: {ff.title}")
                    print(f"Parent A ID: {ff.parent_a_id}")
                    print(f"Parent B ID: {ff.parent_b_id}")
                    print(f"Parent B Joined At: {ff.parent_b_joined_at}")
                    
                    print(f"Child Status: {child.status}")
                    print(f"Approved By A: {child.approved_by_a}")
                    print(f"Approved By B: {child.approved_by_b}")
                    print(f"Approved At A: {child.approved_at_a}")
                    print(f"Approved At B: {child.approved_at_b}")
            else:
                print("Child is NOT associated with a family file.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify_child())

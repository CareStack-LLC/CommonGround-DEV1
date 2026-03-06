import os
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
from app.models import Child, FamilyFile
from datetime import datetime

async def approve_child():
    engine = create_async_engine(os.environ["DATABASE_URL"], connect_args={"statement_cache_size": 0})
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        # Targeting the one in the family file where Mya joined
        child_id = "0ae1df6c-ac7a-41a8-ba79-3524708563dc"
        result = await db.execute(select(Child).where(Child.id == child_id))
        child = result.scalar_one_or_none()
        
        if child:
            ff_result = await db.execute(select(FamilyFile).where(FamilyFile.id == child.family_file_id))
            ff = ff_result.scalar_one_or_none()
            
            if ff:
                print(f"Approving Child {child.id} for Family File {ff.id}")
                child.status = "active"
                child.approved_by_a = ff.parent_a_id
                child.approved_by_b = ff.parent_b_id
                child.approved_at_a = datetime.utcnow()
                child.approved_at_b = datetime.utcnow()
                
                await db.commit()
                print("Child successfully approved by both parents.")
            else:
                print("Family File not found for child.")
        else:
            print("Child not found.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(approve_child())

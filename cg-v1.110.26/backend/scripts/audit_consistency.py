import os
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from app.models import User, UserProfile, FamilyFile, Case, Child

async def audit_db():
    engine = create_async_engine(os.environ["DATABASE_URL"], connect_args={"statement_cache_size": 0})
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        print("--- Auditing Users & Profiles ---")
        # Find users without profiles
        users_result = await db.execute(select(User.id, User.email).outerjoin(UserProfile, User.id == UserProfile.user_id).where(UserProfile.id == None))
        users_without_profiles = users_result.all()
        print(f"Users missing profiles: {len(users_without_profiles)}")
        for u in users_without_profiles:
            print(f"  Missing profile: {u.email} ({u.id})")
            
        print("\n--- Auditing Family Files ---")
        # Find FF with missing parents
        ff_result = await db.execute(select(FamilyFile))
        family_files = ff_result.scalars().all()
        for ff in family_files:
            parents = []
            if ff.parent_a_id: parents.append(ff.parent_a_id)
            if ff.parent_b_id: parents.append(ff.parent_b_id)
            if len(parents) < 2:
                print(f"  FamilyFile {ff.id} ({ff.title}) has only {len(parents)} parents.")
                if not ff.parent_b_joined_at and ff.parent_b_email:
                    print(f"    (Parent B {ff.parent_b_email} hasn't joined yet)")
            
            # Check for linked case
            case_result = await db.execute(select(Case).where(Case.family_file_id == ff.id))
            case = case_result.scalar_one_or_none()
            if not case:
                print(f"  FamilyFile {ff.id} is MISSING an associated Case record.")

        print("\n--- Auditing Children ---")
        # Find children without family files
        child_result = await db.execute(select(Child.id, Child.first_name).where(Child.family_file_id == None))
        orphaned_children = child_result.all()
        print(f"Children missing family_file_id: {len(orphaned_children)}")
        for c in orphaned_children:
            print(f"  Orphaned child: {c.first_name} ({c.id})")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(audit_db())

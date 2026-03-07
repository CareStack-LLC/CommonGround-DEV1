import asyncio
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy import select
from app.core.database import get_db_context
from app.models.child import Child
from app.models.family_file import FamilyFile
from app.models.user import User

async def run():
    async with get_db_context() as session:
        # Get all family files
        res = await session.execute(select(FamilyFile))
        families = res.scalars().all()
        print("\n--- Family Files ---")
        for f in families:
            print(f"ID: {f.id}, Name: {f.family_name}, Number: {f.family_file_number}")
            print(f"  Parent A: {f.parent_a_id}, Parent B: {f.parent_b_id}")

        # Get all children
        res = await session.execute(select(Child))
        children = res.scalars().all()
        print("\n--- Children ---")
        for c in children:
            print(f"ID: {c.id}, Name: {c.first_name}, FF: {c.family_file_id}")

        # Get parents
        emails = ['mya@email.com', 'greg@email.com', 'eric@email.com', 'thomas.wilform@gmail.com']
        res = await session.execute(select(User).where(User.email.in_(emails)))
        users = res.scalars().all()
        print("\n--- Parents ---")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}")

if __name__ == "__main__":
    asyncio.run(run())

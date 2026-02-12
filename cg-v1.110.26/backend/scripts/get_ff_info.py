
import asyncio
from app.core.database import get_db_context
from app.models.family_file import FamilyFile
from app.models.user import User
from app.models.child import Child
from app.models.agreement import Agreement
from sqlalchemy import select

async def get_family_file_info(ff_id: str):
    async with get_db_context() as db:
        result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == ff_id)
        )
        ff = result.scalar_one_or_none()
        if not ff:
            print(f"Family File {ff_id} not found")
            return

        print(f"Family File: {ff.title} ({ff.family_file_number})")
        
        # Get parents
        parent_a = await db.get(User, ff.parent_a_id)
        parent_b = await db.get(User, ff.parent_b_id)
        
        print(f"Parent A: {parent_a.first_name if parent_a else 'N/A'} {parent_a.last_name if parent_a else ''} ({ff.parent_a_id})")
        print(f"Parent B: {parent_b.first_name if parent_b else 'N/A'} {parent_b.last_name if parent_b else ''} ({ff.parent_b_id})")
        
        # Get children
        result = await db.execute(
            select(Child).where(Child.family_file_id == ff_id)
        )
        children = result.scalars().all()
        print(f"Children ({len(children)}):")
        for child in children:
            print(f" - {child.first_name} {child.last_name}, DOB: {child.date_of_birth}")

        # Get agreements
        result = await db.execute(
            select(Agreement).where(Agreement.family_file_id == ff_id)
        )
        agreements = result.scalars().all()
        print(f"\nAgreements ({len(agreements)}):")
        for ag in agreements:
            print(f" - ID: {ag.id} | Status: {ag.status} | Version: {ag.agreement_version} | Title: {ag.title}")

if __name__ == "__main__":
    asyncio.run(get_family_file_info('efc1b35e-7153-4622-ac16-784a5aef13ea'))

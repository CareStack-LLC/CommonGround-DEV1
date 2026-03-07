import asyncio
import os
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import User, FamilyFile, Child, Case, CourtCustodyCase
from app.models.user import UserProfile
from app.core.config import settings

async def setup_parents_and_ffs():
    engine = create_async_engine(os.environ["DATABASE_URL"], connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        # 1. Ensure Mya exists
        result = await db.execute(select(User).where(User.email == "mya@email.com"))
        mya = result.scalar_one_or_none()
        if not mya:
            print("Mya not found, creating...")
            mya = User(
                supabase_id="mya-supabase-id",
                email="mya@email.com", 
                first_name="Mya", 
                last_name="Wilform",
                is_active=True
            )
            db.add(mya)
            await db.flush()
        
        # 2. Create Greg
        result = await db.execute(select(User).where(User.email == "greg@email.com"))
        greg = result.scalar_one_or_none()
        if not greg:
            print("Creating Greg...")
            greg = User(
                supabase_id="greg-supabase-id",
                email="greg@email.com", 
                first_name="Greg", 
                last_name="Parent",
                is_active=True
            )
            db.add(greg)
            await db.flush()
            profile = UserProfile(user_id=greg.id, first_name="Greg", last_name="Parent")
            db.add(profile)
        
        # 3. Create Eric
        result = await db.execute(select(User).where(User.email == "eric@email.com"))
        eric = result.scalar_one_or_none()
        if not eric:
            print("Creating Eric...")
            eric = User(
                supabase_id="eric-supabase-id",
                email="eric@email.com", 
                first_name="Eric", 
                last_name="Parent",
                is_active=True
            )
            db.add(eric)
            await db.flush()
            profile = UserProfile(user_id=eric.id, first_name="Eric", last_name="Parent")
            db.add(profile)

        # 4. Update Leo Family File (FF-O3FPE0)
        # Assuming ID: b9c6031c-8084-4d72-b0ca-080358b7f711 is Leo Family
        leo_ff_id = "b9c6031c-8084-4d72-b0ca-080358b7f711"
        await db.execute(
            update(FamilyFile)
            .where(FamilyFile.id == leo_ff_id)
            .values(parent_a_id=mya.id, parent_b_id=greg.id, title="Wilform / Greg Family")
        )
        print(f"Updated Leo FF {leo_ff_id}")

        # 5. Update Stacy Family File (FF-H3C2DG)
        # Assuming ID: d6f08c5a-e65c-4dbe-8b65-f128167c9f3f is Stacy Family
        stacy_ff_id = "d6f08c5a-e65c-4dbe-8b65-f128167c9f3f"
        await db.execute(
            update(FamilyFile)
            .where(FamilyFile.id == stacy_ff_id)
            .values(parent_a_id=mya.id, parent_b_id=eric.id, title="Mya / Eric Family")
        )
        print(f"Updated Stacy FF {stacy_ff_id}")

        await db.commit()
        print("Setup completed.")

if __name__ == "__main__":
    asyncio.run(setup_parents_and_ffs())

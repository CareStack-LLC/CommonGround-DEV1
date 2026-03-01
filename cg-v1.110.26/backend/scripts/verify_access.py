#!/usr/bin/env python3
import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.models.user import User, UserProfile
from app.models.professional import ProfessionalProfile, CaseAssignment

TARGET_EMAIL = "info@hbplaw.com"

async def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return

    print(f"Connecting to database...")
    engine = create_async_engine(
        database_url, 
        echo=False,
        connect_args={"statement_cache_size": 0}
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.email == TARGET_EMAIL)
        )
        user = result.scalar_one_or_none()
        if not user:
            print("❌ User not found")
            return

        result = await session.execute(
            select(UserProfile).where(UserProfile.user_id == user.id)
        )
        up = result.scalar_one_or_none()
        print(f"UserProfile Tier: {up.subscription_tier}")
        print(f"UserProfile Status: {up.subscription_status}")

        result = await session.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.id)
        )
        pp = result.scalar_one_or_none()
        print(f"ProfessionalProfile Tier: {pp.subscription_tier}")
        print(f"ProfessionalProfile Status: {pp.subscription_status}")
        print(f"ProfessionalProfile Max Cases: {pp.max_active_cases}")

        result = await session.execute(
            select(CaseAssignment).where(CaseAssignment.professional_id == pp.id)
        )
        assignments = result.scalars().all()
        for i, a in enumerate(assignments):
            print(f"Assignment {i} Scopes: {a.access_scopes}")

if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
Grant Enterprise access to info@hbplaw.com.
Updates UserProfile, ProfessionalProfile, and CaseAssignment scopes.
"""

import asyncio
import os
import sys
from datetime import datetime

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.models.user import User, UserProfile
from app.models.professional import ProfessionalProfile, CaseAssignment, ProfessionalTier, AssignmentStatus

# Full set of scopes
REQUIRED_SCOPES = [
    "overview",
    "timeline",
    "calendar",
    "schedule",
    "checkins",
    "messages",
    "agreement",
    "financials",
    "documents",
    "compliance",
    "aria_control"
]

TARGET_EMAIL = "info@hbplaw.com"

async def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return

    print(f"Connecting to database...")
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 1. Find User
        print(f"Finding user {TARGET_EMAIL}...")
        result = await session.execute(
            select(User).where(User.email == TARGET_EMAIL)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User {TARGET_EMAIL} not found.")
            return

        print(f"Found user: {user.id}")

        # 2. Update UserProfile
        print("Updating UserProfile...")
        result = await session.execute(
            select(UserProfile).where(UserProfile.user_id == user.id)
        )
        user_profile = result.scalar_one_or_none()
        if user_profile:
            user_profile.subscription_tier = "enterprise"
            user_profile.subscription_status = "active"
            print("  ✅ UserProfile updated.")
        else:
            print("  ⚠️ UserProfile not found.")

        # 3. Update/Create ProfessionalProfile
        print("Updating ProfessionalProfile...")
        result = await session.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.id)
        )
        prof_profile = result.scalar_one_or_none()
        
        if not prof_profile:
            print("  Creating ProfessionalProfile...")
            prof_profile = ProfessionalProfile(
                user_id=user.id,
                subscription_tier=ProfessionalTier.ENTERPRISE.value,
                subscription_status="active",
                max_active_cases=999999,
                license_verified=True,
                is_active=True,
                onboarded_at=datetime.utcnow()
            )
            session.add(prof_profile)
            await session.flush() # Get ID
            print(f"  ✅ Created ProfessionalProfile: {prof_profile.id}")
        else:
            prof_profile.subscription_tier = ProfessionalTier.ENTERPRISE.value
            prof_profile.subscription_status = "active"
            prof_profile.max_active_cases = 999999
            prof_profile.license_verified = True
            prof_profile.is_active = True
            print(f"  ✅ Updated ProfessionalProfile: {prof_profile.id}")

        # 4. Update Case Assignments
        print("Updating Case Assignments...")
        result = await session.execute(
            select(CaseAssignment).where(
                CaseAssignment.professional_id == prof_profile.id,
                CaseAssignment.status == AssignmentStatus.ACTIVE.value
            )
        )
        assignments = result.scalars().all()
        
        updated_assignments = 0
        for assignment in assignments:
            assignment.access_scopes = REQUIRED_SCOPES
            updated_assignments += 1
            print(f"  ✅ Updated scopes for assignment {assignment.id}")

        print(f"Found {len(assignments)} assignments, updated {updated_assignments}.")

        await session.commit()
        print("\n🎉 Success! info@hbplaw.com has been granted Enterprise access.")

if __name__ == "__main__":
    asyncio.run(main())

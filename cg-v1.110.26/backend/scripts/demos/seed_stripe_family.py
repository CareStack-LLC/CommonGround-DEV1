"""
Seed script: Create a test family with 2 real Stripe customers.

Creates:
  - Parent A: Sarah Mitchell (sarah.mitchell@commonground-test.com)
  - Parent B: James Mitchell (james.mitchell@commonground-test.com)
  - Child: Emma Mitchell
  - Family File linking both parents
  - Stripe Customer records for both parents
  - UserProfiles with stripe_customer_id set

Usage:
  cd backend
  python scripts/seed_stripe_family.py
"""

import sys
import os
import asyncio
from datetime import datetime, timedelta
from uuid import uuid4

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import stripe
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.user import User, UserProfile
from app.models.family_file import FamilyFile
from app.models.child import Child


# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


def uid():
    return str(uuid4())


async def find_or_create_user_with_stripe(
    session,
    email: str,
    first_name: str,
    last_name: str,
    subscription_tier: str = "plus",
) -> tuple:
    """Find or create a user with a real Stripe customer."""

    # Check if user already exists
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        print(f"  User already exists: {email} ({user.id})")
        # Check if profile has stripe_customer_id
        prof_result = await session.execute(
            select(UserProfile).where(UserProfile.user_id == user.id)
        )
        profile = prof_result.scalar_one_or_none()
        if profile and profile.stripe_customer_id:
            print(f"  Already has Stripe customer: {profile.stripe_customer_id}")
            return user, profile
        # Create Stripe customer for existing user without one
        if profile:
            stripe_customer = stripe.Customer.create(
                email=email,
                name=f"{first_name} {last_name}",
                metadata={"user_id": str(user.id), "platform": "commonground"},
            )
            profile.stripe_customer_id = stripe_customer.id
            print(f"  Created Stripe customer: {stripe_customer.id}")
            return user, profile

    # Create new user
    user_id = uid()
    user = User(
        id=user_id,
        supabase_id=uid(),
        email=email,
        first_name=first_name,
        last_name=last_name,
        is_active=True,
        email_verified=True,
        last_login=datetime.utcnow(),
        created_at=datetime.utcnow() - timedelta(days=14),
        updated_at=datetime.utcnow(),
    )
    session.add(user)
    await session.flush()
    print(f"  Created user: {email} ({user.id})")

    # Create Stripe customer
    stripe_customer = stripe.Customer.create(
        email=email,
        name=f"{first_name} {last_name}",
        metadata={"user_id": user_id, "platform": "commonground"},
    )
    print(f"  Created Stripe customer: {stripe_customer.id}")

    # Create profile with Stripe customer ID
    profile = UserProfile(
        user_id=user_id,
        first_name=first_name,
        last_name=last_name,
        stripe_customer_id=stripe_customer.id,
        subscription_tier=subscription_tier,
        subscription_status="active",
        terms_accepted_at=datetime.utcnow(),
        privacy_policy_accepted_at=datetime.utcnow(),
    )
    session.add(profile)
    await session.flush()
    print(f"  Created profile with tier: {subscription_tier}")

    return user, profile


async def main():
    print("\n=== Seeding Stripe Test Family ===\n")

    if not settings.STRIPE_SECRET_KEY:
        print("ERROR: STRIPE_SECRET_KEY not set. Check your .env file.")
        return

    print(f"Using Stripe key: {settings.STRIPE_SECRET_KEY[:12]}...{settings.STRIPE_SECRET_KEY[-4:]}\n")

    async with AsyncSessionLocal() as session:
        try:
            # Create Parent A
            print("Creating Parent A (Sarah Mitchell)...")
            parent_a, profile_a = await find_or_create_user_with_stripe(
                session,
                email="sarah.mitchell@commonground-test.com",
                first_name="Sarah",
                last_name="Mitchell",
                subscription_tier="complete",
            )

            # Create Parent B
            print("\nCreating Parent B (James Mitchell)...")
            parent_b, profile_b = await find_or_create_user_with_stripe(
                session,
                email="james.mitchell@commonground-test.com",
                first_name="James",
                last_name="Mitchell",
                subscription_tier="plus",
            )

            # Check if family file already exists
            ff_result = await session.execute(
                select(FamilyFile).where(
                    FamilyFile.parent_a_id == parent_a.id,
                    FamilyFile.parent_b_id == parent_b.id,
                )
            )
            existing_ff = ff_result.scalar_one_or_none()

            if existing_ff:
                print(f"\nFamily file already exists: {existing_ff.id}")
            else:
                # Create Family File
                print("\nCreating Family File...")
                family_file = FamilyFile(
                    id=uid(),
                    family_file_number=f"FF-{uid()[:6].upper()}",
                    title="Mitchell Family",
                    created_by=parent_a.id,
                    parent_a_id=parent_a.id,
                    parent_a_role="mother",
                    parent_b_id=parent_b.id,
                    parent_b_role="father",
                    parent_b_email="james.mitchell@commonground-test.com",
                    parent_b_invited_at=datetime.utcnow() - timedelta(days=7),
                    parent_b_joined_at=datetime.utcnow() - timedelta(days=6),
                    status="active",
                    conflict_level="moderate",
                    state="CA",
                    aria_enabled=True,
                )
                session.add(family_file)
                await session.flush()
                print(f"  Created family file: {family_file.id}")

                # Create Child
                child = Child(
                    id=uid(),
                    family_file_id=family_file.id,
                    first_name="Emma",
                    last_name="Mitchell",
                    date_of_birth=datetime(2019, 8, 22),
                    gender="female",
                    created_at=datetime.utcnow(),
                )
                session.add(child)
                await session.flush()
                print(f"  Created child: Emma Mitchell ({child.id})")

            await session.commit()

            print("\n" + "=" * 50)
            print("SEED COMPLETE")
            print("=" * 50)
            print(f"\nParent A: Sarah Mitchell")
            print(f"  Email: sarah.mitchell@commonground-test.com")
            print(f"  Stripe Customer: {profile_a.stripe_customer_id}")
            print(f"  Tier: {profile_a.subscription_tier}")
            print(f"\nParent B: James Mitchell")
            print(f"  Email: james.mitchell@commonground-test.com")
            print(f"  Stripe Customer: {profile_b.stripe_customer_id}")
            print(f"  Tier: {profile_b.subscription_tier}")
            print(f"\nCheck Stripe dashboard: https://dashboard.stripe.com/test/customers")
            print(f"Check SuperAdmin billing: https://find-commonground.com/superadmin/billing")

        except Exception as e:
            await session.rollback()
            print(f"\nERROR: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())

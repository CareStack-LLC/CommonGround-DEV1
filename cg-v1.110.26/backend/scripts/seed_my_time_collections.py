"""
Seed script to create default "My Time" collections for all parents.

This script:
1. Finds all active cases
2. For each parent in each case
3. Creates a default "My Time" collection if they don't have one

Run with: python -m scripts.seed_my_time_collections
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.case import Case, CaseParticipant
from app.models.my_time_collection import MyTimeCollection
import uuid


async def seed_collections():
    """Create default My Time collections for all parents."""

    async with AsyncSessionLocal() as session:
        try:
            # Get all active cases
            result = await session.execute(
                select(Case).where(Case.status.in_(["pending", "active"]))
            )
            cases = result.scalars().all()

            print(f"\n📋 Found {len(cases)} active cases")

            total_created = 0
            total_existing = 0

            for case in cases:
                print(f"\n🔍 Processing case: {case.case_name} ({case.id})")

                # Get all participants in this case
                participants_result = await session.execute(
                    select(CaseParticipant).where(
                        CaseParticipant.case_id == case.id,
                        CaseParticipant.is_active == True
                    )
                )
                participants = participants_result.scalars().all()

                print(f"   👥 Found {len(participants)} active participants")

                for participant in participants:
                    # Check if participant already has a default collection
                    existing_result = await session.execute(
                        select(MyTimeCollection).where(
                            MyTimeCollection.case_id == case.id,
                            MyTimeCollection.owner_id == participant.user_id,
                            MyTimeCollection.is_default == True
                        )
                    )
                    existing = existing_result.scalar_one_or_none()

                    if existing:
                        print(f"   ✓ {participant.parent_type} already has default collection: {existing.name}")
                        total_existing += 1
                    else:
                        # Create default collection
                        collection = MyTimeCollection(
                            id=str(uuid.uuid4()),
                            case_id=case.id,
                            owner_id=participant.user_id,
                            name="My Time",
                            color="#3B82F6",  # Blue
                            is_default=True,
                            is_active=True,
                            display_order=0
                        )
                        session.add(collection)
                        total_created += 1

                        print(f"   ✨ Created default collection for {participant.parent_type}")

            # Commit all changes
            await session.commit()

            print(f"\n{'='*60}")
            print(f"🎉 Seed complete!")
            print(f"   Created: {total_created} new collections")
            print(f"   Existing: {total_existing} collections already present")
            print(f"   Total: {total_created + total_existing} collections")
            print(f"{'='*60}\n")

            return total_created, total_existing

        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error during seeding: {e}")
            raise


async def verify_collections():
    """Verify that all parents have default collections."""

    async with AsyncSessionLocal() as session:
        # Count total participants
        participants_result = await session.execute(
            select(CaseParticipant).where(CaseParticipant.is_active == True)
        )
        total_participants = len(participants_result.scalars().all())

        # Count default collections
        collections_result = await session.execute(
            select(MyTimeCollection).where(MyTimeCollection.is_default == True)
        )
        total_collections = len(collections_result.scalars().all())

        print(f"\n📊 Verification:")
        print(f"   Active participants: {total_participants}")
        print(f"   Default collections: {total_collections}")

        if total_participants == total_collections:
            print(f"   ✅ All participants have default collections!")
        else:
            print(f"   ⚠️  Mismatch: {total_participants - total_collections} missing")

        return total_participants, total_collections


async def main():
    """Main entry point."""
    print("\n" + "="*60)
    print("🌱 My Time Collections - Seed Script")
    print("="*60)

    # Run seeding
    created, existing = await seed_collections()

    # Verify results
    await verify_collections()


if __name__ == "__main__":
    asyncio.run(main())

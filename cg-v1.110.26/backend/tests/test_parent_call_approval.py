"""
Test parent call approval logic.

This test verifies:
1. Only 1 daily room is created per family file
2. Calling is disabled until both parents join
3. Room only works with the specific family file
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import select
from app.core.database import get_db_context
from app.models.user import User, UserProfile
from app.models.family_file import FamilyFile
from app.models.parent_call import ParentCallRoom
from app.services.parent_call import parent_call_service
import httpx


async def create_test_user(db, email: str, name: str):
    """Create a test user."""
    first_name = name.split()[0]
    last_name = name.split()[-1] if len(name.split()) > 1 else ""

    user = User(
        email=email,
        supabase_id=f"test-{email}",
        first_name=first_name,
        last_name=last_name
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


async def test_parent_call_approval():
    """Main test function."""
    print("\n" + "="*80)
    print("Testing Parent Call Approval Logic")
    print("="*80 + "\n")

    async with get_db_context() as db:
        try:
            # Cleanup any existing test data first
            print("Cleaning up any existing test data...")

            # Delete test family files first
            from app.models.parent_call import ParentCallRoom, ParentCallSession
            test_ff_numbers = ["FF-TEST-001", "FF-TEST-002"]
            for ff_number in test_ff_numbers:
                result = await db.execute(
                    select(FamilyFile).where(FamilyFile.family_file_number == ff_number)
                )
                ff = result.scalar_one_or_none()
                if ff:
                    # Delete call rooms for this family file
                    rooms_result = await db.execute(
                        select(ParentCallRoom).where(ParentCallRoom.family_file_id == ff.id)
                    )
                    for room in rooms_result.scalars().all():
                        await db.delete(room)

                    # Delete call sessions for this family file
                    sessions_result = await db.execute(
                        select(ParentCallSession).where(ParentCallSession.family_file_id == ff.id)
                    )
                    for session in sessions_result.scalars().all():
                        await db.delete(session)

                    await db.delete(ff)

            # Delete test users
            test_emails = [
                "parent_a1@test.com",
                "parent_b1@test.com",
                "parent_a2@test.com",
                "parent_b2@test.com"
            ]
            for email in test_emails:
                result = await db.execute(select(User).where(User.email == email))
                user = result.scalar_one_or_none()
                if user:
                    await db.delete(user)

            await db.commit()
            print("✅ Cleanup complete")

            # Step 1: Create test users
            print("\nStep 1: Creating test users...")
            parent_a1 = await create_test_user(db, "parent_a1@test.com", "Alice Smith")
            parent_b1 = await create_test_user(db, "parent_b1@test.com", "Bob Smith")
            parent_a2 = await create_test_user(db, "parent_a2@test.com", "Charlie Jones")
            parent_b2 = await create_test_user(db, "parent_b2@test.com", "Diana Jones")
            print(f"✅ Created 4 test users")

            # Step 2: Create Family File 1 (only parent A joined, parent B not yet)
            print("\nStep 2: Creating Family File 1 (only Parent A joined)...")
            ff1 = FamilyFile(
                title="Smith Family File",
                family_file_number="FF-TEST-001",
                state="CA",
                county="Los Angeles",
                parent_a_id=parent_a1.id,
                parent_b_id=parent_b1.id,
                created_by=parent_a1.id,
                parent_b_joined_at=None,  # Not joined yet
                status="active"
            )
            db.add(ff1)
            await db.commit()
            await db.refresh(ff1)
            print(f"✅ Created Family File 1: {ff1.id}")
            print(f"   - Parent A joined: ✅ (creator)")
            print(f"   - Parent B joined: ❌ (not yet)")

            # Step 3: Verify permanent room created for FF1
            print("\nStep 3: Checking permanent room for Family File 1...")
            room1 = await parent_call_service.get_or_create_permanent_room(
                db=db,
                family_file_id=ff1.id
            )
            print(f"✅ Room created: {room1.daily_room_name}")

            # Verify only 1 room exists
            result = await db.execute(
                select(ParentCallRoom).where(ParentCallRoom.family_file_id == ff1.id)
            )
            rooms = list(result.scalars().all())
            assert len(rooms) == 1, f"Expected 1 room, found {len(rooms)}"
            print(f"✅ Verified: Only 1 room exists for Family File 1")

            # Step 4: Try to call again - should return same room
            print("\nStep 4: Testing idempotency (get room again)...")
            room1_again = await parent_call_service.get_or_create_permanent_room(
                db=db,
                family_file_id=ff1.id
            )
            assert room1.id == room1_again.id, "Got different room ID!"
            assert room1.daily_room_name == room1_again.daily_room_name, "Got different room name!"
            print(f"✅ Same room returned (idempotent): {room1_again.daily_room_name}")

            # Verify still only 1 room
            result = await db.execute(
                select(ParentCallRoom).where(ParentCallRoom.family_file_id == ff1.id)
            )
            rooms = list(result.scalars().all())
            assert len(rooms) == 1, f"Expected 1 room after retry, found {len(rooms)}"
            print(f"✅ Still only 1 room exists")

            # Step 5: Try to create call session (should fail - parent B not joined)
            print("\nStep 5: Testing call session creation (should fail - Parent B not joined)...")
            try:
                session = await parent_call_service.create_call_session(
                    db=db,
                    family_file_id=ff1.id,
                    initiator_id=parent_a1.id,
                    call_type="video"
                )
                print("❌ FAILED: Should have raised exception but didn't!")
                raise AssertionError("Expected exception for calling without parent B joined")
            except ValueError as e:
                expected_message = "Both parents must join the family file before calling"
                if expected_message in str(e):
                    print(f"✅ Correct error raised: {e}")
                else:
                    print(f"❌ Wrong error message: {e}")
                    raise

            # Step 6: Parent B joins Family File 1
            print("\nStep 6: Parent B joins Family File 1...")
            ff1.parent_b_joined_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(ff1)
            print(f"✅ Parent B joined at: {ff1.parent_b_joined_at}")

            # Step 7: Now try to create call session (should succeed)
            print("\nStep 7: Creating call session (should succeed now)...")
            session = await parent_call_service.create_call_session(
                db=db,
                family_file_id=ff1.id,
                initiator_id=parent_a1.id,
                call_type="video"
            )
            print(f"✅ Call session created: {session.id}")
            print(f"   - Room: {session.daily_room_name}")
            print(f"   - Status: {session.status}")
            print(f"   - Call type: {session.call_type}")

            # Step 8: Create Family File 2 (both parents joined)
            print("\nStep 8: Creating Family File 2 (both parents joined)...")
            ff2 = FamilyFile(
                title="Jones Family File",
                family_file_number="FF-TEST-002",
                state="NY",
                county="New York",
                parent_a_id=parent_a2.id,
                parent_b_id=parent_b2.id,
                created_by=parent_a2.id,
                parent_b_joined_at=datetime.now(timezone.utc),  # Parent B joined
                status="active"
            )
            db.add(ff2)
            await db.commit()
            await db.refresh(ff2)
            print(f"✅ Created Family File 2: {ff2.id}")
            print(f"   - Parent A joined: ✅ (creator)")
            print(f"   - Parent B joined: ✅")

            # Step 9: Create permanent room for FF2
            print("\nStep 9: Creating permanent room for Family File 2...")
            room2 = await parent_call_service.get_or_create_permanent_room(
                db=db,
                family_file_id=ff2.id
            )
            print(f"✅ Room created: {room2.daily_room_name}")

            # Step 10: Verify rooms are different
            print("\nStep 10: Verifying rooms are unique per family file...")
            assert room1.id != room2.id, "Rooms have same ID!"
            assert room1.daily_room_name != room2.daily_room_name, "Rooms have same name!"
            assert room1.family_file_id == ff1.id, "Room 1 has wrong family file ID"
            assert room2.family_file_id == ff2.id, "Room 2 has wrong family file ID"
            print(f"✅ Rooms are unique:")
            print(f"   - FF1 room: {room1.daily_room_name}")
            print(f"   - FF2 room: {room2.daily_room_name}")

            # Step 11: Create call in FF2 (should work immediately)
            print("\nStep 11: Creating call session in Family File 2...")
            session2 = await parent_call_service.create_call_session(
                db=db,
                family_file_id=ff2.id,
                initiator_id=parent_a2.id,
                call_type="audio"
            )
            print(f"✅ Call session created: {session2.id}")
            print(f"   - Room: {session2.daily_room_name}")
            print(f"   - Matches FF2 room: {session2.daily_room_name == room2.daily_room_name}")

            # Verify session uses correct room
            assert session2.daily_room_name == room2.daily_room_name, "Session using wrong room!"
            print(f"✅ Session correctly using Family File 2's room")

            # Step 12: Final verification
            print("\n" + "="*80)
            print("Final Verification Summary")
            print("="*80)

            # Count total rooms
            result = await db.execute(select(ParentCallRoom))
            all_rooms = list(result.scalars().all())
            print(f"\n✅ Total permanent rooms created: {len(all_rooms)}")
            print(f"   - Family File 1: 1 room")
            print(f"   - Family File 2: 1 room")
            print(f"   - Expected: 2, Actual: {len(all_rooms)}")
            assert len(all_rooms) == 2, f"Expected 2 total rooms, found {len(all_rooms)}"

            # Verify each family file has exactly 1 room
            for ff, expected_room_name in [(ff1, room1.daily_room_name), (ff2, room2.daily_room_name)]:
                result = await db.execute(
                    select(ParentCallRoom).where(ParentCallRoom.family_file_id == ff.id)
                )
                rooms = list(result.scalars().all())
                assert len(rooms) == 1, f"Family file {ff.id} has {len(rooms)} rooms!"
                assert rooms[0].daily_room_name == expected_room_name

            print(f"\n✅ Each family file has exactly 1 unique room")
            print(f"✅ Rooms are isolated per family file")
            print(f"✅ Calling disabled until both parents join")
            print(f"✅ Calling enabled after both parents join")

            print("\n" + "="*80)
            print("✅ ALL TESTS PASSED!")
            print("="*80 + "\n")

            # Cleanup
            print("Cleaning up test data...")
            await db.delete(session)
            await db.delete(session2)
            await db.delete(room1)
            await db.delete(room2)
            await db.delete(ff1)
            await db.delete(ff2)
            await db.delete(parent_a1)
            await db.delete(parent_b1)
            await db.delete(parent_a2)
            await db.delete(parent_b2)
            await db.commit()
            print("✅ Cleanup complete")

        except Exception as e:
            print(f"\n❌ Test failed with error: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(test_parent_call_approval())

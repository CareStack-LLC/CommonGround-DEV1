"""
Setup KidsCom for Jayden Brown

Creates:
1. Approves Jayden's child profile
2. Creates ChildUser with PIN "1234"
3. Sets up circle contacts (Tasha & Marcus as approved contacts)
4. Creates KidComs settings for the family

Run with: python -m scripts.setup_kidscom_jayden
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.core.database import AsyncSessionLocal
from app.models.child import Child
from app.models.family_file import FamilyFile
from app.models.kidcoms import ChildUser, KidComsSettings, CirclePermission
from app.models.circle import CircleContact


def hash_pin(pin: str) -> str:
    """Hash a PIN using bcrypt."""
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()


async def setup_jayden_kidscom():
    """Set up KidsCom for Jayden Brown."""

    # IDs from the database
    FAMILY_FILE_ID = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab"
    CHILD_ID = "28db6b20-0038-4712-8f55-9a4ddc1ce71c"
    TASHA_ID = "cb157af9-69e8-4c81-943a-83deea6746cc"
    MARCUS_ID = "eb9a2b70-76ed-4cb5-b8fb-23e1776423ee"

    PIN = "1234"  # Simple PIN for demo
    USERNAME = "SuperJayden"

    async with AsyncSessionLocal() as db:
        print("\n=== Setting up KidsCom for Jayden Brown ===\n")

        # 1. Check if child exists and approve if needed
        result = await db.execute(
            select(Child).where(Child.id == CHILD_ID)
        )
        child = result.scalar_one_or_none()

        if not child:
            print(f"ERROR: Child not found with ID {CHILD_ID}")
            return

        print(f"Found child: {child.first_name} {child.last_name}")
        print(f"  Status: {child.status}")

        if child.status == "pending_approval":
            print("  Approving child profile...")
            child.status = "active"
            child.approved_by_a = TASHA_ID
            child.approved_at_a = datetime.utcnow()
            child.approved_by_b = MARCUS_ID
            child.approved_at_b = datetime.utcnow()
            await db.commit()
            print("  ✓ Child profile approved!")

        # 2. Create or update ChildUser
        result = await db.execute(
            select(ChildUser).where(ChildUser.child_id == CHILD_ID)
        )
        child_user = result.scalar_one_or_none()

        if child_user:
            print(f"\nChildUser already exists: {child_user.username}")
            # Update PIN
            child_user.pin_hash = hash_pin(PIN)
            child_user.is_active = True
            print(f"  Updated PIN to: {PIN}")
        else:
            print(f"\nCreating ChildUser...")
            child_user = ChildUser(
                child_id=CHILD_ID,
                family_file_id=FAMILY_FILE_ID,
                username=USERNAME,
                pin_hash=hash_pin(PIN),
                avatar_id="dinosaur",  # Kid-friendly avatar
                is_active=True
            )
            db.add(child_user)
            print(f"  Username: {USERNAME}")
            print(f"  PIN: {PIN}")

        await db.commit()
        await db.refresh(child_user)
        print(f"  ✓ ChildUser ID: {child_user.id}")

        # 3. Create or update KidComs settings
        result = await db.execute(
            select(KidComsSettings).where(KidComsSettings.family_file_id == FAMILY_FILE_ID)
        )
        settings = result.scalar_one_or_none()

        if settings:
            print(f"\nKidComs settings already exist")
        else:
            print(f"\nCreating KidComs settings...")
            settings = KidComsSettings(
                family_file_id=FAMILY_FILE_ID,
                circle_approval_mode="one_parent",  # Allow communication with one parent approval
                enforce_availability=False,  # Don't restrict by time for demo
                require_parent_notification=True,
                notify_on_session_start=True,
                notify_on_session_end=True,
                notify_on_aria_flag=True,
                allowed_features={
                    "video": True,
                    "chat": True,
                    "theater": True,
                    "arcade": True,
                    "whiteboard": True
                },
                max_session_duration_minutes=60,
                max_daily_sessions=10,
                max_participants_per_session=4,
                require_parent_in_call=False,
                allow_child_to_initiate=True,  # Let Jayden initiate calls
                record_sessions=False
            )
            db.add(settings)
            await db.commit()
            print("  ✓ KidComs settings created!")

        # 4. Create circle contacts for parents (so child can call them)
        # Check if circle contacts already exist
        result = await db.execute(
            select(CircleContact).where(
                CircleContact.family_file_id == FAMILY_FILE_ID
            )
        )
        existing_contacts = result.scalars().all()
        print(f"\nExisting circle contacts: {len(existing_contacts)}")

        # Create parent circle contacts if they don't exist
        for parent_id, name, relationship in [
            (TASHA_ID, "Mom (Tasha)", "parent"),
            (MARCUS_ID, "Dad (Marcus)", "parent")
        ]:
            # Check if this parent is already a circle contact
            has_contact = any(
                c.user_id == parent_id for c in existing_contacts
            )

            if not has_contact:
                print(f"  Creating circle contact for {name}...")
                contact = CircleContact(
                    family_file_id=FAMILY_FILE_ID,
                    user_id=parent_id,
                    contact_name=name,
                    relationship_type=relationship,
                    contact_email=None,
                    contact_phone=None,
                    is_active=True,
                    approved_by_parent_a_at=datetime.utcnow(),
                    approved_by_parent_b_at=datetime.utcnow(),
                )
                db.add(contact)
                await db.flush()

                # Create permission for this contact
                permission = CirclePermission(
                    family_file_id=FAMILY_FILE_ID,
                    circle_contact_id=str(contact.id),
                    child_id=CHILD_ID,
                    can_video_call=True,
                    can_voice_call=True,
                    can_chat=True,
                    can_theater=True,
                    max_call_duration_minutes=60,
                    require_parent_present=False
                )
                db.add(permission)
                print(f"    ✓ Created contact and permissions for {name}")

        await db.commit()

        print("\n" + "="*50)
        print("✓ KidsCom setup complete!")
        print("="*50)
        print(f"\nJayden can now log in with:")
        print(f"  PIN: {PIN}")
        print(f"\nAnd call:")
        print(f"  - Mom (Tasha)")
        print(f"  - Dad (Marcus)")
        print()


if __name__ == "__main__":
    asyncio.run(setup_jayden_kidscom())

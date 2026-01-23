"""
Reset Database - Delete Auth Users

Deletes all users from auth.users which cascades to all application data.
This is the cleanest way to reset the system.
"""

import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text


async def reset_auth_users():
    """Delete all auth users (cascades to all app data)."""

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")

    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("\n🚨 RESETTING DATABASE...")
        print("⚠️  Deleting all users from auth.users (cascades to all data)\n")

        try:
            # Get count of users before deletion
            result = await session.execute(
                text("SELECT COUNT(*) FROM auth.users;")
            )
            user_count = result.scalar()
            print(f"📋 Found {user_count} users to delete\n")

            if user_count == 0:
                print("✅ No users found. Database is already clean!")
                return

            # Delete all users from auth schema
            # This will cascade delete all related data in public schema
            print("🗑️  Deleting users from auth.users...")
            await session.execute(
                text("DELETE FROM auth.users;")
            )

            await session.commit()

            print("\n✅ DATABASE RESET COMPLETE!")
            print("\n📊 Summary:")
            print(f"   - {user_count} users deleted from auth.users")
            print("   - All family files cascaded (deleted)")
            print("   - All messages cascaded (deleted)")
            print("   - All agreements cascaded (deleted)")
            print("   - All children cascaded (deleted)")
            print("   - All schedule data cascaded (deleted)")
            print("   - All expense data cascaded (deleted)")
            print("   - All case data cascaded (deleted)")
            print("   - Schema and migrations preserved")
            print("\n🎉 System is now fresh and ready for new users!")

        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            await session.rollback()
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    print("\n" + "="*60)
    print("   COMMONGROUND DATABASE RESET")
    print("="*60)

    confirmation = input("\n⚠️  Type 'RESET' to confirm deletion of ALL users: ")

    if confirmation != "RESET":
        print("\n❌ Reset cancelled. No data was deleted.")
        exit(0)

    print("\n🔄 Starting reset in 3 seconds...")
    import time
    time.sleep(3)

    asyncio.run(reset_auth_users())

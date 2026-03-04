"""
Simple Database Reset - Delete All User Data via Supabase Auth

This approach deletes users from Supabase Auth, which will cascade
delete all related data in PostgreSQL through foreign key constraints.
"""

import asyncio
import os
from supabase import create_client, Client


async def reset_via_supabase():
    """Delete all users via Supabase Auth (cascades to all data)."""

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")

    supabase: Client = create_client(supabase_url, supabase_key)

    print("\n🚨 RESETTING DATABASE VIA SUPABASE AUTH...")
    print("⚠️  This will delete ALL users and cascade to all data!\n")

    try:
        # Get all users
        print("📋 Fetching all users...")
        response = supabase.auth.admin.list_users()
        users = response

        if not users:
            print("✅ No users found. Database is already clean!")
            return

        print(f"Found {len(users)} users to delete\n")

        # Delete each user
        deleted_count = 0
        for user in users:
            try:
                supabase.auth.admin.delete_user(user.id)
                deleted_count += 1
                print(f"   ✅ Deleted user: {user.email} ({user.id})")
            except Exception as e:
                print(f"   ❌ Error deleting {user.email}: {e}")

        print(f"\n✅ DATABASE RESET COMPLETE!")
        print(f"\n📊 Summary:")
        print(f"   - {deleted_count} users deleted from Supabase Auth")
        print(f"   - All related data cascaded (family files, messages, agreements, etc.)")
        print(f"   - Schema and migrations preserved")
        print("\n🎉 System is now fresh and ready for new users!")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        raise


if __name__ == "__main__":
    print("\n" + "="*60)
    print("   COMMONGROUND DATABASE RESET (VIA SUPABASE)")
    print("="*60)

    confirmation = input("\n⚠️  Type 'RESET' to confirm deletion of ALL users: ")

    if confirmation != "RESET":
        print("\n❌ Reset cancelled. No data was deleted.")
        exit(0)

    print("\n🔄 Starting reset in 3 seconds...")
    import time
    time.sleep(3)

    asyncio.run(reset_via_supabase())

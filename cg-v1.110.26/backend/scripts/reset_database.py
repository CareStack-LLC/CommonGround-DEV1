"""
Reset Database - Delete All User Data and Family Files

This script deletes all user accounts, family files, and related data
while preserving the database schema and migrations table.

⚠️  WARNING: This is destructive and cannot be undone!
"""

import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text


async def reset_database():
    """Delete all user data while preserving schema."""

    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")

    # Create async engine
    engine = create_async_engine(database_url, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("\n🚨 STARTING DATABASE RESET...")
        print("⚠️  This will delete ALL user data and family files!\n")

        try:
            # Disable foreign key constraints temporarily
            await session.execute(text("SET session_replication_role = 'replica';"))

            # Delete order matters due to foreign key relationships
            # Start with dependent tables first, then parent tables

            tables_to_truncate = [
                # Professional portal
                'professional_messages',
                'case_assignments',
                'professional_access_requests',
                'intake_sessions',
                'intake_session_outputs',
                'firm_templates',
                'firm_memberships',
                'firms',
                'professional_profiles',

                # Court portal
                'court_events',
                'court_event_attendees',

                # Parent calls
                'call_flags',
                'call_transcript_chunks',
                'parent_call_sessions',
                'parent_call_rooms',
                'message_attachments',

                # KidComs
                'kidcoms_messages',
                'kidcoms_sessions',
                'kidcoms_rooms',
                'child_circle_contacts',
                'child_wallets',
                'wallet_transactions',

                # ClearFund
                'expense_splits',
                'expenses',
                'obligations',
                'obligation_payments',

                # Custody tracking
                'custody_exchange_instances',
                'custody_exchanges',
                'custody_periods',
                'time_blocks',
                'my_time_collections',

                # Schedule
                'schedule_events',
                'calendar_busy_periods',

                # Messages & ARIA
                'message_flags',
                'message_threads',
                'messages',
                'aria_messages',
                'aria_conversations',

                # Agreements
                'agreement_versions',
                'agreement_sections',
                'agreements',

                # Children & Cubbie
                'cubbie_items',
                'children',

                # Family Files
                'family_file_participants',
                'family_files',

                # Cases (legacy)
                'case_participants',
                'cases',

                # Audit & notifications
                'audit_logs',
                'notifications',

                # Users
                'user_profiles',
                'users',
            ]

            print("\n📋 Tables to be cleared:")
            for table in tables_to_truncate:
                print(f"   - {table}")

            print("\n🗑️  Deleting data...")

            for table in tables_to_truncate:
                try:
                    # Check if table exists
                    result = await session.execute(
                        text(f"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '{table}');")
                    )
                    exists = result.scalar()

                    if exists:
                        await session.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
                        print(f"   ✅ Cleared: {table}")
                    else:
                        print(f"   ⚠️  Skipped (not found): {table}")
                except Exception as e:
                    print(f"   ❌ Error clearing {table}: {e}")

            # Re-enable foreign key constraints
            await session.execute(text("SET session_replication_role = 'origin';"))

            await session.commit()

            print("\n✅ DATABASE RESET COMPLETE!")
            print("\n📊 Summary:")
            print("   - All user accounts deleted")
            print("   - All family files deleted")
            print("   - All cases deleted")
            print("   - All messages deleted")
            print("   - All agreements deleted")
            print("   - All children profiles deleted")
            print("   - All schedule data deleted")
            print("   - All expense data deleted")
            print("   - Schema preserved")
            print("   - Migrations table preserved")

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

    confirmation = input("\n⚠️  Type 'RESET' to confirm deletion of ALL data: ")

    if confirmation != "RESET":
        print("\n❌ Reset cancelled. No data was deleted.")
        exit(0)

    print("\n🔄 Starting reset in 3 seconds...")
    import time
    time.sleep(3)

    asyncio.run(reset_database())

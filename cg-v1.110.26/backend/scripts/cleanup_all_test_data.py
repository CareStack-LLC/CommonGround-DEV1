"""
Clean up all test data from Database, Stripe, and Supabase.
Keeps only the admin account: thomas.wilform@gmail.com
"""
import asyncio
import os
import stripe
from supabase import create_client

# ── Config (reads from environment variables) ────────────────────────────
ADMIN_EMAIL = "thomas.wilform@gmail.com"

DATABASE_URL = os.environ.get("DATABASE_URL", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")


async def cleanup_database():
    """Delete all non-admin data from the database using TRUNCATE CASCADE."""
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    engine = create_async_engine(DATABASE_URL, echo=False)

    # First get admin info
    async with engine.begin() as conn:
        result = await conn.execute(
            text("SELECT id, supabase_id FROM users WHERE email = :email"),
            {"email": ADMIN_EMAIL}
        )
        admin_row = result.fetchone()
        if not admin_row:
            print(f"  WARNING: Admin user {ADMIN_EMAIL} not found!")
            admin_id = None
            admin_supabase_id = None
        else:
            admin_id = str(admin_row[0])
            admin_supabase_id = str(admin_row[1])
            print(f"  Admin user found: id={admin_id}, supabase_id={admin_supabase_id}")

        result = await conn.execute(
            text("SELECT COUNT(*) FROM users WHERE email != :email"),
            {"email": ADMIN_EMAIL}
        )
        print(f"  Non-admin users to delete: {result.scalar()}")

    # Tables to fully truncate (no admin rows to keep)
    truncate_tables = [
        "bug_hunt_findings",
        "bug_hunt_families",
        "bug_hunt_checklist_items",
        "bug_hunt_cohorts",
        "message_flags",
        "messages",
        "aria_messages",
        "aria_conversations",
        "agreement_sections",
        "agreement_versions",
        "agreements",
        "custody_exchange_instances",
        "custody_exchanges",
        "custody_periods",
        "my_time_collection_items",
        "my_time_collections",
        "time_blocks",
        "schedule_events",
        "obligation_payments",
        "obligations",
        "expense_splits",
        "expenses",
        "court_event_participants",
        "court_events",
        "professional_messages",
        "intake_sessions",
        "case_assignments",
        "firm_memberships",
        "firms",
        "professional_access_requests",
        "professional_profiles",
        "kidcoms_call_logs",
        "kidcoms_circle_members",
        "kidcoms_circles",
        "kidcoms_wallet_transactions",
        "kidcoms_wallets",
        "children",
        "family_files",
        "notifications",
        "audit_logs",
    ]

    # Truncate all dependent tables first (each in own transaction)
    for table in truncate_tables:
        async with engine.begin() as conn:
            try:
                result = await conn.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
                print(f"  Truncated {table}")
            except Exception as e:
                err = str(e)
                if "does not exist" in err or "UndefinedTable" in err:
                    pass
                else:
                    print(f"  WARNING: {table}: {err[:120]}")

    # Delete non-admin user_profiles and users
    if admin_id:
        async with engine.begin() as conn:
            try:
                r = await conn.execute(
                    text("DELETE FROM user_profiles WHERE user_id != :id"),
                    {"id": admin_id}
                )
                print(f"  Deleted {r.rowcount} rows from user_profiles")
            except Exception as e:
                print(f"  WARNING user_profiles: {str(e)[:120]}")

        async with engine.begin() as conn:
            try:
                r = await conn.execute(
                    text("DELETE FROM users WHERE id != :id"),
                    {"id": admin_id}
                )
                print(f"  Deleted {r.rowcount} rows from users")
            except Exception as e:
                print(f"  WARNING users: {str(e)[:120]}")

    await engine.dispose()
    print("  Database cleanup complete.")
    return admin_supabase_id


def cleanup_stripe():
    """Delete all Stripe customers (which cascades subscriptions)."""
    stripe.api_key = STRIPE_SECRET_KEY

    deleted = 0
    # List all customers and delete them
    customers = stripe.Customer.list(limit=100)
    while customers.data:
        for customer in customers.data:
            try:
                # Cancel all subscriptions first
                subs = stripe.Subscription.list(customer=customer.id, limit=100)
                for sub in subs.data:
                    if sub.status != "canceled":
                        stripe.Subscription.cancel(sub.id)
                        print(f"  Cancelled subscription {sub.id}")

                # Delete the customer
                stripe.Customer.delete(customer.id)
                deleted += 1
                print(f"  Deleted customer {customer.id} ({customer.email})")
            except Exception as e:
                print(f"  WARNING: Failed to delete customer {customer.id}: {e}")

        if customers.has_more:
            customers = stripe.Customer.list(limit=100, starting_after=customers.data[-1].id)
        else:
            break

    print(f"  Stripe cleanup complete. Deleted {deleted} customers.")


def cleanup_supabase(admin_supabase_id: str = None):
    """Delete all Supabase auth users except the admin."""
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    deleted = 0
    page = 1
    per_page = 100

    while True:
        response = client.auth.admin.list_users(page=page, per_page=per_page)
        users = response if isinstance(response, list) else getattr(response, 'users', response)

        if not users:
            break

        found_any = False
        for user in users:
            found_any = True
            user_id = user.id if hasattr(user, 'id') else user.get('id')
            user_email = user.email if hasattr(user, 'email') else user.get('email', '')

            # Skip admin
            if user_email == ADMIN_EMAIL:
                print(f"  Keeping admin: {user_email} ({user_id})")
                continue
            if admin_supabase_id and str(user_id) == str(admin_supabase_id):
                print(f"  Keeping admin by supabase_id: {user_email} ({user_id})")
                continue

            try:
                client.auth.admin.delete_user(str(user_id))
                deleted += 1
                print(f"  Deleted Supabase user: {user_email} ({user_id})")
            except Exception as e:
                print(f"  WARNING: Failed to delete {user_email}: {e}")

        if not found_any or len(users) < per_page:
            break
        page += 1

    print(f"  Supabase cleanup complete. Deleted {deleted} users.")


async def main():
    print("=" * 60)
    print("CLEANUP: Removing all test data")
    print(f"Keeping only: {ADMIN_EMAIL}")
    print("=" * 60)

    print("\n[1/3] Cleaning DATABASE...")
    admin_supabase_id = await cleanup_database()

    print("\n[2/3] Cleaning STRIPE...")
    cleanup_stripe()

    print("\n[3/3] Cleaning SUPABASE AUTH...")
    cleanup_supabase(admin_supabase_id)

    print("\n" + "=" * 60)
    print("CLEANUP COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

"""
Simplified E2E Test Data Seeding Script (Async)

Creates minimal test data for E2E testing.
"""

import sys
import asyncio
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import get_db_context
from app.models.user import User
from app.utils.security import get_password_hash
from sqlalchemy import select, delete


async def clean_test_data():
    """Remove existing test data"""
    print("\n🧹 Cleaning existing E2E test data...")
    
    async with get_db_context() as db:
        # Delete test users
        result = await db.execute(
            delete(User).where(User.email.like("%@commonground.test"))
        )
        await db.commit()
        print(f"   ✅ Removed {result.rowcount} test users")


async def create_test_users():
    """Create 4 test user accounts"""
    print("\n👥 Creating test user accounts...")
    
    personas = [
        {
            "email": "e2e_test_sarah@commonground.test",
            "first_name": "Sarah",
            "last_name": "Martinez",
            "password": "TestPass123!"
        },
        {
            "email": "e2e_test_michael@commonground.test",
            "first_name": "Michael",
            "last_name": "Rodriguez",
            "password": "TestPass123!"
        },
        {
            "email": "e2e_test_jessica@commonground.test",
            "first_name": "Jessica",
            "last_name": "Chen",
            "password": "TestPass123!"
        },
        {
            "email": "e2e_test_david@commonground.test",
            "first_name": "David",
            "last_name": "Thompson",
            "password": "TestPass123!"
        }
    ]
    
    async with get_db_context() as db:
        for persona in personas:
            # Check if user exists
            result = await db.execute(
                select(User).where(User.email == persona["email"])
            )
            existing = result.scalar_one_or_none()
            
            if not existing:
                user = User(
                    email=persona["email"],
                    hashed_password=get_password_hash(persona["password"]),
                    first_name=persona["first_name"],
                    last_name=persona["last_name"],
                    role="parent",
                    is_active=True
                )
                db.add(user)
                print(f"   ✅ Created {persona['first_name']} {persona['last_name']}")
            else:
                print(f"   ⚠️  {persona['first_name']} {persona['last_name']} already exists")
        
        await db.commit()


async def main():
    """Main seeding function"""
    print("\n" + "="*60)
    print("CommonGround E2E Test Data Seeding (Simplified)")
    print("="*60)
    
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--clean", action="store_true", help="Clean existing test data first")
    args = parser.parse_args()
    
    if args.clean:
        await clean_test_data()
    
    await create_test_users()
    
    print("\n" + "="*60)
    print("✅ E2E Test Data Seeding Complete!")
    print("="*60)
    print("\n📋 Test Credentials:")
    print("   Email: e2e_test_sarah@commonground.test")
    print("   Email: e2e_test_michael@commonground.test")
    print("   Email: e2e_test_jessica@commonground.test")
    print("   Email: e2e_test_david@commonground.test")
    print("   Password (all): TestPass123!")
    print("\n")


if __name__ == "__main__":
    asyncio.run(main())

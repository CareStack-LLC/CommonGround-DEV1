import os
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
os.environ["SECRET_KEY"] = "secret"

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models import User, Partner, PartnerStaff, PartnerStatus

async def seed_partner():
    engine = create_async_engine(os.environ["DATABASE_URL"], connect_args={"statement_cache_size": 0})
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        # Check if partner exists
        result = await db.execute(select(Partner).where(Partner.partner_slug == "commonground"))
        partner = result.scalar_one_or_none()
        
        if not partner:
            partner = Partner(
                partner_slug="commonground",
                display_name="CommonGround Org",
                legal_name="CommonGround Organization",
                status=PartnerStatus.ACTIVE
            )
            db.add(partner)
            await db.flush()
            print("Created partner: commonground")
        
        # Check user
        result = await db.execute(select(User).where(User.email == "mya@email.com"))
        user = result.scalar_one_or_none()
        
        if user:
            # Add staff access
            staff_result = await db.execute(
                select(PartnerStaff).where(
                    PartnerStaff.partner_id == partner.id,
                    PartnerStaff.user_id == user.id
                )
            )
            if not staff_result.scalar_one_or_none():
                staff = PartnerStaff(
                    partner_id=partner.id,
                    user_id=user.id,
                    role="admin"
                )
                db.add(staff)
                print(f"Added mya@email.com as staff to {partner.partner_slug}")
            else:
                print("mya@email.com already has staff access")
        
        await db.commit()
            
    await engine.dispose()

asyncio.run(seed_partner())

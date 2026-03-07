import os
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
os.environ["SECRET_KEY"] = "secret"
os.environ["SUPABASE_URL"] = "https://mtcdoewgywxrlsogtmzi.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "dummy"
os.environ["SUPABASE_SERVICE_KEY"] = "dummy"
os.environ["EMAIL_ENABLED"] = "false"

import sys
import asyncio

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import all models to populate SQLAlchemy registry
from app.models.circle_call import CircleCallRoom, CircleCallSession
from app.models import *

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.schemas.family_file import FamilyFileCreate, ChildBasic
from app.services.family_file import FamilyFileService
from sqlalchemy import select

async def main():
    print("Starting family file script...")
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == 'thomas.wilform@gmail.com'))
        parent_a = result.scalar_one_or_none()
        if not parent_a:
            print("Error: User thomas.wilform@gmail.com not found. Create it first.")
            return
            
        result = await session.execute(select(User).where(User.email == 'mya@email.com'))
        parent_b = result.scalar_one_or_none()
        if not parent_b:
            print("Error: User mya@email.com not found. Create it first.")
            return

        service = FamilyFileService(session)
        
        data = FamilyFileCreate(
            title="Wilform / Mya Family",
            parent_a_role="father",
            parent_b_email="mya@email.com",
            parent_b_role="mother",
            state="CA",
            children=[
                ChildBasic(
                    first_name="Leo",
                    last_name="Wilform",
                    date_of_birth="2018-05-15",
                    gender="Male"
                )
            ]
        )
        
        try:
            print(f"Executing create_family_file for {parent_a.email}...")
            family_file = await service.create_family_file(data, parent_a)
            print(f"Created Family File: {family_file.id}")
            
            print(f"Accepting invitation for {parent_b.email}...")
            ff = await service.accept_invitation(family_file.id, parent_b)
            print("Parent B successfully joined!")
            
        except Exception as e:
            print(f"Error during execution: {e}")

if __name__ == "__main__":
    asyncio.run(main())


import asyncio
import uuid
import sys
import os
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../backend"))

# Set dummy env vars for Settings
os.environ["SECRET_KEY"] = "dummy_secret"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://user:pass@localhost/db"
os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "dummy_anon"
os.environ["SUPABASE_SERVICE_KEY"] = "dummy_service"
os.environ["ANTHROPIC_API_KEY"] = "dummy_anthropic"
os.environ["OPENAI_API_KEY"] = "dummy_openai"
os.environ["STRIPE_SECRET_KEY"] = "dummy_stripe"
os.environ["STRIPE_PUBLISHABLE_KEY"] = "dummy_stripe_pub"
os.environ["STRIPE_WEBHOOK_SECRET"] = "dummy_webhook"

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.ext.compiler import compiles

# Fix for JSONB in SQLite
@compiles(JSONB, 'sqlite')
def compile_jsonb_sqlite(type_, compiler, **kw):
    return compiler.visit_JSON(JSON(), **kw)

# Models
from app.models.base import Base
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.professional import ProfessionalProfile, CaseAssignment, AssignmentStatus, Firm
from app.models.agreement import Agreement

# Services
from app.services.agreement import AgreementService

async def verify_professional_access():
    print("Setting up in-memory SQLite DB...")
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with AsyncSessionLocal() as db:
        print("Creating test data...")
        
        # 1. Create Parent
        parent = User(
            id=str(uuid.uuid4()),
            supabase_id=str(uuid.uuid4()),
            email="parent@test.com",
            first_name="Parent",
            last_name="Test",
            is_active=True
        )
        db.add(parent)
        
        # 2. Create Professional
        pro_user = User(
            id=str(uuid.uuid4()),
            supabase_id=str(uuid.uuid4()),
            email="pro@test.com",
            first_name="Pro",
            last_name="User",
            is_active=True
        )
        db.add(pro_user)
        
        # 3. Create Unassigned User
        stranger = User(
            id=str(uuid.uuid4()),
            supabase_id=str(uuid.uuid4()),
            email="stranger@test.com",
            first_name="Stranger",
            last_name="User",
            is_active=True
        )
        db.add(stranger)
        
        # 4. Create Family File (Parent is owner)
        family_file = FamilyFile(
            id=str(uuid.uuid4()),
            family_file_number="FF-123",
            title="Test Family",
            created_by=parent.id,
            parent_a_id=parent.id,
            status="active"
        )
        db.add(family_file)
        
        # 5. Create Professional Profile & Firm
        firm = Firm(
            id=str(uuid.uuid4()),
            name="Legal Firm",
            slug="legal-firm",
            email="firm@example.com",
            created_by=pro_user.id
        )
        db.add(firm)
        
        pro_profile = ProfessionalProfile(
            id=str(uuid.uuid4()),
            user_id=pro_user.id
        )
        db.add(pro_profile)
        
        # 6. Create Active Assignment
        assignment = CaseAssignment(
            id=str(uuid.uuid4()),
            professional_id=pro_profile.id,
            firm_id=firm.id,
            family_file_id=family_file.id,
            status=AssignmentStatus.ACTIVE.value
        )
        db.add(assignment)
        
        # 7. Create Agreement
        agreement = Agreement(
            id=str(uuid.uuid4()),
            title="Test Agreement",
            family_file_id=family_file.id,
            status="active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(agreement)
        
        await db.commit()
        
        # --- VERIFICATION ---
        service = AgreementService(db)
        
        print("\nTest 1: Parent Access")
        try:
            agreements = await service.get_family_file_agreements(family_file.id, parent)
            assert len(agreements) == 1
            assert agreements[0].id == agreement.id
            print("✅ Parent access successful")
        except Exception as e:
            print(f"❌ Parent access failed: {e}")

        print("\nTest 2: Professional Access (Active Assignment)")
        try:
            agreements = await service.get_family_file_agreements(family_file.id, pro_user)
            assert len(agreements) == 1
            assert agreements[0].id == agreement.id
            print("✅ Professional access successful")
        except Exception as e:
            print(f"❌ Professional access failed: {e}")
            
        print("\nTest 3: Stranger Access (Should Fail)")
        try:
            await service.get_family_file_agreements(family_file.id, stranger)
            print("❌ Stranger access succeeded (Should have failed)")
        except HTTPException as e:
            if e.status_code == 403:
                print("✅ Stranger access correctly denied (403)")
            else:
                print(f"❌ Stranger access failed with unexpected code: {e.status_code}")
        except Exception as e:
             print(f"❌ Stranger access failed with unexpected error: {e}")

        # Test 4: Inactive Assignment
        print("\nTest 4: Professional Access with Inactive Assignment")
        # Deactivate assignment
        assignment.status = "inactive"
        await db.commit()
        
        try:
            await service.get_family_file_agreements(family_file.id, pro_user)
            print("❌ Access succeeded with inactive assignment (Should have failed)")
        except HTTPException as e:
            if e.status_code == 403:
                print("✅ Access correctly denied for inactive assignment (403)")
            else:
                 print(f"❌ Access failed with unexpected code: {e.status_code}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify_professional_access())

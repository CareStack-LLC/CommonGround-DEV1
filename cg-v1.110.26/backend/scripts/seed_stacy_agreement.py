import sys
import os
import uuid
from decimal import Decimal
from datetime import datetime

# Use the real staging Supabase DB URL found in test_db.py
DB_URL = "postgresql://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

# Mock env vars for Pydantic Settings validation so we can connect
os.environ.setdefault("SECRET_KEY", "mock_secret_key")
os.environ.setdefault("DATABASE_URL", DB_URL)
os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "mock_anon_key")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "mock_service_key")
os.environ.setdefault("OPENAI_API_KEY", "mock_openai_key")
os.environ.setdefault("NEXT_PUBLIC_SITE_URL", "http://localhost:3000")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.agreement import Agreement, AgreementSection
from app.services.agreement_activation import AgreementActivationService

MYA_ID = "6c19d270-8196-436b-a791-5fcd194048d6"
ERIC_ID = "3550d7f0-9dc1-442b-b016-c9fcdaebe9b0"
STACY_FF_ID = "d6f08c5a-e65c-4dbe-8b65-f128167c9f3f"

V1_SECTIONS = {
    "1": {"title": "Basic Information", "type": "basic_info"},
    "2": {"title": "Legal Custody", "type": "custody"},
    "3": {"title": "Physical Custody", "type": "custody"},
    "4": {"title": "Parenting Time Schedule", "type": "schedule"},
    "5": {"title": "Holiday Schedule", "type": "schedule"},
    "6": {"title": "Vacation Time", "type": "schedule"},
    "7": {"title": "School Breaks", "type": "schedule"},
    "8": {"title": "Transportation", "type": "logistics"},
    "9": {"title": "Decision-Making Authority", "type": "decision_making"},
    "10": {"title": "Education Decisions", "type": "decision_making"},
    "11": {"title": "Healthcare Decisions", "type": "decision_making"},
    "12": {"title": "Religious Upbringing", "type": "decision_making"},
    "13": {"title": "Extracurricular Activities", "type": "activities"},
    "14": {"title": "Child Support", "type": "financial"},
    "15": {"title": "Expense Sharing", "type": "financial"},
    "16": {"title": "Communication Guidelines", "type": "communication"},
    "17": {"title": "Dispute Resolution", "type": "legal"},
    "18": {"title": "Modification Process", "type": "legal"},
}

async def create_agreement(session, ff_id, title, sections_data, activation_data):
    print(f"\n--- Creating Agreement for {title} ---")
    
    # Create Agreement
    agreement = Agreement(
        id=str(uuid.uuid4()),
        family_file_id=ff_id,
        title=title,
        agreement_type="shared_care",
        agreement_version="v1",
        status="approved", # Mark as approved so it can be activated
        petitioner_approved=True,
        respondent_approved=True,
        version=1,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    session.add(agreement)
    await session.flush()
    print(f"Agreement created: {agreement.id}")

    # Create Sections
    for num, data in V1_SECTIONS.items():
        content = sections_data.get(num) or f"Content for Section {num}: None defined."
        structured_data = None
        
        # Overlay structured data from activation_data
        if data['type'] == 'schedule' and "Time Schedule" in data['title']:
            structured_data = activation_data.get('parenting_time')
        elif data['type'] == 'logistics':
            structured_data = activation_data.get('logistics')
        elif data['type'] == 'financial' and "Child Support" in data['title']:
            structured_data = activation_data.get('child_support')
        elif data['type'] == 'financial' and "Expense Sharing" in data['title']:
            structured_data = activation_data.get('financial')
            if 'recurring_expenses' in activation_data:
                structured_data['recurring_expenses'] = activation_data['recurring_expenses']

        section = AgreementSection(
            id=str(uuid.uuid4()),
            agreement_id=agreement.id,
            section_number=num,
            section_title=data['title'],
            section_type=data['type'],
            content=content,
            structured_data=structured_data,
            display_order=int(num),
            is_required=True,
            is_completed=True
        )
        session.add(section)
    
    await session.flush()
    print(f"All 18 sections created.")
    return agreement

async def run():
    url = DB_URL
    if url and url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(url, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # 1. Delete old Stacy agreements first
        from app.models.custody_exchange import CustodyExchange
        from app.models.clearfund import Obligation
        
        old_agreements = await session.execute(
            select(Agreement).where(Agreement.family_file_id == STACY_FF_ID)
        )
        old_agreements = old_agreements.scalars().all()
        
        for oa in old_agreements:
            print(f"Deleting older agreement {oa.id} for STACY_FF_ID")
            exs = await session.execute(select(CustodyExchange).where(CustodyExchange.agreement_id == oa.id))
            for x in exs.scalars().all():
                await session.delete(x)
            obs = await session.execute(select(Obligation).where(Obligation.family_file_id == STACY_FF_ID))
            for o in obs.scalars().all():
                await session.delete(o)
                
            await session.delete(oa)
        
        await session.flush()
    
        # 2. Stacy Activation Data
        stacy_activation_data = {
            "parenting_time": {
                "primary_residence": "parent_a",
                "schedule_pattern": "custom",
                "custom_pattern_description": "First weekend of every month",
                "transition_day": "Friday",
                "transition_time": "6:00 PM"
            },
            "logistics": {
                "exchange_location": "neutral_location",
                "exchange_location_address": "Carson Park (21411 S Orrick Ave, Carson)",
                "transportation_responsibility": "shared",
                "transition_communication": "commonground"
            },
            "financial": {
                "expense_categories": ["medical", "education"],
                "split_ratio": "0/100", # Mya 0, Eric 100
                "reimbursement_window": "30_days",
                "documentation_required": True
            },
            "child_support": {
                "has_support": True,
                "payer_parent_role": "parent_b",
                "receiver_parent_role": "parent_a",
                "amount": 1500.0,
                "frequency": "monthly",
                "due_day": 1
            }
        }
        
        stacy_sections_data = {
            "1": "Basic Information: This agreement is between Mya (Mother) and Eric (Father) regarding their child, Stacy.",
            "2": "Legal Custody: Mother Decides (Sole Legal Custody). Eric has restricted involvement in major decisions regarding education, medical care, religion, and extracurriculars.",
            "3": "Physical Custody: Primary with Mother. Mya has the child the vast majority of the time.",
            "4": "Parenting Time Schedule: One Weekend per Month. Specifically the 1st Weekend of every month.",
            "5": "Holiday Schedule: Father's Day: Eric has 4 hours (10 AM - 2 PM). All Others: Child stays with Mother.",
            "6": "Vacation Time: Child stays with Mother; Eric has no designated vacation time.",
            "7": "School Breaks: Child stays with Mother.",
            "8": "Transportation and Exchange Logistics: Drop-off: Friday at 6:00 PM at Carson Park (21411 S Orrick Ave, Carson). Pick-up: Sunday at 7:00 PM at Carson Park. Protocol: Eric is not permitted at Mya's Long Beach residence. Mya drops off in Carson; Eric returns to the same location.",
            "9": "Decision-Making Authority: Sole Legal Custody to Mya.",
            "10": "Education Decisions: Mother has sole access; Father is informed of emergencies only.",
            "11": "Healthcare Decisions: Mother has sole access; Father is informed of emergencies only.",
            "12": "Religious Upbringing: Mother decides.",
            "13": "Extracurricular Activities: Mother decides.",
            "14": "Child Support: Eric pays $1,500.00/month due on the 1st.",
            "15": "Expense Sharing: All Other Expenses: 100% Eric (Medical/Education).",
            "16": "Communication Guidelines: Restriction: Platform Only via CommonGround. Restricted: No Video Calls for Eric (LA County Court Order). ARIA Mode: Strict (Monitoring for conflict/harassment).",
            "17": "Dispute Resolution: Platform mediation only. No direct contact permitted.",
            "18": "Modification Process & Travel: Travel: Eric must obtain Mya's written consent for any travel. Relocation: Standard 60-day notice requirement for Mya."
        }
        
        stacy_agreement = await create_agreement(session, STACY_FF_ID, "Stacy Restricted SharedCare Agreement", stacy_sections_data, stacy_activation_data)

        await session.commit()
        print("\nAgreements persisted. Activating...")

        # 3. Activate Agreements
        activation_service = AgreementActivationService(session)
        
        print("\nActivating Stacy's Agreement...")
        stacy_result = await activation_service.activate_agreement(stacy_agreement, MYA_ID)
        print(f"Stacy's Activation Result: {stacy_result}")

        await session.commit()
        print("\nSeeding Complete!")

    await engine.dispose()

if __name__ == "__main__":
    import asyncio
    asyncio.run(run())

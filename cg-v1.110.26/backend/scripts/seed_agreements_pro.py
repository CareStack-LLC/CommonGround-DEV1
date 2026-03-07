import asyncio
import sys
import os
import uuid
from decimal import Decimal
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv

load_dotenv()

# Add app to path
sys.path.append(os.getcwd())

from app.models.agreement import Agreement, AgreementSection
from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.user import User
from app.services.agreement_activation import AgreementActivationService

# IDs from list_info_manual.py
LEO_FF_ID = "d6f08c5a-e65c-4dbe-8b65-f128167c9f3f"
STACY_FF_ID = "1f5a54fd-9549-43c2-bf72-bb7941fc357e"

LEO_CHILD_ID = "d2b7c4d5-4556-4299-823d-4c3167b09315"
STACY_CHILD_ID = "56ee3b1c-c3b0-4595-8eac-234b9247d4e5"

MYA_ID = "6c19d270-8196-436b-a791-5fcd194048d6"
GREG_ID = "52d3c5ef-fde5-4c10-86b7-1e3a9c68cd36"
ERIC_ID = "3550d7f0-9dc1-442b-b016-c9fcdaebe9b0"

# Section Types mapping for v1
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
        content = sections_data.get(num) or f"Content for Section {num}: {data['title']}"
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
            # Add recurring expenses to financial section if any
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
    url = os.environ.get("DATABASE_URL")
    engine = create_async_engine(url, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # 1. Leo Wilform Agreement
        leo_activation_data = {
            "parenting_time": {
                "primary_residence": "equal",
                "schedule_pattern": "week_on_week_off",
                "transition_day": "Monday",
                "transition_time": "after school"
            },
            "logistics": {
                "exchange_location": "school",
                "exchange_location_address": "Stevenson Elementary School, Long Beach, CA",
                "transportation_responsibility": "dropping_off_parent",
                "transition_communication": "commonground"
            },
            "financial": {
                "expense_categories": ["medical", "education", "activities", "clothing"],
                "split_ratio": "50/50",
                "reimbursement_window": "30_days",
                "documentation_required": True
            },
            "child_support": {
                "has_support": True,
                "payer_parent_role": "parent_b",
                "receiver_parent_role": "parent_a",
                "amount": 475.0,
                "frequency": "monthly",
                "due_day": 12
            },
            "recurring_expenses": [
                {
                    "category": "activities",
                    "description": "Weekly Sports/Activity",
                    "amount": 50.0,
                    "frequency": "weekly",
                    "due_day": 1
                }
            ]
        }
        leo_sections_data = {
            "1": "Basic Information: This agreement is between Mya (Mother) and Greg (Father) regarding their child, Leo Wilform.",
            "2": "Legal Custody: Mya and Greg share joint legal custody of Leo. They make major decisions regarding education, medical care, religion, and extracurriculars jointly. They work well together and maintain a neutral/positive co-parenting relationship.",
            "3": "Physical Custody: General physical custody arrangement is 50/50 (Equal Time). Leo spends equal time with both parents.",
            "4": "Parenting Time Schedule: The weekly parenting pattern is Alternating Weeks. Transition occurs every Monday. Mya has one week, Greg has the next.",
            "5": "Holiday Schedule: Holidays follow an alternating yearly rotation for all major holidays. For the child's Birthday (May 15), the day is split (9 AM - 3 PM / 3 PM - 9 PM) between parents. For Parent Birthdays, Leo stays with the parent celebrating their birthday.",
            "6": "Vacation Time: Follows the general rotating schedule unless agreed otherwise in writing.",
            "7": "School Breaks: Follows the general 50/50 rotation.",
            "8": "Transportation and Exchange Logistics: Day/Time for transitions is Monday. Morning: Mya drops Leo off at Stevenson Elementary (1260 Lime Ave, Long Beach) at 8:15 AM. Afternoon: Greg picks Leo up from school at 2:30 PM. (Protocol reverses on the following Monday). Both parents live in Long Beach and handle their own school transport. Each pays their own transportation costs.",
            "9": "Decision-Making Authority: Joint Decision for all major matters. Both parents work well together.",
            "10": "Education Decisions: Joint decisions. Both parents have full access to school records and both attend conferences and events.",
            "11": "Healthcare Decisions: Joint decisions. Both parents have full access to medical records.",
            "12": "Religious Upbringing: Joint decisions regarding religion.",
            "13": "Extracurricular Activities: Joint decisions. Activities costs are split 50% / 50%.",
            "14": "Child Support: Greg pays $475.00/month due on the 12th of each month.",
            "15": "Expense Sharing: Medical and Education costs are split 80% Greg / 20% Mya. Extracurricular and miscellaneous costs are split 50% / 50%.",
            "16": "Communication Guidelines: Parent-to-Parent communication can be via any method (Neutral). Child-to-Parent: Reasonable phone and video access during the other parent's time.",
            "17": "Dispute Resolution: Mediation is required before going to court. Right of first refusal applies if a parent is away for more than 24 hours.",
            "18": "Modification Process & Travel: Travel requires 14 days notice for domestic trips, 30 days for international. Relocation requires 45 days notice for any move over 20 miles. Modification Process requires a written agreement from both parents."
        }
        leo_agreement = await create_agreement(session, LEO_FF_ID, "Leo Wilform SharedCare Agreement", leo_sections_data, leo_activation_data)

        await session.commit()
        print("\nAgreements persisted. Activating...")

        # 3. Activate Agreements
        activation_service = AgreementActivationService(session)
        
        print("\nActivating Leo's Agreement...")
        leo_result = await activation_service.activate_agreement(leo_agreement, MYA_ID)
        print(f"Leo's Activation Result: {leo_result}")

        await session.commit()
        print("\nSeeding Complete!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())

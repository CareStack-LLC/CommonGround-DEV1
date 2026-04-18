import asyncio
import os
import json
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import User, FamilyFile, Agreement, AgreementSection, AgreementType

async def seed_agreements():
    engine = create_async_engine(os.environ["DATABASE_URL"], connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        # Get Parent IDs
        mya = (await db.execute(select(User).where(User.email == "mya@email.com"))).scalar_one()
        greg = (await db.execute(select(User).where(User.email == "greg@email.com"))).scalar_one()
        eric = (await db.execute(select(User).where(User.email == "eric@email.com"))).scalar_one()

        leo_ff_id = "b9c6031c-8084-4d72-b0ca-080358b7f711"
        stacy_ff_id = "d6f08c5a-e65c-4dbe-8b65-f128167c9f3f"

        # --- 1. Leo Agreement DATA ---
        leo_sections = {
            "1": {"section_title": "Parent Information (Mother)", "data": {"full_name": "Mya Wilform", "role": "mother", "address": "250 Ocean Blvd, Long Beach, CA 90802"}},
            "2": {"section_title": "Parent Information (Father)", "data": {"full_name": "Greg Parent", "role": "father", "address": "400 W Ocean Blvd, Long Beach, CA 90802"}},
            "3": {"section_title": "Children Information", "data": {"children": [{"full_name": "Leo Wilform", "date_of_birth": "2018-05-15", "school": "Stevenson Elementary"}]}},
            "4": {"section_title": "Legal Custody", "data": {"education_decisions": "Joint Decision", "medical_decisions": "Joint Decision", "religious_decisions": "Joint Decision", "extracurricular_decisions": "Joint Decision"}},
            "5": {"section_title": "Physical Custody", "data": {"arrangement_type": "50/50 (Equal Time)", "primary_residential_parent": "Joint"}},
            "6": {"section_title": "Regular Parenting Schedule", "data": {"weekly_pattern": "Alternating Weeks", "exchange_description": "Weekly transition every Monday"}},
            "7": {"section_title": "Holiday Schedule", "data": {"thanksgiving": "Alternating", "christmas_eve": "Alternating", "christmas_day": "Alternating", "new_years": "Alternating", "child_birthday": "Split (9 AM - 3 PM / 3 PM - 9 PM)", "parent_birthdays": "Child spends day with birthday parent"}},
            "8": {"section_title": "Exchange Logistics", "data": {"exchange_day": "Monday", "exchange_time": "08:15 AM (Drop-off) / 02:30 PM (Pick-up)", "exchange_location": "Stevenson Elementary, 1260 Lime Ave, Long Beach", "who_transports": "Mya drops off, Greg picks up"}},
            "9": {"section_title": "Transportation", "data": {"cost_arrangement": "Each Pays Own", "who_pays": "N/A"}},
            "10": {"section_title": "Child Support & Expenses", "data": {"amount": "$475.00/month", "due_date": "12th", "medical_split": "80% Greg / 20% Mya", "education_split": "80% Greg / 20% Mya", "extracurricular_split": "50% Greg / 50% Mya"}},
            "11": {"section_title": "Medical & Healthcare", "data": {"medical_records_access": "Yes, both parents", "routine_appointments": "Jointly managed"}},
            "12": {"section_title": "Education", "data": {"school_choice": "Joint Decision", "school_records_access": "Yes, both parents", "conferences": "Both parents attend"}},
            "13": {"section_title": "Parent Communication", "data": {"primary_method": "Text/Email/CommonGround", "response_time_non_urgent": "24 hours"}},
            "14": {"section_title": "Child Communication", "data": {"phone_calls_allowed": "Yes", "video_calls_allowed": "Yes", "call_frequency": "Reasonable"}},
            "15": {"section_title": "Travel", "data": {"domestic_notice": "14 days", "international_consent": "Yes, 30 days notice", "vacation_time_amount": "2 weeks per parent"}},
            "16": {"section_title": "Relocation", "data": {"notice_days": "45 days", "distance_trigger": "20 miles"}},
            "17": {"section_title": "Dispute Resolution", "data": {"first_step": "Discussion", "mediation_required": "Yes, before court"}},
            "18": {"section_title": "Other Provisions", "data": {"right_of_first_refusal": "Yes, after 24 hours", "discipline": "Consistent between homes"}}
        }

        # --- 2. Stacy Agreement DATA ---
        stacy_sections = {
            "1": {"section_title": "Parent Information (Mother)", "data": {"full_name": "Mya Wilform", "role": "mother", "address": "250 Ocean Blvd, Long Beach, CA 90802"}},
            "2": {"section_title": "Parent Information (Father)", "data": {"full_name": "Eric Parent", "role": "father", "address": "23200 S Main St, Carson, CA 90745"}},
            "3": {"section_title": "Children Information", "data": {"children": [{"full_name": "Stacy Parent", "date_of_birth": "2020-01-01", "school": "N/A"}]}},
            "4": {"section_title": "Legal Custody", "data": {"education_decisions": "Mother Decides", "medical_decisions": "Mother Decides", "religious_decisions": "Mother Decides", "extracurricular_decisions": "Mother Decides"}},
            "5": {"section_title": "Physical Custody", "data": {"arrangement_type": "Primary with Mother", "primary_residential_parent": "Mother"}},
            "6": {"section_title": "Regular Parenting Schedule", "data": {"weekly_pattern": "One Weekend per Month", "schedule": "1st Weekend of every month"}},
            "7": {"section_title": "Holiday Schedule", "data": {"fathers_day": "4 hours (10 AM - 2 PM)", "all_others": "With Mother"}},
            "8": {"section_title": "Exchange Logistics", "data": {"exchange_location": "Carson Park, 21411 S Orrick Ave, Carson", "drop_off_time": "Friday 6:00 PM", "pick_up_time": "Sunday 7:00 PM", "protocol": "Eric not permitted at Mya residency"}},
            "9": {"section_title": "Transportation", "data": {"cost_arrangement": "Mya drops off in Carson, Eric returns to same spot"}},
            "10": {"section_title": "Child Support & Expenses", "data": {"amount": "$1,500.00/month", "due_date": "1st", "medical_split": "100% Eric", "education_split": "100% Eric"}},
            "11": {"section_title": "Medical & Healthcare", "data": {"medical_records_access": "Mother sole access", "emergency_notice": "Eric notified of emergencies only"}},
            "12": {"section_title": "Education", "data": {"school_choice": "Mother Decides", "school_records_access": "Mother sole access"}},
            "13": {"section_title": "Parent Communication", "data": {"primary_method": "Platform Only (CommonGround)", "aria_mode": "Strict"}},
            "14": {"section_title": "Child Communication", "data": {"video_calls_allowed": "No (Court Order)", "call_privacy": "Monitored", "phone_calls": "Restricted"}},
            "15": {"section_title": "Travel", "data": {"consent_required": "Yes, Mya written consent required", "notice_days": "30 days"}},
            "16": {"section_title": "Relocation", "data": {"notice_days": "60 days"}},
            "17": {"section_title": "Dispute Resolution", "data": {"first_step": "Platform Mediation", "court_intervention": "LA County Superior"}},
            "18": {"section_title": "Other Provisions", "data": {"contact_restriction": "No direct contact", "safeguards": "Platform monitoring active"}}
        }

        async def create_agreement(full_name, ff_id, sections_data, pet_id, resp_id):
            print(f"Creating Agreement for {full_name}...")
            agreement = Agreement(
                family_file_id=ff_id,
                title=f"SharedCare Agreement - {full_name}",
                agreement_type=AgreementType.SHARED_CARE,
                agreement_version="v1",
                status="active",
                petitioner_approved=True,
                petitioner_approved_at=datetime.utcnow(),
                respondent_approved=True,
                respondent_approved_at=datetime.utcnow(),
                effective_date=datetime.utcnow()
            )
            db.add(agreement)
            await db.flush()

            for num, details in sections_data.items():
                section = AgreementSection(
                    agreement_id=agreement.id,
                    section_number=num,
                    section_type="v1_wizard",
                    section_title=details["section_title"],
                    content=json.dumps(details["data"], indent=2),
                    structured_data=details["data"],
                    display_order=int(num),
                    is_required=True,
                    is_completed=True
                )
                db.add(section)
            print(f"Agreement created: {agreement.id}")

        await create_agreement("Leo Wilform", leo_ff_id, leo_sections, mya.id, greg.id)
        await create_agreement("Stacy", stacy_ff_id, stacy_sections, mya.id, eric.id)

        await db.commit()
        print("Seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed_agreements())

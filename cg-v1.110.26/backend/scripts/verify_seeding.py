
import asyncio
from sqlalchemy import select
from app.core.database import get_db_context
from app.models.agreement import Agreement, AgreementSection

FF_ID = "efc1b35e-7153-4622-ac16-784a5aef13ea"

async def verify_seeding():
    async with get_db_context() as db:
        result = await db.execute(
            select(Agreement).where(Agreement.family_file_id == FF_ID, Agreement.status == "active")
        )
        agreement = result.scalar_one_or_none()
        if not agreement:
            print("No active agreement found.")
            return

        print(f"Agreement ID: {agreement.id}")
        print(f"Title: {agreement.title}")
        print(f"Status: {agreement.status}")
        print(f"Version: {agreement.version}")
        print(f"Agreement Version: {agreement.agreement_version}")
        print(f"Petitioner Approved: {agreement.petitioner_approved}")
        print(f"Respondent Approved: {agreement.respondent_approved}")

        result = await db.execute(
            select(AgreementSection).where(AgreementSection.agreement_id == agreement.id).order_by(AgreementSection.display_order)
        )
        sections = result.scalars().all()
        print(f"Sections found: {len(sections)}")
        for s in sections:
            print(f" - {s.section_number}. {s.section_title} (Completed: {s.is_completed})")

if __name__ == "__main__":
    asyncio.run(verify_seeding())

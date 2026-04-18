
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from app.core.database import get_db_context
from app.models.agreement import Agreement, AgreementSection, AgreementType
from app.models.family_file import FamilyFile

FF_ID = "efc1b35e-7153-4622-ac16-784a5aef13ea"

# V2 Standard - 7 Sections
SECTIONS_V2 = [
    {
        "number": "1",
        "title": "Parties & Children",
        "type": "parties",
        "content": "This SharedCare Agreement is entered into between Thomas Wilform and Mya H regarding the care of their child, Malia Wilform. Both parents reside in the same county and wish to establish a stable co-parenting relationship."
    },
    {
        "number": "2",
        "title": "Agreement Scope & Duration",
        "type": "scope",
        "content": "This agreement shall be effective as of today and shall remain in effect until modified by mutual written consent or a court order. The parents agree to review these terms annually on the child's birthday."
    },
    {
        "number": "3",
        "title": "Parenting Time Structure",
        "type": "schedule",
        "content": "The parties agree to a 50/50 alternating weekly schedule. Transitions occur every Friday at 5:00 PM. Thomas is the primary residence for school registration purposes."
    },
    {
        "number": "4",
        "title": "Logistics & Transitions",
        "type": "logistics",
        "content": "Custody exchanges shall occur at the child's school on Fridays. During summer/holidays, the parent starting their time will pick up from the other parent's home. Communication regarding delays must happen via CommonGround."
    },
    {
        "number": "5",
        "title": "Decision-Making & Communication",
        "type": "decision_making",
        "content": "Major decisions regarding health, education, and welfare are shared. Response time for non-emergency requests is 24 hours. Parents will use CommonGround for all scheduling and expense communication."
    },
    {
        "number": "6",
        "title": "Expenses & Financial Cooperation",
        "type": "financial",
        "content": "Mya H shall pay $350.00 per month in child support to Thomas Wilform. In addition, all agreed-upon extracurricular and medical expenses will be split 50/50. Receipts must be uploaded within 30 days."
    },
    {
        "number": "7",
        "title": "Modification, Disputes & Acknowledgment",
        "type": "legal",
        "content": "Disputes will be handled via mediation before court action. Both parents acknowledge they have read and understood this simplified 7-section SharedCare agreement."
    }
]

async def seed_v2_agreement():
    async with get_db_context() as db:
        # Check if FF exists
        ff = await db.get(FamilyFile, FF_ID)
        if not ff:
            print(f"Error: Family File {FF_ID} not found.")
            return

        # Deactivate any existing agreements for this FF
        result = await db.execute(
            select(Agreement).where(Agreement.family_file_id == FF_ID, Agreement.status == "active")
        )
        for existing in result.scalars().all():
            existing.status = "superseded"

        # Create new Agreement (v2_standard)
        agreement = Agreement(
            family_file_id=FF_ID,
            title="Simplified SharedCare Agreement",
            agreement_type=AgreementType.SHARED_CARE.value,
            agreement_version="v2_standard",
            version=2,
            status="active",
            petitioner_approved=True,
            petitioner_approved_at=datetime.utcnow() - timedelta(hours=1),
            respondent_approved=True,
            respondent_approved_at=datetime.utcnow() - timedelta(hours=1),
            effective_date=datetime.utcnow(),
            summary="Simplified 7-section agreement with $350/mo support."
        )
        db.add(agreement)
        await db.flush()

        # Add sections
        for i, s in enumerate(SECTIONS_V2):
            section = AgreementSection(
                agreement_id=agreement.id,
                section_number=s["number"],
                section_title=s["title"],
                section_type=s["type"],
                content=s["content"],
                display_order=i + 1,
                is_required=True,
                is_completed=True
            )
            db.add(section)

        # Update Family File fields
        ff.agreement_expense_split_ratio = "50/50"
        ff.agreement_split_parent_a_percentage = 50
        ff.agreement_split_locked = True
        ff.agreement_split_source_id = agreement.id
        ff.agreement_split_set_at = datetime.utcnow()

        await db.commit()
        print(f"Successfully seeded active v2 agreement {agreement.id} for Family File {FF_ID}")

if __name__ == "__main__":
    asyncio.run(seed_v2_agreement())

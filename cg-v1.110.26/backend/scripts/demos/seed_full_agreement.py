
import asyncio
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy import select
from app.core.database import get_db_context
from app.models.agreement import Agreement, AgreementSection, AgreementType
from app.models.family_file import FamilyFile
from app.models.user import User
from app.models.child import Child

FF_ID = "efc1b35e-7153-4622-ac16-784a5aef13ea"

SECTIONS = [
    {
        "number": "1",
        "title": "Basic Information",
        "type": "basic_info",
        "content": "This Parenting Agreement is entered into by Thomas Wilform and Mya H regarding the care and custody of their child, Malia Wilform. Both parents agree to work cooperatively in the best interests of Malia."
    },
    {
        "number": "2",
        "title": "Legal Custody",
        "type": "custody",
        "content": "The parties shall share joint legal custody, meaning both parents have equal rights and responsibilities to make major decisions affecting the children's welfare, education, health, and religious upbringing. Neither parent shall take any action that would significantly change the child's life without notifying and consulting the other."
    },
    {
        "number": "3",
        "title": "Physical Custody",
        "type": "custody",
        "content": "The parties agree to a 50/50 joint physical custody arrangement. Malia will spend equal time with both parents to ensure strong bonds are maintained with each."
    },
    {
        "number": "4",
        "title": "Parenting Time Schedule",
        "type": "schedule",
        "content": "Malia will follow an alternating weekly schedule (week-on/week-off). Transitions will occur every Friday at 5:00 PM. The parent whose time is starting will pick up the child from school or the other parent's home."
    },
    {
        "number": "5",
        "title": "Holiday Schedule",
        "type": "schedule",
        "content": "Holidays shall be alternating. Thomas will have Malia on Thanksgiving and Christmas Eve in even-numbered years, while Mya will have Malia in odd-numbered years. Mother's Day is always with Mya and Father's Day always with Thomas."
    },
    {
        "number": "6",
        "title": "Vacation Time",
        "type": "schedule",
        "content": "Each parent is entitled to two non-consecutive weeks of vacation time with Malia each year. Parents must provide at least 30 days notice before the requested vacation dates."
    },
    {
        "number": "7",
        "title": "School Breaks",
        "type": "schedule",
        "content": "Spring and Winter breaks will be split evenly. If the break is one week, parents will alternate the full week based on even/odd years."
    },
    {
        "number": "8",
        "title": "Transportation",
        "type": "logistics",
        "content": "The parent beginning their parenting time is responsible for picking up Malia from school or the other parent’s residence. Exchanges should be punctual and handled respectfully."
    },
    {
        "number": "9",
        "title": "Decision-Making Authority",
        "type": "decision_making",
        "content": "Major decisions require mutual consent of both parents. This includes major medical procedures, choice of school, and significant changes in extracurricular activities. If parents cannot agree, they shall first attempt mediation via CommonGround."
    },
    {
        "number": "10",
        "title": "Education Decisions",
        "type": "decision_making",
        "content": "Both parents have the right to receive school records and attend school functions. Malia shall attend the school determined by the parents' current residential proximity unless otherwise agreed."
    },
    {
        "number": "11",
        "title": "Healthcare Decisions",
        "type": "decision_making",
        "content": "Medical and healthcare decisions will be shared. In emergencies, the parent with Malia should seek immediate care and notify the other parent as soon as possible. Routine appointments should be scheduled during the attending parent's time when feasible."
    },
    {
        "number": "12",
        "title": "Religious Upbringing",
        "type": "decision_making",
        "content": "Each parent may involve Malia in their chosen religious services and traditions during their respective parenting time."
    },
    {
        "number": "13",
        "title": "Extracurricular Activities",
        "type": "activities",
        "content": "Both parents must agree before enrolling Malia in an activity that requires time or financial commitment from both. Once agreed, costs are split 50/50."
    },
    {
        "number": "14",
        "title": "Child Support",
        "type": "financial",
        "content": "Mya H shall pay child support to Thomas Wilform in the amount of $350.00 per month. Payments are due on the 1st of each month and shall be processed via CommonGround ClearFund."
    },
    {
        "number": "15",
        "title": "Expense Sharing",
        "type": "financial",
        "content": "Unreimbursed medical, dental, and educational expenses shall be split 50/50 between the parents. Reimbursement requests should be submitted via CommonGround within 30 days of the expense."
    },
    {
        "number": "16",
        "title": "Communication Guidelines",
        "type": "communication",
        "content": "Parents shall communicate primarily through CommonGround for all logistics. Communication should be professional and focused on Malia. Neither parent shall disparage the other in front of the child."
    },
    {
        "number": "17",
        "title": "Dispute Resolution",
        "type": "legal",
        "content": "In the event of disputes, the parties agree to first attempt mediation through a qualified neutral third party before seeking court intervention, unless an emergency exists."
    },
    {
        "number": "18",
        "title": "Modification Process",
        "type": "legal",
        "content": "This agreement may be modified by mutual written consent of both parties or by a subsequent court order."
    }
]

async def seed_agreement():
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

        # Create new Agreement
        agreement = Agreement(
            family_file_id=FF_ID,
            title="SharedCare Standard Agreement",
            agreement_type=AgreementType.SHARED_CARE.value,
            agreement_version="v1",
            version=1,
            status="active",
            petitioner_approved=True,
            petitioner_approved_at=datetime.utcnow() - timedelta(days=1),
            respondent_approved=True,
            respondent_approved_at=datetime.utcnow() - timedelta(days=1),
            effective_date=datetime.utcnow() - timedelta(days=1),
            summary="Comprensive 50/50 parenting plan with $350/mo child support paid by Mya."
        )
        db.add(agreement)
        await db.flush()

        # Add sections
        for i, s in enumerate(SECTIONS):
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

        # Update Family File fields derived from agreement
        ff.agreement_expense_split_ratio = "50/50"
        ff.agreement_split_parent_a_percentage = 50
        ff.agreement_split_locked = True
        ff.agreement_split_source_id = agreement.id
        ff.agreement_split_set_at = datetime.utcnow()

        await db.commit()
        print(f"Successfully seeded active agreement {agreement.id} for Family File {FF_ID}")

if __name__ == "__main__":
    asyncio.run(seed_agreement())

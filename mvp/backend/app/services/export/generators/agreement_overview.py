"""
Agreement Overview section generator.

Section 1: Provides summary of case parties, children, and agreement terms.
"""

from datetime import date
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.case import Case, CaseParticipant
from app.models.child import Child
from app.models.agreement import Agreement, AgreementSection
from app.services.export.generators.base import (
    BaseSectionGenerator,
    GeneratorContext,
    SectionContent,
)


class AgreementOverviewGenerator(BaseSectionGenerator):
    """Generates the Agreement Overview section."""

    section_type = "agreement_overview"
    section_title = "Agreement Overview"
    section_order = 1

    async def generate(self, context: GeneratorContext) -> SectionContent:
        """Generate agreement overview content."""
        db = context.db

        # Load case with participants
        case_result = await db.execute(
            select(Case)
            .options(selectinload(Case.participants))
            .where(Case.id == context.case_id)
        )
        case = case_result.scalar_one_or_none()

        if not case:
            return self._empty_content("Case not found")

        # Load children
        children_result = await db.execute(
            select(Child)
            .where(Child.case_id == context.case_id)
            .where(Child.is_active == True)
            .order_by(Child.date_of_birth)
        )
        children = list(children_result.scalars().all())

        # Load active agreement
        agreement_result = await db.execute(
            select(Agreement)
            .options(selectinload(Agreement.sections))
            .where(Agreement.case_id == context.case_id)
            .where(Agreement.is_active == True)
            .order_by(Agreement.created_at.desc())
        )
        agreement = agreement_result.scalar_one_or_none()

        # Build parties data
        parties = []
        for participant in case.participants:
            if participant.is_active:
                party_data = {
                    "role": participant.role,
                    "parent_type": participant.parent_type,
                    "user_id": participant.user_id,
                }
                parties.append(party_data)

        # Build children data
        children_data = []
        for child in children:
            child_data = {
                "name": await self._redact(
                    f"{child.first_name} {child.last_name}",
                    context
                ),
                "age": self._calculate_age(child.date_of_birth),
                "date_of_birth": self._format_date(child.date_of_birth),
            }
            children_data.append(child_data)

        # Build agreement data
        agreement_data = None
        if agreement:
            key_terms = await self._extract_key_terms(agreement, context)
            agreement_data = {
                "title": agreement.title,
                "type": agreement.agreement_type,
                "status": agreement.status,
                "effective_date": self._format_date(agreement.effective_date) if agreement.effective_date else None,
                "key_terms": key_terms,
            }

        # Build content
        content_data = {
            "case_info": {
                "case_name": case.case_name,
                "case_number": case.case_number,
                "state": case.state,
                "county": case.county,
                "status": case.status,
                "created_at": self._format_date(case.created_at.date()),
            },
            "parties": parties,
            "children": children_data,
            "agreement": agreement_data,
            "report_period": {
                "start": self._format_date(context.date_start),
                "end": self._format_date(context.date_end),
            },
        }

        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data=content_data,
            evidence_count=len(children) + (1 if agreement else 0),
            data_sources=["cases", "children", "agreements"],
        )

    def _calculate_age(self, dob: date) -> int:
        """Calculate age from date of birth."""
        today = date.today()
        age = today.year - dob.year
        if (today.month, today.day) < (dob.month, dob.day):
            age -= 1
        return age

    async def _extract_key_terms(
        self,
        agreement: Agreement,
        context: GeneratorContext
    ) -> dict:
        """Extract key terms from agreement sections."""
        key_terms = {
            "legal_custody": None,
            "physical_custody": None,
            "parenting_schedule": None,
            "communication_protocol": None,
        }

        for section in agreement.sections:
            if section.section_type == "legal_custody":
                key_terms["legal_custody"] = "Defined in agreement"
            elif section.section_type == "physical_custody":
                key_terms["physical_custody"] = "Defined in agreement"
            elif section.section_type == "parenting_schedule":
                key_terms["parenting_schedule"] = "See schedule details"
            elif section.section_type == "parent_communication":
                key_terms["communication_protocol"] = "CommonGround messaging"

        return key_terms

    def _empty_content(self, reason: str) -> SectionContent:
        """Return empty content when data is missing."""
        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data={"error": reason},
            evidence_count=0,
            data_sources=[],
        )

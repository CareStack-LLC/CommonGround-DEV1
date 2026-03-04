"""
Agreement Overview section generator.

Section 1: Provides summary of case parties, children, and agreement terms.
"""

from datetime import date
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.case import Case, CaseParticipant
from app.models.child import Child
from app.models.user import User
from app.models.agreement import Agreement, AgreementSection, AgreementConversation
from app.models.custody_day_record import CustodyDayRecord
from sqlalchemy import or_
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

        # Load active agreement (Robust logic matching compliance_summary)
        family_file_id = case.family_file_id if case else None

        stmt = select(Agreement).where(
            or_(
                Agreement.case_id == context.case_id,
                Agreement.family_file_id == family_file_id
            ) if family_file_id else (Agreement.case_id == context.case_id)
        ).order_by(Agreement.updated_at.desc())
        
        agmt_result = await db.execute(stmt)
        all_agreements = agmt_result.scalars().all()
        
        # Priority: Active > Draft
        agreement = None
        for a in all_agreements:
             if a.status == 'active':
                 agreement = a
                 break
        if not agreement and all_agreements:
             agreement = all_agreements[0] # Fallback


        # Build parties data with user names
        parties = []
        petitioner_data = None
        respondent_data = None
        
        for participant in case.participants:
            if participant.is_active:
                user = await db.get(User, participant.user_id)
                user_name = f"{user.first_name} {user.last_name}" if user else "Unknown"
                # Redact if needed
                user_name = await self._redact(user_name, context)
                
                party_data = {
                    "role": participant.role,
                    "parent_type": participant.parent_type,
                    "user_id": participant.user_id,
                    "name": user_name,
                }
                parties.append(party_data)
                
                if participant.role == 'petitioner':
                    petitioner_data = party_data
                elif participant.role == 'respondent':
                    respondent_data = party_data

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
            # Fetch Summary from Conversation or fallback
            summary_text = None
            conv = await db.scalar(
                select(AgreementConversation)
                .where(AgreementConversation.agreement_id == agreement.id)
                .order_by(AgreementConversation.updated_at.desc())
            )
            if conv:
                if conv.summary:
                    summary_text = conv.summary
                elif conv.extracted_data and conv.extracted_data.get('summary'):
                     summary_text = conv.extracted_data.get('summary')
            
            # Need to re-load sections for key terms logic if not loaded
            # (or simple heuristic)
            # The agreement obj might be detached or sections not loaded if we used simple fetch
            # Re-fetch with sections option if needed, or query sections directly.
            # actually better to just query sections if needed or assume Lazy loading works (asyncio warning)
            # Let's just query sections for key_terms to be safe
            sections_res = await db.execute(select(AgreementSection).where(AgreementSection.agreement_id == agreement.id))
            sections = sections_res.scalars().all() 

            key_terms = await self._extract_key_terms(agreement, context, sections=sections)
            
            agreement_data = {
                "title": agreement.title,
                "type": agreement.agreement_type,
                "status": agreement.status,
                "effective_date": self._format_date(agreement.effective_date) if agreement.effective_date else None,
                "summary": summary_text,
                "petitioner_approved_at": self._format_date(agreement.petitioner_approved_at) if agreement.petitioner_approved_at else None,
                "respondent_approved_at": self._format_date(agreement.respondent_approved_at) if agreement.respondent_approved_at else None,
                "key_terms": key_terms,
            }

        # Calculate Custody Metrics
        custody_summary = None
        if petitioner_data and respondent_data:
            # Count days per parent in the report period
            petitioner_days_res = await db.execute(
                select(func.count(CustodyDayRecord.id)).where(
                    CustodyDayRecord.family_file_id == family_file_id,
                    CustodyDayRecord.record_date >= context.date_start,
                    CustodyDayRecord.record_date <= context.date_end,
                    CustodyDayRecord.custodial_parent_id == petitioner_data["user_id"]
                )
            )
            petitioner_days = petitioner_days_res.scalar() or 0

            respondent_days_res = await db.execute(
                select(func.count(CustodyDayRecord.id)).where(
                    CustodyDayRecord.family_file_id == family_file_id,
                    CustodyDayRecord.record_date >= context.date_start,
                    CustodyDayRecord.record_date <= context.date_end,
                    CustodyDayRecord.custodial_parent_id == respondent_data["user_id"]
                )
            )
            respondent_days = respondent_days_res.scalar() or 0

            total_days = petitioner_days + respondent_days
            if total_days > 0:
                petitioner_pct = round((petitioner_days / total_days) * 100, 1)
                respondent_pct = round((respondent_days / total_days) * 100, 1)
            else:
                petitioner_pct = 0
                respondent_pct = 0

            custody_summary = {
                "petitioner_days": petitioner_days,
                "petitioner_pct": petitioner_pct,
                "respondent_days": respondent_days,
                "respondent_pct": respondent_pct,
                "total_days": total_days,
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
            "petitioner": petitioner_data,
            "respondent": respondent_data,
            "parties": parties,
            "children": children_data,
            "agreement": agreement_data,
            "custody_summary": custody_summary,
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
        context: GeneratorContext,
        sections: list[AgreementSection] = None
    ) -> dict:
        """Extract key terms from agreement sections."""
        import re
        
        key_terms = {
            "custody_split": None,
            "child_support": None,
            "cost_split": None,
        }
        
        # Use passed sections or try to access from agreement (careful with lazy load)
        agmt_sections = sections or agreement.sections

        for section in agmt_sections:
            content = section.content or ""
            
            # Extract custody split from schedule section
            if section.section_type in ["schedule", "physical_custody"]:
                # Look for patterns like "80% of the time" or "80/20"
                match = re.search(r'(\d+)%?\s*(?:of the time|/)\s*(?:and\s*)?(?:Parent\s*[AB]\s*(?:having\s*)?)?(\d+)%?', content)
                if match:
                    key_terms["custody_split"] = f"{match.group(1)}/{match.group(2)}"
                else:
                    # Try simpler pattern
                    match2 = re.search(r'Parent\s*A\s*having\s*(\d+)%.*Parent\s*B\s*having\s*(\d+)%', content)
                    if match2:
                        key_terms["custody_split"] = f"{match2.group(1)}/{match2.group(2)}"
            
            # Extract child support from financial section
            if section.section_type == "financial":
                # Look for "$X/month" or "$X per month"
                match = re.search(r'\$([0-9,.]+)\s*(?:/|per\s*)month', content, re.IGNORECASE)
                if match:
                    amount = match.group(1).replace(',', '')
                    key_terms["child_support"] = f"${float(amount):,.0f}/month"
                
                # Look for cost split
                if "shared equally" in content.lower():
                    key_terms["cost_split"] = "50/50"
                elif "split" in content.lower():
                    split_match = re.search(r'(\d+)\s*/\s*(\d+)\s*split', content, re.IGNORECASE)
                    if split_match:
                        key_terms["cost_split"] = f"{split_match.group(1)}/{split_match.group(2)}"

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

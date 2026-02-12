"""
Professional Case Summary Service.

Aggregates children, parents, agreements, and compliance data
into a unified summary for professionals (pre-acceptance and active).
"""

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.agreement import Agreement
from app.models.professional import ProfessionalAccessRequest
from app.schemas.professional import (
    InvitationCasePreview,
    InvitationChildPreview,
    InvitationAgreementPreview,
    InvitationCompliancePreview,
    InvitationMessagePreview,
    InvitationClearFundPreview,
)
from app.services.professional.compliance_service import ProfessionalComplianceService
from app.services.exchange_compliance import ExchangeComplianceService
from app.services.agreement import AgreementService

class ProfessionalCaseSummaryService:
    """
    Service for providing unified case summaries to professionals.
    Used for pre-acceptance previews and active case overview.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.compliance_service = ProfessionalComplianceService(db)

    async def get_case_preview(
        self,
        family_file_id: str,
        access_request_id: Optional[str] = None,
        professional_id: Optional[str] = None
    ) -> InvitationCasePreview:
        """
        Generate a case preview for an invitation or active case.
        
        Args:
            family_file_id: ID of the Family File
            access_request_id: Optional ID of the pending access request
            professional_id: Optional ID of the professional (for access verification if needed)
            
        Returns:
            InvitationCasePreview: Full summary of people, agreements, and metrics.
        """
        # Fetch Family File with parents and children
        result = await self.db.execute(
            select(FamilyFile)
            .where(FamilyFile.id == family_file_id)
            .options(
                selectinload(FamilyFile.children),
                selectinload(FamilyFile.parent_a),
                selectinload(FamilyFile.parent_b)
            )
        )
        family_file = result.scalar_one_or_none()
        if not family_file:
            raise ValueError("Family file not found")

        # Fetch active agreement
        agreement_result = await self.db.execute(
            select(Agreement)
            .where(
                and_(
                    Agreement.family_file_id == family_file_id,
                    Agreement.status == "active"
                )
            )
            .options(
                selectinload(Agreement.sections)
            )
            .order_by(Agreement.updated_at.desc())
        )
        active_agreement = agreement_result.scalar_one_or_none()

        # Get metrics
        # Use 30 days for metrics
        days = 30
        start_date = datetime.utcnow() - timedelta(days=days)
        end_date = datetime.utcnow()

        # Communication Metrics
        comm_metrics = await self.compliance_service._get_communication_metrics(
            family_file_id, start_date, end_date
        )

        # Financial Metrics
        fin_metrics = await self.compliance_service._get_financial_metrics(
            family_file_id, family_file.legacy_case_id, start_date, end_date
        )

        # Exchange Metrics
        exchange_metrics = {}
        if family_file.legacy_case_id:
            exchange_metrics = await ExchangeComplianceService.get_exchange_metrics(
                self.db, family_file.legacy_case_id, start_date, end_date
            )

        # Overall Score
        overall_score = self.compliance_service._calculate_overall_score(
            exchange_metrics, fin_metrics, comm_metrics
        )

        # Requested info
        requested_role = None
        requested_scopes = []
        representing = None
        req_message = None

        if access_request_id:
            req_result = await self.db.execute(
                select(ProfessionalAccessRequest).where(ProfessionalAccessRequest.id == access_request_id)
            )
            access_req = req_result.scalar_one_or_none()
            if access_req:
                requested_role = access_req.requested_role
                requested_scopes = access_req.requested_scopes
                representing = access_req.representing
                req_message = access_req.message

        # Extract Quick Facts if agreement exists
        quick_facts = []
        if active_agreement and active_agreement.sections:
            section_dict = {}
            for section in active_agreement.sections:
                if section.content:
                    section_dict[section.section_type] = {
                        "title": section.section_title,
                        "content": section.content
                    }
            
            agreement_service = AgreementService(self.db)
            extracted = agreement_service.extract_key_points_from_sections(section_dict, active_agreement)
            quick_facts = extracted.get("key_points", [])

        return InvitationCasePreview(
            family_file_id=family_file.id,
            family_file_number=family_file.family_file_number,
            family_file_title=family_file.title,
            state=family_file.state,
            county=family_file.county,
            created_at=family_file.created_at,
            parent_a_name=f"{family_file.parent_a.first_name} {family_file.parent_a.last_name}",
            parent_b_name=f"{family_file.parent_b.first_name} {family_file.parent_b.last_name}" if family_file.parent_b else None,
            children=[
                InvitationChildPreview(
                    id=c.id,
                    first_name=c.first_name,
                    age=c.age,
                    has_special_needs=c.has_special_needs
                ) for c in family_file.children if c.is_active
            ],
            agreement=InvitationAgreementPreview(
                has_active_agreement=active_agreement is not None,
                agreement_title=active_agreement.title if active_agreement else None,
                total_sections=18 if active_agreement and active_agreement.agreement_version == "v1" else 7,
                completed_sections=len(active_agreement.sections) if active_agreement and active_agreement.sections else 0,
                last_updated=active_agreement.updated_at if active_agreement else None,
                key_sections=[s.section_title for s in active_agreement.sections[:3]] if active_agreement and active_agreement.sections else [],
                quick_facts=quick_facts
            ),
            compliance=InvitationCompliancePreview(
                exchange_completion_rate=exchange_metrics.get("geofence_compliance_rate"),
                on_time_rate=exchange_metrics.get("on_time_rate"),
                total_exchanges_30d=exchange_metrics.get("total_exchanges", 0),
                completed_exchanges_30d=exchange_metrics.get("completed", 0),
                communication_flag_rate=comm_metrics.get("flag_rate"),
                top_flagged_category=comm_metrics.get("top_flagged_category"),
                overall_health=self.compliance_service._score_to_status(overall_score)
            ),
            messages=InvitationMessagePreview(
                total_messages_30d=comm_metrics.get("total_messages", 0),
                flagged_messages_30d=comm_metrics.get("flagged_messages", 0),
                flag_rate=comm_metrics.get("flag_rate", 0.0),
                top_flagged_category=comm_metrics.get("top_flagged_category"),
                parent_a_messages=comm_metrics.get("parent_a_messages", 0), # This might need per-parent logic if comm_metrics supports it
                parent_b_messages=comm_metrics.get("parent_b_messages", 0),
                last_message_at=None
            ),
            clearfund=InvitationClearFundPreview(
                total_obligations=fin_metrics.get("payments_completed", 0) + fin_metrics.get("payments_pending", 0),
                pending_obligations=fin_metrics.get("payments_pending", 0),
                total_amount=fin_metrics.get("payments_completed_amount", 0.0) + fin_metrics.get("payments_pending_amount", 0.0),
                paid_amount=fin_metrics.get("payments_completed_amount", 0.0),
                overdue_amount=fin_metrics.get("payments_pending_amount", 0.0),
                categories=[]
            ),
            requested_role=requested_role,
            requested_scopes=requested_scopes,
            representing=representing,
            message=req_message
        )

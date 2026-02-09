"""
Agreement service for managing custody agreements and parenting plans.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
import hashlib
import json

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
import io

from anthropic import Anthropic
from openai import OpenAI

from app.models.agreement import Agreement, AgreementSection, AgreementVersion
from app.models.case import Case, CaseParticipant
from app.models.family_file import FamilyFile
from app.models.user import User
from app.schemas.agreement import SECTION_TEMPLATES, AgreementSectionUpdate
from app.schemas.agreement_v2 import SECTION_TEMPLATES_V2, get_section_templates
from app.services.case import CaseService
from app.services.family_file import FamilyFileService
from app.services.email import EmailService
from app.core.config import settings
from app.core.websocket import manager


class AgreementService:
    """Service for handling agreement operations."""

    def __init__(self, db: AsyncSession):
        """
        Initialize agreement service.

        Args:
            db: Database session
        """
        self.db = db
        self.case_service = CaseService(db)
        self.family_file_service = FamilyFileService(db)
        self.email_service = EmailService()

    async def create_agreement(
        self,
        case_id: str,
        user: User,
        title: str = "Parenting Agreement"
    ) -> Agreement:
        """
        Create a new agreement for a case.

        Initializes agreement with 18 section templates.

        Args:
            case_id: ID of the case
            user: User creating the agreement
            title: Agreement title

        Returns:
            Created agreement

        Raises:
            HTTPException: If creation fails
        """
        # Verify user has access to case
        case = await self.case_service.get_case(case_id, user)

        # No restrictions on creating multiple agreements
        # Only restriction is that only one can be ACTIVE at a time (enforced in activate method)

        try:
            # Create agreement
            agreement = Agreement(
                case_id=case_id,
                title=title,
                version=1,
                status="draft",
            )
            self.db.add(agreement)
            await self.db.flush()

            # Create sections from templates
            for template in SECTION_TEMPLATES:
                section = AgreementSection(
                    agreement_id=agreement.id,
                    section_number=template["section_number"],
                    section_title=template["section_title"],
                    section_type=template["section_type"],
                    display_order=template["display_order"],
                    is_required=template["is_required"],
                    content=template["template"],
                    is_completed=False,
                )
                self.db.add(section)

            await self.db.commit()
            await self.db.refresh(agreement)

            # WS5: Broadcast agreement creation for real-time updates
            await manager.broadcast_to_case({
                "type": "agreement_created",
                "case_id": agreement.case_id,
                "agreement_id": agreement.id,
                "agreement": {
                    "id": agreement.id,
                    "title": agreement.title,
                    "status": agreement.status,
                    "version": agreement.version,
                },
                "timestamp": datetime.utcnow().isoformat()
            }, agreement.case_id)

            return agreement

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create agreement: {str(e)}"
            ) from e

    async def get_agreement(
        self,
        agreement_id: str,
        user: User
    ) -> Agreement:
        """
        Get agreement with sections.

        Args:
            agreement_id: ID of the agreement
            user: User requesting the agreement

        Returns:
            Agreement with sections

        Raises:
            HTTPException: If not found or no access
        """
        result = await self.db.execute(
            select(Agreement)
            .options(
                selectinload(Agreement.sections),
                selectinload(Agreement.family_file)
            )
            .where(Agreement.id == agreement_id)
        )
        agreement = result.scalar_one_or_none()

        if not agreement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agreement not found"
            )

        # Verify user has access - check family_file_id first, then case_id
        if agreement.family_file_id:
            # New flow: agreement belongs to a Family File
            await self.family_file_service.get_family_file(agreement.family_file_id, user)
        elif agreement.case_id:
            # Legacy flow: agreement belongs to a Case
            await self.case_service.get_case(agreement.case_id, user)
        else:
            # Neither - shouldn't happen, but deny access
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Agreement has no associated family file or case"
            )

        return agreement

    async def get_case_agreement(
        self,
        case_id: str,
        user: User
    ) -> Optional[Agreement]:
        """
        Get the most relevant agreement for a case.

        Priority: active > approved > pending_approval > draft

        Args:
            case_id: ID of the case
            user: User requesting the agreement

        Returns:
            Most relevant agreement or None

        Raises:
            HTTPException: If no access to case
        """
        # Verify access
        await self.case_service.get_case(case_id, user)

        # Try to get active agreement first
        result = await self.db.execute(
            select(Agreement)
            .options(selectinload(Agreement.sections))
            .where(Agreement.case_id == case_id)
            .where(Agreement.status == "active")
            .order_by(Agreement.version.desc())
            .limit(1)
        )
        active = result.scalars().first()
        if active:
            return active

        # Otherwise, get the most recent non-inactive agreement
        result = await self.db.execute(
            select(Agreement)
            .options(selectinload(Agreement.sections))
            .where(Agreement.case_id == case_id)
            .where(Agreement.status.in_(["approved", "pending_approval", "draft"]))
            .order_by(Agreement.version.desc())
            .limit(1)
        )
        return result.scalars().first()

    async def create_section(
        self,
        create_data,
        user: User
    ) -> AgreementSection:
        """
        Create a new agreement section.

        Args:
            create_data: Section creation data
            user: User creating the section

        Returns:
            Created section

        Raises:
            HTTPException: If creation fails
        """
        # Verify user has access to the agreement
        agreement = await self.get_agreement(create_data.agreement_id, user)

        # Can only create sections in draft agreements
        if agreement.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only create sections in draft agreements"
            )

        try:
            # Get next display order
            result = await self.db.execute(
                select(AgreementSection)
                .where(AgreementSection.agreement_id == create_data.agreement_id)
            )
            existing_sections = result.scalars().all()
            next_order = max([s.display_order for s in existing_sections], default=0) + 1

            # Create section
            section = AgreementSection(
                agreement_id=create_data.agreement_id,
                section_type=create_data.section_type,
                section_number=create_data.section_number or "",
                section_title=create_data.section_title or "",
                content=json.dumps(create_data.content) if isinstance(create_data.content, dict) else create_data.content,
                structured_data=create_data.structured_data,
                display_order=next_order,
                is_required=False,
                is_completed=True
            )

            self.db.add(section)
            await self.db.commit()
            await self.db.refresh(section)

            return section

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create section: {str(e)}"
            ) from e

    async def update_section(
        self,
        section_id: str,
        update_data: AgreementSectionUpdate,
        user: User
    ) -> AgreementSection:
        """
        Update an agreement section.

        Args:
            section_id: ID of the section
            update_data: Update data
            user: User making the update

        Returns:
            Updated section

        Raises:
            HTTPException: If update fails
        """
        # Get section
        result = await self.db.execute(
            select(AgreementSection).where(AgreementSection.id == section_id)
        )
        section = result.scalar_one_or_none()

        if not section:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Section not found"
            )

        # Get agreement and verify access
        agreement = await self.get_agreement(section.agreement_id, user)

        # Can only update draft agreements
        if agreement.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only update sections in draft agreements"
            )

        try:
            # Update section - only update fields that are provided
            if update_data.section_number is not None:
                section.section_number = update_data.section_number
            if update_data.section_title is not None:
                section.section_title = update_data.section_title
            if update_data.content is not None:
                section.content = update_data.content
            if update_data.structured_data is not None:
                section.structured_data = update_data.structured_data
            section.is_completed = True

            await self.db.commit()
            await self.db.refresh(section)

            # WS5: Broadcast agreement update for real-time updates
            await manager.broadcast_to_case({
                "type": "agreement_updated",
                "case_id": agreement.case_id,
                "agreement_id": agreement.id,
                "section_id": section.id,
                "section_number": section.section_number,
                "is_completed": section.is_completed,
                "timestamp": datetime.utcnow().isoformat()
            }, agreement.case_id)

            return section

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update section: {str(e)}"
            ) from e

    async def compile_rules(self, agreement: Agreement) -> Dict[str, Any]:
        """
        Compile machine-readable rules from agreement sections.

        Args:
            agreement: Agreement to compile rules from

        Returns:
            Compiled rules dictionary
        """
        rules = {
            "version": agreement.version,
            "effective_date": agreement.effective_date.isoformat() if agreement.effective_date else None,
            "sections": {},
            "schedule": {},
            "financial": {},
            "decision_making": {}
        }

        # Load sections
        result = await self.db.execute(
            select(AgreementSection)
            .where(AgreementSection.agreement_id == agreement.id)
            .order_by(AgreementSection.display_order)
        )
        sections = result.scalars().all()

        for section in sections:
            section_data = {
                "title": section.section_title,
                "content": section.content,
                "structured_data": section.structured_data or {}
            }

            rules["sections"][section.section_number] = section_data

            # Categorize by type
            if section.section_type == "schedule":
                rules["schedule"][section.section_number] = section_data
            elif section.section_type == "financial":
                rules["financial"][section.section_number] = section_data
            elif section.section_type == "decision_making":
                rules["decision_making"][section.section_number] = section_data

        return rules

    def _format_structured_data_for_pdf(self, data: Dict[str, Any]) -> str:
        """
        Format structured data from v2 agreements into readable PDF content.

        Args:
            data: Structured data dictionary from section

        Returns:
            Formatted string for PDF paragraph
        """
        if not data:
            return "<i>No content provided</i>"

        # Human-readable labels for common fields
        field_labels = {
            'current_arrangements': 'Current Living Arrangements',
            'effective_date': 'Effective Date',
            'duration_type': 'Agreement Duration',
            'review_schedule': 'Review Schedule',
            'primary_residence': 'Primary Residence',
            'schedule_pattern': 'Schedule Pattern',
            'transition_day': 'Transition Day',
            'transition_time': 'Transition Time',
            'exchange_location': 'Exchange Location',
            'exchange_location_address': 'Exchange Address',
            'transportation_responsibility': 'Transportation',
            'transition_communication': 'Communication Method',
            'major_decision_authority': 'Decision-Making Authority',
            'response_timeframe': 'Response Timeframe',
            'split_ratio': 'Expense Split Ratio',
            'reimbursement_window': 'Reimbursement Window',
            'escalation_timeframe': 'Escalation Timeframe',
            'parent_a_acknowledgment': 'Parent A Acknowledged',
            'parent_b_acknowledgment': 'Parent B Acknowledged',
        }

        # Human-readable values for common options
        value_labels = {
            'indefinite': 'Until modified by both parents',
            'until_child_18': 'Until child(ren) turn 18',
            'fixed_term': 'Fixed term',
            'annual': 'Annually',
            'every_6_months': 'Every 6 months',
            'as_needed': 'As needed',
            'equal': 'Equal time with both parents (50/50)',
            'parent_a': 'Primarily with Parent A',
            'parent_b': 'Primarily with Parent B',
            'week_on_week_off': 'Week-on, week-off',
            '2-2-3': '2-2-3 rotation',
            'every_other_weekend': 'Every other weekend + one weeknight',
            'custom': 'Custom arrangement',
            'school': 'At school (pickup/dropoff)',
            'parent_a_home': 'At Parent A\'s home',
            'parent_b_home': 'At Parent B\'s home',
            'neutral_location': 'Neutral location',
            'picking_up_parent': 'Parent picking up handles transportation',
            'dropping_off_parent': 'Parent dropping off handles transportation',
            'shared': 'Meet in the middle',
            'commonground': 'CommonGround app',
            'text': 'Text messages',
            'email': 'Email',
            'joint': 'Together (both parents must agree)',
            'divided': 'Divided by category',
            'same_day_urgent': 'Same day for urgent, 24 hours for routine',
            '24_hours': 'Within 24 hours',
            '48_hours': 'Within 48 hours',
            '50/50': '50/50 split',
            '60/40': '60/40 split',
            'income_based': 'Based on income proportions',
            '14_days': '14 days',
            '30_days': '30 days',
            '7_days': '7 days',
        }

        lines = []
        for key, value in data.items():
            if value is None or value == '':
                continue

            # Get human-readable label
            label = field_labels.get(key, key.replace('_', ' ').title())

            # Get human-readable value
            if isinstance(value, bool):
                display_value = 'Yes' if value else 'No'
            elif isinstance(value, str):
                display_value = value_labels.get(value, value)
            else:
                display_value = str(value)

            lines.append(f"<b>{label}:</b> {display_value}")

        return '<br/>'.join(lines) if lines else "<i>No content provided</i>"

    async def generate_pdf(self, agreement: Agreement) -> bytes:
        """
        Generate PDF document from agreement.

        Args:
            agreement: Agreement to generate PDF for

        Returns:
            PDF bytes

        Raises:
            HTTPException: If generation fails
        """
        try:
            # Create PDF in memory
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter,
                                   topMargin=0.75*inch, bottomMargin=0.75*inch)

            # Build story (content)
            story = []
            styles = getSampleStyleSheet()

            # Title style
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=18,
                textColor='black',
                spaceAfter=30,
                alignment=TA_CENTER
            )

            # Add title
            story.append(Paragraph(agreement.title, title_style))
            story.append(Spacer(1, 0.3*inch))

            # Add metadata
            meta_style = styles['Normal']
            story.append(Paragraph(f"<b>Agreement ID:</b> {agreement.id}", meta_style))
            story.append(Paragraph(f"<b>Version:</b> {agreement.version}", meta_style))
            story.append(Paragraph(f"<b>Status:</b> {agreement.status.upper()}", meta_style))
            story.append(Paragraph(f"<b>Created:</b> {agreement.created_at.strftime('%B %d, %Y')}", meta_style))

            if agreement.effective_date:
                story.append(Paragraph(
                    f"<b>Effective Date:</b> {agreement.effective_date.strftime('%B %d, %Y')}",
                    meta_style
                ))

            story.append(Spacer(1, 0.5*inch))

            # Add sections
            result = await self.db.execute(
                select(AgreementSection)
                .where(AgreementSection.agreement_id == agreement.id)
                .order_by(AgreementSection.display_order)
            )
            sections = result.scalars().all()

            section_style = ParagraphStyle(
                'SectionTitle',
                parent=styles['Heading2'],
                fontSize=14,
                textColor='black',
                spaceAfter=12,
                spaceBefore=20
            )

            content_style = ParagraphStyle(
                'SectionContent',
                parent=styles['Normal'],
                fontSize=11,
                alignment=TA_JUSTIFY,
                spaceAfter=12
            )

            for section in sections:
                # Section title
                story.append(Paragraph(
                    f"{section.section_number}. {section.section_title}",
                    section_style
                ))

                # Section content - handle both v1 (content) and v2 (structured_data)
                content = section.content
                if not content or content.strip() == '':
                    # For v2 agreements, format structured_data
                    if section.structured_data:
                        content = self._format_structured_data_for_pdf(section.structured_data)
                    else:
                        content = "<i>No content provided</i>"

                story.append(Paragraph(content, content_style))
                story.append(Spacer(1, 0.2*inch))

            # Add signature block
            story.append(PageBreak())
            story.append(Spacer(1, 0.5*inch))
            story.append(Paragraph("<b>SIGNATURES</b>", title_style))
            story.append(Spacer(1, 0.3*inch))

            sig_style = styles['Normal']
            story.append(Paragraph(
                "By signing below, both parties acknowledge that they have read, understood, and agree to the terms of this Parenting Agreement.",
                sig_style
            ))
            story.append(Spacer(1, 0.5*inch))

            # Parent signatures
            story.append(Paragraph("_" * 50, sig_style))
            story.append(Paragraph("Parent A Signature", sig_style))
            story.append(Paragraph(
                f"Date: {agreement.petitioner_approved_at.strftime('%B %d, %Y') if agreement.petitioner_approved_at else '___________'}",
                sig_style
            ))
            story.append(Spacer(1, 0.5*inch))

            story.append(Paragraph("_" * 50, sig_style))
            story.append(Paragraph("Parent B Signature", sig_style))
            story.append(Paragraph(
                f"Date: {agreement.respondent_approved_at.strftime('%B %d, %Y') if agreement.respondent_approved_at else '___________'}",
                sig_style
            ))

            # Build PDF
            doc.build(story)

            # Get PDF bytes
            pdf_bytes = buffer.getvalue()
            buffer.close()

            return pdf_bytes

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate PDF: {str(e)}"
            ) from e

    async def submit_for_approval(
        self,
        agreement_id: str,
        user: User
    ) -> Agreement:
        """
        Submit agreement for dual approval.

        Args:
            agreement_id: ID of the agreement
            user: User submitting for approval

        Returns:
            Updated agreement

        Raises:
            HTTPException: If submission fails
        """
        agreement = await self.get_agreement(agreement_id, user)

        if agreement.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only submit draft agreements for approval"
            )

        # Check all required sections are completed
        result = await self.db.execute(
            select(AgreementSection)
            .where(AgreementSection.agreement_id == agreement_id)
            .where(AgreementSection.is_required == True)
        )
        required_sections = result.scalars().all()

        incomplete = [s for s in required_sections if not s.is_completed]
        if incomplete:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Complete all required sections first. Missing: {', '.join(s.section_title for s in incomplete)}"
            )

        try:
            # Compile rules
            rules = await self.compile_rules(agreement)
            agreement.rules = rules

            # Generate PDF
            pdf_bytes = await self.generate_pdf(agreement)
            pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()
            agreement.pdf_hash = pdf_hash

            # TODO: Upload PDF to storage and set pdf_url
            # For now, we'll just store the hash
            agreement.pdf_url = f"/agreements/{agreement_id}/document.pdf"

            # Update status
            agreement.status = "pending_approval"

            await self.db.commit()
            await self.db.refresh(agreement)

            # Send email notification to other parent
            try:
                # Get case participants to find the other parent
                result = await self.db.execute(
                    select(CaseParticipant)
                    .options(selectinload(CaseParticipant.user))
                    .where(CaseParticipant.case_id == agreement.case_id)
                    .where(CaseParticipant.is_active == True)
                )
                participants = result.scalars().all()

                # Find the other parent (not the current user)
                other_parent = next(
                    (p for p in participants if p.user_id != user.id),
                    None
                )

                if other_parent and other_parent.user:
                    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
                    approval_link = f"{frontend_url}/agreements/{agreement_id}/review"

                    await self.email_service.send_agreement_approval_needed(
                        to_email=other_parent.user.email,
                        to_name=f"{other_parent.user.first_name} {other_parent.user.last_name}",
                        case_name=agreement.case.case_name if agreement.case else "Your Case",
                        agreement_title=agreement.title,
                        approval_link=approval_link
                    )
            except Exception as email_error:
                # Log email error but don't fail approval submission
                print(f"Warning: Failed to send approval email: {email_error}")

            return agreement

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to submit for approval: {str(e)}"
            ) from e

    async def approve_agreement(
        self,
        agreement_id: str,
        user: User,
        notes: Optional[str] = None
    ) -> Agreement:
        """
        Approve an agreement.

        Requires both parents to approve before becoming active.

        Args:
            agreement_id: ID of the agreement
            user: User approving the agreement
            notes: Optional approval notes

        Returns:
            Updated agreement

        Raises:
            HTTPException: If approval fails
        """
        agreement = await self.get_agreement(agreement_id, user)

        if agreement.status not in ["pending_approval", "active"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agreement must be submitted for approval first"
            )

        # Determine user's role - check Family File first, then Case
        user_role = None

        if agreement.family_file_id:
            # Family File-based agreement (SharedCare v2)
            from app.models.family_file import FamilyFile
            result = await self.db.execute(
                select(FamilyFile).where(FamilyFile.id == agreement.family_file_id)
            )
            family_file = result.scalar_one_or_none()

            if family_file:
                if str(family_file.parent_a_id) == str(user.id):
                    user_role = "petitioner"  # parent_a maps to petitioner
                elif str(family_file.parent_b_id) == str(user.id):
                    user_role = "respondent"  # parent_b maps to respondent

        if not user_role and agreement.case_id:
            # Case-based agreement (legacy)
            result = await self.db.execute(
                select(CaseParticipant)
                .where(CaseParticipant.case_id == agreement.case_id)
                .where(CaseParticipant.user_id == user.id)
            )
            participant = result.scalar_one_or_none()
            if participant:
                user_role = participant.role

        if not user_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant in this agreement"
            )

        try:
            # Mark approval based on role
            if user_role == "petitioner":
                if agreement.petitioner_approved:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="You have already approved this agreement"
                    )
                agreement.petitioner_approved = True
                agreement.petitioner_approved_at = datetime.utcnow()

            elif user_role == "respondent":
                if agreement.respondent_approved:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="You have already approved this agreement"
                    )
                agreement.respondent_approved = True
                agreement.respondent_approved_at = datetime.utcnow()

            # Check if both parents have approved
            if agreement.petitioner_approved and agreement.respondent_approved:
                # Change status to "approved" (not active yet - requires manual activation)
                agreement.status = "approved"

                # Create version snapshot
                version = AgreementVersion(
                    agreement_id=agreement.id,
                    version_number=agreement.version,
                    created_by=user.id,
                    data=agreement.rules or {},
                    petitioner_approved=True,
                    petitioner_approved_at=agreement.petitioner_approved_at,
                    respondent_approved=True,
                    respondent_approved_at=agreement.respondent_approved_at,
                    pdf_url=agreement.pdf_url,
                    pdf_hash=agreement.pdf_hash,
                    version_notes=notes
                )
                self.db.add(version)

            await self.db.commit()
            await self.db.refresh(agreement)

            # WS5: Broadcast agreement approval for real-time updates
            broadcast_id = agreement.family_file_id or agreement.case_id
            if broadcast_id:
                await manager.broadcast_to_case({
                    "type": "agreement_approved",
                    "case_id": agreement.case_id,
                    "family_file_id": agreement.family_file_id,
                    "agreement_id": agreement.id,
                    "agreement": {
                        "id": agreement.id,
                        "title": agreement.title,
                        "status": agreement.status,
                        "petitioner_approved": agreement.petitioner_approved,
                        "respondent_approved": agreement.respondent_approved,
                    },
                    "user_role": user_role,
                    "timestamp": datetime.utcnow().isoformat()
                }, broadcast_id)

            return agreement

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to approve agreement: {str(e)}"
            ) from e

    async def get_completion_percentage(self, agreement: Agreement) -> float:
        """
        Calculate agreement completion percentage.

        Args:
            agreement: Agreement to calculate completion for

        Returns:
            Completion percentage (0-100)
        """
        result = await self.db.execute(
            select(AgreementSection)
            .where(AgreementSection.agreement_id == agreement.id)
        )
        sections = result.scalars().all()

        if not sections:
            return 0.0

        completed = sum(1 for s in sections if s.is_completed)
        return (completed / len(sections)) * 100

    async def activate_agreement(
        self,
        agreement_id: str,
        user: User
    ) -> Agreement:
        """
        Activate an approved agreement.

        Deactivates any currently active agreements for the same case.

        Args:
            agreement_id: ID of the agreement to activate
            user: User activating the agreement

        Returns:
            Activated agreement

        Raises:
            HTTPException: If activation fails
        """
        agreement = await self.get_agreement(agreement_id, user)

        # Can only activate approved agreements
        if agreement.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only activate approved agreements"
            )

        try:
            # Deactivate any currently active agreements for this case
            result = await self.db.execute(
                select(Agreement)
                .where(Agreement.case_id == agreement.case_id)
                .where(Agreement.status == "active")
            )
            active_agreements = result.scalars().all()

            for active_agreement in active_agreements:
                active_agreement.status = "inactive"

            # Activate this agreement
            agreement.status = "active"
            agreement.effective_date = datetime.utcnow()

            await self.db.commit()
            await self.db.refresh(agreement)

            return agreement

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to activate agreement: {str(e)}"
            ) from e

    async def deactivate_agreement(
        self,
        agreement_id: str,
        user: User
    ) -> Agreement:
        """
        Deactivate an active agreement.

        Args:
            agreement_id: ID of the agreement to deactivate
            user: User deactivating the agreement

        Returns:
            Deactivated agreement

        Raises:
            HTTPException: If deactivation fails
        """
        agreement = await self.get_agreement(agreement_id, user)

        # Can only deactivate active agreements
        if agreement.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only deactivate active agreements"
            )

        try:
            agreement.status = "inactive"

            await self.db.commit()
            await self.db.refresh(agreement)

            return agreement

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to deactivate agreement: {str(e)}"
            ) from e

    async def delete_agreement(
        self,
        agreement_id: str,
        user: User
    ) -> None:
        """
        Delete an agreement (only if in draft status).

        Args:
            agreement_id: ID of the agreement
            user: User requesting deletion

        Raises:
            HTTPException: If deletion fails or agreement is not draft
        """
        agreement = await self.get_agreement(agreement_id, user)

        # Can only delete draft agreements
        if agreement.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only delete draft agreements"
            )

        try:
            # Delete all sections first (cascade should handle this, but explicit is better)
            await self.db.execute(
                select(AgreementSection)
                .where(AgreementSection.agreement_id == agreement_id)
            )
            sections = (await self.db.execute(
                select(AgreementSection)
                .where(AgreementSection.agreement_id == agreement_id)
            )).scalars().all()

            for section in sections:
                await self.db.delete(section)

            # Delete agreement
            await self.db.delete(agreement)
            await self.db.commit()

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete agreement: {str(e)}"
            ) from e

    async def generate_quick_summary(
        self,
        agreement_id: str,
        user: User
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive, plain-English summary of an agreement.

        Extracts all key provisions from every section and formats them
        in a clear, organized markdown structure.

        Args:
            agreement_id: ID of the agreement
            user: Current user

        Returns:
            Dict with summary (markdown), key_points, completion_percentage, status
        """
        agreement = await self.get_agreement(agreement_id, user)

        # Get all sections with content
        result = await self.db.execute(
            select(AgreementSection)
            .where(AgreementSection.agreement_id == agreement_id)
            .order_by(AgreementSection.display_order)
        )
        sections = result.scalars().all()

        # Calculate completion percentage
        completed_sections = sum(1 for s in sections if s.is_completed)
        total_sections = len(sections)
        completion_percentage = int((completed_sections / total_sections * 100)) if total_sections > 0 else 0

        # If no sections are completed, return placeholder summary
        if completed_sections == 0:
            return {
                "summary": "This agreement is still being drafted. Complete the sections to see a summary.",
                "key_points": [
                    "Agreement not yet started",
                    "Use the builder to add custody details"
                ],
                "completion_percentage": 0,
                "status": agreement.status
            }

        # Build section content dictionary
        section_dict = {}
        for section in sections:
            if section.is_completed and section.content:
                section_dict[section.section_type] = {
                    "title": section.section_title,
                    "content": section.content
                }

        # Generate comprehensive summary using AI
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            
            sections_text = "\n\n".join([
                f"## {data['title']}\n{data['content']}" 
                for data in section_dict.values()
            ])

            response = client.chat.completions.create(
                model="gpt-4o",
                max_tokens=2500,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a legal document summarizer for co-parenting agreements.
Your job is to extract key provisions and present them in a clear, mobile-friendly format.
Write in plain English that parents can easily understand.
Be concise but include specific details like names, times, dates, amounts, and locations.
Use emojis for holidays to make them scannable."""
                    },
                    {
                        "role": "user",
                        "content": f"""Generate a summary of this custody agreement.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS (use markdown):

[Write a single paragraph summary. Include: parent names (Parent A/B), children's names and ages, any special needs, court name and case number, custody type (joint legal + joint physical), the schedule type (like 2-2-3), exchange location and time, child support amount and due date, communication platform, and dispute resolution process. Keep it to one flowing paragraph.]

---

## 📅 Regular Schedule ([Schedule name], Exchange at [time])

| Week | Mon–Tue | Wed–Thu | Fri–Sun |
|------|---------|---------|---------|
| Week A | Parent A ([name]) | Parent B ([name]) | Parent A ([name]) |
| Week B | Parent B ([name]) | Parent A ([name]) | Parent B ([name]) |

---

## 🎄 Holidays & Special Days

**Alternating Holidays** (Even years: Parent A has first choice)

| Holiday | 2025 | 2026 |
|---------|------|------|
| 🦃 Thanksgiving | Parent A | Parent B |
| 🎄 Christmas Eve | Parent B | Parent A |
| 🎁 Christmas Day | Parent A | Parent B |
| 🎆 New Year's Eve | Parent B | Parent A |
| 🐰 Easter | Parent A | Parent B |
| 🎇 July 4th | Parent B | Parent A |

**Fixed Holidays / Special Days**

| Day | Rule |
|-----|------|
| 💐 Mother's Day | Always with Parent A ([mom name]) |
| 👔 Father's Day | Always with Parent B ([dad name]) |
| 🎂 Children's Birthdays | Split (morning/afternoon) |
| 🎈 Parent Birthdays | Birthday parent has children 4:00 PM–8:00 PM |

---

AGREEMENT SECTIONS:
{sections_text}"""
                    }
                ]
            )

            summary_markdown = response.choices[0].message.content

            # Extract key points for the compact view
            key_points_data = self._extract_key_points_from_sections(section_dict)

            return {
                "summary": summary_markdown,
                "key_points": key_points_data.get("key_points", []),
                "shared_expenses_table": key_points_data.get("shared_expenses_table"),
                "completion_percentage": completion_percentage,
                "status": agreement.status
            }

        except Exception as e:
            # Fallback: generate summary directly from sections without AI
            return self._generate_fallback_comprehensive_summary(
                agreement, section_dict, completion_percentage
            )

    def _extract_key_points_from_sections(self, section_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract labeled Quick Facts for easy reference.
        Returns dict with key_points (list) and shared_expenses_table (dict).
        """
        import re
        key_points = []
        shared_expenses_table = None
        
        # 1. CUSTODY TYPE
        if "custody" in section_dict:
            content = section_dict["custody"]["content"]
            custody_parts = []
            
            if "joint legal" in content.lower():
                custody_parts.append("Joint legal")
            elif "sole legal" in content.lower():
                custody_parts.append("Sole legal")
            
            if "joint physical" in content.lower():
                custody_parts.append("joint physical custody")
            elif "sole physical" in content.lower():
                custody_parts.append("sole physical custody")
            
            if custody_parts:
                key_points.append(f"**Custody Type:** {' + '.join(custody_parts)}")
        
        # 2. SCHEDULE
        if "schedule" in section_dict or "custody" in section_dict:
            content = section_dict.get("schedule", {}).get("content", "")
            content += " " + section_dict.get("custody", {}).get("content", "")
            
            if "2-2-3" in content:
                key_points.append("**Schedule:** 2-2-3 schedule (50/50 time)")
            elif "week on" in content.lower() or "alternating weeks" in content.lower():
                key_points.append("**Schedule:** Week on/week off schedule")
            elif "every other weekend" in content.lower():
                key_points.append("**Schedule:** Every other weekend schedule")
        
        # 3. EXCHANGES
        if "transportation" in section_dict or "schedule" in section_dict:
            trans_content = section_dict.get("transportation", {}).get("content", "")
            sched_content = section_dict.get("schedule", {}).get("content", "")
            content = trans_content + " " + sched_content
            
            # Extract time
            time_match = re.search(r'(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))', content, re.IGNORECASE)
            time_str = time_match.group(1) if time_match else "5:00 PM"
            
            # Extract location with address
            location = None
            # Look for @ symbol pattern with address
            at_match = re.search(r'@\s*([^,\.\n]+(?:\([^)]+\))?)', content)
            if at_match:
                location = at_match.group(1).strip()
            # Look for specific addresses
            elif "starbucks" in content.lower():
                addr_match = re.search(r'(\d+\s+[A-Za-z\s]+(?:Ave|Avenue|St|Street|Blvd|Boulevard|Dr|Drive|Rd|Road)[^,\.\n]*)', content, re.IGNORECASE)
                if addr_match:
                    location = f"Starbucks ({addr_match.group(1).strip()})"
                else:
                    location = "Starbucks"
            elif "school" in content.lower():
                location = "School"
            elif "residence" in content.lower() or "receiving parent" in content.lower():
                location = "Receiving parent's home"
            else:
                location = "Designated location"
            
            key_points.append(f"**Exchanges:** {time_str} @ {location}")
        
        # 4. LATE POLICY
        if "transportation" in section_dict:
            content = section_dict["transportation"]["content"]
            grace_match = re.search(r'(\d+)[\s-]*minute[s]?\s*grace', content, re.IGNORECASE)
            missed_match = re.search(r'(\d+)[\s-]*minute[s]?.*(?:missed|no contact)', content, re.IGNORECASE)
            
            if grace_match and missed_match:
                grace = grace_match.group(1)
                missed = missed_match.group(1)
                key_points.append(f"**Late policy:** {grace}-minute grace; \"missed\" after {missed} minutes no contact")
            elif grace_match:
                grace = grace_match.group(1)
                key_points.append(f"**Late policy:** {grace}-minute grace period")
        
        # 5. SILENT HANDOFF (if applicable)
        if "transportation" in section_dict:
            content = section_dict["transportation"]["content"]
            if "silent handoff" in content.lower():
                features = []
                if "gps" in content.lower():
                    features.append("GPS check-in")
                if "app" in content.lower() or "confirmation" in content.lower():
                    features.append("in-app confirmation")
                
                if features:
                    key_points.append(f"**Silent Handoff:** {' + '.join(features)}")
                else:
                    key_points.append("**Silent Handoff:** Enabled")
        
        # 6. COMMUNICATION
        if "communication" in section_dict:
            content = section_dict["communication"]["content"]
            comm_method = "Per agreement"
            
            if "commonground" in content.lower():
                comm_method = "CommonGround only"
            elif "text" in content.lower():
                comm_method = "Text/phone"
            elif "email" in content.lower():
                comm_method = "Email"
            
            if "aria" in content.lower():
                comm_method += "; ARIA™ monitors tone"
            
            key_points.append(f"**Communication:** {comm_method}")
        
        # 7. DISPUTES
        if "communication" in section_dict:
            content = section_dict["communication"]["content"]
            if "dispute" in content.lower() or "resolution" in content.lower():
                steps = []
                if "48" in content or "two days" in content.lower():
                    steps.append("48 hours")
                if "quickaccord" in content.lower():
                    steps.append("QuickAccord")
                elif "mediat" in content.lower():
                    steps.append("mediator")
                if "court" in content.lower():
                    steps.append("court")
                
                if steps:
                    key_points.append(f"**Disputes:** {' → '.join(steps)}")
        
        # 8. CHILD SUPPORT
        if "financial" in section_dict:
            content = section_dict["financial"]["content"]
            amount_match = re.search(r'\$[\d,]+', content)
            if amount_match:
                amount = amount_match.group(0)
                if "clearfund" in content.lower():
                    key_points.append(f"**Child support:** {amount}/month via ClearFund")
                else:
                    key_points.append(f"**Child support:** {amount}/month")
            elif "no support" in content.lower() or "waived" in content.lower():
                key_points.append("**Child support:** None ordered")
        
        # 9. SHARED EXPENSES - Return as structured table data
        if "financial" in section_dict:
            content = section_dict["financial"]["content"]
            if "50/50" in content or "50-50" in content:
                # Build expense table
                covered = []
                not_covered = []
                
                # Medical
                if "medical" in content.lower():
                    if "not covered" in content.lower() or "insurance only" in content.lower():
                        not_covered.append("Medical not covered by insurance")
                    else:
                        covered.append("Medical expenses")
                
                # Activities
                if "activities" in content.lower() or "extracurricular" in content.lower():
                    covered.append("Activities/extracurricular")
                
                # School
                if "school" in content.lower():
                    covered.append("School costs")
                
                # Clothing
                if "clothing" in content.lower():
                    threshold_match = re.search(r'\$(\d+)', content)
                    if threshold_match:
                        covered.append(f"Clothing over ${threshold_match.group(1)}")
                    else:
                        covered.append("Clothing")
                
                shared_expenses_table = {
                    "split": "50/50",
                    "covered": covered,
                    "not_covered": not_covered
                }
        
        return {
            "key_points": key_points,
            "shared_expenses_table": shared_expenses_table
        }

    def _generate_fallback_comprehensive_summary(
        self, 
        agreement: Agreement, 
        section_dict: Dict[str, Any],
        completion_percentage: int
    ) -> Dict[str, Any]:
        """Generate comprehensive summary without AI as fallback."""
        
        summary_parts = ["## Agreement Overview\n"]
        
        # Build overview from sections
        overview_lines = []
        if "legal" in section_dict:
            overview_lines.append(section_dict["legal"]["content"].split("\n")[0])
        if "children" in section_dict:
            content = section_dict["children"]["content"]
            if "Leo" in content and "Mia" in content:
                overview_lines.append("This agreement covers two children: Leo Chen-Miller and Mia Chen-Miller.")
        if "custody" in section_dict:
            content = section_dict["custody"]["content"]
            if "joint physical custody" in content.lower():
                overview_lines.append("The parents share joint physical custody using a 2-2-3 rotating schedule, resulting in approximately 50/50 parenting time.")
        
        summary_parts.append(" ".join(overview_lines))
        summary_parts.append("\n\n---\n\n## Key Provisions\n")
        
        # Add each section
        section_order = [
            ("legal", "1) Court & Parties"),
            ("children", "2) Children"),
            ("custody", "3) Custody Type"),
            ("schedule", "4) Regular Schedule"),
            ("holidays", "5) Holidays & Special Days"),
            ("transportation", "6) Transportation & Exchange"),
            ("financial", "7) Child Support & Expenses"),
            ("communication", "8) Communication & Disputes")
        ]
        
        for section_type, heading in section_order:
            if section_type in section_dict:
                summary_parts.append(f"\n### {heading}\n")
                # Format content as bullet points
                content = section_dict[section_type]["content"]
                for line in content.split("\n"):
                    line = line.strip()
                    if line and not line.startswith("#"):
                        if line.startswith("-"):
                            summary_parts.append(f"{line}\n")
                        elif ":" in line:
                            summary_parts.append(f"* **{line}**\n")
                        else:
                            summary_parts.append(f"* {line}\n")
        
        key_points = self._extract_key_points_from_sections(section_dict)
        
        return {
            "summary": "".join(summary_parts),
            "key_points": key_points[:8],
            "completion_percentage": completion_percentage,
            "status": agreement.status
        }

    async def create_agreement_for_family_file(
        self,
        family_file_id: str,
        title: str,
        agreement_type: str,
        user: User,
        agreement_version: str = "v2_standard"
    ) -> Agreement:
        """
        Create a new SharedCare Agreement for a Family File.

        Initializes agreement with appropriate section templates based on version:
        - v2_standard: 7 sections (default)
        - v2_lite: 5 sections
        - v1: 18 sections (legacy ARIA Professional)

        Args:
            family_file_id: ID of the Family File
            title: Agreement title
            agreement_type: Type of agreement (shared_care)
            user: User creating the agreement
            agreement_version: Version format (v2_standard, v2_lite, or v1)

        Returns:
            Created agreement

        Raises:
            HTTPException: If creation fails
        """
        from app.models.agreement import generate_shared_care_number

        try:
            # Create agreement with family_file_id (no case_id)
            agreement = Agreement(
                family_file_id=family_file_id,
                case_id=None,  # No legacy case link
                agreement_number=generate_shared_care_number(),
                title=title,
                agreement_type=agreement_type,
                agreement_version=agreement_version,
                version=1,
                status="draft",
            )
            self.db.add(agreement)
            await self.db.flush()

            # Get templates based on agreement version
            templates = get_section_templates(agreement_version)

            # Create sections from templates
            for template in templates:
                section = AgreementSection(
                    agreement_id=agreement.id,
                    section_number=template["section_number"],
                    section_title=template["section_title"],
                    section_type=template["section_type"],
                    display_order=template["display_order"],
                    is_required=template.get("is_required", False),
                    content=template.get("template", ""),
                    is_completed=False,
                )
                self.db.add(section)

            await self.db.commit()
            await self.db.refresh(agreement)

            return agreement

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create agreement: {str(e)}"
            ) from e

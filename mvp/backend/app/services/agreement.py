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
from app.services.case import CaseService
from app.services.family_file import FamilyFileService
from app.services.email import EmailService
from app.core.config import settings


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
            .options(selectinload(Agreement.sections))
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
            # Update section
            section.content = update_data.content
            if update_data.structured_data:
                section.structured_data = update_data.structured_data
            section.is_completed = True

            await self.db.commit()
            await self.db.refresh(section)

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

                # Section content
                story.append(Paragraph(section.content, content_style))
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

        # Determine user's role in the case
        result = await self.db.execute(
            select(CaseParticipant)
            .where(CaseParticipant.case_id == agreement.case_id)
            .where(CaseParticipant.user_id == user.id)
        )
        participant = result.scalar_one_or_none()

        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant in this case"
            )

        try:
            # Mark approval based on role
            if participant.role == "petitioner":
                if agreement.petitioner_approved:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="You have already approved this agreement"
                    )
                agreement.petitioner_approved = True
                agreement.petitioner_approved_at = datetime.utcnow()

            elif participant.role == "respondent":
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
        Generate a quick, plain-English summary of an agreement for dashboard display.

        Uses Claude API to create a parent-friendly summary from the agreement sections.

        Args:
            agreement_id: ID of the agreement
            user: Current user

        Returns:
            Dict with summary, key_points, completion_percentage, status
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

        # Build section content for AI
        section_content = []
        for section in sections:
            if section.is_completed and section.content:
                section_content.append(f"## {section.section_title}\n{section.content}")

        sections_text = "\n\n".join(section_content)

        # Call OpenAI API for summary
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=500,
                messages=[
                    {
                        "role": "user",
                        "content": f"""Generate a brief, parent-friendly summary of this custody agreement.

The summary should be:
- 2-3 sentences maximum
- Written in plain English (no legal jargon)
- Focus on the practical arrangement (who has the kids when)
- Warm but professional tone

Also provide 3-4 key points as bullet points (very short, 5-8 words each).

Agreement sections:
{sections_text}

Return your response in this exact format:
SUMMARY: [Your 2-3 sentence summary here]
KEY_POINTS:
- [Point 1]
- [Point 2]
- [Point 3]"""
                    }
                ]
            )

            # Parse response
            response_text = response.choices[0].message.content

            # Extract summary and key points
            summary = ""
            key_points = []

            if "SUMMARY:" in response_text:
                parts = response_text.split("KEY_POINTS:")
                summary = parts[0].replace("SUMMARY:", "").strip()

                if len(parts) > 1:
                    points_text = parts[1].strip()
                    for line in points_text.split("\n"):
                        line = line.strip()
                        if line.startswith("-"):
                            key_points.append(line[1:].strip())

            # Fallback if parsing fails
            if not summary:
                summary = f"A {agreement.status} custody agreement covering {completed_sections} of {total_sections} sections."

            if not key_points:
                key_points = [
                    f"{completed_sections} sections completed",
                    f"Status: {agreement.status}"
                ]

            return {
                "summary": summary,
                "key_points": key_points[:4],  # Max 4 points
                "completion_percentage": completion_percentage,
                "status": agreement.status
            }

        except Exception as e:
            # Fallback summary if AI fails
            return {
                "summary": f"A {agreement.status} parenting agreement with {completed_sections} of {total_sections} sections completed.",
                "key_points": [
                    f"{completed_sections} sections completed",
                    f"Agreement status: {agreement.status}",
                    "Review sections for details"
                ],
                "completion_percentage": completion_percentage,
                "status": agreement.status
            }

    async def create_agreement_for_family_file(
        self,
        family_file_id: str,
        title: str,
        agreement_type: str,
        user: User
    ) -> Agreement:
        """
        Create a new SharedCare Agreement for a Family File.

        Initializes agreement with 18 section templates.

        Args:
            family_file_id: ID of the Family File
            title: Agreement title
            agreement_type: Type of agreement (shared_care)
            user: User creating the agreement

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

            return agreement

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create agreement: {str(e)}"
            ) from e

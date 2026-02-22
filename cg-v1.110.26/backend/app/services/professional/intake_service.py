"""
Professional intake service layer.

Business logic for managing intake sessions from the professional portal,
including session creation, transcript retrieval, and review workflows.
"""

from datetime import datetime, timedelta
import secrets
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.intake import IntakeSession, IntakeStatus
from app.models.professional import (
    ProfessionalProfile,
    CaseAssignment,
    Firm,
    FirmMembership,
    AssignmentStatus,
    MembershipStatus,
)
from app.models.family_file import FamilyFile
from app.models.user import User


# =============================================================================
# Intake Service
# =============================================================================

class ProfessionalIntakeService:
    """Service for managing professional intake sessions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # Create Session
    # -------------------------------------------------------------------------

    async def create_session(
        self,
        professional_id: str,
        client_name: str,
        client_email: str,
        client_phone: Optional[str] = None,
        intake_type: str = "custody",
        template_id: str = "comprehensive-custody",
        notes: Optional[str] = None,
        target_forms: Optional[list[str]] = None,
        custom_questions: Optional[list[dict]] = None,
        firm_id: Optional[str] = None,
        case_assignment_id: Optional[str] = None,
        family_file_id: Optional[str] = None,
        case_id: Optional[str] = None,
        parent_id: Optional[str] = None,
    ) -> IntakeSession:
        """
        Create a new intake session.

        If the professional is creating this via a case assignment,
        links are established to the firm and assignment.
        """
        # Auto-populate target_forms from template if not explicitly provided
        from app.services.intake_templates import get_intake_template
        template = get_intake_template(template_id)
        if not target_forms and template:
            target_forms = template.form_targets

        # Get the professional profile to find the court_professional_id
        # Note: professional_id here is the ProfessionalProfile.id
        # The IntakeSession model references court_professionals.id
        profile = await self.db.execute(
            select(ProfessionalProfile).where(
                ProfessionalProfile.id == professional_id
            )
        )
        profile = profile.scalar_one_or_none()

        # For now, we use the professional profile ID as the reference
        # In a full migration, we'd update the FK to point to professional_profiles
        court_professional_id = profile.court_professional_id if profile else None

        # If we have a case assignment, get the family file and case info
        if case_assignment_id:
            assignment = await self.db.execute(
                select(CaseAssignment).where(
                    CaseAssignment.id == case_assignment_id
                )
            )
            assignment = assignment.scalar_one_or_none()
            if assignment:
                family_file_id = family_file_id or assignment.family_file_id
                firm_id = firm_id or assignment.firm_id
                case_id = case_id or assignment.case_id

        # Find or create parent user by email if not provided
        if not parent_id and client_email:
            parent_result = await self.db.execute(
                select(User).where(User.email == client_email)
            )
            parent = parent_result.scalar_one_or_none()
            if parent:
                parent_id = parent.id
            else:
                # If user doesn't exist, we leave parent_id as None
                # They will claim the session when they sign up/login
                parent_id = None

        # Create session
        access_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=7)

        session = IntakeSession(
            id=str(uuid4()),
            case_id=case_id,
            family_file_id=family_file_id,
            professional_id=court_professional_id or professional_id,
            parent_id=parent_id,
            firm_id=firm_id,
            case_assignment_id=case_assignment_id,
            template_id=template_id,
            target_forms=target_forms or [],
            custom_questions=custom_questions,
            status=IntakeStatus.PENDING.value,
            aria_provider="openai",
            access_token=access_token,
            access_link_expires_at=expires_at,
            messages=[
                {
                    "role": "system",
                    "content": f"Intake session for {client_name}. Email: {client_email}. "
                               f"Phone: {client_phone or 'Not provided'}. "
                               f"Type: {intake_type}. Template: {template_id}. Notes: {notes or 'None'}."
                }
            ],
        )

        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)

        return session

    # -------------------------------------------------------------------------
    # List Sessions
    # -------------------------------------------------------------------------

    async def list_sessions(
        self,
        professional_id: str,
        firm_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[IntakeSession], int]:
        """
        List intake sessions for a professional.

        Supports filtering by firm, status, and search text.
        Returns tuple of (sessions, total_count).
        """
        # Get the court_professional_id for this profile
        profile = await self.db.execute(
            select(ProfessionalProfile).where(
                ProfessionalProfile.id == professional_id
            )
        )
        profile = profile.scalar_one_or_none()

        # Build query conditions
        conditions = []

        # Match either the court_professional_id or professional_id directly
        if profile and profile.court_professional_id:
            conditions.append(
                or_(
                    IntakeSession.professional_id == profile.court_professional_id,
                    IntakeSession.professional_id == professional_id,
                )
            )
        else:
            conditions.append(IntakeSession.professional_id == professional_id)

        if firm_id:
            conditions.append(IntakeSession.firm_id == firm_id)

        if status:
            conditions.append(IntakeSession.status == status)

        # Build count query
        count_query = select(func.count(IntakeSession.id)).where(and_(*conditions))
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Build list query
        list_query = (
            select(IntakeSession)
            .where(and_(*conditions))
            .order_by(desc(IntakeSession.created_at))
            .offset(skip)
            .limit(limit)
        )

        result = await self.db.execute(list_query)
        sessions = list(result.scalars().all())

        return sessions, total

    # -------------------------------------------------------------------------
    # Get Session
    # -------------------------------------------------------------------------

    async def get_session(
        self,
        session_id: str,
        professional_id: str,
    ) -> Optional[IntakeSession]:
        """
        Get a single intake session.

        Verifies the professional has access to this session.
        """
        # Get the court_professional_id for this profile
        profile = await self.db.execute(
            select(ProfessionalProfile).where(
                ProfessionalProfile.id == professional_id
            )
        )
        profile = profile.scalar_one_or_none()

        # Build access conditions
        access_conditions = [IntakeSession.id == session_id]

        if profile and profile.court_professional_id:
            access_conditions.append(
                or_(
                    IntakeSession.professional_id == profile.court_professional_id,
                    IntakeSession.professional_id == professional_id,
                )
            )
        else:
            access_conditions.append(IntakeSession.professional_id == professional_id)

        result = await self.db.execute(
            select(IntakeSession).where(and_(*access_conditions))
        )
        return result.scalar_one_or_none()

    async def get_session_by_token(
        self,
        access_token: str,
    ) -> Optional[IntakeSession]:
        """Get session by access token (for parent access)."""
        result = await self.db.execute(
            select(IntakeSession).where(
                IntakeSession.access_token == access_token
            )
        )
        return result.scalar_one_or_none()

    # -------------------------------------------------------------------------
    # Get Transcript
    # -------------------------------------------------------------------------

    async def get_transcript(
        self,
        session_id: str,
        professional_id: str,
    ) -> Optional[list[dict]]:
        """
        Get the conversation transcript for a session.

        Returns messages in chronological order.
        """
        session = await self.get_session(session_id, professional_id)
        if not session:
            return None

        messages = session.messages or []

        # Format messages for display
        formatted = []
        for i, msg in enumerate(messages):
            formatted.append({
                "id": str(i),
                "role": msg.get("role", "unknown"),
                "content": msg.get("content", ""),
                "timestamp": msg.get("timestamp"),
            })

        return formatted

    # -------------------------------------------------------------------------
    # Get Outputs
    # -------------------------------------------------------------------------

    async def get_outputs(
        self,
        session_id: str,
        professional_id: str,
    ) -> Optional[dict]:
        """
        Get the session outputs (summary, extracted data).

        Returns structured output data for review.
        """
        session = await self.get_session(session_id, professional_id)
        if not session:
            return None

        # Parse extracted_data into structured format
        extracted_data = session.extracted_data or {}

        # Build summary object
        summary = None
        if session.aria_summary or extracted_data:
            summary = {
                "client_info": extracted_data.get("client_info", {}),
                "case_overview": session.aria_summary,
                "current_situation": extracted_data.get("current_situation", ""),
                "children": extracted_data.get("children", []),
                "goals": extracted_data.get("goals", []),
                "concerns": extracted_data.get("concerns", []),
                "recommended_actions": extracted_data.get("recommended_actions", []),
                "confidence_score": extracted_data.get("confidence_score", 0.0),
            }

        # Build extracted data sections
        sections = []
        for key, value in extracted_data.items():
            if key not in ["client_info", "children", "goals", "concerns",
                          "recommended_actions", "confidence_score"]:
                sections.append({
                    "title": key.replace("_", " ").title(),
                    "fields": self._flatten_dict(value) if isinstance(value, dict) else [
                        {"label": key, "value": str(value), "confidence": 1.0}
                    ],
                })

        return {
            "summary": summary,
            "extracted_data": {
                "sections": sections,
                "total_fields": sum(len(s.get("fields", [])) for s in sections),
                "high_confidence_count": len([
                    f for s in sections
                    for f in s.get("fields", [])
                    if f.get("confidence", 0) >= 0.8
                ]),
                "needs_review_count": len([
                    f for s in sections
                    for f in s.get("fields", [])
                    if f.get("confidence", 0) < 0.8
                ]),
            },
            "draft_form_url": session.draft_form_url,
            "draft_generated_at": session.draft_form_generated_at,
            "professional_reviewed": session.professional_reviewed,
            "professional_reviewed_at": session.professional_reviewed_at,
            "parent_confirmed": session.parent_confirmed,
            "parent_confirmed_at": session.parent_confirmed_at,
        }

    def _flatten_dict(self, d: dict, prefix: str = "") -> list[dict]:
        """Flatten a nested dict into a list of field objects."""
        fields = []
        for key, value in d.items():
            label = f"{prefix}{key}".replace("_", " ").title() if prefix else key.replace("_", " ").title()
            if isinstance(value, dict):
                fields.extend(self._flatten_dict(value, f"{key}."))
            else:
                fields.append({
                    "label": label,
                    "value": str(value) if value is not None else "",
                    "confidence": 1.0,
                })
        return fields

    # -------------------------------------------------------------------------
    # Mark Reviewed
    # -------------------------------------------------------------------------

    async def mark_reviewed(
        self,
        session_id: str,
        professional_id: str,
        notes: Optional[str] = None,
    ) -> Optional[IntakeSession]:
        """
        Mark an intake session as reviewed by the professional.
        """
        session = await self.get_session(session_id, professional_id)
        if not session:
            return None

        session.professional_reviewed = True
        session.professional_reviewed_at = datetime.utcnow()
        if notes:
            session.professional_notes = notes

        await self.db.commit()
        await self.db.refresh(session)

        return session

    # -------------------------------------------------------------------------
    # Request Clarification
    # -------------------------------------------------------------------------

    async def request_clarification(
        self,
        session_id: str,
        professional_id: str,
        request_text: str,
    ) -> Optional[IntakeSession]:
        """
        Send a clarification request to the parent.

        The parent will be prompted to provide additional information
        in the intake conversation.
        """
        session = await self.get_session(session_id, professional_id)
        if not session:
            return None

        session.clarification_requested = True
        session.clarification_request = request_text
        session.clarification_response = None  # Reset any previous response

        # Re-open the session for the parent
        if session.status == IntakeStatus.COMPLETED.value:
            session.status = IntakeStatus.IN_PROGRESS.value

        # Extend the access link expiration
        session.access_link_expires_at = datetime.utcnow() + timedelta(days=7)

        await self.db.commit()
        await self.db.refresh(session)

        # TODO: Send notification email to parent about clarification request

        return session

    # -------------------------------------------------------------------------
    # Cancel Session
    # -------------------------------------------------------------------------

    async def cancel_session(
        self,
        session_id: str,
        professional_id: str,
        reason: Optional[str] = None,
    ) -> Optional[IntakeSession]:
        """
        Cancel an intake session.
        """
        session = await self.get_session(session_id, professional_id)
        if not session:
            return None

        # Can only cancel pending or in-progress sessions
        if session.status not in [IntakeStatus.PENDING.value, IntakeStatus.IN_PROGRESS.value]:
            return None

        session.status = IntakeStatus.CANCELLED.value
        if reason:
            session.professional_notes = (session.professional_notes or "") + f"\nCancelled: {reason}"

        await self.db.commit()
        await self.db.refresh(session)

        return session

    # -------------------------------------------------------------------------
    # Resend Link
    # -------------------------------------------------------------------------

    async def resend_link(
        self,
        session_id: str,
        professional_id: str,
    ) -> Optional[dict]:
        """
        Resend the intake link to the parent.

        Generates a new access token and extends expiration.
        """
        session = await self.get_session(session_id, professional_id)
        if not session:
            return None

        # Can only resend for pending or in-progress sessions
        if session.status not in [IntakeStatus.PENDING.value, IntakeStatus.IN_PROGRESS.value]:
            return None

        # Generate new token and extend expiration
        import secrets
        session.access_token = secrets.token_urlsafe(32)
        session.access_link_expires_at = datetime.utcnow() + timedelta(days=7)

        await self.db.commit()
        await self.db.refresh(session)

        # TODO: Send email with new link

        return {
            "session_id": session.id,
            "access_token": session.access_token,
            "intake_link": session.intake_link,
            "expires_at": session.access_link_expires_at,
        }

    # -------------------------------------------------------------------------
    # Statistics
    # -------------------------------------------------------------------------

    async def get_stats(
        self,
        professional_id: str,
        firm_id: Optional[str] = None,
    ) -> dict:
        """
        Get intake statistics for the professional.
        """
        # Get the court_professional_id for this profile
        profile = await self.db.execute(
            select(ProfessionalProfile).where(
                ProfessionalProfile.id == professional_id
            )
        )
        profile = profile.scalar_one_or_none()

        # Build access conditions
        conditions = []
        if profile and profile.court_professional_id:
            conditions.append(
                or_(
                    IntakeSession.professional_id == profile.court_professional_id,
                    IntakeSession.professional_id == professional_id,
                )
            )
        else:
            conditions.append(IntakeSession.professional_id == professional_id)

        if firm_id:
            conditions.append(IntakeSession.firm_id == firm_id)

        # Count by status
        base_query = select(IntakeSession.status, func.count(IntakeSession.id)).where(
            and_(*conditions)
        ).group_by(IntakeSession.status)

        result = await self.db.execute(base_query)
        status_counts = {row[0]: row[1] for row in result.fetchall()}

        # Count needing review
        needs_review_query = select(func.count(IntakeSession.id)).where(
            and_(
                *conditions,
                IntakeSession.status == IntakeStatus.COMPLETED.value,
                IntakeSession.professional_reviewed == False,
            )
        )
        needs_review_result = await self.db.execute(needs_review_query)
        needs_review = needs_review_result.scalar() or 0

        return {
            "total": sum(status_counts.values()),
            "pending": status_counts.get(IntakeStatus.PENDING.value, 0),
            "in_progress": status_counts.get(IntakeStatus.IN_PROGRESS.value, 0),
            "completed": status_counts.get(IntakeStatus.COMPLETED.value, 0),
            "needs_review": needs_review,
            "expired": status_counts.get(IntakeStatus.EXPIRED.value, 0),
            "cancelled": status_counts.get(IntakeStatus.CANCELLED.value, 0),
        }

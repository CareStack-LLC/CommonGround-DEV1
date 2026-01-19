"""
Professional dashboard service layer.

Business logic for aggregating dashboard data across all
assigned cases for a professional.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import (
    ProfessionalProfile,
    CaseAssignment,
    ProfessionalAccessRequest,
    ProfessionalMessage,
    Firm,
    FirmMembership,
    MembershipStatus,
    AssignmentStatus,
    AccessRequestStatus,
)
from app.models.family_file import FamilyFile
from app.models.schedule import ScheduleEvent
from app.models.intake import IntakeSession, IntakeStatus
from app.models.court import CourtEvent


# =============================================================================
# Dashboard Service
# =============================================================================

class ProfessionalDashboardService:
    """Service for aggregating professional dashboard data."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # Main Dashboard
    # -------------------------------------------------------------------------

    async def get_dashboard(
        self,
        professional_id: str,
        firm_id: Optional[str] = None,
    ) -> dict:
        """
        Get aggregated dashboard data for a professional.

        Returns counts, alerts, and recent activity across all assigned cases.
        """
        # Get case count
        case_count = await self._get_active_case_count(professional_id, firm_id)

        # Get pending intakes
        pending_intakes = await self._get_pending_intake_count(professional_id)

        # Get pending approvals (access requests)
        pending_approvals = await self._get_pending_approval_count(professional_id)

        # Get unread messages
        unread_messages = await self._get_unread_message_count(professional_id)

        # Get upcoming events (next 7 days)
        upcoming_events = await self.get_upcoming_events(professional_id, days=7)

        # Get alerts
        alerts = await self.get_alerts(professional_id)

        # Get recent activity
        recent_activity = await self.get_recent_activity(professional_id, limit=10)

        return {
            "case_count": case_count,
            "pending_intakes": pending_intakes,
            "pending_approvals": pending_approvals,
            "unread_messages": unread_messages,
            "upcoming_events": upcoming_events,
            "alerts": alerts,
            "recent_activity": recent_activity,
        }

    # -------------------------------------------------------------------------
    # Alerts
    # -------------------------------------------------------------------------

    async def get_alerts(
        self,
        professional_id: str,
    ) -> list[dict]:
        """
        Get active alerts for a professional.

        Alerts include:
        - Court deadlines approaching
        - Intake sessions pending review
        - Access requests waiting for response
        - Compliance issues
        """
        alerts = []

        # Get intakes pending review
        pending_intakes = await self._get_intakes_pending_review(professional_id)
        for intake in pending_intakes:
            alerts.append({
                "type": "intake_pending",
                "severity": "medium",
                "title": "Intake pending review",
                "message": f"Intake {intake.session_number} is ready for review",
                "resource_type": "intake",
                "resource_id": intake.id,
                "created_at": intake.completed_at or intake.created_at,
            })

        # Get pending access requests
        pending_requests = await self._get_pending_access_requests(professional_id)
        for request in pending_requests:
            alerts.append({
                "type": "access_request",
                "severity": "medium",
                "title": "Case invitation pending",
                "message": "You have a pending case invitation",
                "resource_type": "access_request",
                "resource_id": request.id,
                "created_at": request.created_at,
            })

        # Get upcoming court events
        upcoming_court_events = await self._get_upcoming_court_events(
            professional_id, days=3
        )
        for event in upcoming_court_events:
            severity = "high" if event.get("is_mandatory") else "medium"
            alerts.append({
                "type": "court_event",
                "severity": severity,
                "title": f"Court event: {event.get('title', 'Upcoming hearing')}",
                "message": f"Scheduled for {event.get('event_date')}",
                "resource_type": "court_event",
                "resource_id": event.get("id"),
                "created_at": datetime.utcnow(),
            })

        # Sort by severity and date
        severity_order = {"high": 0, "medium": 1, "low": 2}
        alerts.sort(key=lambda x: (severity_order.get(x["severity"], 2), x["created_at"]))

        return alerts

    # -------------------------------------------------------------------------
    # Pending Actions
    # -------------------------------------------------------------------------

    async def get_pending_actions(
        self,
        professional_id: str,
    ) -> list[dict]:
        """
        Get items requiring the professional's attention.
        """
        actions = []

        # Intakes needing review
        pending_intakes = await self._get_intakes_pending_review(professional_id)
        for intake in pending_intakes:
            actions.append({
                "action_type": "review_intake",
                "title": f"Review intake {intake.session_number}",
                "description": "Parent has completed intake, ready for review",
                "priority": "medium",
                "resource_type": "intake",
                "resource_id": intake.id,
            })

        # Access requests to respond to
        pending_requests = await self._get_pending_access_requests(professional_id)
        for request in pending_requests:
            actions.append({
                "action_type": "respond_invitation",
                "title": "Respond to case invitation",
                "description": "A parent has invited you to their case",
                "priority": "medium",
                "resource_type": "access_request",
                "resource_id": request.id,
            })

        return actions

    # -------------------------------------------------------------------------
    # Upcoming Events
    # -------------------------------------------------------------------------

    async def get_upcoming_events(
        self,
        professional_id: str,
        days: int = 7,
    ) -> list[dict]:
        """
        Get upcoming events across all assigned cases.

        Includes:
        - Court hearings
        - Scheduled exchanges (if in scope)
        - Important deadlines
        """
        events = []

        # Get case IDs for the professional
        case_ids = await self._get_assigned_family_file_ids(professional_id)
        if not case_ids:
            return events

        # Get court events
        court_events = await self._get_upcoming_court_events(professional_id, days)
        events.extend(court_events)

        # Get scheduled exchanges (if professional has schedule scope)
        # This would query schedule_events table for the assigned cases
        # For now, we'll skip this to keep the implementation simpler

        # Sort by date
        events.sort(key=lambda x: x.get("event_date", datetime.max))

        return events

    # -------------------------------------------------------------------------
    # Recent Activity
    # -------------------------------------------------------------------------

    async def get_recent_activity(
        self,
        professional_id: str,
        limit: int = 20,
    ) -> list[dict]:
        """
        Get recent activity across all assigned cases.

        Includes:
        - New messages
        - Intake completions
        - Case updates
        """
        activity = []

        # Get recent intakes
        recent_intakes = await self._get_recent_intakes(professional_id, limit=5)
        for intake in recent_intakes:
            activity.append({
                "activity_type": "intake_completed" if intake.status == IntakeStatus.COMPLETED.value else "intake_updated",
                "title": f"Intake {intake.session_number}",
                "description": f"Status: {intake.status}",
                "timestamp": intake.updated_at,
                "resource_type": "intake",
                "resource_id": intake.id,
            })

        # Get recent professional messages
        recent_messages = await self._get_recent_messages(professional_id, limit=5)
        for msg in recent_messages:
            activity.append({
                "activity_type": "message_received",
                "title": msg.subject or "New message",
                "description": "From client",
                "timestamp": msg.sent_at,
                "resource_type": "professional_message",
                "resource_id": msg.id,
            })

        # Sort by timestamp
        activity.sort(key=lambda x: x["timestamp"], reverse=True)

        return activity[:limit]

    # -------------------------------------------------------------------------
    # Case Summary
    # -------------------------------------------------------------------------

    async def get_case_summary_cards(
        self,
        professional_id: str,
        status: Optional[AssignmentStatus] = None,
        limit: int = 50,
    ) -> list[dict]:
        """
        Get case summary cards for the professional's dashboard.

        Each card includes:
        - Family file info
        - Assignment role
        - Recent activity indicator
        - Key metrics
        """
        from app.services.professional.assignment_service import CaseAssignmentService

        assignment_service = CaseAssignmentService(self.db)
        assignments = await assignment_service.list_assignments_for_professional(
            professional_id,
            status=status,
            include_inactive=status is not None,
        )

        cards = []
        for assignment in assignments[:limit]:
            family_file = assignment.family_file
            if not family_file:
                continue

            card = {
                "assignment_id": assignment.id,
                "family_file_id": family_file.id,
                "file_number": family_file.file_number,
                "assignment_role": assignment.assignment_role,
                "representing": assignment.representing,
                "status": assignment.status,
                "assigned_at": assignment.assigned_at,
                "access_scopes": assignment.access_scopes,
                # Would populate with actual data in production
                "has_unread_messages": False,
                "pending_actions_count": 0,
            }
            cards.append(card)

        return cards

    # -------------------------------------------------------------------------
    # Private Helpers - Counts
    # -------------------------------------------------------------------------

    async def _get_active_case_count(
        self,
        professional_id: str,
        firm_id: Optional[str] = None,
    ) -> int:
        """Count active case assignments."""
        query = select(func.count(CaseAssignment.id)).where(
            and_(
                CaseAssignment.professional_id == professional_id,
                CaseAssignment.status == AssignmentStatus.ACTIVE.value,
            )
        )
        if firm_id:
            query = query.where(CaseAssignment.firm_id == firm_id)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_pending_intake_count(
        self,
        professional_id: str,
    ) -> int:
        """Count intakes pending review."""
        result = await self.db.execute(
            select(func.count(IntakeSession.id)).where(
                and_(
                    IntakeSession.professional_id == professional_id,
                    IntakeSession.status == IntakeStatus.COMPLETED.value,
                    IntakeSession.professional_reviewed == False,
                )
            )
        )
        return result.scalar() or 0

    async def _get_pending_approval_count(
        self,
        professional_id: str,
    ) -> int:
        """Count pending access requests."""
        result = await self.db.execute(
            select(func.count(ProfessionalAccessRequest.id)).where(
                and_(
                    ProfessionalAccessRequest.professional_id == professional_id,
                    ProfessionalAccessRequest.status == AccessRequestStatus.PENDING.value,
                    ProfessionalAccessRequest.requested_by == "parent",
                )
            )
        )
        return result.scalar() or 0

    async def _get_unread_message_count(
        self,
        professional_id: str,
    ) -> int:
        """Count unread professional messages."""
        # Get the user_id from the professional profile
        result = await self.db.execute(
            select(ProfessionalProfile.user_id).where(
                ProfessionalProfile.id == professional_id
            )
        )
        user_id = result.scalar_one_or_none()
        if not user_id:
            return 0

        result = await self.db.execute(
            select(func.count(ProfessionalMessage.id)).where(
                and_(
                    ProfessionalMessage.recipient_id == user_id,
                    ProfessionalMessage.is_read == False,
                )
            )
        )
        return result.scalar() or 0

    # -------------------------------------------------------------------------
    # Private Helpers - Queries
    # -------------------------------------------------------------------------

    async def _get_assigned_family_file_ids(
        self,
        professional_id: str,
    ) -> list[str]:
        """Get IDs of family files assigned to the professional."""
        result = await self.db.execute(
            select(CaseAssignment.family_file_id).where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.status == AssignmentStatus.ACTIVE.value,
                )
            )
        )
        return [row[0] for row in result.fetchall()]

    async def _get_intakes_pending_review(
        self,
        professional_id: str,
    ) -> list[IntakeSession]:
        """Get intakes that need professional review."""
        result = await self.db.execute(
            select(IntakeSession).where(
                and_(
                    IntakeSession.professional_id == professional_id,
                    IntakeSession.status == IntakeStatus.COMPLETED.value,
                    IntakeSession.professional_reviewed == False,
                )
            )
            .order_by(IntakeSession.completed_at.desc())
            .limit(10)
        )
        return list(result.scalars().all())

    async def _get_pending_access_requests(
        self,
        professional_id: str,
    ) -> list[ProfessionalAccessRequest]:
        """Get pending access requests (invitations from parents)."""
        result = await self.db.execute(
            select(ProfessionalAccessRequest).where(
                and_(
                    ProfessionalAccessRequest.professional_id == professional_id,
                    ProfessionalAccessRequest.status == AccessRequestStatus.PENDING.value,
                    ProfessionalAccessRequest.requested_by == "parent",
                )
            )
            .order_by(ProfessionalAccessRequest.created_at.desc())
        )
        return list(result.scalars().all())

    async def _get_upcoming_court_events(
        self,
        professional_id: str,
        days: int = 7,
    ) -> list[dict]:
        """Get upcoming court events for assigned cases."""
        case_ids = await self._get_assigned_family_file_ids(professional_id)
        if not case_ids:
            return []

        cutoff = datetime.utcnow() + timedelta(days=days)

        # Query CourtEvent for the family files
        result = await self.db.execute(
            select(CourtEvent).where(
                and_(
                    CourtEvent.case_id.in_(case_ids),  # Note: CourtEvent uses case_id
                    CourtEvent.event_date <= cutoff,
                    CourtEvent.event_date >= datetime.utcnow(),
                )
            )
            .order_by(CourtEvent.event_date.asc())
            .limit(20)
        )

        events = []
        for event in result.scalars().all():
            events.append({
                "id": event.id,
                "title": event.title,
                "event_type": event.event_type,
                "event_date": event.event_date,
                "start_time": event.start_time,
                "is_mandatory": event.is_mandatory,
                "case_id": event.case_id,
            })

        return events

    async def _get_recent_intakes(
        self,
        professional_id: str,
        limit: int = 5,
    ) -> list[IntakeSession]:
        """Get recent intakes for the professional."""
        result = await self.db.execute(
            select(IntakeSession).where(
                IntakeSession.professional_id == professional_id
            )
            .order_by(IntakeSession.updated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def _get_recent_messages(
        self,
        professional_id: str,
        limit: int = 5,
    ) -> list[ProfessionalMessage]:
        """Get recent messages to/from the professional."""
        # Get the user_id from the professional profile
        result = await self.db.execute(
            select(ProfessionalProfile.user_id).where(
                ProfessionalProfile.id == professional_id
            )
        )
        user_id = result.scalar_one_or_none()
        if not user_id:
            return []

        result = await self.db.execute(
            select(ProfessionalMessage).where(
                or_(
                    ProfessionalMessage.sender_id == user_id,
                    ProfessionalMessage.recipient_id == user_id,
                )
            )
            .order_by(ProfessionalMessage.sent_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

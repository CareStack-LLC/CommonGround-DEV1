"""
Case timeline service layer.

Business logic for generating chronological event feeds
for cases, used by professionals to understand case history.
"""

from datetime import datetime, timedelta
from typing import Optional
from enum import Enum

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import (
    CaseAssignment,
    ProfessionalAccessLog,
    ProfessionalMessage,
    AssignmentStatus,
)
from app.models.family_file import FamilyFile
from app.models.message import Message, MessageFlag
from app.models.schedule import ScheduleEvent, ExchangeCheckIn
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.agreement import Agreement, AgreementVersion
from app.models.court import CourtEvent
from app.models.intake import IntakeSession
from app.models.payment import Payment, ExpenseRequest


class TimelineEventType(str, Enum):
    """Types of events in a case timeline."""
    MESSAGE = "message"
    MESSAGE_FLAGGED = "message_flagged"
    EXCHANGE_SCHEDULED = "exchange_scheduled"
    EXCHANGE_COMPLETED = "exchange_completed"
    EXCHANGE_MISSED = "exchange_missed"
    AGREEMENT_CREATED = "agreement_created"
    AGREEMENT_SIGNED = "agreement_signed"
    COURT_EVENT = "court_event"
    INTAKE_COMPLETED = "intake_completed"
    PAYMENT = "payment"
    EXPENSE_REQUEST = "expense_request"
    PROFESSIONAL_ASSIGNED = "professional_assigned"
    PROFESSIONAL_MESSAGE = "professional_message"


# =============================================================================
# Timeline Service
# =============================================================================

class CaseTimelineService:
    """Service for generating case timelines."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # Main Timeline
    # -------------------------------------------------------------------------

    async def get_timeline(
        self,
        family_file_id: str,
        professional_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_types: Optional[list[TimelineEventType]] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        """
        Get a chronological timeline of events for a case.

        Args:
            family_file_id: The family file to get timeline for
            professional_id: The professional requesting (for access verification)
            start_date: Filter events after this date
            end_date: Filter events before this date
            event_types: Filter to specific event types
            limit: Maximum number of events
            offset: Pagination offset

        Returns:
            Dict with events list and metadata
        """
        # Verify professional has access
        assignment = await self._get_assignment(professional_id, family_file_id)
        if not assignment or not assignment.is_active:
            raise ValueError("Professional does not have access to this case")

        # Get events based on scopes
        events = []
        scopes = assignment.access_scopes or []

        # Collect events from various sources
        if not event_types or TimelineEventType.MESSAGE in event_types:
            if "messages" in scopes:
                messages = await self._get_message_events(
                    family_file_id, start_date, end_date
                )
                events.extend(messages)

        if not event_types or TimelineEventType.EXCHANGE_COMPLETED in event_types:
            if "schedule" in scopes or "checkins" in scopes:
                exchanges = await self._get_exchange_events(
                    family_file_id, start_date, end_date
                )
                events.extend(exchanges)

        if not event_types or TimelineEventType.AGREEMENT_CREATED in event_types:
            if "agreement" in scopes:
                agreements = await self._get_agreement_events(
                    family_file_id, start_date, end_date
                )
                events.extend(agreements)

        if not event_types or TimelineEventType.COURT_EVENT in event_types:
            court_events = await self._get_court_events(
                family_file_id, start_date, end_date
            )
            events.extend(court_events)

        if not event_types or TimelineEventType.INTAKE_COMPLETED in event_types:
            intakes = await self._get_intake_events(
                family_file_id, start_date, end_date
            )
            events.extend(intakes)

        if not event_types or TimelineEventType.PAYMENT in event_types:
            if "financials" in scopes:
                payments = await self._get_payment_events(
                    family_file_id, start_date, end_date
                )
                events.extend(payments)

        if not event_types or TimelineEventType.PROFESSIONAL_MESSAGE in event_types:
            prof_messages = await self._get_professional_message_events(
                family_file_id, start_date, end_date
            )
            events.extend(prof_messages)

        # Sort by timestamp descending (most recent first)
        events.sort(key=lambda x: x["timestamp"], reverse=True)

        # Apply pagination
        total_count = len(events)
        paginated_events = events[offset:offset + limit]

        # Get family file info for response
        family_file = await self._get_family_file(family_file_id)
        family_file_title = family_file.family_file_number if family_file else "Unknown"

        return {
            "family_file_id": family_file_id,
            "family_file_title": family_file_title,
            "total_events": total_count,
            "events": paginated_events,
            "date_start": start_date,
            "date_end": end_date,
            "event_types": [e.value for e in event_types] if event_types else None,
        }

    async def get_timeline_summary(
        self,
        family_file_id: str,
        professional_id: str,
        days: int = 30,
    ) -> dict:
        """
        Get a summary of timeline activity for a case.

        Returns counts and highlights for the specified period.
        """
        assignment = await self._get_assignment(professional_id, family_file_id)
        if not assignment or not assignment.is_active:
            raise ValueError("Professional does not have access to this case")

        start_date = datetime.utcnow() - timedelta(days=days)
        scopes = assignment.access_scopes or []

        summary = {
            "period_days": days,
            "message_count": 0,
            "flagged_message_count": 0,
            "exchange_count": 0,
            "missed_exchange_count": 0,
            "agreement_updates": 0,
            "court_events": 0,
            "payment_count": 0,
        }

        if "messages" in scopes:
            summary["message_count"] = await self._count_messages(
                family_file_id, start_date
            )
            summary["flagged_message_count"] = await self._count_flagged_messages(
                family_file_id, start_date
            )

        if "schedule" in scopes or "checkins" in scopes:
            summary["exchange_count"] = await self._count_exchanges(
                family_file_id, start_date
            )
            summary["missed_exchange_count"] = await self._count_missed_exchanges(
                family_file_id, start_date
            )

        if "agreement" in scopes:
            summary["agreement_updates"] = await self._count_agreement_updates(
                family_file_id, start_date
            )

        summary["court_events"] = await self._count_court_events(
            family_file_id, start_date
        )

        if "financials" in scopes:
            summary["payment_count"] = await self._count_payments(
                family_file_id, start_date
            )

        return summary

    # -------------------------------------------------------------------------
    # Export Timeline
    # -------------------------------------------------------------------------

    async def export_timeline(
        self,
        family_file_id: str,
        professional_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        format: str = "json",
    ) -> dict:
        """
        Export timeline data for court documentation.

        Returns structured data suitable for PDF generation.
        """
        timeline = await self.get_timeline(
            family_file_id,
            professional_id,
            start_date=start_date,
            end_date=end_date,
            limit=1000,  # Higher limit for export
        )

        # Get family file info
        family_file = await self._get_family_file(family_file_id)

        export_data = {
            "family_file": {
                "id": family_file.id,
                "file_number": family_file.family_file_number,
            } if family_file else None,
            "export_date": datetime.utcnow().isoformat(),
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
            },
            "event_count": timeline["total_count"],
            "events": timeline["events"],
        }

        return export_data

    # -------------------------------------------------------------------------
    # Event Fetchers
    # -------------------------------------------------------------------------

    async def _get_message_events(
        self,
        family_file_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> list[dict]:
        """Get message events from parent-to-parent communication."""
        # Query messages directly by family_file_id
        query = select(Message).where(Message.family_file_id == family_file_id)

        if start_date:
            query = query.where(Message.created_at >= start_date)
        if end_date:
            query = query.where(Message.created_at <= end_date)

        query = query.order_by(desc(Message.created_at)).limit(200)
        result = await self.db.execute(query)

        events = []
        for msg in result.scalars().all():
            event_type = TimelineEventType.MESSAGE_FLAGGED if msg.was_flagged else TimelineEventType.MESSAGE
            events.append({
                "id": f"msg-{msg.id}",
                "event_type": event_type.value,
                "timestamp": msg.created_at,
                "title": "Message flagged by ARIA" if msg.was_flagged else "Message sent",
                "description": msg.content[:200] + "..." if len(msg.content) > 200 else msg.content,
                "is_flagged": msg.was_flagged,
                "details": {
                    "message_id": msg.id,
                    "sender_id": msg.sender_id,
                },
            })

        return events

    async def _get_exchange_events(
        self,
        family_file_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> list[dict]:
        """Get custody exchange events."""
        query = (
            select(CustodyExchangeInstance)
            .join(CustodyExchange)
            .where(CustodyExchange.family_file_id == family_file_id)
        )

        if start_date:
            query = query.where(CustodyExchangeInstance.scheduled_time >= start_date)
        if end_date:
            query = query.where(CustodyExchangeInstance.scheduled_time <= end_date)

        query = query.order_by(desc(CustodyExchangeInstance.scheduled_time)).limit(100)
        result = await self.db.execute(query)

        events = []
        for instance in result.scalars().all():
            if instance.status == "completed":
                event_type = TimelineEventType.EXCHANGE_COMPLETED
                title = "Exchange completed"
            elif instance.status == "missed":
                event_type = TimelineEventType.EXCHANGE_MISSED
                title = "Exchange missed"
            else:
                event_type = TimelineEventType.EXCHANGE_SCHEDULED
                title = "Exchange scheduled"

            events.append({
                "id": f"exch-{instance.id}",
                "event_type": event_type.value,
                "timestamp": instance.actual_time or instance.scheduled_time,
                "title": title,
                "description": f"Exchange at {instance.scheduled_time}",
                "is_flagged": instance.status == "missed",
                "details": {
                    "instance_id": instance.id,
                    "exchange_id": instance.custody_exchange_id,
                    "status": instance.status,
                },
            })

        return events

    async def _get_agreement_events(
        self,
        family_file_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> list[dict]:
        """Get agreement events."""
        # Query agreements by family_file_id
        query = select(Agreement).where(Agreement.family_file_id == family_file_id)

        if start_date:
            query = query.where(Agreement.created_at >= start_date)
        if end_date:
            query = query.where(Agreement.created_at <= end_date)

        query = query.order_by(desc(Agreement.created_at)).limit(50)
        result = await self.db.execute(query)

        events = []
        for agreement in result.scalars().all():
            events.append({
                "id": f"agr-{agreement.id}",
                "event_type": TimelineEventType.AGREEMENT_CREATED.value,
                "timestamp": agreement.created_at,
                "title": f"Agreement: {agreement.title or 'Untitled'}",
                "description": f"Status: {agreement.status}",
                "is_flagged": False,
                "details": {
                    "agreement_id": agreement.id,
                    "agreement_type": agreement.agreement_type,
                    "status": agreement.status,
                },
            })

        return events

    async def _get_court_events(
        self,
        family_file_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> list[dict]:
        """Get court events."""
        # CourtEvent doesn't have family_file_id yet, return empty for now
        # TODO: Add family_file_id to CourtEvent model
        return []

    async def _get_intake_events(
        self,
        family_file_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> list[dict]:
        """Get intake session events."""
        query = select(IntakeSession).where(
            IntakeSession.family_file_id == family_file_id
        )

        if start_date:
            query = query.where(IntakeSession.created_at >= start_date)
        if end_date:
            query = query.where(IntakeSession.created_at <= end_date)

        query = query.order_by(desc(IntakeSession.created_at)).limit(20)
        result = await self.db.execute(query)

        events = []
        for intake in result.scalars().all():
            if intake.status == "completed":
                events.append({
                    "id": f"int-{intake.id}",
                    "event_type": TimelineEventType.INTAKE_COMPLETED.value,
                    "timestamp": intake.completed_at or intake.updated_at,
                    "title": f"Intake {intake.session_number} completed",
                    "description": f"Target forms: {', '.join(intake.target_forms or [])}",
                    "is_flagged": False,
                    "details": {
                        "session_id": intake.id,
                        "session_number": intake.session_number,
                        "status": intake.status,
                    },
                })

        return events

    async def _get_payment_events(
        self,
        family_file_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> list[dict]:
        """Get payment and expense events."""
        events = []

        # Get payments by family_file_id
        query = select(Payment).where(Payment.family_file_id == family_file_id)
        if start_date:
            query = query.where(Payment.created_at >= start_date)
        if end_date:
            query = query.where(Payment.created_at <= end_date)
        query = query.order_by(desc(Payment.created_at)).limit(50)

        result = await self.db.execute(query)
        for payment in result.scalars().all():
            events.append({
                "id": f"pay-{payment.id}",
                "event_type": TimelineEventType.PAYMENT.value,
                "timestamp": payment.created_at,
                "title": f"Payment: ${payment.amount:.2f}",
                "description": payment.description or "Payment recorded",
                "is_flagged": False,
                "details": {
                    "payment_id": payment.id,
                    "amount": float(payment.amount),
                    "status": payment.status,
                },
            })

        # TODO: ExpenseRequest doesn't have family_file_id yet, skipping for now
        # Once added, query by ExpenseRequest.family_file_id == family_file_id

        return events

    async def _get_professional_message_events(
        self,
        family_file_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> list[dict]:
        """Get professional-client message events."""
        query = select(ProfessionalMessage).where(
            ProfessionalMessage.family_file_id == family_file_id
        )

        if start_date:
            query = query.where(ProfessionalMessage.sent_at >= start_date)
        if end_date:
            query = query.where(ProfessionalMessage.sent_at <= end_date)

        query = query.order_by(desc(ProfessionalMessage.sent_at)).limit(50)
        result = await self.db.execute(query)

        events = []
        for msg in result.scalars().all():
            events.append({
                "id": f"pmsg-{msg.id}",
                "event_type": TimelineEventType.PROFESSIONAL_MESSAGE.value,
                "timestamp": msg.sent_at,
                "title": msg.subject or "Professional message",
                "description": msg.content[:200] + "..." if len(msg.content) > 200 else msg.content,
                "is_flagged": False,
                "details": {
                    "message_id": msg.id,
                    "sender_type": msg.sender_type,
                    "is_read": msg.is_read,
                },
            })

        return events

    # -------------------------------------------------------------------------
    # Count Helpers
    # -------------------------------------------------------------------------

    async def _count_messages(
        self,
        family_file_id: str,
        since: datetime,
    ) -> int:
        result = await self.db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.family_file_id == family_file_id,
                    Message.created_at >= since,
                )
            )
        )
        return result.scalar() or 0

    async def _count_flagged_messages(
        self,
        family_file_id: str,
        since: datetime,
    ) -> int:
        result = await self.db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.family_file_id == family_file_id,
                    Message.created_at >= since,
                    Message.was_flagged == True,
                )
            )
        )
        return result.scalar() or 0

    async def _count_exchanges(
        self,
        family_file_id: str,
        since: datetime,
    ) -> int:
        result = await self.db.execute(
            select(func.count(CustodyExchangeInstance.id))
            .join(CustodyExchange)
            .where(
                and_(
                    CustodyExchange.family_file_id == family_file_id,
                    CustodyExchangeInstance.scheduled_time >= since,
                )
            )
        )
        return result.scalar() or 0

    async def _count_missed_exchanges(
        self,
        family_file_id: str,
        since: datetime,
    ) -> int:
        result = await self.db.execute(
            select(func.count(CustodyExchangeInstance.id))
            .join(CustodyExchange)
            .where(
                and_(
                    CustodyExchange.family_file_id == family_file_id,
                    CustodyExchangeInstance.scheduled_time >= since,
                    CustodyExchangeInstance.status == "missed",
                )
            )
        )
        return result.scalar() or 0

    async def _count_agreement_updates(
        self,
        family_file_id: str,
        since: datetime,
    ) -> int:
        result = await self.db.execute(
            select(func.count(Agreement.id)).where(
                and_(
                    Agreement.family_file_id == family_file_id,
                    Agreement.updated_at >= since,
                )
            )
        )
        return result.scalar() or 0

    async def _count_court_events(
        self,
        family_file_id: str,
        since: datetime,
    ) -> int:
        # CourtEvent doesn't have family_file_id yet
        return 0

    async def _count_payments(
        self,
        family_file_id: str,
        since: datetime,
    ) -> int:
        result = await self.db.execute(
            select(func.count(Payment.id)).where(
                and_(
                    Payment.family_file_id == family_file_id,
                    Payment.created_at >= since,
                )
            )
        )
        return result.scalar() or 0

    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------

    async def _get_assignment(
        self,
        professional_id: str,
        family_file_id: str,
    ) -> Optional[CaseAssignment]:
        """Get a professional's assignment to a case."""
        result = await self.db.execute(
            select(CaseAssignment).where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.family_file_id == family_file_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def _get_family_file(
        self,
        family_file_id: str,
    ) -> Optional[FamilyFile]:
        """Get a family file by ID."""
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        return result.scalar_one_or_none()

"""
Dashboard service - aggregates activity data for dashboard display.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.user import User
from app.models.family_file import FamilyFile, QuickAccord
from app.models.message import Message
from app.models.clearfund import Obligation
from app.models.agreement import Agreement
from app.models.schedule import ScheduleEvent
from app.models.court import CourtMessage
from app.models.child import Child
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.schemas.dashboard import (
    DashboardSummary,
    PendingExpense,
    UnreadMessage,
    PendingAgreement,
    CourtNotification,
    UpcomingEvent,
    RecentActivity,
)
from app.services.activity import ActivityService


class DashboardService:
    """Service for aggregating dashboard activity data."""

    @staticmethod
    async def get_dashboard_summary(
        db: AsyncSession,
        family_file_id: str,
        user: User
    ) -> DashboardSummary:
        """
        Get aggregated dashboard data for a family file.

        Aggregates:
        - Pending expenses (obligations with status='pending')
        - Unread messages (read_at is NULL, user is recipient)
        - Agreements needing approval (pending_approval, user hasn't approved)
        - Court notifications (unread by user)
        - Upcoming events (next 7 days, all categories)
        """
        # Verify user has access to family file
        family_file = await DashboardService._verify_access(db, family_file_id, user)

        # Get the other parent ID for context
        is_parent_a = str(user.id) == str(family_file.parent_a_id)

        # Fetch all data
        expenses_count, expenses = await DashboardService._get_pending_expenses(
            db, family_file, user
        )
        messages_count, messages, sender_name = await DashboardService._get_unread_messages(
            db, family_file_id, user
        )
        agreements_count, agreements = await DashboardService._get_pending_agreements(
            db, family_file_id, user, is_parent_a
        )
        court_count, court_notifications = await DashboardService._get_court_notifications(
            db, family_file, user, is_parent_a
        )
        events, next_event = await DashboardService._get_upcoming_events(
            db, family_file_id, user, family_file
        )

        # Get recent activities
        recent_activities_data = await ActivityService.get_recent_activities(
            db, family_file_id, user, limit=10
        )
        recent_activities = [
            RecentActivity(
                id=item.id,
                activity_type=item.activity_type,
                category=item.category,
                actor_name=item.actor_name,
                title=item.title,
                icon=item.icon,
                severity=item.severity,
                created_at=item.created_at,
                is_read=item.is_read,
                subject_type=item.subject_type,
                subject_id=item.subject_id,
            )
            for item in recent_activities_data.items
        ]
        unread_activity_count = recent_activities_data.unread_count

        return DashboardSummary(
            pending_expenses_count=expenses_count,
            pending_expenses=expenses,
            unread_messages_count=messages_count,
            unread_messages=messages,
            sender_name=sender_name,
            pending_agreements_count=agreements_count,
            pending_agreements=agreements,
            unread_court_count=court_count,
            court_notifications=court_notifications,
            upcoming_events=events,
            next_event=next_event,
            recent_activities=recent_activities,
            unread_activity_count=unread_activity_count,
        )

    @staticmethod
    async def _verify_access(
        db: AsyncSession,
        family_file_id: str,
        user: User
    ) -> FamilyFile:
        """Verify user has access to family file."""
        result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()

        if not family_file:
            raise HTTPException(status_code=404, detail="Family file not found")

        user_id_str = str(user.id)
        if user_id_str not in [str(family_file.parent_a_id), str(family_file.parent_b_id)]:
            raise HTTPException(status_code=403, detail="Access denied")

        return family_file

    @staticmethod
    async def _get_pending_expenses(
        db: AsyncSession,
        family_file: FamilyFile,
        user: User
    ) -> Tuple[int, List[PendingExpense]]:
        """Get pending obligations where user has an outstanding share."""
        user_id_str = str(user.id)

        # Determine if user is petitioner (parent_a) or respondent (parent_b)
        is_petitioner = str(user.id) == str(family_file.parent_a_id)

        # Build family file filter (handles legacy case_id)
        if family_file.legacy_case_id:
            family_filter = or_(
                Obligation.family_file_id == str(family_file.id),
                Obligation.case_id == str(family_file.legacy_case_id)
            )
        else:
            family_filter = Obligation.family_file_id == str(family_file.id)

        # Query open obligations where user has a share > 0
        # Petitioner uses petitioner_share, respondent uses respondent_share
        if is_petitioner:
            share_filter = Obligation.petitioner_share > 0
        else:
            share_filter = Obligation.respondent_share > 0

        query = select(Obligation).where(
            and_(
                Obligation.status == "open",
                family_filter,
                share_filter
            )
        ).order_by(desc(Obligation.created_at)).limit(5)

        result = await db.execute(query)
        obligations = result.scalars().all()

        items = []
        for obl in obligations:
            days_pending = (datetime.utcnow() - obl.created_at).days if obl.created_at else 0

            # Get creator name (who submitted this expense request)
            creator_name = None
            if obl.created_by:
                creator_result = await db.execute(
                    select(User).where(User.id == obl.created_by)
                )
                creator = creator_result.scalar_one_or_none()
                if creator:
                    creator_name = creator.first_name

            # Get the user's share amount
            user_share = float(obl.petitioner_share) if is_petitioner else float(obl.respondent_share)

            items.append(PendingExpense(
                id=str(obl.id),
                title=obl.title or obl.description or "Expense",
                amount=user_share,
                category=obl.purpose_category or "other",
                requested_by_name=creator_name,
                requested_at=obl.created_at or datetime.utcnow(),
                days_pending=days_pending,
            ))

        return len(obligations), items

    @staticmethod
    async def _get_unread_messages(
        db: AsyncSession,
        family_file_id: str,
        user: User
    ) -> Tuple[int, List[UnreadMessage], Optional[str]]:
        """Get unread messages for user in this family file."""
        user_id_str = str(user.id)

        # Count unread
        count_result = await db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.family_file_id == family_file_id,
                    Message.recipient_id == user_id_str,
                    Message.read_at.is_(None),
                    Message.is_hidden_by_recipient == False
                )
            )
        )
        unread_count = count_result.scalar() or 0

        # Get recent unread with sender info
        result = await db.execute(
            select(Message).where(
                and_(
                    Message.family_file_id == family_file_id,
                    Message.recipient_id == user_id_str,
                    Message.read_at.is_(None),
                    Message.is_hidden_by_recipient == False
                )
            ).order_by(desc(Message.sent_at)).limit(3)
        )
        messages = result.scalars().all()

        # Get sender name from first message
        sender_name = None
        items = []

        for msg in messages:
            # Get sender name
            if not sender_name and msg.sender_id:
                sender_result = await db.execute(
                    select(User).where(User.id == msg.sender_id)
                )
                sender = sender_result.scalar_one_or_none()
                if sender:
                    sender_name = sender.first_name

            content_preview = msg.content[:50] + "..." if len(msg.content) > 50 else msg.content

            items.append(UnreadMessage(
                id=str(msg.id),
                sender_id=str(msg.sender_id),
                sender_name=sender_name or "Co-parent",
                content_preview=content_preview,
                sent_at=msg.sent_at,
            ))

        return unread_count, items, sender_name

    @staticmethod
    async def _get_pending_agreements(
        db: AsyncSession,
        family_file_id: str,
        user: User,
        is_parent_a: bool
    ) -> Tuple[int, List[PendingAgreement]]:
        """Get agreements pending user's approval."""
        items = []

        # Get SharedCare Agreements pending approval where user hasn't approved
        if is_parent_a:
            agreement_filter = and_(
                Agreement.family_file_id == family_file_id,
                Agreement.status == "pending_approval",
                Agreement.petitioner_approved == False
            )
        else:
            agreement_filter = and_(
                Agreement.family_file_id == family_file_id,
                Agreement.status == "pending_approval",
                Agreement.respondent_approved == False
            )

        shared_care_result = await db.execute(
            select(Agreement).where(agreement_filter)
        )
        shared_agreements = shared_care_result.scalars().all()

        for agr in shared_agreements:
            items.append(PendingAgreement(
                id=str(agr.id),
                title=agr.title,
                agreement_type="shared_care",
                status=agr.status,
                submitted_at=agr.updated_at,
                submitted_by_name=None,
            ))

        # Get QuickAccords pending approval where user hasn't approved
        if is_parent_a:
            quick_filter = and_(
                QuickAccord.family_file_id == family_file_id,
                QuickAccord.status == "pending_approval",
                QuickAccord.parent_a_approved == False
            )
        else:
            quick_filter = and_(
                QuickAccord.family_file_id == family_file_id,
                QuickAccord.status == "pending_approval",
                QuickAccord.parent_b_approved == False
            )

        quick_accord_result = await db.execute(
            select(QuickAccord).where(quick_filter)
        )
        quick_accords = quick_accord_result.scalars().all()

        for qa in quick_accords:
            # Get initiator name
            initiator_name = None
            if qa.initiated_by:
                initiator_result = await db.execute(
                    select(User).where(User.id == qa.initiated_by)
                )
                initiator = initiator_result.scalar_one_or_none()
                if initiator:
                    initiator_name = initiator.first_name

            items.append(PendingAgreement(
                id=str(qa.id),
                title=qa.title,
                agreement_type="quick_accord",
                status=qa.status,
                submitted_at=qa.updated_at,
                submitted_by_name=initiator_name,
            ))

        return len(items), items

    @staticmethod
    async def _get_court_notifications(
        db: AsyncSession,
        family_file: FamilyFile,
        user: User,
        is_parent_a: bool
    ) -> Tuple[int, List[CourtNotification]]:
        """Get unread court messages for user."""
        # Court messages are linked to case_id
        if not family_file.legacy_case_id:
            return 0, []

        # Build read check and recipient check based on role
        if is_parent_a:
            read_check = CourtMessage.petitioner_read_at.is_(None)
            to_check = CourtMessage.to_petitioner == True
        else:
            read_check = CourtMessage.respondent_read_at.is_(None)
            to_check = CourtMessage.to_respondent == True

        result = await db.execute(
            select(CourtMessage).where(
                and_(
                    CourtMessage.case_id == family_file.legacy_case_id,
                    to_check,
                    read_check
                )
            ).order_by(desc(CourtMessage.sent_at)).limit(5)
        )
        messages = result.scalars().all()

        items = []
        for msg in messages:
            items.append(CourtNotification(
                id=str(msg.id),
                message_type=msg.message_type,
                subject=msg.subject,
                is_urgent=msg.is_urgent,
                sent_at=msg.sent_at,
            ))

        return len(messages), items

    @staticmethod
    async def _get_upcoming_events(
        db: AsyncSession,
        family_file_id: str,
        user: User,
        family_file: FamilyFile
    ) -> Tuple[List[UpcomingEvent], Optional[UpcomingEvent]]:
        """Get upcoming events for next 7 days across all categories, including custody exchanges."""
        now = datetime.utcnow()
        week_later = now + timedelta(days=7)

        # Get children for name mapping
        children_result = await db.execute(
            select(Child).where(Child.family_file_id == family_file_id)
        )
        children_map = {str(c.id): c.first_name for c in children_result.scalars().all()}

        # Determine other parent name for exchanges
        other_parent_id = None
        other_parent_name = None
        if str(user.id) == str(family_file.parent_a_id):
            other_parent_id = family_file.parent_b_id
        elif str(user.id) == str(family_file.parent_b_id):
            other_parent_id = family_file.parent_a_id

        if other_parent_id:
            from app.models.user import User as UserModel
            other_user_result = await db.execute(
                select(UserModel).where(UserModel.id == other_parent_id)
            )
            other_user = other_user_result.scalar_one_or_none()
            if other_user:
                other_parent_name = f"{other_user.first_name} {other_user.last_name or ''}".strip()

        items = []

        # Get schedule events
        events_result = await db.execute(
            select(ScheduleEvent).where(
                and_(
                    ScheduleEvent.family_file_id == family_file_id,
                    ScheduleEvent.start_time >= now,
                    ScheduleEvent.start_time <= week_later,
                    ScheduleEvent.status != "cancelled"
                )
            ).order_by(ScheduleEvent.start_time).limit(10)
        )
        events = events_result.scalars().all()

        for ev in events:
            child_ids = ev.child_ids or []
            child_names = [children_map.get(str(cid), "Unknown") for cid in child_ids]

            items.append(UpcomingEvent(
                id=str(ev.id),
                title=ev.title,
                event_category=ev.event_category or "general",
                start_time=ev.start_time,
                end_time=ev.end_time,
                location=ev.location or ev.exchange_location,
                all_day=ev.all_day if ev.all_day is not None else False,
                is_exchange=ev.is_exchange if ev.is_exchange is not None else False,
                child_names=child_names,
            ))

        # Get upcoming custody exchanges
        exchanges_result = await db.execute(
            select(CustodyExchangeInstance)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .join(CustodyExchange, CustodyExchangeInstance.exchange_id == CustodyExchange.id)
            .where(
                and_(
                    CustodyExchange.family_file_id == family_file_id,
                    CustodyExchangeInstance.scheduled_time >= now,
                    CustodyExchangeInstance.scheduled_time <= week_later,
                    CustodyExchangeInstance.status.in_(["scheduled", "pending"])
                )
            )
            .order_by(CustodyExchangeInstance.scheduled_time)
            .limit(10)
        )
        exchange_instances = exchanges_result.scalars().all()

        for inst in exchange_instances:
            exchange = inst.exchange
            child_ids = exchange.child_ids or []
            child_names = [children_map.get(str(cid), "Unknown") for cid in child_ids]

            # Calculate end time (default 30 min after start)
            end_time = inst.scheduled_time + timedelta(minutes=30) if inst.scheduled_time else None

            # Calculate viewer's role in this exchange
            # If viewer is NOT the creator, reverse the perspective
            is_creator = str(exchange.created_by) == str(user.id)
            original_pickup_ids = exchange.pickup_child_ids or []
            original_dropoff_ids = exchange.dropoff_child_ids or []

            if is_creator:
                viewer_pickup_ids = original_pickup_ids
                viewer_dropoff_ids = original_dropoff_ids
            else:
                # Reverse: creator's pickup = viewer's dropoff
                viewer_pickup_ids = original_dropoff_ids
                viewer_dropoff_ids = original_pickup_ids

            # Determine viewer's role
            has_pickups = len(viewer_pickup_ids) > 0
            has_dropoffs = len(viewer_dropoff_ids) > 0

            if has_pickups and has_dropoffs:
                viewer_role = "both"
            elif has_pickups:
                viewer_role = "pickup"
            elif has_dropoffs:
                viewer_role = "dropoff"
            else:
                # Fallback to exchange_type
                exchange_type = exchange.exchange_type
                if is_creator:
                    viewer_role = exchange_type
                else:
                    if exchange_type == "pickup":
                        viewer_role = "dropoff"
                    elif exchange_type == "dropoff":
                        viewer_role = "pickup"
                    else:
                        viewer_role = "both"

            # Generate title based on viewer's role
            if viewer_role == "pickup":
                display_title = "Pickup"
            elif viewer_role == "dropoff":
                display_title = "Dropoff"
            else:
                display_title = exchange.title or "Exchange"

            items.append(UpcomingEvent(
                id=str(inst.id),
                title=display_title,
                event_category="exchange",
                start_time=inst.scheduled_time,
                end_time=end_time,
                location=inst.override_location or exchange.location,
                all_day=False,
                is_exchange=True,
                child_names=child_names,
                viewer_role=viewer_role,
                other_parent_name=other_parent_name,
            ))

        # Sort all items by start_time and take the first 10
        items.sort(key=lambda x: x.start_time)
        items = items[:10]

        next_event = items[0] if items else None

        return items, next_event

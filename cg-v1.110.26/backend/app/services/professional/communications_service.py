"""
Communications view service layer.

Business logic for professionals to view parent-to-parent
communication history on cases they're assigned to.
"""

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import (
    CaseAssignment,
    AssignmentStatus,
)
from app.models.family_file import FamilyFile
from app.models.message import Message, MessageThread
from app.models.user import User


class CommunicationsService:
    """Service for viewing parent-to-parent communications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_communications(
        self,
        family_file_id: str,
        professional_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        sender_id: Optional[str] = None,
        flagged_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        """
        Get parent-to-parent messages for a case.

        Args:
            family_file_id: The family file to view
            professional_id: The professional requesting access
            start_date: Filter messages after this date
            end_date: Filter messages before this date
            sender_id: Filter by specific sender
            flagged_only: Only return ARIA-flagged messages
            limit: Max results
            offset: Pagination offset

        Returns:
            Dict with messages and metadata
        """
        # Verify professional has access
        await self._verify_access(professional_id, family_file_id)

        # Build query for parent-to-parent messages
        query = (
            select(Message)
            .where(Message.family_file_id == family_file_id)
        )

        if start_date:
            query = query.where(Message.created_at >= start_date)
        if end_date:
            query = query.where(Message.created_at <= end_date)
        if sender_id:
            query = query.where(Message.sender_id == sender_id)
        if flagged_only:
            query = query.where(Message.was_flagged == True)

        # Count total
        count_query = select(func.count(Message.id)).where(
            Message.family_file_id == family_file_id
        )
        if start_date:
            count_query = count_query.where(Message.created_at >= start_date)
        if end_date:
            count_query = count_query.where(Message.created_at <= end_date)
        if sender_id:
            count_query = count_query.where(Message.sender_id == sender_id)
        if flagged_only:
            count_query = count_query.where(Message.was_flagged == True)

        count_result = await self.db.execute(count_query)
        total_count = count_result.scalar() or 0

        # Get paginated results
        query = query.order_by(desc(Message.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)

        messages = []
        for msg in result.scalars().all():
            messages.append({
                "id": msg.id,
                "sender_id": msg.sender_id,
                "recipient_id": msg.recipient_id,
                "content": msg.content,
                "sent_at": msg.sent_at,
                "created_at": msg.created_at,
                "is_read": msg.is_read,
                "read_at": msg.read_at,
                "was_flagged": msg.was_flagged,
                "original_content": msg.original_content,
                "thread_id": msg.thread_id,
            })

        return {
            "messages": messages,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total_count,
        }

    async def get_threads(
        self,
        family_file_id: str,
        professional_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> dict:
        """
        Get message threads for a case.

        Returns thread summaries with last message preview.
        """
        await self._verify_access(professional_id, family_file_id)

        # Get family file to find case_id for threads
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            return {"threads": [], "total_count": 0}

        # Threads may be linked via case_id or we group messages by thread_id
        query = (
            select(MessageThread)
            .where(
                or_(
                    MessageThread.case_id == family_file.legacy_case_id,
                    # Thread may not exist, group by family file messages
                )
            )
            .order_by(desc(MessageThread.last_message_at))
            .limit(limit)
            .offset(offset)
        )

        result = await self.db.execute(query)
        threads = []

        for thread in result.scalars().all():
            threads.append({
                "id": thread.id,
                "subject": thread.subject,
                "thread_type": thread.thread_type,
                "participant_ids": thread.participant_ids,
                "last_message_at": thread.last_message_at,
                "message_count": thread.message_count,
                "is_archived": thread.is_archived,
            })

        # If no threads found, create a virtual "All Messages" thread
        if not threads:
            msg_count = await self._count_messages(family_file_id)
            if msg_count > 0:
                # Get last message time
                last_msg = await self.db.execute(
                    select(Message.created_at)
                    .where(Message.family_file_id == family_file_id)
                    .order_by(desc(Message.created_at))
                    .limit(1)
                )
                last_msg_time = last_msg.scalar()

                threads.append({
                    "id": "all",
                    "subject": "All Messages",
                    "thread_type": "general",
                    "participant_ids": [],
                    "last_message_at": last_msg_time,
                    "message_count": msg_count,
                    "is_archived": False,
                })

        return {
            "threads": threads,
            "total_count": len(threads),
        }

    async def get_communication_stats(
        self,
        family_file_id: str,
        professional_id: str,
        days: int = 30,
    ) -> dict:
        """
        Get communication statistics for a case.

        Returns message counts, flag rates, and trends.
        """
        await self._verify_access(professional_id, family_file_id)

        since = datetime.utcnow() - timedelta(days=days)

        # Total messages
        total = await self._count_messages(family_file_id, since)

        # Flagged messages
        flagged = await self._count_flagged_messages(family_file_id, since)

        # Messages by sender
        by_sender = await self._count_by_sender(family_file_id, since)

        # Recent activity (last 7 days vs previous 7 days)
        last_week = await self._count_messages(
            family_file_id,
            datetime.utcnow() - timedelta(days=7),
        )
        prev_week = await self._count_messages(
            family_file_id,
            datetime.utcnow() - timedelta(days=14),
            datetime.utcnow() - timedelta(days=7),
        )

        trend = "increasing" if last_week > prev_week else (
            "decreasing" if last_week < prev_week else "stable"
        )

        return {
            "period_days": days,
            "total_messages": total,
            "flagged_messages": flagged,
            "flag_rate": round((flagged / total * 100), 2) if total > 0 else 0,
            "messages_by_sender": by_sender,
            "recent_trend": trend,
            "last_7_days": last_week,
            "previous_7_days": prev_week,
        }

    async def get_message_detail(
        self,
        family_file_id: str,
        professional_id: str,
        message_id: str,
    ) -> Optional[dict]:
        """
        Get detailed view of a specific message.

        Includes full content and any ARIA intervention details.
        """
        await self._verify_access(professional_id, family_file_id)

        result = await self.db.execute(
            select(Message)
            .options(selectinload(Message.flags))
            .where(
                and_(
                    Message.id == message_id,
                    Message.family_file_id == family_file_id,
                )
            )
        )
        msg = result.scalar_one_or_none()

        if not msg:
            return None

        # Get sender info
        sender = await self._get_user(msg.sender_id)
        recipient = await self._get_user(msg.recipient_id)

        detail = {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "sender_name": f"{sender.first_name} {sender.last_name}" if sender else None,
            "recipient_id": msg.recipient_id,
            "recipient_name": f"{recipient.first_name} {recipient.last_name}" if recipient else None,
            "content": msg.content,
            "original_content": msg.original_content,
            "sent_at": msg.sent_at,
            "created_at": msg.created_at,
            "is_read": msg.is_read,
            "read_at": msg.read_at,
            "was_flagged": msg.was_flagged,
            "thread_id": msg.thread_id,
            "flags": [],
        }

        # Add flag details if present
        for flag in msg.flags:
            detail["flags"].append({
                "id": flag.id,
                "severity": flag.severity,
                "categories": flag.categories,
                "toxicity_score": flag.toxicity_score,
                "suggested_content": flag.suggested_content,
                "user_action": flag.user_action,
                "intervention_message": flag.intervention_message,
            })

        return detail

    # -------------------------------------------------------------------------
    # Private Helpers
    # -------------------------------------------------------------------------

    async def _verify_access(
        self,
        professional_id: str,
        family_file_id: str,
    ) -> CaseAssignment:
        """Verify professional has access to view communications."""
        result = await self.db.execute(
            select(CaseAssignment).where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.family_file_id == family_file_id,
                    CaseAssignment.status == AssignmentStatus.ACTIVE.value,
                )
            )
        )
        assignment = result.scalar_one_or_none()

        if not assignment:
            raise ValueError("Professional does not have access to this case")

        # Check if they have messages scope
        if "messages" not in (assignment.access_scopes or []):
            raise ValueError("Professional does not have access to view messages")

        return assignment

    async def _get_family_file(self, family_file_id: str) -> Optional[FamilyFile]:
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        return result.scalar_one_or_none()

    async def _get_user(self, user_id: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def _count_messages(
        self,
        family_file_id: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
    ) -> int:
        query = select(func.count(Message.id)).where(
            Message.family_file_id == family_file_id
        )
        if since:
            query = query.where(Message.created_at >= since)
        if until:
            query = query.where(Message.created_at < until)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _count_flagged_messages(
        self,
        family_file_id: str,
        since: Optional[datetime] = None,
    ) -> int:
        query = select(func.count(Message.id)).where(
            and_(
                Message.family_file_id == family_file_id,
                Message.was_flagged == True,
            )
        )
        if since:
            query = query.where(Message.created_at >= since)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _count_by_sender(
        self,
        family_file_id: str,
        since: Optional[datetime] = None,
    ) -> dict:
        """Get message counts grouped by sender."""
        query = (
            select(Message.sender_id, func.count(Message.id))
            .where(Message.family_file_id == family_file_id)
            .group_by(Message.sender_id)
        )
        if since:
            query = query.where(Message.created_at >= since)

        result = await self.db.execute(query)
        return {row[0]: row[1] for row in result.fetchall()}

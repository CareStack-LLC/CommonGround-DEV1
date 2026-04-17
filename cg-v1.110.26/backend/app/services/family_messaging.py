"""
FamilyMessagingService — business logic for persistent parent↔child threads.

Encapsulates ARIA analysis, DB persistence, and notification fan-out for the
async messaging feature. Endpoints stay thin and only handle HTTP concerns.
"""

import logging
from typing import List, Optional, Tuple

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.child import Child
from app.models.family_file import FamilyFile
from app.models.kidcoms import ChildUser
from app.models.parent_child_message import ParentChildMessage
from app.models.user import User
from app.schemas.parent_child_message import ParentChildThreadSummary
from app.services.aria_child_chat import aria_child_chat_monitor
from app.services.supabase_broadcast import broadcast_realtime

logger = logging.getLogger(__name__)


HIDDEN_PLACEHOLDER = "[Message hidden by safety filter]"


class FamilyMessagingService:
    """Service for the persistent parent↔child messaging inbox."""

    # ---------- Sending ----------

    async def send_from_parent(
        self,
        db: AsyncSession,
        family_file: FamilyFile,
        parent_user: User,
        child: Child,
        content: str,
    ) -> ParentChildMessage:
        """
        Create a message from a parent to their child. Runs ARIA, persists the
        row, and notifies the child (best-effort).
        """
        sender_name = self._display_name_for_user(parent_user)

        aria_result = aria_child_chat_monitor.analyze_message(
            content=content,
            sender_type="parent",
            sender_name=sender_name,
        )

        message = self._build_message(
            family_file_id=family_file.id,
            child_id=child.id,
            sender_id=parent_user.id,
            sender_type="parent",
            sender_name=sender_name,
            content=content,
            aria_result=aria_result,
        )

        db.add(message)
        await db.commit()
        await db.refresh(message)

        # A6's Notification model targets users.id (parents), not children.
        # The child will see the message the next time they open KidSpace;
        # future push-to-child work can plug in here.

        # Supabase Realtime broadcast → wake any open kid client on the
        # thread. The kid's Supabase session is anon-only (no Supabase
        # Auth), so `postgres_changes` rows don't reach them; broadcast
        # is RLS-free and content-free — just a "refetch now" nudge.
        await broadcast_realtime(
            topic=f"pcm:{child.id}",
            event="new_message",
            payload={
                "id": str(message.id),
                "sender_type": "parent",
                "aria_hidden": bool(message.aria_hidden),
            },
        )

        if aria_result.should_flag:
            logger.warning(
                "ARIA flagged parent→child message family=%s child=%s category=%s reason=%s",
                family_file.id,
                child.id,
                getattr(aria_result.category, "value", None),
                aria_result.reason,
            )

        return message

    async def send_from_child(
        self,
        db: AsyncSession,
        child_user: ChildUser,
        content: str,
    ) -> ParentChildMessage:
        """
        Create a message from a child to their parents. Runs ARIA and notifies
        both parents on the family file (best-effort).
        """
        child = await self._get_child_or_raise(db, child_user.child_id)
        family_file = await self._get_family_file_or_raise(db, child_user.family_file_id)

        sender_name = child.display_name  # preferred_name or first_name

        aria_result = aria_child_chat_monitor.analyze_message(
            content=content,
            sender_type="child",
            sender_name=sender_name,
        )

        message = self._build_message(
            family_file_id=family_file.id,
            child_id=child.id,
            sender_id=child.id,
            sender_type="child",
            sender_name=sender_name,
            content=content,
            aria_result=aria_result,
        )

        db.add(message)
        await db.commit()
        await db.refresh(message)

        # Notify both parents if present (best-effort; never fails the send).
        parent_ids = [p for p in [family_file.parent_a_id, family_file.parent_b_id] if p]
        for parent_id in parent_ids:
            await self._notify(
                db=db,
                user_id=parent_id,
                notification_type="parent_child_message",
                title=f"New message from {sender_name}",
                body=self._preview(message.content),
                action_url=f"/messages/child/{child.id}",
                family_file_id=family_file.id,
            )

        # Broadcast a refetch nudge to the kid's own screen (in case their
        # own sent message needs to appear in a second open tab) AND to
        # any parent-side thread page that's open. The parent page also
        # has an RLS-backed postgres_changes listener — this is a
        # belt-and-suspenders.
        await broadcast_realtime(
            topic=f"pcm:{child.id}",
            event="new_message",
            payload={
                "id": str(message.id),
                "sender_type": "child",
                "aria_hidden": bool(message.aria_hidden),
            },
        )

        if aria_result.should_flag:
            logger.warning(
                "ARIA flagged child→parent message family=%s child=%s category=%s reason=%s",
                family_file.id,
                child.id,
                getattr(aria_result.category, "value", None),
                aria_result.reason,
            )

        return message

    # ---------- Listing ----------

    async def list_thread(
        self,
        db: AsyncSession,
        family_file_id: str,
        child_id: str,
        requester_id: str,
        requester_type: str,  # "parent" | "child"
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ParentChildMessage], int, int]:
        """
        Return messages in the thread newest-first, plus total count and
        unread count for the requester.
        """
        base = select(ParentChildMessage).where(
            and_(
                ParentChildMessage.family_file_id == family_file_id,
                ParentChildMessage.child_id == child_id,
            )
        )

        total = (
            await db.execute(select(func.count()).select_from(base.subquery()))
        ).scalar_one()

        result = await db.execute(
            base.order_by(desc(ParentChildMessage.created_at))
            .offset(offset)
            .limit(limit)
        )
        messages = list(result.scalars().all())

        # Unread = messages from the OTHER side that the requester hasn't read.
        opposite = "child" if requester_type == "parent" else "parent"
        unread_result = await db.execute(
            select(func.count(ParentChildMessage.id)).where(
                and_(
                    ParentChildMessage.family_file_id == family_file_id,
                    ParentChildMessage.child_id == child_id,
                    ParentChildMessage.sender_type == opposite,
                    ParentChildMessage.read_by_recipient == False,  # noqa: E712
                )
            )
        )
        unread_count = unread_result.scalar_one() or 0

        return messages, int(total), int(unread_count)

    async def mark_thread_read(
        self,
        db: AsyncSession,
        family_file_id: str,
        child_id: str,
        requester_type: str,  # "parent" | "child"
    ) -> int:
        """
        Mark all messages *sent to* the requester (i.e. from the opposite side)
        as read. Returns the count of newly-read messages.
        """
        from datetime import datetime

        opposite = "child" if requester_type == "parent" else "parent"

        result = await db.execute(
            select(ParentChildMessage).where(
                and_(
                    ParentChildMessage.family_file_id == family_file_id,
                    ParentChildMessage.child_id == child_id,
                    ParentChildMessage.sender_type == opposite,
                    ParentChildMessage.read_by_recipient == False,  # noqa: E712
                )
            )
        )
        unread = result.scalars().all()
        now = datetime.utcnow()
        for msg in unread:
            msg.read_by_recipient = True
            msg.read_at = now

        if unread:
            await db.commit()
        return len(unread)

    async def list_parent_threads(
        self, db: AsyncSession, parent_user: User
    ) -> List[ParentChildThreadSummary]:
        """
        One summary per child in any family file the parent is on.
        """
        ff_result = await db.execute(
            select(FamilyFile).where(
                or_(
                    FamilyFile.parent_a_id == parent_user.id,
                    FamilyFile.parent_b_id == parent_user.id,
                )
            )
        )
        family_files = list(ff_result.scalars().all())
        if not family_files:
            return []

        family_file_ids = [ff.id for ff in family_files]

        children_result = await db.execute(
            select(Child).where(Child.family_file_id.in_(family_file_ids))
        )
        children = list(children_result.scalars().all())

        summaries: List[ParentChildThreadSummary] = []
        for child in children:
            last_msg_result = await db.execute(
                select(ParentChildMessage)
                .where(
                    and_(
                        ParentChildMessage.family_file_id == child.family_file_id,
                        ParentChildMessage.child_id == child.id,
                    )
                )
                .order_by(desc(ParentChildMessage.created_at))
                .limit(1)
            )
            last_msg = last_msg_result.scalar_one_or_none()

            unread_result = await db.execute(
                select(func.count(ParentChildMessage.id)).where(
                    and_(
                        ParentChildMessage.family_file_id == child.family_file_id,
                        ParentChildMessage.child_id == child.id,
                        ParentChildMessage.sender_type == "child",
                        ParentChildMessage.read_by_recipient == False,  # noqa: E712
                    )
                )
            )
            unread = int(unread_result.scalar_one() or 0)

            summaries.append(
                ParentChildThreadSummary(
                    child_id=child.id,
                    child_name=child.display_name,
                    child_avatar_url=child.photo_url,
                    last_message_preview=(
                        self._preview(last_msg.content) if last_msg else None
                    ),
                    last_message_at=last_msg.created_at if last_msg else None,
                    unread_count=unread,
                )
            )

        # Most recently active threads first, then children without messages.
        summaries.sort(
            key=lambda s: (s.last_message_at is None, -(s.last_message_at.timestamp() if s.last_message_at else 0)),
        )
        return summaries

    # ---------- Internal helpers ----------

    def _build_message(
        self,
        *,
        family_file_id: str,
        child_id: str,
        sender_id: str,
        sender_type: str,
        sender_name: str,
        content: str,
        aria_result,
    ) -> ParentChildMessage:
        should_hide = bool(getattr(aria_result, "should_hide", False))
        should_flag = bool(getattr(aria_result, "should_flag", False))
        category = getattr(aria_result, "category", None)
        category_value = category.value if category is not None else None

        message = ParentChildMessage(
            family_file_id=family_file_id,
            child_id=child_id,
            sender_id=sender_id,
            sender_type=sender_type,
            sender_name=sender_name,
            content=HIDDEN_PLACEHOLDER if should_hide else content,
            original_content=content if should_hide else None,
            aria_analyzed=True,
            aria_flagged=should_flag,
            aria_hidden=should_hide,
            aria_category=category_value,
            aria_reason=getattr(aria_result, "reason", None) if should_flag else None,
            aria_score=getattr(aria_result, "confidence_score", None),
        )
        return message

    @staticmethod
    def _display_name_for_user(user: User) -> str:
        first = getattr(user, "first_name", None) or ""
        last = getattr(user, "last_name", None) or ""
        full = f"{first} {last}".strip()
        return full or getattr(user, "email", "Parent")

    @staticmethod
    def _preview(content: str, max_len: int = 120) -> str:
        content = content or ""
        if len(content) <= max_len:
            return content
        return content[: max_len - 1].rstrip() + "\u2026"

    @staticmethod
    async def _get_child_or_raise(db: AsyncSession, child_id: str) -> Child:
        result = await db.execute(select(Child).where(Child.id == child_id))
        child = result.scalar_one_or_none()
        if child is None:
            raise ValueError(f"Child {child_id} not found")
        return child

    @staticmethod
    async def _get_family_file_or_raise(
        db: AsyncSession, family_file_id: str
    ) -> FamilyFile:
        result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        ff = result.scalar_one_or_none()
        if ff is None:
            raise ValueError(f"FamilyFile {family_file_id} not found")
        return ff

    @staticmethod
    async def _notify(
        *,
        db: AsyncSession,
        user_id: str,
        notification_type: str,
        title: str,
        body: str,
        action_url: Optional[str] = None,
        family_file_id: Optional[str] = None,
    ) -> None:
        """
        Best-effort notification dispatch. Matches the A6
        ``NotificationService.create`` signature. If the service isn't
        importable yet, log at info level and continue — never fail the send.
        """
        try:
            from app.services.notification_service import notification_service  # type: ignore

            create_fn = getattr(notification_service, "create", None)
            if create_fn is None:
                logger.info(
                    "notification_service.create missing; skipping (%s to %s)",
                    notification_type,
                    user_id,
                )
                return

            maybe_coro = create_fn(
                db=db,
                user_id=user_id,
                notification_type=notification_type,
                title=title,
                body=body,
                action_url=action_url,
                family_file_id=family_file_id,
            )
            if hasattr(maybe_coro, "__await__"):
                await maybe_coro
        except ImportError:
            logger.info(
                "notification service unavailable; skipping %s notification for %s",
                notification_type,
                user_id,
            )
        except Exception as exc:  # pragma: no cover — never fail the send
            logger.warning(
                "notification dispatch failed (%s → %s): %s",
                notification_type,
                user_id,
                exc,
            )


family_messaging_service = FamilyMessagingService()

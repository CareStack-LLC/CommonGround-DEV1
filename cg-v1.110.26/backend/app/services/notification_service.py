"""
Notification service - in-app inbox + best-effort email delivery.

Wave 1 scope: DB-backed in-app notifications only. Realtime (WebSocket /
SSE / Web Push) is intentionally out of scope.

Email routing piggybacks on the existing ``email_service``. When the
mapped EmailService method's signature is not a clean fit for a given
notification type, we fall back to ``send_generic_notification`` or skip
email entirely. Email failures never block the DB write.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.services.email import email_service

logger = logging.getLogger(__name__)


class NotificationService:
    """Create, list, and mark-read notifications for users."""

    async def create(
        self,
        db: AsyncSession,
        user_id: str,
        notification_type: str,
        title: str,
        body: str,
        action_url: Optional[str] = None,
        family_file_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
        send_email: bool = True,
    ) -> Notification:
        """
        Create a single notification row, commit, and (optionally) send email.

        Returns the persisted Notification. Email failures are logged and
        swallowed so they never block the write.
        """
        notification = Notification(
            user_id=user_id,
            family_file_id=family_file_id,
            notification_type=notification_type,
            title=title,
            body=body,
            action_url=action_url,
            metadata_json=metadata,
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        if send_email:
            try:
                sent = await self._send_email_for(db, notification)
                if sent:
                    notification.email_sent = True
                    notification.email_sent_at = datetime.utcnow()
                    await db.commit()
                    await db.refresh(notification)
            except Exception as exc:  # pragma: no cover - best-effort email
                logger.warning(
                    "Notification email failed for notification %s: %s",
                    notification.id,
                    exc,
                )

        return notification

    async def create_bulk(
        self, db: AsyncSession, notifications: list[dict[str, Any]]
    ) -> list[Notification]:
        """
        Fan-out creation. Each dict supports the same fields as ``create``.

        Email sends run best-effort per notification. All rows are flushed
        in a single commit for efficiency.
        """
        created: list[Notification] = []
        for payload in notifications:
            notification = Notification(
                user_id=payload["user_id"],
                family_file_id=payload.get("family_file_id"),
                notification_type=payload.get(
                    "notification_type", NotificationType.OTHER.value
                ),
                title=payload["title"],
                body=payload["body"],
                action_url=payload.get("action_url"),
                metadata_json=payload.get("metadata"),
            )
            db.add(notification)
            created.append(notification)

        await db.commit()
        for notification in created:
            await db.refresh(notification)

        # Fire emails after the batch commit so DB state is durable first.
        for notification, payload in zip(created, notifications):
            if not payload.get("send_email", True):
                continue
            try:
                sent = await self._send_email_for(db, notification)
                if sent:
                    notification.email_sent = True
                    notification.email_sent_at = datetime.utcnow()
            except Exception as exc:  # pragma: no cover - best-effort email
                logger.warning(
                    "Notification email failed for notification %s: %s",
                    notification.id,
                    exc,
                )

        await db.commit()
        return created

    async def mark_read(
        self,
        db: AsyncSession,
        user_id: str,
        notification_ids: Optional[list[str]] = None,
    ) -> int:
        """
        Mark notifications as read. Returns count updated.

        If ``notification_ids`` is None or empty, marks ALL unread
        notifications for the user.
        """
        now = datetime.utcnow()
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id)
            .where(Notification.is_read.is_(False))
            .values(is_read=True, read_at=now)
        )
        if notification_ids:
            stmt = stmt.where(Notification.id.in_(notification_ids))

        result = await db.execute(stmt)
        await db.commit()
        return int(result.rowcount or 0)

    async def list_for_user(
        self,
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False,
    ) -> tuple[list[Notification], int, int]:
        """
        Return ``(items, total, unread_count)`` for the current user.

        ``total`` reflects the filtered query (respects ``unread_only``).
        ``unread_count`` is always the user's total unread, for the badge.
        """
        base = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            base = base.where(Notification.is_read.is_(False))

        count_stmt = select(func.count()).select_from(base.subquery())
        total_result = await db.execute(count_stmt)
        total = int(total_result.scalar_one() or 0)

        items_stmt = (
            base.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
        )
        items_result = await db.execute(items_stmt)
        items = list(items_result.scalars().all())

        unread = await self.unread_count(db, user_id)
        return items, total, unread

    async def unread_count(self, db: AsyncSession, user_id: str) -> int:
        """Cheap count of unread notifications for a user."""
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id)
            .where(Notification.is_read.is_(False))
        )
        result = await db.execute(stmt)
        return int(result.scalar_one() or 0)

    # ---------------------------------------------------------------- email

    async def _get_user_email(
        self, db: AsyncSession, user_id: str
    ) -> tuple[Optional[str], str]:
        """Return (email, display_name) for a user, or (None, "") if missing."""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email:
            return None, ""
        name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email
        return user.email, name

    async def _send_email_for(
        self, db: AsyncSession, notification: Notification
    ) -> bool:
        """
        Route a notification to the correct EmailService method.

        Returns True if the email was dispatched successfully (or in dev
        mode). Types without a clean matching method fall back to the
        generic notification template; if even that is unavailable we
        simply log and skip.
        """
        email, to_name = await self._get_user_email(db, notification.user_id)
        if not email:
            logger.info(
                "Skipping notification email: user %s has no email",
                notification.user_id,
            )
            return False

        n_type = notification.notification_type
        meta = notification.metadata_json or {}

        try:
            if n_type == NotificationType.PARENT_CHILD_MESSAGE.value:
                # Existing signature: send_message_notification(
                #   to_email, to_name, sender_name, case_name,
                #   message_preview, message_link, was_flagged
                # )
                await email_service.send_message_notification(
                    to_email=email,
                    to_name=to_name,
                    sender_name=meta.get("sender_name", "Someone"),
                    case_name=meta.get("case_name", ""),
                    message_preview=notification.body[:200],
                    message_link=notification.action_url or "",
                    was_flagged=bool(meta.get("was_flagged", False)),
                )
                return True

            if n_type == NotificationType.KIDCOMS_CALL.value:
                # send_kidcoms_call_notification(
                #   to_email, to_name, caller_name, child_name,
                #   call_link, caller_relationship
                # )
                await email_service.send_kidcoms_call_notification(
                    to_email=email,
                    to_name=to_name,
                    caller_name=meta.get("caller_name", "A caller"),
                    child_name=meta.get("child_name", ""),
                    call_link=notification.action_url or "",
                    caller_relationship=meta.get("caller_relationship"),
                )
                return True

            if n_type == NotificationType.ARIA_INTERVENTION.value:
                # send_aria_intervention(
                #   to_email, to_name, category, suggestion, conversation_url
                # )
                await email_service.send_aria_intervention(
                    to_email=email,
                    to_name=to_name,
                    category=meta.get("category", "flagged_message"),
                    suggestion=meta.get("suggestion"),
                    conversation_url=notification.action_url,
                )
                return True

            # Types without a dedicated template -> generic notification.
            # CIRCLE_CONTACT_MESSAGE / CIRCLE_INVITE / WALLET_GIFT /
            # AGREEMENT_CHANGE / EXCHANGE_REMINDER / OTHER
            await email_service.send_generic_notification(
                to_email=email,
                to_name=to_name,
                subject=notification.title,
                message=notification.body,
                cta_url=notification.action_url,
                cta_text=meta.get("cta_text", "View Details"),
                title=notification.title,
            )
            return True

        except AttributeError as exc:
            # Email service missing the expected method -> skip silently.
            logger.info(
                "No email template available for notification_type=%s: %s",
                n_type,
                exc,
            )
            return False

    # ---------------------------------------------------- circle-contact lifecycle

    async def notify_circle_contact(
        self,
        db: AsyncSession,
        contact,  # CircleContact; typed loosely to avoid import cycles
        action: str,  # "verified" | "revoked"
        inviter_name: Optional[str] = None,
    ) -> None:
        """
        Fire a circle-contact lifecycle notification.

        - "verified": the contact is now fully approved and can chat/call.
          Sent when a parent approves OR when email verification completes.
        - "revoked":  the contact has been removed or blocked and can no
          longer participate.

        In-app notifications require a User row, which circle contacts
        don't have — so we rely on email + (for returning contacts who
        have an active CircleUser session) log their inbox view. Email
        failures never block the caller.
        """
        email = getattr(contact, "contact_email", None)
        if not email:
            return

        contact_name = getattr(contact, "contact_name", "") or email
        action_url = f"{self._frontend_url()}/my-circle/contact"

        if action == "verified":
            subject = "You're now an approved CommonGround circle contact"
            body = (
                "Good news — a parent has approved your access, so you can "
                "now video call, voice call, and message the children in "
                "their circle. Sign in to My Circle to get started."
            )
            cta_text = "Open My Circle"
        elif action == "revoked":
            subject = "Your CommonGround circle access has been updated"
            body = (
                "A parent has removed you from the approved circle, so "
                "you'll no longer be able to message or call the children "
                "on that family file. If you think this is a mistake, "
                "please reach out to the parent directly."
            )
            cta_text = "Open My Circle"
        else:
            logger.info("Unknown circle contact action %r, skipping", action)
            return

        if inviter_name:
            body = f"{body}\n\nInviting parent: {inviter_name}"

        try:
            from app.services.email import email_service

            await email_service.send_generic_notification(
                to_email=email,
                to_name=contact_name,
                subject=subject,
                message=body,
                cta_url=action_url,
                cta_text=cta_text,
                title=subject,
            )
        except Exception as exc:  # pragma: no cover — best-effort email
            logger.warning(
                "Failed to email circle contact %s (action=%s): %s",
                contact_name,
                action,
                exc,
            )
            return

        # Try to drop an in-app notification at the contact's CircleUser
        # if one exists. Circle users aren't in the `users` table, so we
        # can't use the normal Notification row; we just log that they'll
        # see the update when they next sign in.
        try:
            from app.models.kidcoms import CircleUser

            result = await db.execute(
                select(CircleUser).where(
                    CircleUser.circle_contact_id == getattr(contact, "id", None)
                )
            )
            cu = result.scalar_one_or_none()
            if cu is not None:
                logger.info(
                    "Circle contact %s (%s) will see '%s' status on next login",
                    contact_name,
                    cu.email,
                    action,
                )
        except Exception:  # pragma: no cover
            pass

        # Court-evidence chain: record the lifecycle event so a GAL / attorney
        # can later verify who approved which circle contact and when. The
        # entry is keyed to the case behind the family_file; if no case row
        # exists yet, we skip (matches the behaviour of
        # `circle_messages._create_event_log`). Never blocks the caller.
        await self._log_circle_contact_event(db, contact, action, inviter_name)

    async def _log_circle_contact_event(
        self,
        db: AsyncSession,
        contact,
        action: str,
        inviter_name: Optional[str],
    ) -> None:
        """Write an EventLog row for a circle-contact lifecycle transition.

        Non-fatal: failures are swallowed and logged so the caller's email
        + in-app work stays intact if, say, the `cases` table is missing
        on a family file that predates the Case model.
        """
        try:
            import hashlib
            import json
            from datetime import datetime

            from sqlalchemy import desc, func

            from app.models.audit import EventLog
            from app.models.case import Case

            family_file_id = getattr(contact, "family_file_id", None)
            if not family_file_id:
                return

            case_result = await db.execute(
                select(Case).where(Case.family_file_id == family_file_id).limit(1)
            )
            case = case_result.scalar_one_or_none()
            if case is None:
                # No case linked yet — nothing to anchor the chain to.
                return

            seq_result = await db.execute(
                select(func.coalesce(func.max(EventLog.sequence_number), 0)).where(
                    EventLog.case_id == str(case.id)
                )
            )
            next_seq = (seq_result.scalar() or 0) + 1

            prev_result = await db.execute(
                select(EventLog.content_hash)
                .where(EventLog.case_id == str(case.id))
                .order_by(desc(EventLog.sequence_number))
                .limit(1)
            )
            previous_hash = prev_result.scalar_one_or_none()

            event_data = {
                "action": action,  # "verified" | "revoked"
                "contact_id": getattr(contact, "id", None),
                "contact_name": getattr(contact, "contact_name", None),
                "contact_email": getattr(contact, "contact_email", None),
                "inviter_name": inviter_name,
                "family_file_id": family_file_id,
            }
            content_str = json.dumps(event_data, sort_keys=True, default=str)
            content_hash = hashlib.sha256(content_str.encode()).hexdigest()

            db.add(
                EventLog(
                    event_type=f"circle_contact.{action}",
                    case_id=str(case.id),
                    actor_id=None,  # System-triggered; actor identity lives
                                    # in the calling endpoint's audit trail.
                    event_timestamp=datetime.utcnow(),
                    event_data=event_data,
                    content_hash=content_hash,
                    previous_hash=previous_hash,
                    sequence_number=next_seq,
                    source="notification_service",
                    category="circle",
                    severity="info" if action == "verified" else "warning",
                    related_user_id=None,
                    related_resource_type="circle_contact",
                    related_resource_id=getattr(contact, "id", None),
                )
            )
            # The calling transaction commits; we don't commit here.
        except Exception as exc:  # pragma: no cover
            logger.warning(
                "Failed to write EventLog for circle_contact.%s: %s", action, exc
            )

    @staticmethod
    def _frontend_url() -> str:
        """Best-effort lookup of the FE URL for emailed deep-links."""
        try:
            from app.core.config import settings

            return settings.FRONTEND_URL or ""
        except Exception:
            return ""


notification_service = NotificationService()

"""
Web Push notification service.

Uses pywebpush to send push notifications to subscribed browsers.
"""

import json
import logging
from typing import List, Optional, Tuple

from pywebpush import webpush, WebPushException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


class PushNotificationService:
    """Service for sending Web Push notifications."""

    def __init__(self):
        """Initialize the push service with VAPID keys."""
        self.vapid_private_key = settings.VAPID_PRIVATE_KEY
        self.vapid_public_key = settings.VAPID_PUBLIC_KEY
        self.vapid_subject = settings.VAPID_SUBJECT

    @property
    def is_configured(self) -> bool:
        """Check if push notifications are properly configured."""
        return bool(self.vapid_private_key and self.vapid_public_key)

    async def send_notification(
        self,
        db: AsyncSession,
        user_id: str,
        title: str,
        body: str,
        url: Optional[str] = None,
        icon: Optional[str] = None,
        tag: Optional[str] = None,
        data: Optional[dict] = None
    ) -> int:
        """
        Send a push notification to all of a user's subscriptions.

        Args:
            db: Database session
            user_id: ID of the user to notify
            title: Notification title
            body: Notification body text
            url: URL to open when notification is clicked
            icon: Icon URL for the notification
            tag: Tag to group/replace notifications
            data: Additional data to include in the notification

        Returns:
            Number of successful sends
        """
        if not self.is_configured:
            logger.warning("Push notifications not configured - missing VAPID keys")
            return 0

        # Get all active subscriptions for this user
        result = await db.execute(
            select(PushSubscription)
            .where(PushSubscription.user_id == user_id)
            .where(PushSubscription.is_active == True)
        )
        subscriptions = result.scalars().all()

        if not subscriptions:
            logger.debug(f"No push subscriptions found for user {user_id}")
            return 0

        # Build notification payload
        payload = {
            "title": title,
            "body": body,
            "icon": icon or "/icon-192.png",
            "badge": "/badge-72.png",
            "tag": tag,
            "url": url or "/",
            "data": data or {}
        }

        success_count, _ = await self._send_to_subscriptions(db, subscriptions, payload)
        return success_count

    async def _send_to_subscriptions(
        self,
        db: AsyncSession,
        subscriptions: List[PushSubscription],
        payload: dict
    ) -> Tuple[int, int]:
        """
        Send a notification to multiple subscriptions.

        Args:
            db: Database session
            subscriptions: List of push subscriptions
            payload: Notification payload

        Returns:
            Tuple of (success_count, failure_count)
        """
        success_count = 0
        failure_count = 0
        expired_subscriptions = []

        payload_json = json.dumps(payload)

        for subscription in subscriptions:
            try:
                webpush(
                    subscription_info=subscription.to_dict(),
                    data=payload_json,
                    vapid_private_key=self.vapid_private_key,
                    vapid_claims={"sub": self.vapid_subject}
                )
                success_count += 1
                logger.debug(f"Push sent to subscription {subscription.id}")

            except WebPushException as e:
                failure_count += 1
                logger.error(f"Push failed for subscription {subscription.id}: {e}")

                # Check if subscription expired (410 Gone or 404 Not Found)
                if e.response and e.response.status_code in [404, 410]:
                    expired_subscriptions.append(subscription)
                    logger.info(f"Marking subscription {subscription.id} as inactive (expired)")

            except Exception as e:
                failure_count += 1
                logger.error(f"Unexpected error sending push to {subscription.id}: {e}")

        # Mark expired subscriptions as inactive
        for subscription in expired_subscriptions:
            subscription.is_active = False
            db.add(subscription)

        if expired_subscriptions:
            await db.commit()

        return success_count, failure_count

    async def send_to_users(
        self,
        db: AsyncSession,
        user_ids: List[str],
        title: str,
        body: str,
        url: Optional[str] = None,
        icon: Optional[str] = None,
        tag: Optional[str] = None,
        data: Optional[dict] = None
    ) -> int:
        """
        Send a push notification to multiple users.

        Args:
            db: Database session
            user_ids: List of user IDs to notify
            title: Notification title
            body: Notification body text
            url: URL to open when notification is clicked
            icon: Icon URL for the notification
            tag: Tag to group/replace notifications
            data: Additional data to include

        Returns:
            Total number of successful sends
        """
        total_success = 0
        for user_id in user_ids:
            count = await self.send_notification(
                db, user_id, title, body, url, icon, tag, data
            )
            total_success += count
        return total_success


# Global service instance
push_service = PushNotificationService()

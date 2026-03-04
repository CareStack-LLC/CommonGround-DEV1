"""
Push subscription model for Web Push notifications.
"""

from typing import Optional
from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDMixin


class PushSubscription(Base, UUIDMixin, TimestampMixin):
    """
    Stores Web Push subscription data for sending push notifications.

    Each user can have multiple subscriptions (one per device/browser).
    """

    __tablename__ = "push_subscriptions"

    # User who owns this subscription
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Push subscription endpoint URL (unique per subscription)
    endpoint: Mapped[str] = mapped_column(Text, nullable=False, unique=True)

    # Encryption keys
    p256dh_key: Mapped[str] = mapped_column(String(200), nullable=False)
    auth_key: Mapped[str] = mapped_column(String(100), nullable=False)

    # Optional metadata
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Whether subscription is still active
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationship
    user = relationship("User", back_populates="push_subscriptions")

    def __repr__(self) -> str:
        return f"<PushSubscription(id={self.id}, user_id={self.user_id}, active={self.is_active})>"

    def to_dict(self) -> dict:
        """Convert to subscription info dict for pywebpush."""
        return {
            "endpoint": self.endpoint,
            "keys": {
                "p256dh": self.p256dh_key,
                "auth": self.auth_key
            }
        }

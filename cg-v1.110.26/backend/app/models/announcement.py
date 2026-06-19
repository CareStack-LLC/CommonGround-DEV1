"""Platform announcements shown in-app to users.

Created by platform admins; surfaced to users via a public active-announcements
endpoint that the app polls to render a banner.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Announcement(Base, UUIDMixin, TimestampMixin):
    """A platform-wide announcement banner."""

    __tablename__ = "announcements"

    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    # info | warning | critical — drives banner styling.
    level: Mapped[str] = mapped_column(String(20), default="info")
    # all | parents | professionals — who should see it.
    audience: Mapped[str] = mapped_column(String(20), default="all")

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    starts_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_by_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    def is_live(self, now: Optional[datetime] = None) -> bool:
        now = now or datetime.utcnow()
        if not self.is_active:
            return False
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        return True

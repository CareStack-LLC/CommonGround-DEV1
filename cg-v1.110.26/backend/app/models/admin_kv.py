"""Per-admin key-value store for superadmin UI state that benefits from
backend persistence (multi-device, cross-browser) without warranting a
dedicated table.

Currently powers the Reddit / GTM Playbook page — it stores the checklist
state, drafts, outreach contacts, and activity log as JSON blobs under
well-known keys. A single row per (user_id, key) pair.
"""

from typing import Optional

from sqlalchemy import JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class AdminKV(Base, UUIDMixin, TimestampMixin):
    """A key-value row scoped to a single admin user."""

    __tablename__ = "admin_kv"
    __table_args__ = (
        UniqueConstraint("user_id", "key", name="uq_admin_kv_user_key"),
    )

    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    # Stored as JSON so we can hold any arbitrary UI state blob — matches
    # what localStorage would hold client-side.
    value_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<AdminKV {self.user_id}:{self.key}>"

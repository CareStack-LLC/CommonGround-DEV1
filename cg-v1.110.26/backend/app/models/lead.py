"""Lead generation and email campaign models."""

from datetime import datetime
from typing import Optional, List

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class LeadList(Base, UUIDMixin, TimestampMixin):
    """A collection of leads for targeted outreach."""

    __tablename__ = "lead_lists"

    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lead_type: Mapped[str] = mapped_column(String(20))  # professional, parent
    search_criteria: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    sendgrid_list_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    lead_count: Mapped[int] = mapped_column(default=0)

    leads: Mapped[List["Lead"]] = relationship("Lead", back_populates="lead_list", cascade="all, delete-orphan")
    campaigns: Mapped[List["EmailCampaign"]] = relationship("EmailCampaign", back_populates="lead_list")

    def __repr__(self) -> str:
        return f"<LeadList {self.name} ({self.lead_type})>"


class Lead(Base, UUIDMixin, TimestampMixin):
    """An individual lead contact."""

    __tablename__ = "leads"
    __table_args__ = (
        UniqueConstraint("lead_list_id", "email", name="uq_lead_list_email"),
    )

    lead_list_id: Mapped[str] = mapped_column(String(36), ForeignKey("lead_lists.id", ondelete="CASCADE"))
    email: Mapped[str] = mapped_column(String(320), index=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    company: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="manual")  # manual, import
    status: Mapped[str] = mapped_column(String(20), default="new")  # new, contacted, responded, converted, unsubscribed
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    lead_list: Mapped["LeadList"] = relationship("LeadList", back_populates="leads")

    def __repr__(self) -> str:
        return f"<Lead {self.email}>"


class EmailCampaign(Base, UUIDMixin, TimestampMixin):
    """An email campaign targeting a lead list."""

    __tablename__ = "email_campaigns"

    name: Mapped[str] = mapped_column(String(200))
    lead_list_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("lead_lists.id"), nullable=True)
    subject: Mapped[str] = mapped_column(String(500))
    html_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plain_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, scheduled, sending, sent, cancelled
    sendgrid_singlesend_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    stats_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    lead_list: Mapped[Optional["LeadList"]] = relationship("LeadList", back_populates="campaigns")

    def __repr__(self) -> str:
        return f"<EmailCampaign {self.name} ({self.status})>"


class CampaignTemplate(Base, UUIDMixin, TimestampMixin):
    """Reusable email campaign template."""

    __tablename__ = "campaign_templates"

    name: Mapped[str] = mapped_column(String(200))
    target_audience: Mapped[str] = mapped_column(String(50))  # attorney, mediator, parent, general
    subject_template: Mapped[str] = mapped_column(String(500))
    html_template: Mapped[str] = mapped_column(Text)

    def __repr__(self) -> str:
        return f"<CampaignTemplate {self.name}>"

"""
Partner models for nonprofit grant program.

Enables nonprofit partner organizations to:
- Have branded landing pages
- Distribute grant codes to their clients
- Track anonymized usage metrics
- Access dashboards with aggregated data
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class PartnerStatus(str):
    """Partner account status."""
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    INACTIVE = "inactive"


class PartnerStaffRole(str):
    """Partner staff access levels."""
    ADMIN = "admin"      # Full access, can request codes
    VIEWER = "viewer"    # Read-only dashboard access


class Partner(Base, UUIDMixin, TimestampMixin):
    """
    Nonprofit partner organization.
    
    Partners receive grant codes to distribute to their clients.
    Each partner has a branded landing page and metrics dashboard.
    """

    __tablename__ = "partners"

    # URL-safe identifier (e.g., 'foreverforward')
    partner_slug: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )

    # Organization details
    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    ein: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    mission_statement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Primary contact
    primary_contact_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    primary_contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    primary_contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Branding configuration (JSONB)
    branding_config: Mapped[dict] = mapped_column(
        JSONB,
        default={
            "logo_url": "",
            "primary_color": "#2C5F5D",
            "secondary_color": "#D4A853",
            "accent_color": "#4A90A4",
            "font_family": "system-ui",
            "hero_image_url": "",
            "tagline": ""
        },
        nullable=False
    )

    # Landing page configuration (JSONB)
    landing_config: Mapped[dict] = mapped_column(
        JSONB,
        default={
            "show_mission": True,
            "show_stats": True,
            "show_testimonials": False,
            "custom_welcome_message": "",
            "faq_items": [],
            "contact_method": "email"
        },
        nullable=False
    )

    # Dashboard configuration (JSONB)
    dashboard_config: Mapped[dict] = mapped_column(
        JSONB,
        default={
            "metrics_enabled": {
                "codes_distributed": True,
                "activation_rate": True,
                "active_users": True,
                "conflict_reduction": True,
                "message_volume": True,
                "schedules_created": True
            },
            "report_frequency": "weekly",
            "report_recipients": []
        },
        nullable=False
    )

    # Grant code management
    code_prefix: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    codes_allocated: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    codes_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default=PartnerStatus.PENDING, nullable=False
    )
    activation_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    staff: Mapped[list["PartnerStaff"]] = relationship(
        "PartnerStaff", back_populates="partner", cascade="all, delete-orphan"
    )
    metrics: Mapped[list["PartnerMetric"]] = relationship(
        "PartnerMetric", back_populates="partner", cascade="all, delete-orphan"
    )
    grant_codes: Mapped[list["GrantCode"]] = relationship(
        "GrantCode", back_populates="partner"
    )

    def __repr__(self) -> str:
        return f"<Partner {self.partner_slug} ({self.display_name})>"

    @property
    def codes_remaining(self) -> int:
        """Calculate remaining available codes."""
        return max(0, self.codes_allocated - self.codes_used)

    @property
    def is_active(self) -> bool:
        """Check if partner is active."""
        return self.status == PartnerStatus.ACTIVE


class PartnerStaff(Base, UUIDMixin, TimestampMixin):
    """
    Links users to partner organizations with role-based access.
    
    Enables partner staff to access the partner dashboard with
    appropriate permissions based on their role.
    """

    __tablename__ = "partner_staff"
    __table_args__ = (
        UniqueConstraint("partner_id", "user_id", name="uq_partner_staff_partner_user"),
    )

    # Foreign keys
    partner_id: Mapped[str] = mapped_column(
        ForeignKey("partners.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # Role (admin or viewer)
    role: Mapped[str] = mapped_column(
        String(20), default=PartnerStaffRole.VIEWER, nullable=False
    )

    # Relationships
    partner: Mapped["Partner"] = relationship("Partner", back_populates="staff")
    user: Mapped["User"] = relationship("User", back_populates="partner_staff_roles")

    def __repr__(self) -> str:
        return f"<PartnerStaff user={self.user_id} partner={self.partner_id} role={self.role}>"

    @property
    def is_admin(self) -> bool:
        """Check if user has admin access."""
        return self.role == PartnerStaffRole.ADMIN


class PartnerMetric(Base, UUIDMixin):
    """
    Aggregated metrics for partner dashboards.
    
    Pre-computed metrics by time period for efficient dashboard display.
    Metrics are anonymized and aggregated - no individual user data.
    """

    __tablename__ = "partner_metrics"
    __table_args__ = (
        UniqueConstraint(
            "partner_id", "period_start", "period_type",
            name="uq_partner_metrics_period"
        ),
    )

    # Foreign key
    partner_id: Mapped[str] = mapped_column(
        ForeignKey("partners.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # Period definition
    period_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    period_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # 'daily', 'weekly', 'monthly'

    # Code metrics
    codes_distributed: Mapped[int] = mapped_column(Integer, default=0)
    codes_activated: Mapped[int] = mapped_column(Integer, default=0)
    activation_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

    # User engagement
    active_users: Mapped[int] = mapped_column(Integer, default=0)
    total_logins: Mapped[int] = mapped_column(Integer, default=0)
    avg_logins_per_user: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

    # Communication metrics
    messages_sent: Mapped[int] = mapped_column(Integer, default=0)
    aria_interventions: Mapped[int] = mapped_column(Integer, default=0)
    aria_acceptance_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

    # Conflict metrics
    conflict_score_avg: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    conflict_reduction_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

    # Feature usage
    schedules_created: Mapped[int] = mapped_column(Integer, default=0)
    exchanges_logged: Mapped[int] = mapped_column(Integer, default=0)
    expenses_tracked: Mapped[int] = mapped_column(Integer, default=0)
    agreements_started: Mapped[int] = mapped_column(Integer, default=0)

    # Session/retention
    avg_session_duration_minutes: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    retention_rate_30d: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    retention_rate_90d: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

    # Impact estimates
    client_nps_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    estimated_legal_fees_saved: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    estimated_conflicts_prevented: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Calculation timestamp
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    partner: Mapped["Partner"] = relationship("Partner", back_populates="metrics")

    def __repr__(self) -> str:
        return f"<PartnerMetric partner={self.partner_id} period={self.period_type} start={self.period_start}>"


class UserAnonymizationMap(Base, UUIDMixin, TimestampMixin):
    """
    Maps real user IDs to anonymous identifiers for partner reporting.
    
    CRITICAL PRIVACY: This table must NEVER be accessible to partners.
    Only internal admin operations should access this data.
    Partners only see anonymous IDs like 'User-FF1A2'.
    """

    __tablename__ = "user_anonymization_map"

    # Real user ID
    real_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # Anonymous identifier shown to partners
    anonymous_user_id: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False
    )  # Format: 'User-XXXX' where X is hex

    # Which partner this anonymization is for
    partner_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("partners.id", ondelete="CASCADE"), index=True, nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="anonymization_maps")
    partner: Mapped[Optional["Partner"]] = relationship("Partner")

    def __repr__(self) -> str:
        return f"<UserAnonymizationMap real={self.real_user_id} anon={self.anonymous_user_id}>"

    @staticmethod
    def generate_anonymous_id(partner_prefix: str = "") -> str:
        """
        Generate a unique anonymous user ID.
        
        Format: 'User-{prefix}{4 hex chars}'
        Example: 'User-FF1A2B' for Forever Forward partner
        """
        import secrets
        hex_suffix = secrets.token_hex(2).upper()
        if partner_prefix:
            return f"User-{partner_prefix[:2].upper()}{hex_suffix}"
        return f"User-{hex_suffix}"

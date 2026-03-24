"""
BizOps models - analytics, DevOps, customer success, sales, and marketing tables.

Supports the elevated SuperAdmin BizOps portal with pre-computed metrics,
deployment tracking, customer health scoring, sales events, and marketing analytics.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer,
    Numeric, String, Text, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


# =============================================================================
# Phase 1: Analytics Engine
# =============================================================================

class DailyMetricsSnapshot(Base, UUIDMixin, TimestampMixin):
    """Pre-computed daily platform KPIs for fast dashboard queries."""

    __tablename__ = "daily_metrics_snapshots"

    date: Mapped[datetime] = mapped_column(Date, unique=True, index=True, nullable=False)
    total_users: Mapped[int] = mapped_column(Integer, default=0)
    active_users: Mapped[int] = mapped_column(Integer, default=0)
    new_signups: Mapped[int] = mapped_column(Integer, default=0)
    mrr: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    paying_users: Mapped[int] = mapped_column(Integer, default=0)
    messages_sent: Mapped[int] = mapped_column(Integer, default=0)
    aria_flags: Mapped[int] = mapped_column(Integer, default=0)
    churn_count: Mapped[int] = mapped_column(Integer, default=0)
    trial_starts: Mapped[int] = mapped_column(Integer, default=0)
    trial_conversions: Mapped[int] = mapped_column(Integer, default=0)
    family_files_created: Mapped[int] = mapped_column(Integer, default=0)
    agreements_created: Mapped[int] = mapped_column(Integer, default=0)
    dau: Mapped[int] = mapped_column(Integer, default=0)


class MarketingSpend(Base, UUIDMixin, TimestampMixin):
    """Monthly marketing spend by channel for CAC calculations."""

    __tablename__ = "marketing_spend"

    month: Mapped[datetime] = mapped_column(Date, nullable=False)
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


# =============================================================================
# Phase 2: DevOps Hub
# =============================================================================

class Deployment(Base, UUIDMixin, TimestampMixin):
    """Deployment tracking for CI/CD visibility."""

    __tablename__ = "deployments"

    environment: Mapped[str] = mapped_column(String(20), nullable=False)  # production, staging, preview
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # success, failed, rolled_back, in_progress
    commit_sha: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    commit_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    branch: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    deployed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    deployed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rollback_of: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("deployments.id"), nullable=True
    )
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class CodeQualitySnapshot(Base, UUIDMixin, TimestampMixin):
    """Code quality metrics snapshots for trend tracking."""

    __tablename__ = "code_quality_snapshots"

    date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    test_coverage_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    lint_errors: Mapped[int] = mapped_column(Integer, default=0)
    type_errors: Mapped[int] = mapped_column(Integer, default=0)
    vulnerability_count: Mapped[int] = mapped_column(Integer, default=0)
    bundle_size_kb: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="manual")  # ci, manual
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class Sprint(Base, UUIDMixin, TimestampMixin):
    """Sprint container for DevOps sprint management."""

    __tablename__ = "sprints"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    goal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="planning")  # planning, active, completed, cancelled
    start_date: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True)
    planned_points: Mapped[int] = mapped_column(Integer, default=0)
    completed_points: Mapped[int] = mapped_column(Integer, default=0)


class SprintItem(Base, UUIDMixin, TimestampMixin):
    """Individual items within a sprint."""

    __tablename__ = "sprint_items"

    sprint_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sprints.id"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # critical, high, medium, low
    platform: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # frontend, backend, infra, mobile
    status: Mapped[str] = mapped_column(String(20), default="todo")  # todo, in_progress, done, blocked
    assigned_to: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    estimated_hours: Mapped[Optional[float]] = mapped_column(Numeric(5, 1), nullable=True)
    actual_hours: Mapped[Optional[float]] = mapped_column(Numeric(5, 1), nullable=True)
    story_points: Mapped[int] = mapped_column(Integer, default=1)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sentry_issue_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


# =============================================================================
# Phase 3: Customer Success
# =============================================================================

class CustomerHealthScore(Base, UUIDMixin, TimestampMixin):
    """Cached daily customer health scores."""

    __tablename__ = "customer_health_scores"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True, nullable=False
    )
    date: Mapped[datetime] = mapped_column(Date, nullable=False)
    overall_score: Mapped[int] = mapped_column(Integer, default=50)  # 0-100
    risk_level: Mapped[str] = mapped_column(String(20), default="healthy")  # healthy, at_risk, critical
    login_score: Mapped[int] = mapped_column(Integer, default=50)
    activity_score: Mapped[int] = mapped_column(Integer, default=50)
    payment_score: Mapped[int] = mapped_column(Integer, default=50)
    adoption_score: Mapped[int] = mapped_column(Integer, default=50)
    support_score: Mapped[int] = mapped_column(Integer, default=50)
    factors: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class CSIntervention(Base, UUIDMixin, TimestampMixin):
    """Customer success intervention tracking."""

    __tablename__ = "cs_interventions"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True, nullable=False
    )
    admin_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # outreach, discount, guidance, escalation, retention
    channel: Mapped[str] = mapped_column(
        String(20), default="email"
    )  # email, phone, in_app
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    outcome: Mapped[str] = mapped_column(
        String(30), default="pending"
    )  # resolved, pending, escalated, churned
    follow_up_date: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True)


class NPSResponse(Base, UUIDMixin, TimestampMixin):
    """Net Promoter Score survey responses."""

    __tablename__ = "nps_responses"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True, nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-10
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(30), default="in_app")  # in_app, email


# =============================================================================
# Phase 4: Sales Intelligence
# =============================================================================

class SalesEvent(Base, UUIDMixin, TimestampMixin):
    """Explicit tracking of conversion and subscription events."""

    __tablename__ = "sales_events"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True, nullable=False
    )
    event_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # trial_start, trial_end, conversion, upgrade, downgrade, churn
    from_tier: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    to_tier: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    revenue_impact: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # organic, referral, campaign, direct
    campaign_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


# =============================================================================
# Phase 5: Marketing Analytics
# =============================================================================

class PageView(Base, UUIDMixin, TimestampMixin):
    """Internal page view tracking for content performance."""

    __tablename__ = "page_views"

    page_path: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    referrer: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    utm_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    utm_medium: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    utm_campaign: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)


class SocialMetric(Base, UUIDMixin, TimestampMixin):
    """Social media metrics tracking (manual or API-fed)."""

    __tablename__ = "social_metrics"

    platform: Mapped[str] = mapped_column(String(30), nullable=False)  # twitter, linkedin, facebook, reddit, instagram
    date: Mapped[datetime] = mapped_column(Date, nullable=False)
    followers: Mapped[int] = mapped_column(Integer, default=0)
    posts: Mapped[int] = mapped_column(Integer, default=0)
    engagement_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    referral_visits: Mapped[int] = mapped_column(Integer, default=0)
    mentions: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class SEOSnapshot(Base, UUIDMixin, TimestampMixin):
    """SEO performance tracking."""

    __tablename__ = "seo_snapshots"

    date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    query: Mapped[str] = mapped_column(String(500), nullable=False)
    page: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    position: Mapped[Optional[float]] = mapped_column(Numeric(5, 1), nullable=True)
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    ctr: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

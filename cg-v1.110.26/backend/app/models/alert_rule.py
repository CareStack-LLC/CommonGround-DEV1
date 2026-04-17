"""Alert rules + firing history for the system-health dashboard.

Admins define rules like "error_rate_5m > 5" or "mrr < 500". The
AlertEvaluator job (see services/alert_evaluator.py) runs every 5 min,
resolves each enabled rule's metric, compares to threshold, and writes
an AlertHistory row when transitioning from OK → firing (and again
firing → OK on recovery).

Notification delivery uses existing push infra (VAPID) + SendGrid email.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


# Comparison operators supported by the evaluator.
# See services/alert_evaluator.py:_eval_comparison for the implementation.
VALID_COMPARISONS = {"gt", "lt", "gte", "lte", "eq"}


class AlertRule(Base, UUIDMixin, TimestampMixin):
    """A single alert rule — evaluates one metric against a threshold."""

    __tablename__ = "alert_rules"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Dot-path identifying which metric this rule watches. The evaluator
    # resolves these via services/alert_metric_registry.py. Examples:
    #   platform.error_rate_5m        → errors per 1000 requests last 5 min
    #   billing.mrr                   → current monthly recurring revenue
    #   aria.flag_rate_24h            → % of messages flagged in last 24h
    #   custody.exchanges_disputed_24h → count of exchanges disputed today
    metric_path: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    # One of gt / lt / gte / lte / eq. Enforced via VALID_COMPARISONS.
    comparison: Mapped[str] = mapped_column(String(8), nullable=False)
    threshold_value: Mapped[float] = mapped_column(Float, nullable=False)

    check_interval_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    # 0-1. Require the condition to persist for this fraction of recent checks
    # before firing, to damp one-off blips. Default 1.0 = fire on first match.
    stability_factor: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    # Notification targets
    notify_emails: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    notify_push: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Runbook linkage — when fired, notifications include the runbook URL
    runbook_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_evaluated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # Current state: "ok" | "firing" — set by the evaluator.
    current_state: Mapped[str] = mapped_column(String(16), default="ok", nullable=False)

    created_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    def __repr__(self) -> str:
        return f"<AlertRule {self.name} [{self.metric_path} {self.comparison} {self.threshold_value}]>"


class AlertHistory(Base, UUIDMixin, TimestampMixin):
    """One row per state transition for an AlertRule.

    When a rule transitions OK → firing, a row lands with resolved_at=NULL.
    When it recovers firing → OK, we set resolved_at on the still-open row.
    """

    __tablename__ = "alert_history"

    rule_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("alert_rules.id", ondelete="CASCADE"),
        index=True, nullable=False,
    )
    rule_name_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    metric_path_snapshot: Mapped[str] = mapped_column(String(128), nullable=False)

    fired_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    fired_value: Mapped[float] = mapped_column(Float, nullable=False)
    threshold_value_snapshot: Mapped[float] = mapped_column(Float, nullable=False)
    comparison_snapshot: Mapped[str] = mapped_column(String(8), nullable=False)

    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolved_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    notifications_sent: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # {"push": [...user_ids], "email": [...addresses], "errors": [...]}

    def __repr__(self) -> str:
        status = "resolved" if self.resolved_at else "firing"
        return f"<AlertHistory {self.rule_name_snapshot} [{status}]>"

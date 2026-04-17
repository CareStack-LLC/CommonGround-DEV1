"""Create alert_rules, alert_history, runbooks tables.

Ops infrastructure for the system-health dashboard — configurable
thresholds that fire email + push notifications, backed by runbooks.

Revision ID: alerts_runbooks_20260417
Revises: impersonation_20260417
Create Date: 2026-04-17
"""

from alembic import op
import sqlalchemy as sa


revision = "alerts_runbooks_20260417"
down_revision = "impersonation_20260417"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── runbooks ─────────────────────────────────────────────────────
    op.create_table(
        "runbooks",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False, server_default="incident"),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("steps_json", sa.JSON(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.String(length=36), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_runbooks_title", "runbooks", ["title"])
    op.create_index("ix_runbooks_category", "runbooks", ["category"])

    # ── alert_rules ──────────────────────────────────────────────────
    op.create_table(
        "alert_rules",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metric_path", sa.String(length=128), nullable=False),
        sa.Column("comparison", sa.String(length=8), nullable=False),
        sa.Column("threshold_value", sa.Float(), nullable=False),
        sa.Column("check_interval_minutes", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("stability_factor", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("notify_emails", sa.JSON(), nullable=True),
        sa.Column("notify_push", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("runbook_id", sa.String(length=36), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_evaluated_at", sa.DateTime(), nullable=True),
        sa.Column("last_value", sa.Float(), nullable=True),
        sa.Column("current_state", sa.String(length=16), nullable=False, server_default="ok"),
        sa.Column("created_by", sa.String(length=36), nullable=True),
    )
    op.create_index("ix_alert_rules_metric_path", "alert_rules", ["metric_path"])
    op.create_index("ix_alert_rules_enabled_state", "alert_rules", ["enabled", "current_state"])

    # ── alert_history ────────────────────────────────────────────────
    op.create_table(
        "alert_history",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("rule_id", sa.String(length=36), sa.ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rule_name_snapshot", sa.String(length=200), nullable=False),
        sa.Column("metric_path_snapshot", sa.String(length=128), nullable=False),
        sa.Column("fired_at", sa.DateTime(), nullable=False),
        sa.Column("fired_value", sa.Float(), nullable=False),
        sa.Column("threshold_value_snapshot", sa.Float(), nullable=False),
        sa.Column("comparison_snapshot", sa.String(length=8), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_value", sa.Float(), nullable=True),
        sa.Column("notifications_sent", sa.JSON(), nullable=True),
    )
    op.create_index("ix_alert_history_rule_fired", "alert_history", ["rule_id", "fired_at"])
    op.create_index("ix_alert_history_unresolved", "alert_history", ["resolved_at"])


def downgrade() -> None:
    op.drop_index("ix_alert_history_unresolved", table_name="alert_history")
    op.drop_index("ix_alert_history_rule_fired", table_name="alert_history")
    op.drop_table("alert_history")

    op.drop_index("ix_alert_rules_enabled_state", table_name="alert_rules")
    op.drop_index("ix_alert_rules_metric_path", table_name="alert_rules")
    op.drop_table("alert_rules")

    op.drop_index("ix_runbooks_category", table_name="runbooks")
    op.drop_index("ix_runbooks_title", table_name="runbooks")
    op.drop_table("runbooks")

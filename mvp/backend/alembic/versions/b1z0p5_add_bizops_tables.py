"""Add BizOps portal tables

Adds all tables needed for the elevated SuperAdmin BizOps portal:
- daily_metrics_snapshots (Phase 1: Analytics)
- marketing_spend (Phase 1: Analytics)
- deployments (Phase 2: DevOps)
- code_quality_snapshots (Phase 2: DevOps)
- sprints (Phase 2: DevOps)
- sprint_items (Phase 2: DevOps)
- customer_health_scores (Phase 3: Customer Success)
- cs_interventions (Phase 3: Customer Success)
- nps_responses (Phase 3: Customer Success)
- sales_events (Phase 4: Sales Intelligence)
- page_views (Phase 5: Marketing)
- social_metrics (Phase 5: Marketing)
- seo_snapshots (Phase 5: Marketing)

Revision ID: b1z0p5
Revises: None (runs after all existing migrations)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b1z0p5"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Phase 1: Analytics Engine
    op.create_table(
        "daily_metrics_snapshots",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("date", sa.Date, unique=True, index=True, nullable=False),
        sa.Column("total_users", sa.Integer, default=0),
        sa.Column("active_users", sa.Integer, default=0),
        sa.Column("new_signups", sa.Integer, default=0),
        sa.Column("mrr", sa.Numeric(10, 2), default=0),
        sa.Column("paying_users", sa.Integer, default=0),
        sa.Column("messages_sent", sa.Integer, default=0),
        sa.Column("aria_flags", sa.Integer, default=0),
        sa.Column("churn_count", sa.Integer, default=0),
        sa.Column("trial_starts", sa.Integer, default=0),
        sa.Column("trial_conversions", sa.Integer, default=0),
        sa.Column("family_files_created", sa.Integer, default=0),
        sa.Column("agreements_created", sa.Integer, default=0),
        sa.Column("dau", sa.Integer, default=0),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "marketing_spend",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("month", sa.Date, nullable=False),
        sa.Column("channel", sa.String(50), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), default=0),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # Phase 2: DevOps Hub
    op.create_table(
        "deployments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("environment", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("commit_sha", sa.String(40), nullable=True),
        sa.Column("commit_message", sa.Text, nullable=True),
        sa.Column("branch", sa.String(100), nullable=True),
        sa.Column("deployed_by", sa.String(100), nullable=True),
        sa.Column("deployed_at", sa.DateTime, nullable=False),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("rollback_of", sa.String(36), sa.ForeignKey("deployments.id"), nullable=True),
        sa.Column("metadata_json", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "code_quality_snapshots",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("date", sa.Date, nullable=False, index=True),
        sa.Column("test_coverage_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("lint_errors", sa.Integer, default=0),
        sa.Column("type_errors", sa.Integer, default=0),
        sa.Column("vulnerability_count", sa.Integer, default=0),
        sa.Column("bundle_size_kb", sa.Integer, nullable=True),
        sa.Column("source", sa.String(50), default="manual"),
        sa.Column("metadata_json", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "sprints",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("goal", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), default="planning"),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("planned_points", sa.Integer, default=0),
        sa.Column("completed_points", sa.Integer, default=0),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "sprint_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("sprint_id", sa.String(36), sa.ForeignKey("sprints.id"), index=True, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("severity", sa.String(20), nullable=True),
        sa.Column("platform", sa.String(20), nullable=True),
        sa.Column("status", sa.String(20), default="todo"),
        sa.Column("assigned_to", sa.String(100), nullable=True),
        sa.Column("estimated_hours", sa.Numeric(5, 1), nullable=True),
        sa.Column("actual_hours", sa.Numeric(5, 1), nullable=True),
        sa.Column("story_points", sa.Integer, default=1),
        sa.Column("resolution_notes", sa.Text, nullable=True),
        sa.Column("sentry_issue_id", sa.String(100), nullable=True),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # Phase 3: Customer Success
    op.create_table(
        "customer_health_scores",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("overall_score", sa.Integer, default=50),
        sa.Column("risk_level", sa.String(20), default="healthy"),
        sa.Column("login_score", sa.Integer, default=50),
        sa.Column("activity_score", sa.Integer, default=50),
        sa.Column("payment_score", sa.Integer, default=50),
        sa.Column("adoption_score", sa.Integer, default=50),
        sa.Column("support_score", sa.Integer, default=50),
        sa.Column("factors", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("user_id", "date", name="uq_health_user_date"),
    )

    op.create_table(
        "cs_interventions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("admin_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("channel", sa.String(20), default="email"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("outcome", sa.String(30), default="pending"),
        sa.Column("follow_up_date", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "nps_responses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("source", sa.String(30), default="in_app"),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # Phase 4: Sales Intelligence
    op.create_table(
        "sales_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("from_tier", sa.String(30), nullable=True),
        sa.Column("to_tier", sa.String(30), nullable=True),
        sa.Column("revenue_impact", sa.Numeric(10, 2), nullable=True),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column("campaign_id", sa.String(36), nullable=True),
        sa.Column("metadata_json", sa.JSON, nullable=True),
        sa.Column("occurred_at", sa.DateTime, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    # Phase 5: Marketing Analytics
    op.create_table(
        "page_views",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("page_path", sa.String(500), nullable=False, index=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("session_id", sa.String(100), nullable=True),
        sa.Column("referrer", sa.String(500), nullable=True),
        sa.Column("utm_source", sa.String(100), nullable=True),
        sa.Column("utm_medium", sa.String(100), nullable=True),
        sa.Column("utm_campaign", sa.String(100), nullable=True),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "social_metrics",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("platform", sa.String(30), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("followers", sa.Integer, default=0),
        sa.Column("posts", sa.Integer, default=0),
        sa.Column("engagement_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("referral_visits", sa.Integer, default=0),
        sa.Column("mentions", sa.Integer, default=0),
        sa.Column("metadata_json", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("platform", "date", name="uq_social_platform_date"),
    )

    op.create_table(
        "seo_snapshots",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("date", sa.Date, nullable=False, index=True),
        sa.Column("query", sa.String(500), nullable=False),
        sa.Column("page", sa.String(500), nullable=True),
        sa.Column("position", sa.Numeric(5, 1), nullable=True),
        sa.Column("impressions", sa.Integer, default=0),
        sa.Column("clicks", sa.Integer, default=0),
        sa.Column("ctr", sa.Numeric(5, 2), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("seo_snapshots")
    op.drop_table("social_metrics")
    op.drop_table("page_views")
    op.drop_table("sales_events")
    op.drop_table("nps_responses")
    op.drop_table("cs_interventions")
    op.drop_table("customer_health_scores")
    op.drop_table("sprint_items")
    op.drop_table("sprints")
    op.drop_table("code_quality_snapshots")
    op.drop_table("deployments")
    op.drop_table("marketing_spend")
    op.drop_table("daily_metrics_snapshots")

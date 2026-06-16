"""Reliability batch 1: email outbox, aria_jobs retry columns, KidComs
post-call ARIA report columns.

Revision ID: reliability_batch1_20260611
Revises: admin_kv_20260417
Create Date: 2026-06-11
"""

from alembic import op
import sqlalchemy as sa


revision = "reliability_batch1_20260611"
down_revision = "admin_kv_20260417"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Email outbox: durable spillover for critical emails that exhaust
    # in-process retries (invitations, security alerts, ARIA interventions).
    op.create_table(
        "email_outbox",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("to_email", sa.String(length=320), nullable=False),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("html_body", sa.Text(), nullable=False),
        sa.Column("from_name_override", sa.String(length=200), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column(
            "status", sa.String(length=20), nullable=False, server_default="pending"
        ),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_attempt_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("sendgrid_message_id", sa.String(length=100), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_email_outbox_status_next_attempt",
        "email_outbox",
        ["status", "next_attempt_at"],
    )

    # --- aria_jobs schema drift: table is created via raw SQL
    # (app/db/pro/aria_v3_schema.sql) outside Alembic, so guard everything.
    # Worker code reads retry_count/next_attempt_at and writes 'dead_letter'.
    op.execute("ALTER TABLE IF EXISTS aria_jobs ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0")
    op.execute("ALTER TABLE IF EXISTS aria_jobs ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ")
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aria_job_status') THEN
                ALTER TYPE aria_job_status ADD VALUE IF NOT EXISTS 'dead_letter';
            END IF;
        END $$;
        """
    )

    # --- KidComs post-call ARIA analysis report
    op.add_column("kidcoms_sessions", sa.Column("aria_report", sa.JSON(), nullable=True))
    op.add_column(
        "kidcoms_sessions", sa.Column("aria_analyzed_at", sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("kidcoms_sessions", "aria_analyzed_at")
    op.drop_column("kidcoms_sessions", "aria_report")
    # Enum values cannot be removed in PostgreSQL; leave 'dead_letter' in place.
    op.execute("ALTER TABLE IF EXISTS aria_jobs DROP COLUMN IF EXISTS next_attempt_at")
    op.execute("ALTER TABLE IF EXISTS aria_jobs DROP COLUMN IF EXISTS retry_count")
    op.drop_index("ix_email_outbox_status_next_attempt", table_name="email_outbox")
    op.drop_table("email_outbox")

"""Create impersonation_sessions table for admin "view as user" audit trail.

Every time a superadmin impersonates a user, a row lands here with
started_at / ended_at / action_count. Paired with AuditLog entries that
embed both real_sub + act_as identities so every action is attributable.

Revision ID: impersonation_20260417
Revises: leads_stage_20260417
Create Date: 2026-04-17
"""

from alembic import op
import sqlalchemy as sa


revision = "impersonation_20260417"
down_revision = "leads_stage_20260417"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "impersonation_sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("superadmin_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("superadmin_email", sa.String(length=255), nullable=True),
        sa.Column("target_user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("target_email", sa.String(length=255), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("end_reason", sa.String(length=32), nullable=True),
        sa.Column("action_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_impersonation_superadmin_started",
        "impersonation_sessions",
        ["superadmin_id", "started_at"],
    )
    op.create_index(
        "ix_impersonation_target_started",
        "impersonation_sessions",
        ["target_user_id", "started_at"],
    )
    # Partial-ish index for "open" sessions (no timeout clock uses it yet,
    # but useful when we add the 30-min auto-timeout reaper)
    op.create_index(
        "ix_impersonation_open",
        "impersonation_sessions",
        ["ended_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_impersonation_open", table_name="impersonation_sessions")
    op.drop_index("ix_impersonation_target_started", table_name="impersonation_sessions")
    op.drop_index("ix_impersonation_superadmin_started", table_name="impersonation_sessions")
    op.drop_table("impersonation_sessions")

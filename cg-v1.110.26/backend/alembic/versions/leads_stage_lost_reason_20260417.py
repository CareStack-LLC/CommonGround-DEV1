"""Add sales funnel fields to leads (stage, lost_reason, closed_at).

These columns power the /admin/sales/win-loss endpoint (real aggregation by
lost_reason) and the "Close as lost" UX in the leads page. All nullable so
existing rows are unaffected.

Revision ID: leads_stage_20260417
Revises: court_ready_20260417
Create Date: 2026-04-17
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "leads_stage_20260417"
down_revision = "court_ready_20260417"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # All three columns are nullable — existing leads default to NULL.
    # We don't set a default on `stage` because existing leads predate the
    # funnel tracking and shouldn't be forced into "new".
    op.add_column(
        "leads",
        sa.Column("stage", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "leads",
        sa.Column("lost_reason", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "leads",
        sa.Column("closed_at", sa.DateTime(), nullable=True),
    )
    # Index stage + closed_at so /win-loss queries (WHERE stage='closed_lost'
    # AND closed_at >= cutoff) stay fast as the leads table grows.
    op.create_index(
        "ix_leads_stage_closed_at",
        "leads",
        ["stage", "closed_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_leads_stage_closed_at", table_name="leads")
    op.drop_column("leads", "closed_at")
    op.drop_column("leads", "lost_reason")
    op.drop_column("leads", "stage")

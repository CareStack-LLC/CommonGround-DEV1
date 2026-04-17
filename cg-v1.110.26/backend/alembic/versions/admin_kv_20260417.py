"""Create admin_kv table for per-admin UI state (replaces Reddit playbook
localStorage reliance).

Revision ID: admin_kv_20260417
Revises: alerts_runbooks_20260417
Create Date: 2026-04-17
"""

from alembic import op
import sqlalchemy as sa


revision = "admin_kv_20260417"
down_revision = "alerts_runbooks_20260417"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_kv",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value_json", sa.JSON(), nullable=True),
        sa.UniqueConstraint("user_id", "key", name="uq_admin_kv_user_key"),
    )
    op.create_index("ix_admin_kv_user_id", "admin_kv", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_admin_kv_user_id", table_name="admin_kv")
    op.drop_table("admin_kv")

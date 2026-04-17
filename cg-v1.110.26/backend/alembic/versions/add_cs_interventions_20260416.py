"""add cs_interventions table (SuperAdmin reliability fix)

Moves CS intervention records off the in-memory list in admin_cs.py
and into a durable table so restarts don't wipe outreach history.

Revision ID: add_cs_interventions_20260416
Revises: add_wave4alt_20260416
Create Date: 2026-04-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "add_cs_interventions_20260416"
down_revision: Union[str, Sequence[str], None] = "add_wave4alt_20260416"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cs_interventions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("channel", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("follow_up_date", sa.Date(), nullable=True),
        sa.Column("outcome", sa.String(length=50), nullable=True),
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="open",
        ),
        sa.Column(
            "created_by",
            sa.String(length=36),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_cs_interventions_user_id", "cs_interventions", ["user_id"])
    op.create_index(
        "ix_cs_interventions_user_created",
        "cs_interventions",
        ["user_id", "created_at"],
    )
    op.create_index("ix_cs_interventions_status", "cs_interventions", ["status"])


def downgrade() -> None:
    op.drop_index("ix_cs_interventions_status", table_name="cs_interventions")
    op.drop_index("ix_cs_interventions_user_created", table_name="cs_interventions")
    op.drop_index("ix_cs_interventions_user_id", table_name="cs_interventions")
    op.drop_table("cs_interventions")

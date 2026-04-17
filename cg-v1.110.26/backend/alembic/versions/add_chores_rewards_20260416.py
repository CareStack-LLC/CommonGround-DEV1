"""add chores + rewards tables (Wave 3 C2/C3)

Revision ID: add_chores_rewards_20260416
Revises: add_parent_child_messages_20260416
Create Date: 2026-04-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "add_chores_rewards_20260416"
down_revision: Union[str, Sequence[str], None] = "add_parent_child_messages_20260416"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chores",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "family_file_id",
            sa.String(length=36),
            sa.ForeignKey("family_files.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "child_id",
            sa.String(length=36),
            sa.ForeignKey("children.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "assigned_by",
            sa.String(length=36),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("reward_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("due_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column(
            "approved_by",
            sa.String(length=36),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("reward_credited", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_chores_family_file_id", "chores", ["family_file_id"])
    op.create_index("ix_chores_child_id", "chores", ["child_id"])
    op.create_index("ix_chores_assigned_by", "chores", ["assigned_by"])
    op.create_index("ix_chores_status", "chores", ["status"])
    op.create_index("ix_chores_child_status", "chores", ["child_id", "status"])

    op.create_table(
        "rewards",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "family_file_id",
            sa.String(length=36),
            sa.ForeignKey("family_files.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_by",
            sa.String(length=36),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cost_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("image_emoji", sa.String(length=10), nullable=True),
        sa.Column("stock_limit", sa.Integer(), nullable=True),  # null = unlimited
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_rewards_family_file_id", "rewards", ["family_file_id"])
    op.create_index("ix_rewards_active", "rewards", ["family_file_id", "is_active"])

    op.create_table(
        "reward_redemptions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "reward_id",
            sa.String(length=36),
            sa.ForeignKey("rewards.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "child_id",
            sa.String(length=36),
            sa.ForeignKey("children.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "family_file_id",
            sa.String(length=36),
            sa.ForeignKey("family_files.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("cost_at_redemption", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="requested",
        ),  # requested → fulfilled → cancelled
        sa.Column("wallet_transaction_id", sa.String(length=36), nullable=True),
        sa.Column(
            "fulfilled_by",
            sa.String(length=36),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("fulfilled_at", sa.DateTime(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_reward_redemptions_reward_id", "reward_redemptions", ["reward_id"])
    op.create_index("ix_reward_redemptions_child_id", "reward_redemptions", ["child_id"])
    op.create_index("ix_reward_redemptions_status", "reward_redemptions", ["status"])


def downgrade() -> None:
    op.drop_index("ix_reward_redemptions_status", table_name="reward_redemptions")
    op.drop_index("ix_reward_redemptions_child_id", table_name="reward_redemptions")
    op.drop_index("ix_reward_redemptions_reward_id", table_name="reward_redemptions")
    op.drop_table("reward_redemptions")
    op.drop_index("ix_rewards_active", table_name="rewards")
    op.drop_index("ix_rewards_family_file_id", table_name="rewards")
    op.drop_table("rewards")
    op.drop_index("ix_chores_child_status", table_name="chores")
    op.drop_index("ix_chores_status", table_name="chores")
    op.drop_index("ix_chores_assigned_by", table_name="chores")
    op.drop_index("ix_chores_child_id", table_name="chores")
    op.drop_index("ix_chores_family_file_id", table_name="chores")
    op.drop_table("chores")

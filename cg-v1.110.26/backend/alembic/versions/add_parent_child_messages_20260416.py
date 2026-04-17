"""add parent_child_messages table for persistent parent↔child inbox

Revision ID: add_parent_child_messages_20260416
Revises: add_notifications_20260416
Create Date: 2026-04-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_parent_child_messages_20260416"
down_revision: Union[str, Sequence[str], None] = "add_notifications_20260416"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "parent_child_messages",
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
        sa.Column("sender_id", sa.String(length=36), nullable=False),
        sa.Column("sender_type", sa.String(length=20), nullable=False),
        sa.Column("sender_name", sa.String(length=200), nullable=False),
        sa.Column("content", sa.String(length=2000), nullable=False),
        sa.Column("original_content", sa.String(length=2000), nullable=True),
        sa.Column(
            "aria_analyzed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "aria_flagged",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "aria_hidden",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("aria_category", sa.String(length=50), nullable=True),
        sa.Column("aria_reason", sa.String(length=500), nullable=True),
        sa.Column("aria_score", sa.Float(), nullable=True),
        sa.Column(
            "read_by_recipient",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index(
        "ix_parent_child_messages_family_file_id",
        "parent_child_messages",
        ["family_file_id"],
    )
    op.create_index(
        "ix_parent_child_messages_child_id",
        "parent_child_messages",
        ["child_id"],
    )
    op.create_index(
        "ix_parent_child_messages_sender_id",
        "parent_child_messages",
        ["sender_id"],
    )
    op.create_index(
        "ix_parent_child_messages_read_by_recipient",
        "parent_child_messages",
        ["read_by_recipient"],
    )
    op.create_index(
        "ix_parent_child_messages_created_at",
        "parent_child_messages",
        ["created_at"],
    )
    op.create_index(
        "ix_parent_child_messages_thread_time",
        "parent_child_messages",
        ["family_file_id", "child_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_parent_child_messages_thread_time", table_name="parent_child_messages"
    )
    op.drop_index(
        "ix_parent_child_messages_created_at", table_name="parent_child_messages"
    )
    op.drop_index(
        "ix_parent_child_messages_read_by_recipient",
        table_name="parent_child_messages",
    )
    op.drop_index(
        "ix_parent_child_messages_sender_id", table_name="parent_child_messages"
    )
    op.drop_index(
        "ix_parent_child_messages_child_id", table_name="parent_child_messages"
    )
    op.drop_index(
        "ix_parent_child_messages_family_file_id",
        table_name="parent_child_messages",
    )
    op.drop_table("parent_child_messages")

"""add circle_parent_messages table for parent ↔ circle-contact coordination thread

Wave 3 C1 gap-close — circle contacts today can only message the child
(`circle_messages`). This migration adds a dedicated parent ↔ contact
channel so a grandparent can coordinate with the parent directly
("can I take Mia to a movie Saturday?") without running through the kid.

Descends from `add_chore_completion_photo_20260417` (current head on the
Wave 3 branch as of 2026-04-17).

Revision ID: add_circle_parent_messages_20260417
Revises: add_chore_completion_photo_20260417
Create Date: 2026-04-17
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_circle_parent_messages_20260417"
down_revision: Union[str, Sequence[str], None] = "add_chore_completion_photo_20260417"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "circle_parent_messages",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "family_file_id",
            sa.String(length=36),
            sa.ForeignKey("family_files.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "circle_contact_id",
            sa.String(length=36),
            sa.ForeignKey("circle_contacts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_user_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sender_type", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("original_content", sa.Text(), nullable=True),
        sa.Column(
            "aria_flagged",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("aria_reason", sa.String(length=500), nullable=True),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index(
        "ix_circle_parent_messages_family_file_id",
        "circle_parent_messages",
        ["family_file_id"],
    )
    op.create_index(
        "ix_circle_parent_messages_circle_contact_id",
        "circle_parent_messages",
        ["circle_contact_id"],
    )
    op.create_index(
        "ix_circle_parent_messages_parent_user_id",
        "circle_parent_messages",
        ["parent_user_id"],
    )
    op.create_index(
        "ix_circle_parent_messages_created_at",
        "circle_parent_messages",
        ["created_at"],
    )
    op.create_index(
        "ix_circle_parent_messages_contact_time",
        "circle_parent_messages",
        ["circle_contact_id", "created_at"],
    )
    op.create_index(
        "ix_circle_parent_messages_parent_time",
        "circle_parent_messages",
        ["parent_user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_circle_parent_messages_parent_time", table_name="circle_parent_messages"
    )
    op.drop_index(
        "ix_circle_parent_messages_contact_time", table_name="circle_parent_messages"
    )
    op.drop_index(
        "ix_circle_parent_messages_created_at", table_name="circle_parent_messages"
    )
    op.drop_index(
        "ix_circle_parent_messages_parent_user_id", table_name="circle_parent_messages"
    )
    op.drop_index(
        "ix_circle_parent_messages_circle_contact_id",
        table_name="circle_parent_messages",
    )
    op.drop_index(
        "ix_circle_parent_messages_family_file_id",
        table_name="circle_parent_messages",
    )
    op.drop_table("circle_parent_messages")

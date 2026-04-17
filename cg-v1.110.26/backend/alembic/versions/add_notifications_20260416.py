"""Add notifications table for in-app + email notification inbox (Wave 1 A6).

Revision ID: add_notifications_20260416
Revises: kidcoms_nullable_daily_room
Create Date: 2026-04-16

This migration adds the ``notifications`` table backing the per-user
in-app notification inbox. Email dispatch state (``email_sent`` /
``email_sent_at``) is tracked on the row so we can retry or audit.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_notifications_20260416"
down_revision = "kidcoms_nullable_daily_room"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "family_file_id",
            sa.String(36),
            sa.ForeignKey("family_files.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "notification_type",
            sa.String(50),
            nullable=False,
            server_default="other",
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.String(1000), nullable=False),
        sa.Column("action_url", sa.String(500), nullable=True),
        sa.Column("metadata_json", sa.JSON, nullable=True),
        sa.Column(
            "is_read",
            sa.Boolean,
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("read_at", sa.DateTime, nullable=True),
        sa.Column(
            "email_sent",
            sa.Boolean,
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("email_sent_at", sa.DateTime, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index(
        "ix_notifications_family_file_id", "notifications", ["family_file_id"]
    )
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])
    op.create_index(
        "ix_notifications_user_unread", "notifications", ["user_id", "is_read"]
    )
    op.create_index(
        "ix_notifications_user_created", "notifications", ["user_id", "created_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_user_created", table_name="notifications")
    op.drop_index("ix_notifications_user_unread", table_name="notifications")
    op.drop_index("ix_notifications_created_at", table_name="notifications")
    op.drop_index("ix_notifications_is_read", table_name="notifications")
    op.drop_index("ix_notifications_family_file_id", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")

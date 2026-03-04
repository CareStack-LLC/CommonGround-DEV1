"""Add ARIA sensitivity fields to parent calls.

Revision ID: a1r2i3a4s5e6n7
Revises: m3r9e1h2e3a4d5
Create Date: 2026-01-23

Adds configurable ARIA sensitivity level and threshold to ParentCallSession,
and speaker/mute tracking to CallFlag for intervention reporting.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1r2i3a4s5e6n7"
down_revision = "m3r9e1h2e3a4d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add ARIA sensitivity fields to parent_call_sessions
    op.add_column(
        "parent_call_sessions",
        sa.Column("aria_sensitivity_level", sa.String(20), nullable=False, server_default="moderate")
    )
    op.add_column(
        "parent_call_sessions",
        sa.Column("aria_sensitivity_threshold", sa.Float(), nullable=False, server_default="0.5")
    )

    # Add speaker and mute tracking to call_flags
    op.add_column(
        "call_flags",
        sa.Column("offending_speaker_id", sa.String(36), nullable=True)
    )
    op.add_column(
        "call_flags",
        sa.Column("mute_duration_seconds", sa.Float(), nullable=True)
    )

    # Add foreign key constraint for offending_speaker_id
    op.create_foreign_key(
        "fk_call_flags_offending_speaker_id",
        "call_flags",
        "users",
        ["offending_speaker_id"],
        ["id"],
        ondelete="SET NULL"
    )

    # Add index for querying flags by speaker
    op.create_index(
        "ix_call_flags_offending_speaker",
        "call_flags",
        ["offending_speaker_id"]
    )


def downgrade() -> None:
    # Remove index
    op.drop_index("ix_call_flags_offending_speaker", table_name="call_flags")

    # Remove foreign key
    op.drop_constraint("fk_call_flags_offending_speaker_id", "call_flags", type_="foreignkey")

    # Remove columns from call_flags
    op.drop_column("call_flags", "mute_duration_seconds")
    op.drop_column("call_flags", "offending_speaker_id")

    # Remove columns from parent_call_sessions
    op.drop_column("parent_call_sessions", "aria_sensitivity_threshold")
    op.drop_column("parent_call_sessions", "aria_sensitivity_level")

"""Add ARIA video monitoring tables and violation tracking columns.

Revision ID: ar1av1de0m0n
Revises: None (standalone - apply after latest)
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa

revision = "ar1av1de0m0n"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create video_frame_analyses table
    op.create_table(
        "video_frame_analyses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("parent_call_sessions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("circle_session_id", sa.String(36), sa.ForeignKey("circle_call_sessions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("participant_id", sa.String(36), nullable=False),
        sa.Column("frame_number", sa.Integer, nullable=False),
        sa.Column("captured_at", sa.DateTime, nullable=False),
        sa.Column("call_time_seconds", sa.Float, nullable=False),
        sa.Column("frame_hash", sa.String(64), nullable=False),
        sa.Column("resolution", sa.String(20), default="640x480"),
        sa.Column("frame_storage_path", sa.String(500), nullable=True),
        sa.Column("analysis_model", sa.String(50), default="claude-sonnet-4-5-20250514"),
        sa.Column("analysis_result", sa.JSON, nullable=True),
        sa.Column("is_flagged", sa.Boolean, default=False),
        sa.Column("violation_type", sa.String(50), nullable=True),
        sa.Column("violation_score", sa.Float, nullable=True),
        sa.Column("violation_description", sa.Text, nullable=True),
        sa.Column("intervention_taken", sa.Boolean, default=False),
        sa.Column("intervention_type", sa.String(50), nullable=True),
        sa.Column("processing_time_ms", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_video_frame_session_time", "video_frame_analyses", ["session_id", "captured_at"])
    op.create_index("ix_video_frame_circle_session_time", "video_frame_analyses", ["circle_session_id", "captured_at"])
    op.create_index("ix_video_frame_flagged", "video_frame_analyses", ["is_flagged", "captured_at"])
    op.create_index("ix_video_frame_participant", "video_frame_analyses", ["participant_id", "captured_at"])

    # Create call_violation_trackers table
    op.create_table(
        "call_violation_trackers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("parent_call_sessions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("circle_session_id", sa.String(36), sa.ForeignKey("circle_call_sessions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("participant_id", sa.String(36), nullable=False),
        sa.Column("audio_violation_count", sa.Integer, default=0),
        sa.Column("video_violation_count", sa.Integer, default=0),
        sa.Column("total_violation_count", sa.Integer, default=0),
        sa.Column("audio_warning_count", sa.Integer, default=0),
        sa.Column("audio_mute_count", sa.Integer, default=0),
        sa.Column("video_warning_count", sa.Integer, default=0),
        sa.Column("video_mute_count", sa.Integer, default=0),
        sa.Column("has_severe_violation", sa.Boolean, default=False),
        sa.Column("is_terminated", sa.Boolean, default=False),
        sa.Column("termination_reason", sa.Text, nullable=True),
        sa.Column("last_violation_at", sa.DateTime, nullable=True),
        sa.Column("last_acknowledged_at", sa.DateTime, nullable=True),
        sa.Column("pending_acknowledgment_flag_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_tracker_session_participant", "call_violation_trackers", ["session_id", "participant_id"])
    op.create_index("ix_tracker_circle_session_participant", "call_violation_trackers", ["circle_session_id", "participant_id"])
    op.create_unique_constraint("uq_tracker_session_participant", "call_violation_trackers", ["session_id", "participant_id"])
    op.create_unique_constraint("uq_tracker_circle_session_participant", "call_violation_trackers", ["circle_session_id", "participant_id"])

    # Add columns to call_flags
    op.add_column("call_flags", sa.Column("violation_source", sa.String(20), server_default="audio"))
    op.add_column("call_flags", sa.Column("acknowledged", sa.Boolean, server_default="false"))
    op.add_column("call_flags", sa.Column("acknowledged_at", sa.DateTime, nullable=True))

    # Add columns to circle_call_flags
    op.add_column("circle_call_flags", sa.Column("violation_source", sa.String(20), server_default="audio"))
    op.add_column("circle_call_flags", sa.Column("acknowledged", sa.Boolean, server_default="false"))
    op.add_column("circle_call_flags", sa.Column("acknowledged_at", sa.DateTime, nullable=True))


def downgrade() -> None:
    # Remove columns from circle_call_flags
    op.drop_column("circle_call_flags", "acknowledged_at")
    op.drop_column("circle_call_flags", "acknowledged")
    op.drop_column("circle_call_flags", "violation_source")

    # Remove columns from call_flags
    op.drop_column("call_flags", "acknowledged_at")
    op.drop_column("call_flags", "acknowledged")
    op.drop_column("call_flags", "violation_source")

    # Drop tables
    op.drop_table("call_violation_trackers")
    op.drop_table("video_frame_analyses")

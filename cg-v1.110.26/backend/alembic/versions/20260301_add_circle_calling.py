"""add_circle_calling

Revision ID: 20260301_circle_calling
Revises: 06df596d7422
Create Date: 2026-03-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260301_circle_calling'
down_revision: Union[str, Sequence[str], None] = '06df596d7422'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add circle calling tables."""

    # Create circle_call_rooms table
    op.create_table(
        'circle_call_rooms',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('family_file_id', sa.String(length=36), nullable=False),
        sa.Column('child_id', sa.String(length=36), nullable=False),
        sa.Column('circle_contact_id', sa.String(length=36), nullable=False),
        sa.Column('daily_room_name', sa.String(length=100), nullable=False),
        sa.Column('daily_room_url', sa.String(length=500), nullable=False),
        sa.Column('recording_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('aria_monitoring_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('max_duration_minutes', sa.Integer(), nullable=False, server_default=sa.text('60')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('total_sessions', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['family_file_id'], ['family_files.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['child_id'], ['children.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['circle_contact_id'], ['circle_contacts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_circle_call_rooms_contact_child', 'circle_call_rooms', ['circle_contact_id', 'child_id'], unique=True)
    op.create_index('ix_circle_call_rooms_daily_room_name', 'circle_call_rooms', ['daily_room_name'], unique=True)
    op.create_index('ix_circle_call_rooms_family', 'circle_call_rooms', ['family_file_id'], unique=False)
    op.create_index('ix_circle_call_rooms_child_id', 'circle_call_rooms', ['child_id'], unique=False)
    op.create_index('ix_circle_call_rooms_circle_contact_id', 'circle_call_rooms', ['circle_contact_id'], unique=False)

    # Create circle_call_sessions table
    op.create_table(
        'circle_call_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('family_file_id', sa.String(length=36), nullable=False),
        sa.Column('room_id', sa.String(length=36), nullable=False),
        sa.Column('child_id', sa.String(length=36), nullable=False),
        sa.Column('circle_contact_id', sa.String(length=36), nullable=False),
        sa.Column('call_type', sa.String(length=20), nullable=False, server_default='video'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ringing'),
        sa.Column('initiated_by_id', sa.String(length=36), nullable=False),
        sa.Column('initiated_by_type', sa.String(length=20), nullable=False),
        sa.Column('daily_room_name', sa.String(length=100), nullable=False),
        sa.Column('daily_room_url', sa.String(length=500), nullable=False),
        sa.Column('circle_contact_token', sa.Text(), nullable=True),
        sa.Column('child_token', sa.Text(), nullable=True),
        sa.Column('initiated_at', sa.DateTime(), nullable=False),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('recording_url', sa.Text(), nullable=True),
        sa.Column('recording_storage_path', sa.String(length=500), nullable=True),
        sa.Column('transcript_storage_path', sa.String(length=500), nullable=True),
        sa.Column('aria_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('aria_intervention_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('aria_terminated_call', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('aria_termination_reason', sa.Text(), nullable=True),
        sa.Column('aria_threshold', sa.Float(), nullable=False, server_default=sa.text('0.3')),
        sa.Column('permission_snapshot', sa.JSON(), nullable=True),
        sa.Column('overall_safety_score', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['family_file_id'], ['family_files.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['room_id'], ['circle_call_rooms.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['child_id'], ['children.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['circle_contact_id'], ['circle_contacts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_circle_call_sessions_family_file_id', 'circle_call_sessions', ['family_file_id'], unique=False)
    op.create_index('ix_circle_call_sessions_room_id', 'circle_call_sessions', ['room_id'], unique=False)
    op.create_index('ix_circle_call_sessions_child_id', 'circle_call_sessions', ['child_id'], unique=False)
    op.create_index('ix_circle_call_sessions_circle_contact_id', 'circle_call_sessions', ['circle_contact_id'], unique=False)
    op.create_index('ix_circle_call_sessions_status', 'circle_call_sessions', ['status'], unique=False)
    op.create_index('ix_circle_call_sessions_initiated_by_id', 'circle_call_sessions', ['initiated_by_id'], unique=False)
    op.create_index('ix_circle_call_sessions_daily_room_name', 'circle_call_sessions', ['daily_room_name'], unique=False)
    op.create_index('ix_circle_call_sessions_family_status', 'circle_call_sessions', ['family_file_id', 'status'], unique=False)
    op.create_index('ix_circle_call_sessions_child_date', 'circle_call_sessions', ['child_id', 'initiated_at'], unique=False)
    op.create_index('ix_circle_call_sessions_contact_date', 'circle_call_sessions', ['circle_contact_id', 'initiated_at'], unique=False)

    # Create circle_call_transcript_chunks table
    op.create_table(
        'circle_call_transcript_chunks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('speaker_id', sa.String(length=36), nullable=False),
        sa.Column('speaker_name', sa.String(length=100), nullable=False),
        sa.Column('speaker_type', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('start_time', sa.Float(), nullable=False),
        sa.Column('end_time', sa.Float(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('analyzed', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('flagged', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('toxicity_score', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['circle_call_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_circle_call_transcript_chunks_session_id', 'circle_call_transcript_chunks', ['session_id'], unique=False)
    op.create_index('ix_circle_call_transcript_chunks_speaker_id', 'circle_call_transcript_chunks', ['speaker_id'], unique=False)
    op.create_index('ix_circle_call_transcript_chunks_session_time', 'circle_call_transcript_chunks', ['session_id', 'start_time'], unique=False)
    op.create_index('ix_circle_call_transcript_chunks_flagged', 'circle_call_transcript_chunks', ['session_id', 'flagged'], unique=False)

    # Create circle_call_flags table
    op.create_table(
        'circle_call_flags',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('transcript_chunk_id', sa.String(length=36), nullable=True),
        sa.Column('flag_type', sa.String(length=20), nullable=False),
        sa.Column('toxicity_score', sa.Float(), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('categories', sa.JSON(), nullable=False),
        sa.Column('triggers', sa.JSON(), nullable=False),
        sa.Column('intervention_taken', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('intervention_type', sa.String(length=50), nullable=True),
        sa.Column('intervention_message', sa.Text(), nullable=False),
        sa.Column('flagged_at', sa.DateTime(), nullable=False),
        sa.Column('call_time_seconds', sa.Float(), nullable=True),
        sa.Column('offending_speaker_id', sa.String(length=36), nullable=True),
        sa.Column('offending_speaker_type', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['circle_call_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['transcript_chunk_id'], ['circle_call_transcript_chunks.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_circle_call_flags_session_id', 'circle_call_flags', ['session_id'], unique=False)
    op.create_index('ix_circle_call_flags_transcript_chunk_id', 'circle_call_flags', ['transcript_chunk_id'], unique=False)
    op.create_index('ix_circle_call_flags_flag_type', 'circle_call_flags', ['flag_type'], unique=False)
    op.create_index('ix_circle_call_flags_severity', 'circle_call_flags', ['severity'], unique=False)
    op.create_index('ix_circle_call_flags_offending_speaker_id', 'circle_call_flags', ['offending_speaker_id'], unique=False)
    op.create_index('ix_circle_call_flags_session_severity', 'circle_call_flags', ['session_id', 'severity'], unique=False)
    op.create_index('ix_circle_call_flags_type_flagged_at', 'circle_call_flags', ['flag_type', 'flagged_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema - remove circle calling tables."""

    # Drop tables in reverse order (respecting foreign keys)
    op.drop_index('ix_circle_call_flags_type_flagged_at', table_name='circle_call_flags')
    op.drop_index('ix_circle_call_flags_session_severity', table_name='circle_call_flags')
    op.drop_index('ix_circle_call_flags_offending_speaker_id', table_name='circle_call_flags')
    op.drop_index('ix_circle_call_flags_severity', table_name='circle_call_flags')
    op.drop_index('ix_circle_call_flags_flag_type', table_name='circle_call_flags')
    op.drop_index('ix_circle_call_flags_transcript_chunk_id', table_name='circle_call_flags')
    op.drop_index('ix_circle_call_flags_session_id', table_name='circle_call_flags')
    op.drop_table('circle_call_flags')

    op.drop_index('ix_circle_call_transcript_chunks_flagged', table_name='circle_call_transcript_chunks')
    op.drop_index('ix_circle_call_transcript_chunks_session_time', table_name='circle_call_transcript_chunks')
    op.drop_index('ix_circle_call_transcript_chunks_speaker_id', table_name='circle_call_transcript_chunks')
    op.drop_index('ix_circle_call_transcript_chunks_session_id', table_name='circle_call_transcript_chunks')
    op.drop_table('circle_call_transcript_chunks')

    op.drop_index('ix_circle_call_sessions_contact_date', table_name='circle_call_sessions')
    op.drop_index('ix_circle_call_sessions_child_date', table_name='circle_call_sessions')
    op.drop_index('ix_circle_call_sessions_family_status', table_name='circle_call_sessions')
    op.drop_index('ix_circle_call_sessions_daily_room_name', table_name='circle_call_sessions')
    op.drop_index('ix_circle_call_sessions_initiated_by_id', table_name='circle_call_sessions')
    op.drop_index('ix_circle_call_sessions_status', table_name='circle_call_sessions')
    op.drop_index('ix_circle_call_sessions_circle_contact_id', table_name='circle_call_sessions')
    op.drop_index('ix_circle_call_sessions_child_id', table_name='circle_call_sessions')
    op.drop_index('ix_circle_call_sessions_room_id', table_name='circle_call_sessions')
    op.drop_index('ix_circle_call_sessions_family_file_id', table_name='circle_call_sessions')
    op.drop_table('circle_call_sessions')

    op.drop_index('ix_circle_call_rooms_circle_contact_id', table_name='circle_call_rooms')
    op.drop_index('ix_circle_call_rooms_child_id', table_name='circle_call_rooms')
    op.drop_index('ix_circle_call_rooms_family', table_name='circle_call_rooms')
    op.drop_index('ix_circle_call_rooms_daily_room_name', table_name='circle_call_rooms')
    op.drop_index('ix_circle_call_rooms_contact_child', table_name='circle_call_rooms')
    op.drop_table('circle_call_rooms')

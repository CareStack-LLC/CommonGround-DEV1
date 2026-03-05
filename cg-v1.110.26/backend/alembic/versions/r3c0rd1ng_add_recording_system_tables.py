"""Add recording system tables: recordings, transcriptions, transcription_chunks

Revision ID: r3c0rd1ng
Revises: m3r9e1h2e3a4d5
Create Date: 2026-01-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'r3c0rd1ng'
down_revision: Union[str, Sequence[str], None] = ('m3r9e1h2e3a4d5', 'ee9bcfb92527')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add recording system tables."""
    # Create recordings table
    op.create_table('recordings',
        sa.Column('family_file_id', sa.String(length=36), nullable=False),
        sa.Column('kidcoms_session_id', sa.String(length=36), nullable=True),
        sa.Column('parent_call_session_id', sa.String(length=36), nullable=True),
        sa.Column('recording_type', sa.String(length=20), nullable=False),
        sa.Column('daily_recording_id', sa.String(length=100), nullable=True),
        sa.Column('daily_room_name', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('format', sa.String(length=20), nullable=False),
        sa.Column('s3_bucket', sa.String(length=100), nullable=True),
        sa.Column('s3_key', sa.String(length=500), nullable=True),
        sa.Column('s3_region', sa.String(length=20), nullable=True),
        sa.Column('download_url', sa.Text(), nullable=True),
        sa.Column('download_url_expires_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retain_until', sa.DateTime(), nullable=True),
        sa.Column('is_protected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['family_file_id'], ['family_files.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['kidcoms_session_id'], ['kidcoms_sessions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['parent_call_session_id'], ['parent_call_sessions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recordings_daily_recording_id'), 'recordings', ['daily_recording_id'], unique=True)
    op.create_index(op.f('ix_recordings_daily_room_name'), 'recordings', ['daily_room_name'], unique=False)
    op.create_index(op.f('ix_recordings_family_file_id'), 'recordings', ['family_file_id'], unique=False)
    op.create_index(op.f('ix_recordings_kidcoms_session_id'), 'recordings', ['kidcoms_session_id'], unique=False)
    op.create_index(op.f('ix_recordings_parent_call_session_id'), 'recordings', ['parent_call_session_id'], unique=False)
    op.create_index(op.f('ix_recordings_status'), 'recordings', ['status'], unique=False)
    op.create_index('ix_recordings_family_status', 'recordings', ['family_file_id', 'status'], unique=False)
    op.create_index('ix_recordings_family_date', 'recordings', ['family_file_id', 'started_at'], unique=False)

    # Create transcriptions table
    op.create_table('transcriptions',
        sa.Column('recording_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('word_count', sa.Integer(), nullable=True),
        sa.Column('speaker_count', sa.Integer(), nullable=True),
        sa.Column('s3_bucket', sa.String(length=100), nullable=True),
        sa.Column('s3_key', sa.String(length=500), nullable=True),
        sa.Column('full_text', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['recording_id'], ['recordings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transcriptions_recording_id'), 'transcriptions', ['recording_id'], unique=True)

    # Create transcription_chunks table
    op.create_table('transcription_chunks',
        sa.Column('transcription_id', sa.String(length=36), nullable=False),
        sa.Column('speaker_id', sa.String(length=36), nullable=True),
        sa.Column('speaker_name', sa.String(length=100), nullable=True),
        sa.Column('speaker_label', sa.String(length=20), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('start_time', sa.Float(), nullable=False),
        sa.Column('end_time', sa.Float(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('is_flagged', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('flag_reason', sa.Text(), nullable=True),
        sa.Column('toxicity_score', sa.Float(), nullable=True),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(['transcription_id'], ['transcriptions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transcription_chunks_transcription_id'), 'transcription_chunks', ['transcription_id'], unique=False)
    op.create_index(op.f('ix_transcription_chunks_speaker_id'), 'transcription_chunks', ['speaker_id'], unique=False)
    op.create_index('ix_transcription_chunks_time', 'transcription_chunks', ['transcription_id', 'start_time'], unique=False)
    op.create_index('ix_transcription_chunks_flagged', 'transcription_chunks', ['transcription_id', 'is_flagged'], unique=False)


def downgrade() -> None:
    """Downgrade schema - remove recording system tables."""
    op.drop_index('ix_transcription_chunks_flagged', table_name='transcription_chunks')
    op.drop_index('ix_transcription_chunks_time', table_name='transcription_chunks')
    op.drop_index(op.f('ix_transcription_chunks_speaker_id'), table_name='transcription_chunks')
    op.drop_index(op.f('ix_transcription_chunks_transcription_id'), table_name='transcription_chunks')
    op.drop_table('transcription_chunks')

    op.drop_index(op.f('ix_transcriptions_recording_id'), table_name='transcriptions')
    op.drop_table('transcriptions')

    op.drop_index('ix_recordings_family_date', table_name='recordings')
    op.drop_index('ix_recordings_family_status', table_name='recordings')
    op.drop_index(op.f('ix_recordings_status'), table_name='recordings')
    op.drop_index(op.f('ix_recordings_parent_call_session_id'), table_name='recordings')
    op.drop_index(op.f('ix_recordings_kidcoms_session_id'), table_name='recordings')
    op.drop_index(op.f('ix_recordings_family_file_id'), table_name='recordings')
    op.drop_index(op.f('ix_recordings_daily_room_name'), table_name='recordings')
    op.drop_index(op.f('ix_recordings_daily_recording_id'), table_name='recordings')
    op.drop_table('recordings')

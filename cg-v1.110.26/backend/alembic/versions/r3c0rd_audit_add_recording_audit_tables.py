"""Add recording audit tables for court-admissible chain of custody

Revision ID: r3c0rd_audit
Revises: r3c0rd1ng
Create Date: 2025-01-25

Adds:
- New columns to recordings table for integrity verification and legal hold
- recording_access_logs table for chain of custody tracking
- recording_export_logs table for court export tracking
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'r3c0rd_audit'
down_revision = 'r3c0rd1ng'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to recordings table for integrity verification
    op.add_column('recordings', sa.Column('file_hash', sa.String(64), nullable=True, index=True))
    op.add_column('recordings', sa.Column('file_hash_algorithm', sa.String(20), nullable=False, server_default='sha256'))
    op.add_column('recordings', sa.Column('integrity_verified_at', sa.DateTime(), nullable=True))
    op.add_column('recordings', sa.Column('integrity_status', sa.String(20), nullable=True))

    # Add legal hold management columns
    op.add_column('recordings', sa.Column('legal_hold_set_by', sa.String(36), nullable=True))
    op.add_column('recordings', sa.Column('legal_hold_set_at', sa.DateTime(), nullable=True))
    op.add_column('recordings', sa.Column('legal_hold_reason', sa.Text(), nullable=True))
    op.add_column('recordings', sa.Column('legal_hold_case_number', sa.String(100), nullable=True))

    # Create recording_access_logs table
    op.create_table(
        'recording_access_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('recording_id', sa.String(36), sa.ForeignKey('recordings.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('family_file_id', sa.String(36), nullable=False, index=True),

        # Who accessed
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('user_email', sa.String(255), nullable=True),
        sa.Column('user_role', sa.String(50), nullable=False),
        sa.Column('professional_id', sa.String(36), nullable=True),

        # What action
        sa.Column('action', sa.String(50), nullable=False, index=True),
        sa.Column('action_detail', sa.Text(), nullable=True),

        # When and where
        sa.Column('accessed_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('device_type', sa.String(50), nullable=True),

        # Request context
        sa.Column('request_id', sa.String(36), nullable=True),
        sa.Column('session_id', sa.String(36), nullable=True),

        # Result
        sa.Column('success', sa.Boolean(), nullable=False, default=True),
        sa.Column('error_message', sa.Text(), nullable=True),

        # Integrity verification at time of access
        sa.Column('file_hash_at_access', sa.String(64), nullable=True),
        sa.Column('integrity_verified', sa.Boolean(), nullable=True),

        # Chain of custody linking
        sa.Column('content_hash', sa.String(64), nullable=False, index=True),
        sa.Column('previous_log_hash', sa.String(64), nullable=True),
        sa.Column('sequence_number', sa.Integer(), nullable=False, index=True),

        # Export/legal context
        sa.Column('export_id', sa.String(36), nullable=True),
        sa.Column('case_number', sa.String(100), nullable=True),
        sa.Column('court_order_reference', sa.String(200), nullable=True),
    )

    # Create indexes for recording_access_logs
    op.create_index('ix_recording_access_user_date', 'recording_access_logs', ['user_id', 'accessed_at'])
    op.create_index('ix_recording_access_recording_date', 'recording_access_logs', ['recording_id', 'accessed_at'])
    op.create_index('ix_recording_access_family_date', 'recording_access_logs', ['family_file_id', 'accessed_at'])
    op.create_index('ix_recording_access_action', 'recording_access_logs', ['action', 'accessed_at'])

    # Create recording_export_logs table
    op.create_table(
        'recording_export_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        # Recording reference
        sa.Column('recording_id', sa.String(36), sa.ForeignKey('recordings.id', ondelete='CASCADE'), nullable=False, index=True),

        # Export context
        sa.Column('export_id', sa.String(36), nullable=False, index=True),
        sa.Column('export_type', sa.String(50), nullable=False),

        # Who requested
        sa.Column('requested_by_user_id', sa.String(36), nullable=False, index=True),
        sa.Column('requested_by_role', sa.String(50), nullable=False),
        sa.Column('professional_id', sa.String(36), nullable=True),

        # Legal context
        sa.Column('case_number', sa.String(100), nullable=True),
        sa.Column('court_name', sa.String(200), nullable=True),
        sa.Column('court_order_reference', sa.String(200), nullable=True),
        sa.Column('discovery_request_id', sa.String(100), nullable=True),

        # Exported file details
        sa.Column('exported_format', sa.String(20), nullable=False, default='mp4'),
        sa.Column('exported_file_hash', sa.String(64), nullable=False),
        sa.Column('exported_file_size', sa.Integer(), nullable=False),
        sa.Column('includes_transcription', sa.Boolean(), nullable=False, default=False),
        sa.Column('transcription_hash', sa.String(64), nullable=True),

        # Timing
        sa.Column('exported_at', sa.DateTime(), nullable=False),
        sa.Column('export_started_at', sa.DateTime(), nullable=False),
        sa.Column('export_completed_at', sa.DateTime(), nullable=False),

        # Chain of custody certificate
        sa.Column('certificate_number', sa.String(50), nullable=False, unique=True),
        sa.Column('certificate_hash', sa.String(64), nullable=False),

        # Request metadata
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('request_id', sa.String(36), nullable=True),
    )

    # Create indexes for recording_export_logs
    op.create_index('ix_export_log_export_id', 'recording_export_logs', ['export_id'])
    op.create_index('ix_export_log_case', 'recording_export_logs', ['case_number'])
    op.create_index('ix_export_log_certificate', 'recording_export_logs', ['certificate_number'])


def downgrade():
    # Drop recording_export_logs table
    op.drop_index('ix_export_log_certificate', 'recording_export_logs')
    op.drop_index('ix_export_log_case', 'recording_export_logs')
    op.drop_index('ix_export_log_export_id', 'recording_export_logs')
    op.drop_table('recording_export_logs')

    # Drop recording_access_logs table
    op.drop_index('ix_recording_access_action', 'recording_access_logs')
    op.drop_index('ix_recording_access_family_date', 'recording_access_logs')
    op.drop_index('ix_recording_access_recording_date', 'recording_access_logs')
    op.drop_index('ix_recording_access_user_date', 'recording_access_logs')
    op.drop_table('recording_access_logs')

    # Remove columns from recordings table
    op.drop_column('recordings', 'legal_hold_case_number')
    op.drop_column('recordings', 'legal_hold_reason')
    op.drop_column('recordings', 'legal_hold_set_at')
    op.drop_column('recordings', 'legal_hold_set_by')
    op.drop_column('recordings', 'integrity_status')
    op.drop_column('recordings', 'integrity_verified_at')
    op.drop_column('recordings', 'file_hash_algorithm')
    op.drop_column('recordings', 'file_hash')

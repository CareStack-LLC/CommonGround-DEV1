"""Add KidComs tables

Revision ID: f1e2d3c4b5a6
Revises: 499d3deb006a
Create Date: 2026-01-08

This migration adds the KidComs feature tables:
- circle_contacts: Approved contacts for children
- kidcoms_settings: Per-family KidComs configuration
- kidcoms_sessions: Video call/session records
- kidcoms_messages: Chat messages within sessions
- kidcoms_session_invites: Invitations to join sessions
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f1e2d3c4b5a6'
down_revision = '499d3deb006a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create circle_contacts table
    op.create_table(
        'circle_contacts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('child_id', sa.String(36), sa.ForeignKey('children.id', ondelete='CASCADE'), nullable=True, index=True),

        # Contact information
        sa.Column('contact_name', sa.String(100), nullable=False),
        sa.Column('contact_email', sa.String(255), nullable=True),
        sa.Column('contact_phone', sa.String(20), nullable=True),
        sa.Column('relationship_type', sa.String(50), nullable=False, server_default='other'),
        sa.Column('photo_url', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),

        # Approval tracking
        sa.Column('added_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('approved_by_parent_a_at', sa.DateTime, nullable=True),
        sa.Column('approved_by_parent_b_at', sa.DateTime, nullable=True),

        # Status
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('verification_token', sa.String(100), nullable=True),
        sa.Column('verified_at', sa.DateTime, nullable=True),

        # Availability override
        sa.Column('availability_override', postgresql.JSON(astext_type=sa.Text()), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )

    # Create indexes for circle_contacts
    op.create_index('ix_circle_contacts_family_child', 'circle_contacts', ['family_file_id', 'child_id'])
    op.create_index('ix_circle_contacts_email', 'circle_contacts', ['contact_email'])

    # Create kidcoms_settings table
    op.create_table(
        'kidcoms_settings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id', ondelete='CASCADE'), nullable=False, unique=True, index=True),

        # Circle approval settings
        sa.Column('circle_approval_mode', sa.String(20), nullable=False, server_default='both_parents'),

        # Availability schedule
        sa.Column('availability_schedule', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('enforce_availability', sa.Boolean, nullable=False, server_default='true'),

        # Notifications
        sa.Column('require_parent_notification', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('notify_on_session_start', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('notify_on_session_end', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('notify_on_aria_flag', sa.Boolean, nullable=False, server_default='true'),

        # Feature toggles
        sa.Column('allowed_features', postgresql.JSON(astext_type=sa.Text()), nullable=False,
                  server_default='{"video": true, "chat": true, "theater": true, "arcade": true, "whiteboard": true}'),

        # Session limits
        sa.Column('max_session_duration_minutes', sa.Integer, nullable=False, server_default='60'),
        sa.Column('max_daily_sessions', sa.Integer, nullable=False, server_default='5'),
        sa.Column('max_participants_per_session', sa.Integer, nullable=False, server_default='4'),

        # Parental controls
        sa.Column('require_parent_in_call', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('allow_child_to_initiate', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('record_sessions', sa.Boolean, nullable=False, server_default='false'),

        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )

    # Create kidcoms_sessions table
    op.create_table(
        'kidcoms_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('child_id', sa.String(36), sa.ForeignKey('children.id', ondelete='CASCADE'), nullable=False, index=True),

        # Session info
        sa.Column('session_type', sa.String(20), nullable=False, server_default='video_call'),
        sa.Column('title', sa.String(200), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='waiting', index=True),

        # Daily.co room info
        sa.Column('daily_room_name', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('daily_room_url', sa.String(500), nullable=False),
        sa.Column('daily_room_token', sa.String(500), nullable=True),

        # Initiation
        sa.Column('initiated_by_id', sa.String(36), nullable=False),
        sa.Column('initiated_by_type', sa.String(20), nullable=False),

        # Participants (JSON array)
        sa.Column('participants', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='[]'),

        # Timing
        sa.Column('scheduled_for', sa.DateTime, nullable=True),
        sa.Column('started_at', sa.DateTime, nullable=True),
        sa.Column('ended_at', sa.DateTime, nullable=True),
        sa.Column('duration_seconds', sa.Integer, nullable=True),

        # Features used
        sa.Column('features_used', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='[]'),

        # ARIA stats
        sa.Column('total_messages', sa.Integer, nullable=False, server_default='0'),
        sa.Column('flagged_messages', sa.Integer, nullable=False, server_default='0'),

        # Notes
        sa.Column('notes', sa.Text, nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )

    # Create indexes for kidcoms_sessions
    op.create_index('ix_kidcoms_sessions_family_status', 'kidcoms_sessions', ['family_file_id', 'status'])
    op.create_index('ix_kidcoms_sessions_child_date', 'kidcoms_sessions', ['child_id', 'started_at'])

    # Create kidcoms_messages table
    op.create_table(
        'kidcoms_messages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('session_id', sa.String(36), sa.ForeignKey('kidcoms_sessions.id', ondelete='CASCADE'), nullable=False, index=True),

        # Sender info
        sa.Column('sender_id', sa.String(36), nullable=False, index=True),
        sa.Column('sender_type', sa.String(20), nullable=False),
        sa.Column('sender_name', sa.String(100), nullable=False),

        # Message content
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('original_content', sa.Text, nullable=True),

        # ARIA analysis
        sa.Column('aria_analyzed', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('aria_flagged', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('aria_category', sa.String(50), nullable=True),
        sa.Column('aria_reason', sa.Text, nullable=True),
        sa.Column('aria_score', sa.Float, nullable=True),

        # Status
        sa.Column('is_delivered', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('is_hidden', sa.Boolean, nullable=False, server_default='false'),

        # Timestamp
        sa.Column('sent_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )

    # Create indexes for kidcoms_messages
    op.create_index('ix_kidcoms_messages_session_time', 'kidcoms_messages', ['session_id', 'sent_at'])
    op.create_index('ix_kidcoms_messages_flagged', 'kidcoms_messages', ['session_id', 'aria_flagged'])

    # Create kidcoms_session_invites table
    op.create_table(
        'kidcoms_session_invites',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('session_id', sa.String(36), sa.ForeignKey('kidcoms_sessions.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('circle_contact_id', sa.String(36), sa.ForeignKey('circle_contacts.id', ondelete='CASCADE'), nullable=True),

        # Invite info
        sa.Column('invited_by_id', sa.String(36), nullable=False),
        sa.Column('invited_by_type', sa.String(20), nullable=False),
        sa.Column('invite_token', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('invite_url', sa.String(500), nullable=False),

        # Status
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('expires_at', sa.DateTime, nullable=False),
        sa.Column('accepted_at', sa.DateTime, nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )


def downgrade() -> None:
    op.drop_table('kidcoms_session_invites')
    op.drop_table('kidcoms_messages')
    op.drop_table('kidcoms_sessions')
    op.drop_table('kidcoms_settings')
    op.drop_table('circle_contacts')

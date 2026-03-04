"""Add My Circle communication tables

Revision ID: adf7fbde7f66
Revises: f1e2d3c4b5a6
Create Date: 2025-01-09

This migration adds:
- kidcoms_rooms: 10 communication rooms per family
- circle_users: Login credentials for circle contacts
- child_users: PIN-based login for children
- circle_permissions: Granular permissions per contact/child
- Updates to circle_contacts for room assignment and invitations
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'adf7fbde7f66'
down_revision = 'f1e2d3c4b5a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create kidcoms_rooms table (10 rooms per family)
    op.create_table(
        'kidcoms_rooms',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('room_number', sa.Integer, nullable=False),  # 1-10
        sa.Column('room_type', sa.String(20), nullable=False),  # 'parent_a', 'parent_b', 'circle'
        sa.Column('room_name', sa.String(100), nullable=True),  # Custom name like "Grandma's Room"
        sa.Column('assigned_to_id', sa.String(36), nullable=True),  # circle_contact_id
        sa.Column('daily_room_name', sa.String(100), nullable=True),  # Persistent Daily.co room
        sa.Column('daily_room_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('family_file_id', 'room_number', name='uq_kidcoms_rooms_family_room')
    )
    op.create_index('ix_kidcoms_rooms_family_file_id', 'kidcoms_rooms', ['family_file_id'])
    op.create_index('ix_kidcoms_rooms_assigned_to', 'kidcoms_rooms', ['assigned_to_id'])

    # Create circle_users table (login for circle contacts)
    op.create_table(
        'circle_users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('circle_contact_id', sa.String(36), sa.ForeignKey('circle_contacts.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=True),  # NULL until invite accepted
        sa.Column('invite_token', sa.String(100), nullable=True, unique=True),
        sa.Column('invite_expires_at', sa.DateTime, nullable=True),
        sa.Column('invite_accepted_at', sa.DateTime, nullable=True),
        sa.Column('email_verified', sa.Boolean, default=False),
        sa.Column('last_login', sa.DateTime, nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_circle_users_email', 'circle_users', ['email'])
    op.create_index('ix_circle_users_invite_token', 'circle_users', ['invite_token'])

    # Create child_users table (PIN login for children)
    op.create_table(
        'child_users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('child_id', sa.String(36), sa.ForeignKey('children.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('username', sa.String(50), nullable=False),  # Kid-friendly username
        sa.Column('pin_hash', sa.String(255), nullable=True),  # Hashed PIN
        sa.Column('avatar_id', sa.String(50), nullable=True),  # Avatar selection
        sa.Column('last_login', sa.DateTime, nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('family_file_id', 'username', name='uq_child_users_family_username')
    )
    op.create_index('ix_child_users_child_id', 'child_users', ['child_id'])
    op.create_index('ix_child_users_family_file_id', 'child_users', ['family_file_id'])

    # Create circle_permissions table (granular permissions per contact/child)
    op.create_table(
        'circle_permissions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('circle_contact_id', sa.String(36), sa.ForeignKey('circle_contacts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('child_id', sa.String(36), sa.ForeignKey('children.id', ondelete='CASCADE'), nullable=False),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id', ondelete='CASCADE'), nullable=False),

        # Feature permissions
        sa.Column('can_video_call', sa.Boolean, default=True),
        sa.Column('can_voice_call', sa.Boolean, default=True),
        sa.Column('can_chat', sa.Boolean, default=True),
        sa.Column('can_theater', sa.Boolean, default=True),

        # Time restrictions
        sa.Column('allowed_days', postgresql.ARRAY(sa.Integer), nullable=True),  # 0=Sun, 1=Mon, etc.
        sa.Column('allowed_start_time', sa.Time, nullable=True),
        sa.Column('allowed_end_time', sa.Time, nullable=True),

        # Session restrictions
        sa.Column('max_call_duration_minutes', sa.Integer, default=60),
        sa.Column('require_parent_present', sa.Boolean, default=False),

        # Audit
        sa.Column('set_by_parent_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),

        sa.UniqueConstraint('circle_contact_id', 'child_id', name='uq_circle_permissions_contact_child')
    )
    op.create_index('ix_circle_permissions_contact', 'circle_permissions', ['circle_contact_id'])
    op.create_index('ix_circle_permissions_child', 'circle_permissions', ['child_id'])
    op.create_index('ix_circle_permissions_family', 'circle_permissions', ['family_file_id'])

    # Create kidcoms_communication_logs table (activity logging)
    op.create_table(
        'kidcoms_communication_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('room_id', sa.String(36), sa.ForeignKey('kidcoms_rooms.id', ondelete='SET NULL'), nullable=True),
        sa.Column('session_id', sa.String(36), sa.ForeignKey('kidcoms_sessions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('child_id', sa.String(36), sa.ForeignKey('children.id', ondelete='CASCADE'), nullable=False),

        # Contact info
        sa.Column('contact_type', sa.String(20), nullable=False),  # 'parent_a', 'parent_b', 'circle'
        sa.Column('contact_id', sa.String(36), nullable=True),  # user_id or circle_contact_id
        sa.Column('contact_name', sa.String(100), nullable=True),

        # Communication details
        sa.Column('communication_type', sa.String(20), nullable=False),  # 'video', 'voice', 'chat', 'theater'
        sa.Column('started_at', sa.DateTime, nullable=False),
        sa.Column('ended_at', sa.DateTime, nullable=True),
        sa.Column('duration_seconds', sa.Integer, nullable=True),

        # ARIA monitoring
        sa.Column('aria_flags', postgresql.JSONB, nullable=True),
        sa.Column('total_messages', sa.Integer, default=0),
        sa.Column('flagged_messages', sa.Integer, default=0),

        # Recording
        sa.Column('recording_url', sa.String(500), nullable=True),

        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_kidcoms_comm_logs_family', 'kidcoms_communication_logs', ['family_file_id'])
    op.create_index('ix_kidcoms_comm_logs_child', 'kidcoms_communication_logs', ['child_id'])
    op.create_index('ix_kidcoms_comm_logs_contact', 'kidcoms_communication_logs', ['contact_id'])
    op.create_index('ix_kidcoms_comm_logs_started', 'kidcoms_communication_logs', ['started_at'])

    # Add columns to circle_contacts for room assignment
    op.add_column('circle_contacts', sa.Column('room_number', sa.Integer, nullable=True))
    op.add_column('circle_contacts', sa.Column('invite_sent_at', sa.DateTime, nullable=True))

    # Add columns to kidcoms_settings for My Circle configuration
    op.add_column('kidcoms_settings', sa.Column('child_pin_enabled', sa.Boolean, server_default='true'))
    op.add_column('kidcoms_settings', sa.Column('circle_enabled', sa.Boolean, server_default='true'))
    op.add_column('kidcoms_settings', sa.Column('default_call_duration', sa.Integer, server_default='60'))


def downgrade() -> None:
    # Remove columns from kidcoms_settings
    op.drop_column('kidcoms_settings', 'default_call_duration')
    op.drop_column('kidcoms_settings', 'circle_enabled')
    op.drop_column('kidcoms_settings', 'child_pin_enabled')

    # Remove columns from circle_contacts
    op.drop_column('circle_contacts', 'invite_sent_at')
    op.drop_column('circle_contacts', 'room_number')

    # Drop indexes and tables in reverse order
    op.drop_index('ix_kidcoms_comm_logs_started', 'kidcoms_communication_logs')
    op.drop_index('ix_kidcoms_comm_logs_contact', 'kidcoms_communication_logs')
    op.drop_index('ix_kidcoms_comm_logs_child', 'kidcoms_communication_logs')
    op.drop_index('ix_kidcoms_comm_logs_family', 'kidcoms_communication_logs')
    op.drop_table('kidcoms_communication_logs')

    op.drop_index('ix_circle_permissions_family', 'circle_permissions')
    op.drop_index('ix_circle_permissions_child', 'circle_permissions')
    op.drop_index('ix_circle_permissions_contact', 'circle_permissions')
    op.drop_table('circle_permissions')

    op.drop_index('ix_child_users_family_file_id', 'child_users')
    op.drop_index('ix_child_users_child_id', 'child_users')
    op.drop_table('child_users')

    op.drop_index('ix_circle_users_invite_token', 'circle_users')
    op.drop_index('ix_circle_users_email', 'circle_users')
    op.drop_table('circle_users')

    op.drop_index('ix_kidcoms_rooms_assigned_to', 'kidcoms_rooms')
    op.drop_index('ix_kidcoms_rooms_family_file_id', 'kidcoms_rooms')
    op.drop_table('kidcoms_rooms')

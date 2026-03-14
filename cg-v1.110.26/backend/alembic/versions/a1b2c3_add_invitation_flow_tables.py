"""Add invitation flow tables (case_invitations and case_events)

Implements the 5 critical fixes from the Invitation Flow Spec:
1. Attorney-branded invitation tracking
2. Magic link token management
3. SendGrid delivery tracking
4. Real-time case events for attorney dashboard
5. Automated follow-up support

Revision ID: a1b2c3_invitation
Revises: None (standalone)
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers
revision = 'a1b2c3_invitation'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create case_invitations table
    op.create_table(
        'case_invitations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime, default=datetime.utcnow, nullable=False),
        sa.Column('updated_at', sa.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False),

        # Invitee info
        sa.Column('invitee_email', sa.String(255), nullable=False, index=True),
        sa.Column('invitee_name', sa.String(200), nullable=True),
        sa.Column('invitee_phone', sa.String(20), nullable=True),

        # Family file link
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id'), nullable=True, index=True),

        # Inviter
        sa.Column('invited_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('invitation_source', sa.String(20), nullable=False, default='parent'),

        # Attorney branding (Fix #1)
        sa.Column('attorney_name', sa.String(200), nullable=True),
        sa.Column('attorney_firm', sa.String(200), nullable=True),
        sa.Column('attorney_email', sa.String(255), nullable=True),

        # Magic link token (Fix #2)
        sa.Column('token', sa.String(64), nullable=False, unique=True, index=True),
        sa.Column('token_expires_at', sa.DateTime, nullable=False),

        # Status
        sa.Column('status', sa.String(20), nullable=False, default='pending', index=True),

        # SendGrid tracking (Fix #5)
        sa.Column('sendgrid_message_id', sa.String(255), nullable=True),
        sa.Column('delivered_at', sa.DateTime, nullable=True),
        sa.Column('opened_at', sa.DateTime, nullable=True),
        sa.Column('clicked_at', sa.DateTime, nullable=True),
        sa.Column('bounced_at', sa.DateTime, nullable=True),
        sa.Column('bounce_reason', sa.Text, nullable=True),

        # Activation
        sa.Column('activated_at', sa.DateTime, nullable=True),
        sa.Column('activated_user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),

        # Auto follow-up (Fix #5)
        sa.Column('resend_count', sa.Integer, default=0, nullable=False),
        sa.Column('last_resent_at', sa.DateTime, nullable=True),
        sa.Column('auto_resend_enabled', sa.Boolean, default=True, nullable=False),

        # Parent role
        sa.Column('parent_role', sa.String(20), default='parent_b', nullable=False),
    )

    # Create case_events table (Fix #4 - Real-time attorney status)
    op.create_table(
        'case_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime, default=datetime.utcnow, nullable=False),
        sa.Column('updated_at', sa.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False),

        # Family file link
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id'), nullable=False, index=True),

        # Event details
        sa.Column('event_type', sa.String(50), nullable=False, index=True),
        sa.Column('event_data', sa.JSON, nullable=True),

        # Actor
        sa.Column('actor_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('actor_type', sa.String(20), default='system', nullable=False),

        # Related invitation
        sa.Column('invitation_id', sa.String(36), sa.ForeignKey('case_invitations.id'), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('case_events')
    op.drop_table('case_invitations')

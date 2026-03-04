"""add professional portal tables

Revision ID: p1r2o3f4e5s6s7
Revises: f1i2r3m4d5i6r7
Create Date: 2026-01-19 15:00:00.000000

Creates all tables needed for the Professional Portal:
- professional_profiles
- firms
- firm_memberships
- case_assignments
- firm_templates
- professional_access_requests
- professional_messages
- professional_access_logs
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'p1r2o3f4e5s6s7'
down_revision: Union[str, None] = 'c1u2s3t4o5d6y7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    """Check if a table exists in the database."""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    """Create professional portal tables."""

    # 1. Create professional_profiles table
    if not table_exists('professional_profiles'):
        op.create_table('professional_profiles',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), unique=True, nullable=False, index=True),

            # Professional identity
            sa.Column('professional_type', sa.String(50), nullable=False, default='attorney'),

            # License/credential info
            sa.Column('license_number', sa.String(100), nullable=True),
            sa.Column('license_state', sa.String(2), nullable=True),
            sa.Column('license_verified', sa.Boolean(), nullable=False, default=False),
            sa.Column('license_verified_at', sa.DateTime(), nullable=True),
            sa.Column('license_verified_by', sa.String(36), nullable=True),

            # Additional credentials
            sa.Column('credentials', sa.JSON(), nullable=True),
            sa.Column('practice_areas', sa.JSON(), nullable=True),

            # Professional contact
            sa.Column('professional_email', sa.String(255), nullable=True),
            sa.Column('professional_phone', sa.String(20), nullable=True),

            # Portal settings
            sa.Column('default_intake_template', sa.String(36), nullable=True),
            sa.Column('notification_preferences', sa.JSON(), nullable=True),

            # Status
            sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
            sa.Column('onboarded_at', sa.DateTime(), nullable=True),

            # Legacy link
            sa.Column('court_professional_id', sa.String(36), sa.ForeignKey('court_professionals.id'), nullable=True),

            # Timestamps
            sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        )

    # 2. Create firms table
    if not table_exists('firms'):
        op.create_table('firms',
            sa.Column('id', sa.String(36), primary_key=True),

            # Identity
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('slug', sa.String(100), unique=True, nullable=False, index=True),
            sa.Column('firm_type', sa.String(50), nullable=False, default='law_firm'),

            # Contact
            sa.Column('email', sa.String(255), nullable=False),
            sa.Column('phone', sa.String(20), nullable=True),
            sa.Column('website', sa.String(500), nullable=True),

            # Address
            sa.Column('address_line1', sa.String(200), nullable=True),
            sa.Column('address_line2', sa.String(200), nullable=True),
            sa.Column('city', sa.String(100), nullable=True),
            sa.Column('state', sa.String(2), nullable=False, default='CA'),
            sa.Column('zip_code', sa.String(20), nullable=True),

            # Branding
            sa.Column('logo_url', sa.String(500), nullable=True),
            sa.Column('primary_color', sa.String(7), nullable=True),

            # Directory
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('practice_areas', sa.JSON(), nullable=True),

            # Settings
            sa.Column('settings', sa.JSON(), nullable=True),

            # Directory visibility
            sa.Column('is_public', sa.Boolean(), nullable=False, default=False),

            # Billing
            sa.Column('stripe_customer_id', sa.String(100), nullable=True),
            sa.Column('subscription_tier', sa.String(20), nullable=False, default='professional'),
            sa.Column('subscription_status', sa.String(20), nullable=False, default='trial'),
            sa.Column('subscription_ends_at', sa.DateTime(), nullable=True),

            # Status
            sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
            sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),

            # Timestamps
            sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        )

    # 3. Create firm_memberships table
    if not table_exists('firm_memberships'):
        op.create_table('firm_memberships',
            sa.Column('id', sa.String(36), primary_key=True),

            # Links
            sa.Column('professional_id', sa.String(36), sa.ForeignKey('professional_profiles.id'), nullable=True, index=True),
            sa.Column('firm_id', sa.String(36), sa.ForeignKey('firms.id'), nullable=False, index=True),

            # Role
            sa.Column('role', sa.String(50), nullable=False, default='attorney'),
            sa.Column('custom_permissions', sa.JSON(), nullable=True),

            # Status
            sa.Column('status', sa.String(20), nullable=False, default='invited'),

            # Invitation
            sa.Column('invite_token', sa.String(64), nullable=True),
            sa.Column('invite_expires_at', sa.DateTime(), nullable=True),
            sa.Column('invited_at', sa.DateTime(), nullable=True),
            sa.Column('invited_by', sa.String(36), nullable=True),
            sa.Column('invite_email', sa.String(255), nullable=True),
            sa.Column('joined_at', sa.DateTime(), nullable=True),

            # Removal
            sa.Column('removed_at', sa.DateTime(), nullable=True),
            sa.Column('removed_by', sa.String(36), nullable=True),
            sa.Column('removal_reason', sa.Text(), nullable=True),

            # Timestamps
            sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),

            sa.UniqueConstraint('professional_id', 'firm_id', name='uq_professional_firm'),
        )

    # 4. Create case_assignments table
    if not table_exists('case_assignments'):
        op.create_table('case_assignments',
            sa.Column('id', sa.String(36), primary_key=True),

            # Links
            sa.Column('professional_id', sa.String(36), sa.ForeignKey('professional_profiles.id'), nullable=False, index=True),
            sa.Column('firm_id', sa.String(36), sa.ForeignKey('firms.id'), nullable=True, index=True),
            sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id'), nullable=False, index=True),
            sa.Column('case_id', sa.String(36), sa.ForeignKey('cases.id'), nullable=True, index=True),

            # Role
            sa.Column('assignment_role', sa.String(50), nullable=False, default='lead_attorney'),
            sa.Column('representing', sa.String(20), nullable=True),

            # Access
            sa.Column('access_scopes', sa.JSON(), nullable=False, default=list),
            sa.Column('can_control_aria', sa.Boolean(), nullable=False, default=False),
            sa.Column('aria_preferences', sa.JSON(), nullable=True),
            sa.Column('can_message_client', sa.Boolean(), nullable=False, default=True),

            # Status
            sa.Column('status', sa.String(20), nullable=False, default='active'),

            # Dates
            sa.Column('assigned_at', sa.DateTime(), nullable=False, default=sa.func.now()),
            sa.Column('assigned_by', sa.String(36), nullable=True),
            sa.Column('completed_at', sa.DateTime(), nullable=True),

            # Notes
            sa.Column('internal_notes', sa.Text(), nullable=True),

            # Timestamps
            sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        )

    # 5. Create firm_templates table
    if not table_exists('firm_templates'):
        op.create_table('firm_templates',
            sa.Column('id', sa.String(36), primary_key=True),

            # Links
            sa.Column('firm_id', sa.String(36), sa.ForeignKey('firms.id'), nullable=False, index=True),
            sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),

            # Template info
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('template_type', sa.String(50), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),

            # Content
            sa.Column('content', sa.JSON(), nullable=False),

            # Versioning
            sa.Column('version', sa.Integer(), nullable=False, default=1),
            sa.Column('is_current', sa.Boolean(), nullable=False, default=True),

            # Status
            sa.Column('is_active', sa.Boolean(), nullable=False, default=True),

            # Usage
            sa.Column('use_count', sa.Integer(), nullable=False, default=0),
            sa.Column('last_used_at', sa.DateTime(), nullable=True),

            # Timestamps
            sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        )

    # 6. Create professional_access_requests table
    if not table_exists('professional_access_requests'):
        op.create_table('professional_access_requests',
            sa.Column('id', sa.String(36), primary_key=True),

            # Case
            sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id'), nullable=False, index=True),

            # Professional
            sa.Column('professional_id', sa.String(36), sa.ForeignKey('professional_profiles.id'), nullable=True, index=True),
            sa.Column('professional_email', sa.String(255), nullable=True),

            # Firm
            sa.Column('firm_id', sa.String(36), sa.ForeignKey('firms.id'), nullable=True, index=True),

            # Request details
            sa.Column('requested_by', sa.String(20), nullable=False),
            sa.Column('requested_by_user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('requested_role', sa.String(50), nullable=False, default='lead_attorney'),
            sa.Column('requested_scopes', sa.JSON(), nullable=False, default=list),
            sa.Column('representing', sa.String(20), nullable=True),

            # Status
            sa.Column('status', sa.String(20), nullable=False, default='pending'),

            # Parent approvals
            sa.Column('parent_a_approved', sa.Boolean(), nullable=False, default=False),
            sa.Column('parent_b_approved', sa.Boolean(), nullable=False, default=False),
            sa.Column('parent_a_approved_at', sa.DateTime(), nullable=True),
            sa.Column('parent_b_approved_at', sa.DateTime(), nullable=True),

            # Resolution
            sa.Column('approved_at', sa.DateTime(), nullable=True),
            sa.Column('declined_at', sa.DateTime(), nullable=True),
            sa.Column('decline_reason', sa.Text(), nullable=True),

            # Assignment (after approval)
            sa.Column('case_assignment_id', sa.String(36), sa.ForeignKey('case_assignments.id'), nullable=True),

            # Expiration
            sa.Column('expires_at', sa.DateTime(), nullable=False),

            # Access token for email invites
            sa.Column('access_token', sa.String(64), nullable=True),

            # Message
            sa.Column('message', sa.Text(), nullable=True),

            # Professional acceptance
            sa.Column('professional_accepted', sa.Boolean(), nullable=False, default=False),
            sa.Column('professional_accepted_at', sa.DateTime(), nullable=True),

            # Timestamps
            sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        )

    # 7. Create professional_messages table
    if not table_exists('professional_messages'):
        op.create_table('professional_messages',
            sa.Column('id', sa.String(36), primary_key=True),

            # Context
            sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id'), nullable=False, index=True),
            sa.Column('case_assignment_id', sa.String(36), sa.ForeignKey('case_assignments.id'), nullable=False, index=True),

            # Sender
            sa.Column('sender_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('sender_type', sa.String(20), nullable=False),

            # Recipient
            sa.Column('recipient_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),

            # Content
            sa.Column('subject', sa.String(200), nullable=True),
            sa.Column('content', sa.Text(), nullable=False),

            # Threading
            sa.Column('thread_id', sa.String(36), nullable=True, index=True),
            sa.Column('reply_to_id', sa.String(36), sa.ForeignKey('professional_messages.id'), nullable=True),

            # Status
            sa.Column('is_read', sa.Boolean(), nullable=False, default=False),
            sa.Column('read_at', sa.DateTime(), nullable=True),

            # Attachments
            sa.Column('attachments', sa.JSON(), nullable=True),

            # Sent time
            sa.Column('sent_at', sa.DateTime(), nullable=False, default=sa.func.now()),

            # Timestamps
            sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        )

    # 8. Create professional_access_logs table
    if not table_exists('professional_access_logs'):
        op.create_table('professional_access_logs',
            sa.Column('id', sa.String(36), primary_key=True),

            # Who
            sa.Column('professional_id', sa.String(36), sa.ForeignKey('professional_profiles.id'), nullable=False, index=True),
            sa.Column('firm_id', sa.String(36), sa.ForeignKey('firms.id'), nullable=True, index=True),

            # What case
            sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id'), nullable=False, index=True),

            # Action
            sa.Column('action', sa.String(100), nullable=False, index=True),

            # Resource
            sa.Column('resource_type', sa.String(50), nullable=True),
            sa.Column('resource_id', sa.String(36), nullable=True),

            # Details
            sa.Column('details', sa.JSON(), nullable=True),

            # Request info
            sa.Column('ip_address', sa.String(45), nullable=True),
            sa.Column('user_agent', sa.String(500), nullable=True),

            # Timestamps
            sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        )


def downgrade() -> None:
    """Drop professional portal tables in reverse order."""
    op.drop_table('professional_access_logs')
    op.drop_table('professional_messages')
    op.drop_table('professional_access_requests')
    op.drop_table('firm_templates')
    op.drop_table('case_assignments')
    op.drop_table('firm_memberships')
    op.drop_table('firms')
    op.drop_table('professional_profiles')

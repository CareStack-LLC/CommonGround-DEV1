"""Add professional portal tables and fields.

Revision ID: p1r2o3f4p5o6
Revises: s2t3r4i5p6e7
Create Date: 2026-01-18

This migration adds the Professional Portal for family law practices:
- firms table (law firms and practices)
- professional_profiles table (links users to professional roles)
- firm_memberships table (firm staff with roles)
- case_assignments table (professional access to cases)
- firm_templates table (reusable templates)
- professional_access_requests table (invitation flow)
- professional_messages table (lawyer-client messaging)
- professional_access_logs table (audit trail)
- Updates intake_sessions with firm context
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime


# revision identifiers, used by Alembic.
revision = "p1r2o3f4p5o6"
down_revision = "s2t3r4i5p6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ==========================================================================
    # 1. Create firms table
    # ==========================================================================
    op.create_table(
        "firms",
        sa.Column("id", sa.String(36), primary_key=True),
        # Identity
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("firm_type", sa.String(50), nullable=False, server_default="law_firm"),
        # Contact
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        # Address
        sa.Column("address_line1", sa.String(200), nullable=True),
        sa.Column("address_line2", sa.String(200), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(2), nullable=False, server_default="CA"),
        sa.Column("zip_code", sa.String(20), nullable=True),
        # Branding
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("primary_color", sa.String(7), nullable=True),
        # Settings
        sa.Column("settings", JSONB(), nullable=True),
        # Directory visibility
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"),
        # Billing (future)
        sa.Column("stripe_customer_id", sa.String(100), nullable=True),
        sa.Column("subscription_tier", sa.String(20), nullable=False, server_default="professional"),
        sa.Column("subscription_status", sa.String(20), nullable=False, server_default="trial"),
        sa.Column("subscription_ends_at", sa.DateTime(), nullable=True),
        # Status
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # ==========================================================================
    # 2. Create professional_profiles table
    # ==========================================================================
    op.create_table(
        "professional_profiles",
        sa.Column("id", sa.String(36), primary_key=True),
        # Link to User
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), unique=True, nullable=False, index=True),
        # Professional identity
        sa.Column("professional_type", sa.String(50), nullable=False, server_default="attorney"),
        # License
        sa.Column("license_number", sa.String(100), nullable=True),
        sa.Column("license_state", sa.String(2), nullable=True),
        sa.Column("license_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("license_verified_at", sa.DateTime(), nullable=True),
        sa.Column("license_verified_by", sa.String(36), nullable=True),
        # Credentials
        sa.Column("credentials", JSONB(), nullable=True),
        sa.Column("practice_areas", JSONB(), nullable=True),
        # Professional contact
        sa.Column("professional_email", sa.String(255), nullable=True),
        sa.Column("professional_phone", sa.String(20), nullable=True),
        # Portal settings
        sa.Column("default_intake_template", sa.String(36), nullable=True),
        sa.Column("notification_preferences", JSONB(), nullable=True),
        # Status
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("onboarded_at", sa.DateTime(), nullable=True),
        # Legacy link
        sa.Column("court_professional_id", sa.String(36), sa.ForeignKey("court_professionals.id"), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # ==========================================================================
    # 3. Create firm_memberships table
    # ==========================================================================
    op.create_table(
        "firm_memberships",
        sa.Column("id", sa.String(36), primary_key=True),
        # Links
        sa.Column("professional_id", sa.String(36), sa.ForeignKey("professional_profiles.id"), nullable=False, index=True),
        sa.Column("firm_id", sa.String(36), sa.ForeignKey("firms.id"), nullable=False, index=True),
        # Role
        sa.Column("role", sa.String(50), nullable=False, server_default="attorney"),
        sa.Column("custom_permissions", JSONB(), nullable=True),
        # Status
        sa.Column("status", sa.String(20), nullable=False, server_default="invited"),
        # Invitation flow
        sa.Column("invite_token", sa.String(64), nullable=True),
        sa.Column("invite_expires_at", sa.DateTime(), nullable=True),
        sa.Column("invited_at", sa.DateTime(), nullable=True),
        sa.Column("invited_by", sa.String(36), nullable=True),
        sa.Column("invite_email", sa.String(255), nullable=True),
        sa.Column("joined_at", sa.DateTime(), nullable=True),
        # Removal
        sa.Column("removed_at", sa.DateTime(), nullable=True),
        sa.Column("removed_by", sa.String(36), nullable=True),
        sa.Column("removal_reason", sa.Text(), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        # Unique constraint
        sa.UniqueConstraint("professional_id", "firm_id", name="uq_professional_firm"),
    )

    # ==========================================================================
    # 4. Create case_assignments table
    # ==========================================================================
    op.create_table(
        "case_assignments",
        sa.Column("id", sa.String(36), primary_key=True),
        # Links
        sa.Column("professional_id", sa.String(36), sa.ForeignKey("professional_profiles.id"), nullable=False, index=True),
        sa.Column("firm_id", sa.String(36), sa.ForeignKey("firms.id"), nullable=False, index=True),
        sa.Column("family_file_id", sa.String(36), sa.ForeignKey("family_files.id"), nullable=False, index=True),
        sa.Column("case_id", sa.String(36), sa.ForeignKey("cases.id"), nullable=True, index=True),
        # Role
        sa.Column("assignment_role", sa.String(50), nullable=False, server_default="attorney"),
        sa.Column("representing", sa.String(20), nullable=True),
        # Access
        sa.Column("access_scopes", JSONB(), nullable=False, server_default="[]"),
        sa.Column("can_control_aria", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("aria_preferences", JSONB(), nullable=True),
        sa.Column("can_message_client", sa.Boolean(), nullable=False, server_default="true"),
        # Status
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        # Dates
        sa.Column("assigned_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("assigned_by", sa.String(36), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        # Notes
        sa.Column("internal_notes", sa.Text(), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # ==========================================================================
    # 5. Create firm_templates table
    # ==========================================================================
    op.create_table(
        "firm_templates",
        sa.Column("id", sa.String(36), primary_key=True),
        # Links
        sa.Column("firm_id", sa.String(36), sa.ForeignKey("firms.id"), nullable=False, index=True),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        # Template info
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("template_type", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        # Content
        sa.Column("content", JSONB(), nullable=False),
        # Versioning
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default="true"),
        # Status
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        # Usage
        sa.Column("use_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # ==========================================================================
    # 6. Create professional_access_requests table
    # ==========================================================================
    op.create_table(
        "professional_access_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        # Case
        sa.Column("family_file_id", sa.String(36), sa.ForeignKey("family_files.id"), nullable=False, index=True),
        # Professional (if known)
        sa.Column("professional_id", sa.String(36), sa.ForeignKey("professional_profiles.id"), nullable=True, index=True),
        sa.Column("professional_email", sa.String(255), nullable=True),
        # Firm (optional)
        sa.Column("firm_id", sa.String(36), sa.ForeignKey("firms.id"), nullable=True, index=True),
        # Requester
        sa.Column("requested_by", sa.String(20), nullable=False),
        sa.Column("requested_by_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True),
        # Requested access
        sa.Column("requested_role", sa.String(50), nullable=False, server_default="attorney"),
        sa.Column("requested_scopes", JSONB(), nullable=False, server_default="[]"),
        sa.Column("representing", sa.String(20), nullable=True),
        # Status
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        # Approvals
        sa.Column("parent_a_approved", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("parent_b_approved", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("parent_a_approved_at", sa.DateTime(), nullable=True),
        sa.Column("parent_b_approved_at", sa.DateTime(), nullable=True),
        # Resolution
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("declined_at", sa.DateTime(), nullable=True),
        sa.Column("decline_reason", sa.Text(), nullable=True),
        # Created assignment
        sa.Column("case_assignment_id", sa.String(36), sa.ForeignKey("case_assignments.id"), nullable=True),
        # Expiration
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("access_token", sa.String(64), nullable=True),
        # Message
        sa.Column("message", sa.Text(), nullable=True),
        # Professional acceptance (for parent-initiated invites)
        sa.Column("professional_accepted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("professional_accepted_at", sa.DateTime(), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # ==========================================================================
    # 7. Create professional_messages table
    # ==========================================================================
    op.create_table(
        "professional_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        # Context
        sa.Column("family_file_id", sa.String(36), sa.ForeignKey("family_files.id"), nullable=False, index=True),
        sa.Column("case_assignment_id", sa.String(36), sa.ForeignKey("case_assignments.id"), nullable=False, index=True),
        # Sender
        sa.Column("sender_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("sender_type", sa.String(20), nullable=False),
        # Recipient
        sa.Column("recipient_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True),
        # Content
        sa.Column("subject", sa.String(200), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        # Threading
        sa.Column("thread_id", sa.String(36), nullable=True, index=True),
        sa.Column("reply_to_id", sa.String(36), sa.ForeignKey("professional_messages.id"), nullable=True),
        # Status
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        # Attachments
        sa.Column("attachments", JSONB(), nullable=True),
        # Timestamps
        sa.Column("sent_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # ==========================================================================
    # 8. Create professional_access_logs table
    # ==========================================================================
    op.create_table(
        "professional_access_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        # Who
        sa.Column("professional_id", sa.String(36), sa.ForeignKey("professional_profiles.id"), nullable=False, index=True),
        sa.Column("firm_id", sa.String(36), sa.ForeignKey("firms.id"), nullable=True, index=True),
        # What case
        sa.Column("family_file_id", sa.String(36), sa.ForeignKey("family_files.id"), nullable=False, index=True),
        # Action
        sa.Column("action", sa.String(100), nullable=False, index=True),
        sa.Column("resource_type", sa.String(50), nullable=True),
        sa.Column("resource_id", sa.String(36), nullable=True),
        sa.Column("details", JSONB(), nullable=True),
        # Request info
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        # Timestamp (immutable)
        sa.Column("logged_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # ==========================================================================
    # 9. Add firm context to intake_sessions
    # ==========================================================================
    op.add_column(
        "intake_sessions",
        sa.Column("firm_id", sa.String(36), sa.ForeignKey("firms.id"), nullable=True, index=True)
    )
    op.add_column(
        "intake_sessions",
        sa.Column("case_assignment_id", sa.String(36), sa.ForeignKey("case_assignments.id"), nullable=True, index=True)
    )

    # ==========================================================================
    # 10. Create indexes for common queries
    # ==========================================================================
    op.create_index("idx_case_assignments_status", "case_assignments", ["status"])
    op.create_index("idx_firm_memberships_status", "firm_memberships", ["status"])
    op.create_index("idx_professional_access_requests_status", "professional_access_requests", ["status"])
    op.create_index("idx_professional_messages_thread", "professional_messages", ["thread_id"])
    op.create_index("idx_professional_access_logs_action", "professional_access_logs", ["action"])
    op.create_index("idx_professional_access_logs_logged_at", "professional_access_logs", ["logged_at"])


def downgrade() -> None:
    # Remove indexes
    op.drop_index("idx_professional_access_logs_logged_at", table_name="professional_access_logs")
    op.drop_index("idx_professional_access_logs_action", table_name="professional_access_logs")
    op.drop_index("idx_professional_messages_thread", table_name="professional_messages")
    op.drop_index("idx_professional_access_requests_status", table_name="professional_access_requests")
    op.drop_index("idx_firm_memberships_status", table_name="firm_memberships")
    op.drop_index("idx_case_assignments_status", table_name="case_assignments")

    # Remove columns from intake_sessions
    op.drop_column("intake_sessions", "case_assignment_id")
    op.drop_column("intake_sessions", "firm_id")

    # Drop tables in reverse order
    op.drop_table("professional_access_logs")
    op.drop_table("professional_messages")
    op.drop_table("professional_access_requests")
    op.drop_table("firm_templates")
    op.drop_table("case_assignments")
    op.drop_table("firm_memberships")
    op.drop_table("professional_profiles")
    op.drop_table("firms")

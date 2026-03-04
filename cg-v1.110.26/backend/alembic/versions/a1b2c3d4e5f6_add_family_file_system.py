"""add_family_file_system

Revision ID: a1b2c3d4e5f6
Revises: 71f233c62f14
Create Date: 2026-01-04

Family File System:
- FamilyFile: Root container for family data (replaces Case for parent records)
- CourtCustodyCase: Official court matters linked to a Family File
- QuickAccord: Lightweight situational agreements between parents
- Updates to Agreement and Child models for FamilyFile linkage
- Auto-migration from existing Cases to Family Files
"""
from typing import Sequence, Union
from datetime import datetime
import secrets
import string

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '71f233c62f14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def generate_family_file_number() -> str:
    """Generate a unique Family File number (FF-XXXXXX)."""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(6))
    return f"FF-{random_part}"


def generate_quick_accord_number() -> str:
    """Generate a unique QuickAccord number (QA-XXXXXX)."""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(6))
    return f"QA-{random_part}"


def generate_shared_care_number() -> str:
    """Generate a unique SharedCare Agreement number (SCA-XXXXXX)."""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(6))
    return f"SCA-{random_part}"


def upgrade() -> None:
    """Create Family File system tables and migrate existing data."""

    # ============================================================
    # 1. CREATE FAMILY_FILES TABLE
    # ============================================================
    op.create_table(
        'family_files',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),

        # Identity
        sa.Column('family_file_number', sa.String(20), unique=True, nullable=False, index=True),
        sa.Column('title', sa.String(200), nullable=False),

        # Created by
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),

        # Parent A (initiating parent)
        sa.Column('parent_a_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('parent_a_role', sa.String(20), server_default='parent_a'),

        # Parent B (invited parent - can be null)
        sa.Column('parent_b_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('parent_b_role', sa.String(20), nullable=True),
        sa.Column('parent_b_email', sa.String(255), nullable=True),
        sa.Column('parent_b_invited_at', sa.DateTime(), nullable=True),
        sa.Column('parent_b_joined_at', sa.DateTime(), nullable=True),

        # Status
        sa.Column('status', sa.String(20), server_default='active'),
        sa.Column('conflict_level', sa.String(20), server_default='low'),

        # Jurisdiction
        sa.Column('state', sa.String(2), nullable=True),
        sa.Column('county', sa.String(100), nullable=True),

        # Settings
        sa.Column('aria_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('aria_provider', sa.String(20), server_default='claude'),
        sa.Column('aria_disabled_at', sa.DateTime(), nullable=True),
        sa.Column('aria_disabled_by', sa.String(36), nullable=True),
        sa.Column('require_joint_approval', sa.Boolean(), server_default='true', nullable=False),

        # Legacy link
        sa.Column('legacy_case_id', sa.String(36), nullable=True, index=True),
    )

    # ============================================================
    # 2. CREATE COURT_CUSTODY_CASES TABLE
    # ============================================================
    op.create_table(
        'court_custody_cases',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),

        # Family File link
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id'),
                  unique=True, nullable=False, index=True),

        # Court identification
        sa.Column('case_number', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('case_type', sa.String(50), server_default='custody'),

        # Jurisdiction
        sa.Column('jurisdiction_state', sa.String(2), nullable=False),
        sa.Column('jurisdiction_county', sa.String(100), nullable=True),
        sa.Column('court_name', sa.String(200), nullable=True),

        # Parties
        sa.Column('petitioner_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('respondent_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),

        # Attorneys
        sa.Column('petitioner_attorney', sa.String(200), nullable=True),
        sa.Column('respondent_attorney', sa.String(200), nullable=True),

        # Court professionals
        sa.Column('assigned_gal', sa.String(36), nullable=True),
        sa.Column('assigned_caseworker', sa.String(36), nullable=True),
        sa.Column('judge_name', sa.String(200), nullable=True),

        # Key dates
        sa.Column('filing_date', sa.DateTime(), nullable=True),
        sa.Column('last_court_date', sa.DateTime(), nullable=True),
        sa.Column('next_court_date', sa.DateTime(), nullable=True),
        sa.Column('order_effective_date', sa.DateTime(), nullable=True),

        # Court orders (JSON)
        sa.Column('custody_orders', sa.JSON(), nullable=True),
        sa.Column('parenting_time_orders', sa.JSON(), nullable=True),
        sa.Column('exchange_rules', sa.JSON(), nullable=True),
        sa.Column('restrictions', sa.JSON(), nullable=True),

        # System controls
        sa.Column('gps_checkin_required', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('supervised_exchange_required', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('aria_enforcement_locked', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('agreement_editing_locked', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('investigation_mode', sa.Boolean(), server_default='false', nullable=False),

        # Status
        sa.Column('status', sa.String(20), server_default='active'),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('status_reason', sa.Text(), nullable=True),
    )

    # ============================================================
    # 3. CREATE QUICK_ACCORDS TABLE
    # ============================================================
    op.create_table(
        'quick_accords',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),

        # Family File link
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id'),
                  nullable=False, index=True),

        # Identity
        sa.Column('accord_number', sa.String(20), unique=True, nullable=False, index=True),
        sa.Column('title', sa.String(200), nullable=False),

        # Purpose
        sa.Column('purpose_category', sa.String(50), nullable=False),
        sa.Column('purpose_description', sa.Text(), nullable=True),
        sa.Column('is_single_event', sa.Boolean(), server_default='true', nullable=False),

        # Dates
        sa.Column('event_date', sa.DateTime(), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('end_date', sa.DateTime(), nullable=True),

        # Children
        sa.Column('child_ids', sa.JSON(), server_default='[]'),

        # Logistics
        sa.Column('location', sa.String(500), nullable=True),
        sa.Column('pickup_responsibility', sa.String(100), nullable=True),
        sa.Column('dropoff_responsibility', sa.String(100), nullable=True),
        sa.Column('transportation_notes', sa.Text(), nullable=True),

        # Financial
        sa.Column('has_shared_expense', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('estimated_amount', sa.Float(), nullable=True),
        sa.Column('expense_category', sa.String(50), nullable=True),
        sa.Column('receipt_required', sa.Boolean(), server_default='false', nullable=False),

        # Initiated by
        sa.Column('initiated_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),

        # Status
        sa.Column('status', sa.String(20), server_default='draft'),

        # Approval
        sa.Column('parent_a_approved', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('parent_a_approved_at', sa.DateTime(), nullable=True),
        sa.Column('parent_b_approved', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('parent_b_approved_at', sa.DateTime(), nullable=True),

        # ARIA integration
        sa.Column('aria_conversation_id', sa.String(36), nullable=True),
        sa.Column('ai_summary', sa.Text(), nullable=True),

        # Verification
        sa.Column('pdf_url', sa.String(500), nullable=True),
        sa.Column('pdf_hash', sa.String(64), nullable=True),

        # Attestation
        sa.Column('attestation_text', sa.Text(),
                  server_default='I attest this agreement reflects our mutual understanding for this specific situation.'),
    )

    # ============================================================
    # 4. UPDATE AGREEMENTS TABLE
    # ============================================================

    # Add family_file_id column
    op.add_column('agreements',
        sa.Column('family_file_id', sa.String(36), nullable=True, index=True))

    # Add agreement_number column
    op.add_column('agreements',
        sa.Column('agreement_number', sa.String(20), nullable=True, unique=True, index=True))

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_agreements_family_file_id',
        'agreements', 'family_files',
        ['family_file_id'], ['id']
    )

    # Make case_id nullable for new agreements
    op.alter_column('agreements', 'case_id',
        existing_type=sa.String(36),
        nullable=True)

    # ============================================================
    # 5. UPDATE CHILDREN TABLE
    # ============================================================

    # Add family_file_id column
    op.add_column('children',
        sa.Column('family_file_id', sa.String(36), nullable=True, index=True))

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_children_family_file_id',
        'children', 'family_files',
        ['family_file_id'], ['id']
    )

    # Make case_id nullable
    op.alter_column('children', 'case_id',
        existing_type=sa.String(36),
        nullable=True)

    # ============================================================
    # 6. AUTO-MIGRATION: Cases -> Family Files
    # ============================================================

    # This is handled by a data migration script run separately
    # to avoid complex SQL in the migration itself.
    # See: scripts/migrate_cases_to_family_files.py


def downgrade() -> None:
    """Remove Family File system tables and revert changes."""

    # Remove foreign key constraints
    op.drop_constraint('fk_children_family_file_id', 'children', type_='foreignkey')
    op.drop_constraint('fk_agreements_family_file_id', 'agreements', type_='foreignkey')

    # Remove columns from children
    op.drop_column('children', 'family_file_id')

    # Remove columns from agreements
    op.drop_column('agreements', 'agreement_number')
    op.drop_column('agreements', 'family_file_id')

    # Make case_id non-nullable again
    op.alter_column('agreements', 'case_id',
        existing_type=sa.String(36),
        nullable=False)
    op.alter_column('children', 'case_id',
        existing_type=sa.String(36),
        nullable=False)

    # Drop tables in reverse order
    op.drop_table('quick_accords')
    op.drop_table('court_custody_cases')
    op.drop_table('family_files')

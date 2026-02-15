"""Professional Portal Phase 1 - Schema Gap-Fill

Adds:
- New columns to professional_profiles (subscription tier, billing, directory)
- New columns to compliance_reports (SHA-256, export format, signature)
- New table: ocr_documents (OCR processing pipeline)
- New table: field_locks (court-order field locking)

Revision ID: pp_phase1_001
Revises: (latest)
Create Date: 2026-02-15 12:46:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'pp_phase1_001'
down_revision = None  # Will be auto-set by Alembic chain
branch_labels = None
depends_on = None


def upgrade() -> None:
    # =========================================================================
    # 1. ALTER professional_profiles — add subscription & directory columns
    # =========================================================================
    op.add_column('professional_profiles', sa.Column(
        'subscription_tier', sa.String(20), nullable=False, server_default='starter'
    ))
    op.add_column('professional_profiles', sa.Column(
        'max_active_cases', sa.Integer(), nullable=False, server_default='3'
    ))
    op.add_column('professional_profiles', sa.Column(
        'active_case_count', sa.Integer(), nullable=False, server_default='0'
    ))
    op.add_column('professional_profiles', sa.Column(
        'stripe_customer_id', sa.String(100), nullable=True
    ))
    op.add_column('professional_profiles', sa.Column(
        'stripe_subscription_id', sa.String(100), nullable=True
    ))
    op.add_column('professional_profiles', sa.Column(
        'subscription_status', sa.String(20), nullable=False, server_default='trial'
    ))
    op.add_column('professional_profiles', sa.Column(
        'subscription_ends_at', sa.DateTime(), nullable=True
    ))
    op.add_column('professional_profiles', sa.Column(
        'is_public', sa.Boolean(), nullable=False, server_default='false'
    ))
    op.add_column('professional_profiles', sa.Column(
        'is_featured', sa.Boolean(), nullable=False, server_default='false'
    ))
    op.add_column('professional_profiles', sa.Column(
        'featured_approved_at', sa.DateTime(), nullable=True
    ))
    op.add_column('professional_profiles', sa.Column(
        'jurisdictions', sa.JSON(), nullable=True
    ))
    op.add_column('professional_profiles', sa.Column(
        'office_address', sa.JSON(), nullable=True
    ))

    # =========================================================================
    # 2. ALTER compliance_reports — add SHA-256, export format, signature
    # =========================================================================
    op.add_column('compliance_reports', sa.Column(
        'title', sa.String(300), nullable=True
    ))
    op.add_column('compliance_reports', sa.Column(
        'export_format', sa.String(10), nullable=False, server_default='pdf'
    ))
    op.add_column('compliance_reports', sa.Column(
        'sha256_hash', sa.String(64), nullable=True
    ))
    op.add_column('compliance_reports', sa.Column(
        'signature_line', sa.String(300), nullable=True
    ))
    op.add_column('compliance_reports', sa.Column(
        'raw_data_included', sa.Boolean(), nullable=False, server_default='true'
    ))
    op.add_column('compliance_reports', sa.Column(
        'download_count', sa.Integer(), nullable=False, server_default='0'
    ))
    op.add_column('compliance_reports', sa.Column(
        'last_downloaded_at', sa.DateTime(), nullable=True
    ))

    # =========================================================================
    # 3. CREATE TABLE ocr_documents
    # =========================================================================
    op.create_table(
        'ocr_documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        # Context
        sa.Column('case_assignment_id', sa.String(36),
                  sa.ForeignKey('case_assignments.id'), nullable=True, index=True),
        sa.Column('family_file_id', sa.String(36),
                  sa.ForeignKey('family_files.id'), nullable=False, index=True),
        sa.Column('uploaded_by_id', sa.String(36),
                  sa.ForeignKey('professional_profiles.id'), nullable=False, index=True),
        # Source document
        sa.Column('file_url', sa.String(500), nullable=False),
        sa.Column('original_filename', sa.String(300), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(50), nullable=False, server_default='application/pdf'),
        # Detection
        sa.Column('detected_form_type', sa.String(20), nullable=True),
        sa.Column('detection_confidence', sa.Float(), nullable=True),
        # Pipeline
        sa.Column('extraction_status', sa.String(20), nullable=False, server_default='pending'),
        # Extraction results
        sa.Column('extracted_data', sa.JSON(), nullable=True),
        sa.Column('confidence_scores', sa.JSON(), nullable=True),
        sa.Column('low_confidence_fields', sa.JSON(), nullable=True),
        sa.Column('professional_corrections', sa.JSON(), nullable=True),
        # Processing metadata
        sa.Column('processing_started_at', sa.DateTime(), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(), nullable=True),
        sa.Column('processing_error', sa.Text(), nullable=True),
        # Approval
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by_id', sa.String(36),
                  sa.ForeignKey('professional_profiles.id'), nullable=True),
        sa.Column('rejected_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        # Output
        sa.Column('created_agreement_id', sa.String(36),
                  sa.ForeignKey('agreements.id'), nullable=True),
    )

    # =========================================================================
    # 4. CREATE TABLE field_locks
    # =========================================================================
    op.create_table(
        'field_locks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        # What is locked
        sa.Column('family_file_id', sa.String(36),
                  sa.ForeignKey('family_files.id'), nullable=False, index=True),
        sa.Column('agreement_id', sa.String(36),
                  sa.ForeignKey('agreements.id'), nullable=False, index=True),
        sa.Column('ocr_document_id', sa.String(36),
                  sa.ForeignKey('ocr_documents.id'), nullable=True, index=True),
        # Who locked it
        sa.Column('locked_by_professional_id', sa.String(36),
                  sa.ForeignKey('professional_profiles.id'), nullable=False, index=True),
        # What field
        sa.Column('field_path', sa.String(300), nullable=False, index=True),
        sa.Column('case_number', sa.String(100), nullable=False),
        # Lock state
        sa.Column('locked_at', sa.DateTime(), nullable=False),
        sa.Column('is_locked', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('unlocked_at', sa.DateTime(), nullable=True),
        sa.Column('unlocked_by_id', sa.String(36),
                  sa.ForeignKey('professional_profiles.id'), nullable=True),
        sa.Column('unlock_reason', sa.Text(), nullable=True),
        # Unique constraint
        sa.UniqueConstraint('agreement_id', 'field_path', name='uq_agreement_field_lock'),
    )

    # =========================================================================
    # 5. RLS Policies (Supabase)
    # =========================================================================
    # Note: RLS policies for new tables.
    # OCR documents: only the uploading professional or firm members can access
    # Field locks: professionals with case assignment can read; only lock creator can unlock
    op.execute("""
        -- Enable RLS on new tables
        ALTER TABLE ocr_documents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE field_locks ENABLE ROW LEVEL SECURITY;

        -- OCR Documents: Professional who uploaded can manage
        CREATE POLICY ocr_documents_professional_access ON ocr_documents
            FOR ALL
            USING (
                uploaded_by_id IN (
                    SELECT id FROM professional_profiles
                    WHERE user_id = auth.uid()::text
                )
            );

        -- Field Locks: Any professional with case assignment can read
        CREATE POLICY field_locks_read_access ON field_locks
            FOR SELECT
            USING (
                family_file_id IN (
                    SELECT ca.family_file_id FROM case_assignments ca
                    JOIN professional_profiles pp ON pp.id = ca.professional_id
                    WHERE pp.user_id = auth.uid()::text
                    AND ca.status = 'active'
                )
            );

        -- Field Locks: Only lock creator can modify (unlock)
        CREATE POLICY field_locks_modify_access ON field_locks
            FOR UPDATE
            USING (
                locked_by_professional_id IN (
                    SELECT id FROM professional_profiles
                    WHERE user_id = auth.uid()::text
                )
            );
    """)


def downgrade() -> None:
    # Drop RLS policies first
    op.execute("""
        DROP POLICY IF EXISTS field_locks_modify_access ON field_locks;
        DROP POLICY IF EXISTS field_locks_read_access ON field_locks;
        DROP POLICY IF EXISTS ocr_documents_professional_access ON ocr_documents;
    """)

    # Drop new tables
    op.drop_table('field_locks')
    op.drop_table('ocr_documents')

    # Remove new columns from compliance_reports
    op.drop_column('compliance_reports', 'last_downloaded_at')
    op.drop_column('compliance_reports', 'download_count')
    op.drop_column('compliance_reports', 'raw_data_included')
    op.drop_column('compliance_reports', 'signature_line')
    op.drop_column('compliance_reports', 'sha256_hash')
    op.drop_column('compliance_reports', 'export_format')
    op.drop_column('compliance_reports', 'title')

    # Remove new columns from professional_profiles
    op.drop_column('professional_profiles', 'office_address')
    op.drop_column('professional_profiles', 'jurisdictions')
    op.drop_column('professional_profiles', 'featured_approved_at')
    op.drop_column('professional_profiles', 'is_featured')
    op.drop_column('professional_profiles', 'is_public')
    op.drop_column('professional_profiles', 'subscription_ends_at')
    op.drop_column('professional_profiles', 'subscription_status')
    op.drop_column('professional_profiles', 'stripe_subscription_id')
    op.drop_column('professional_profiles', 'stripe_customer_id')
    op.drop_column('professional_profiles', 'active_case_count')
    op.drop_column('professional_profiles', 'max_active_cases')
    op.drop_column('professional_profiles', 'subscription_tier')

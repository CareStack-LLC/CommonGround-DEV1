"""Add CaseExport tables

Revision ID: 1c9a6143d966
Revises: 8329cf5409d0
Create Date: 2026-01-01 00:10:35.067081

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1c9a6143d966'
down_revision: Union[str, Sequence[str], None] = '8329cf5409d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add CaseExport tables."""
    # Create redaction_rules table
    op.create_table('redaction_rules',
        sa.Column('rule_name', sa.String(length=100), nullable=False),
        sa.Column('rule_type', sa.String(length=50), nullable=False),
        sa.Column('pattern', sa.Text(), nullable=False),
        sa.Column('replacement', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('applies_to', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('redaction_level', sa.String(length=20), nullable=False),
        sa.Column('jurisdiction', sa.String(length=10), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('rule_name')
    )

    # Create case_exports table
    op.create_table('case_exports',
        sa.Column('case_id', sa.String(length=36), nullable=False),
        sa.Column('generated_by', sa.String(length=36), nullable=False),
        sa.Column('generator_type', sa.String(length=20), nullable=False),
        sa.Column('export_number', sa.String(length=50), nullable=False),
        sa.Column('package_type', sa.String(length=30), nullable=False),
        sa.Column('claim_type', sa.String(length=50), nullable=True),
        sa.Column('claim_description', sa.Text(), nullable=True),
        sa.Column('date_range_start', sa.Date(), nullable=False),
        sa.Column('date_range_end', sa.Date(), nullable=False),
        sa.Column('sections_included', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('redaction_level', sa.String(length=20), nullable=False),
        sa.Column('message_content_redacted', sa.Boolean(), nullable=False),
        sa.Column('sealed_items_included', sa.Boolean(), nullable=False),
        sa.Column('file_url', sa.String(length=500), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('content_hash', sa.String(length=64), nullable=True),
        sa.Column('chain_hash', sa.String(length=64), nullable=True),
        sa.Column('watermark_text', sa.String(length=500), nullable=True),
        sa.Column('verification_url', sa.String(length=500), nullable=True),
        sa.Column('evidence_counts', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('download_count', sa.Integer(), nullable=False),
        sa.Column('last_downloaded_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('is_permanent', sa.Boolean(), nullable=False),
        sa.Column('generated_at', sa.DateTime(), nullable=True),
        sa.Column('generation_time_seconds', sa.Integer(), nullable=True),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ),
        sa.ForeignKeyConstraint(['generated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_case_exports_case_id'), 'case_exports', ['case_id'], unique=False)
    op.create_index(op.f('ix_case_exports_export_number'), 'case_exports', ['export_number'], unique=True)
    op.create_index(op.f('ix_case_exports_generated_by'), 'case_exports', ['generated_by'], unique=False)

    # Create export_sections table
    op.create_table('export_sections',
        sa.Column('export_id', sa.String(length=36), nullable=False),
        sa.Column('section_type', sa.String(length=50), nullable=False),
        sa.Column('section_order', sa.Integer(), nullable=False),
        sa.Column('section_title', sa.String(length=200), nullable=False),
        sa.Column('content_json', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('page_start', sa.Integer(), nullable=True),
        sa.Column('page_end', sa.Integer(), nullable=True),
        sa.Column('evidence_count', sa.Integer(), nullable=False),
        sa.Column('data_sources', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('generation_time_ms', sa.Integer(), nullable=True),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['export_id'], ['case_exports.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_export_sections_export_id'), 'export_sections', ['export_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema - remove CaseExport tables."""
    op.drop_index(op.f('ix_export_sections_export_id'), table_name='export_sections')
    op.drop_table('export_sections')
    op.drop_index(op.f('ix_case_exports_generated_by'), table_name='case_exports')
    op.drop_index(op.f('ix_case_exports_export_number'), table_name='case_exports')
    op.drop_index(op.f('ix_case_exports_case_id'), table_name='case_exports')
    op.drop_table('case_exports')
    op.drop_table('redaction_rules')

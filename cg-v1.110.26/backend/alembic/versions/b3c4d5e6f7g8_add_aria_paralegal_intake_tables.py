"""add_aria_paralegal_intake_tables

Revision ID: b3c4d5e6f7g8
Revises: 1913127b5a86
Create Date: 2026-01-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7g8'
down_revision: Union[str, Sequence[str], None] = '1913127b5a86'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create ARIA Paralegal intake tables."""

    # Create intake_sessions table
    op.create_table(
        'intake_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('session_number', sa.String(20), unique=True, nullable=False),

        # Links
        sa.Column('case_id', sa.String(36), sa.ForeignKey('cases.id'), nullable=False, index=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id'), nullable=True, index=True),
        sa.Column('professional_id', sa.String(36), sa.ForeignKey('court_professionals.id'), nullable=False, index=True),
        sa.Column('parent_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),

        # Access
        sa.Column('access_token', sa.String(64), unique=True, nullable=False),
        sa.Column('access_link_expires_at', sa.DateTime, nullable=False),
        sa.Column('access_link_used_at', sa.DateTime, nullable=True),

        # Form targets
        sa.Column('target_forms', sa.JSON, nullable=False, default=list),
        sa.Column('custom_questions', sa.JSON, nullable=True),

        # Status tracking
        sa.Column('status', sa.String(30), nullable=False, default='pending'),
        sa.Column('started_at', sa.DateTime, nullable=True),
        sa.Column('completed_at', sa.DateTime, nullable=True),

        # Conversation
        sa.Column('messages', sa.JSON, nullable=False, default=list),
        sa.Column('aria_provider', sa.String(20), nullable=False, default='claude'),
        sa.Column('message_count', sa.Integer, nullable=False, default=0),

        # Outputs - Extracted data
        sa.Column('extracted_data', sa.JSON, nullable=True),

        # Outputs - ARIA Summary
        sa.Column('aria_summary', sa.Text, nullable=True),

        # Outputs - Draft form
        sa.Column('draft_form_url', sa.Text, nullable=True),
        sa.Column('draft_form_generated_at', sa.DateTime, nullable=True),

        # Parent confirmation
        sa.Column('parent_confirmed', sa.Boolean, nullable=False, default=False),
        sa.Column('parent_confirmed_at', sa.DateTime, nullable=True),
        sa.Column('parent_edits', sa.JSON, nullable=True),

        # Professional review
        sa.Column('professional_reviewed', sa.Boolean, nullable=False, default=False),
        sa.Column('professional_reviewed_at', sa.DateTime, nullable=True),
        sa.Column('professional_notes', sa.Text, nullable=True),

        # Clarification flow
        sa.Column('clarification_requested', sa.Boolean, nullable=False, default=False),
        sa.Column('clarification_request', sa.Text, nullable=True),
        sa.Column('clarification_response', sa.Text, nullable=True),

        # Audit
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create intake_questions table
    op.create_table(
        'intake_questions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('professional_id', sa.String(36), sa.ForeignKey('court_professionals.id'), nullable=False, index=True),

        # Question content
        sa.Column('question_text', sa.Text, nullable=False),
        sa.Column('question_category', sa.String(30), nullable=False, default='other'),
        sa.Column('expected_response_type', sa.String(30), nullable=False, default='text'),
        sa.Column('choices', sa.JSON, nullable=True),

        # Flags
        sa.Column('is_template', sa.Boolean, nullable=False, default=False),
        sa.Column('is_required', sa.Boolean, nullable=False, default=True),
        sa.Column('is_active', sa.Boolean, nullable=False, default=True),

        # Usage tracking
        sa.Column('use_count', sa.Integer, nullable=False, default=0),

        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create intake_extractions table
    op.create_table(
        'intake_extractions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('session_id', sa.String(36), sa.ForeignKey('intake_sessions.id'), nullable=False, index=True),

        # Extraction details
        sa.Column('target_form', sa.String(20), nullable=False),
        sa.Column('extraction_version', sa.Integer, nullable=False, default=1),
        sa.Column('extracted_at', sa.DateTime, nullable=False, default=sa.func.now()),

        # Results
        sa.Column('raw_extraction', sa.JSON, nullable=True),
        sa.Column('validated_fields', sa.JSON, nullable=True),
        sa.Column('confidence_score', sa.Float, nullable=True),

        # Errors
        sa.Column('extraction_errors', sa.JSON, nullable=True),
        sa.Column('missing_fields', sa.JSON, nullable=True),

        # AI details
        sa.Column('ai_provider', sa.String(20), nullable=False, default='claude'),
        sa.Column('model_used', sa.String(50), nullable=True),
        sa.Column('tokens_used', sa.Integer, nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create index on access_token for fast lookup
    op.create_index('ix_intake_sessions_access_token', 'intake_sessions', ['access_token'])

    # Create index on session_number for fast lookup
    op.create_index('ix_intake_sessions_session_number', 'intake_sessions', ['session_number'])


def downgrade() -> None:
    """Drop ARIA Paralegal intake tables."""
    op.drop_index('ix_intake_sessions_session_number', 'intake_sessions')
    op.drop_index('ix_intake_sessions_access_token', 'intake_sessions')
    op.drop_table('intake_extractions')
    op.drop_table('intake_questions')
    op.drop_table('intake_sessions')

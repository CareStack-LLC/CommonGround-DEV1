"""Add court form workflow tables

Revision ID: 1c4aa74af40b
Revises: 63a2488603bd
Create Date: 2026-01-02 12:27:09.714733

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1c4aa74af40b'
down_revision: Union[str, Sequence[str], None] = '63a2488603bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add activation_status columns to cases table
    op.add_column('cases', sa.Column('activation_status', sa.String(length=50), nullable=False, server_default='pending'))
    op.add_column('cases', sa.Column('forms_workflow_started_at', sa.DateTime(), nullable=True))
    op.add_column('cases', sa.Column('forms_workflow_completed_at', sa.DateTime(), nullable=True))
    op.add_column('cases', sa.Column('assigned_court_professional_id', sa.String(length=36), nullable=True))

    # Create court_hearings table first (referenced by court_form_submissions)
    op.create_table(
        'court_hearings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('case_id', sa.String(length=36), nullable=False),
        sa.Column('hearing_type', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('scheduled_date', sa.Date(), nullable=False),
        sa.Column('scheduled_time', sa.String(length=20), nullable=True),
        sa.Column('court_name', sa.String(length=200), nullable=True),
        sa.Column('department', sa.String(length=50), nullable=True),
        sa.Column('courtroom', sa.String(length=50), nullable=True),
        sa.Column('judge_name', sa.String(length=200), nullable=True),
        sa.Column('outcome', sa.String(length=30), nullable=False),
        sa.Column('outcome_notes', sa.Text(), nullable=True),
        sa.Column('petitioner_attended', sa.Boolean(), nullable=True),
        sa.Column('respondent_attended', sa.Boolean(), nullable=True),
        sa.Column('related_fl300_id', sa.String(length=36), nullable=True),
        sa.Column('resulting_fl340_id', sa.String(length=36), nullable=True),
        sa.Column('notifications_sent', sa.Boolean(), nullable=False, default=False),
        sa.Column('notification_sent_at', sa.DateTime(), nullable=True),
        sa.Column('reminder_sent', sa.Boolean(), nullable=False, default=False),
        sa.Column('reminder_sent_at', sa.DateTime(), nullable=True),
        sa.Column('is_continuation', sa.Boolean(), nullable=False, default=False),
        sa.Column('continued_from_id', sa.String(length=36), nullable=True),
        sa.Column('continued_to_id', sa.String(length=36), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id']),
        sa.ForeignKeyConstraint(['continued_from_id'], ['court_hearings.id']),
        sa.ForeignKeyConstraint(['continued_to_id'], ['court_hearings.id']),
    )
    op.create_index('ix_court_hearings_case_id', 'court_hearings', ['case_id'])

    # Create court_form_submissions table
    op.create_table(
        'court_form_submissions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('case_id', sa.String(length=36), nullable=False),
        sa.Column('parent_id', sa.String(length=36), nullable=True),
        sa.Column('form_type', sa.String(length=20), nullable=False),
        sa.Column('form_state', sa.String(length=2), nullable=False, server_default='CA'),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='draft'),
        sa.Column('status_history', sa.JSON(), nullable=True),
        sa.Column('submission_source', sa.String(length=30), nullable=False, server_default='parent_platform'),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('form_data', sa.JSON(), nullable=True),
        sa.Column('pdf_url', sa.Text(), nullable=True),
        sa.Column('pdf_hash', sa.String(length=64), nullable=True),
        sa.Column('aria_assisted', sa.Boolean(), nullable=False, default=False),
        sa.Column('aria_conversation_id', sa.String(length=36), nullable=True),
        sa.Column('responds_to_form_id', sa.String(length=36), nullable=True),
        sa.Column('parent_form_id', sa.String(length=36), nullable=True),
        sa.Column('hearing_id', sa.String(length=36), nullable=True),
        sa.Column('reviewed_by', sa.String(length=36), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('extraction_confidence', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('extraction_notes', sa.Text(), nullable=True),
        sa.Column('requires_review', sa.Boolean(), nullable=False, default=False),
        sa.Column('custody_order_id', sa.String(length=36), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id']),
        sa.ForeignKeyConstraint(['parent_id'], ['users.id']),
        sa.ForeignKeyConstraint(['responds_to_form_id'], ['court_form_submissions.id']),
        sa.ForeignKeyConstraint(['parent_form_id'], ['court_form_submissions.id']),
        sa.ForeignKeyConstraint(['hearing_id'], ['court_hearings.id']),
        sa.ForeignKeyConstraint(['custody_order_id'], ['custody_orders.id']),
    )
    op.create_index('ix_court_form_submissions_case_id', 'court_form_submissions', ['case_id'])

    # Add foreign keys from court_hearings to court_form_submissions (these create the cycle)
    op.create_foreign_key(
        'fk_court_hearings_related_fl300',
        'court_hearings', 'court_form_submissions',
        ['related_fl300_id'], ['id']
    )
    op.create_foreign_key(
        'fk_court_hearings_resulting_fl340',
        'court_hearings', 'court_form_submissions',
        ['resulting_fl340_id'], ['id']
    )

    # Create case_form_requirements table
    op.create_table(
        'case_form_requirements',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('case_id', sa.String(length=36), nullable=False),
        sa.Column('form_type', sa.String(length=20), nullable=False),
        sa.Column('required_by', sa.String(length=20), nullable=False),
        sa.Column('is_satisfied', sa.Boolean(), nullable=False, default=False),
        sa.Column('satisfied_by_submission_id', sa.String(length=36), nullable=True),
        sa.Column('satisfied_at', sa.DateTime(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id']),
        sa.ForeignKeyConstraint(['satisfied_by_submission_id'], ['court_form_submissions.id']),
    )
    op.create_index('ix_case_form_requirements_case_id', 'case_form_requirements', ['case_id'])

    # Create proof_of_service table
    op.create_table(
        'proof_of_service',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('case_id', sa.String(length=36), nullable=False),
        sa.Column('served_form_id', sa.String(length=36), nullable=False),
        sa.Column('service_type', sa.String(length=30), nullable=False),
        sa.Column('served_to_name', sa.String(length=200), nullable=False),
        sa.Column('served_at_address', sa.String(length=500), nullable=True),
        sa.Column('served_on_date', sa.Date(), nullable=False),
        sa.Column('served_by_name', sa.String(length=200), nullable=False),
        sa.Column('served_by_relationship', sa.String(length=100), nullable=True),
        sa.Column('proof_pdf_url', sa.Text(), nullable=True),
        sa.Column('proof_pdf_hash', sa.String(length=64), nullable=True),
        sa.Column('filed_with_court', sa.Boolean(), nullable=False, default=False),
        sa.Column('filed_at', sa.DateTime(), nullable=True),
        sa.Column('accepted_by_court', sa.Boolean(), nullable=False, default=False),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id']),
        sa.ForeignKeyConstraint(['served_form_id'], ['court_form_submissions.id']),
    )
    op.create_index('ix_proof_of_service_case_id', 'proof_of_service', ['case_id'])

    # Create respondent_access_codes table
    op.create_table(
        'respondent_access_codes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('case_id', sa.String(length=36), nullable=False),
        sa.Column('respondent_email', sa.String(length=255), nullable=False),
        sa.Column('respondent_name', sa.String(length=200), nullable=True),
        sa.Column('access_code', sa.String(length=10), nullable=False),
        sa.Column('code_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, default=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('used_by_user_id', sa.String(length=36), nullable=True),
        sa.Column('notification_sent_at', sa.DateTime(), nullable=True),
        sa.Column('notification_method', sa.String(length=20), nullable=True),
        sa.Column('failed_attempts', sa.Integer(), nullable=False, default=0),
        sa.Column('locked_until', sa.DateTime(), nullable=True),
        sa.Column('fl300_submission_id', sa.String(length=36), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id']),
        sa.ForeignKeyConstraint(['used_by_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['fl300_submission_id'], ['court_form_submissions.id']),
    )
    op.create_index('ix_respondent_access_codes_case_id', 'respondent_access_codes', ['case_id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables in reverse order
    op.drop_index('ix_respondent_access_codes_case_id', 'respondent_access_codes')
    op.drop_table('respondent_access_codes')

    op.drop_index('ix_proof_of_service_case_id', 'proof_of_service')
    op.drop_table('proof_of_service')

    op.drop_index('ix_case_form_requirements_case_id', 'case_form_requirements')
    op.drop_table('case_form_requirements')

    # Drop foreign keys that create the cycle first
    op.drop_constraint('fk_court_hearings_resulting_fl340', 'court_hearings', type_='foreignkey')
    op.drop_constraint('fk_court_hearings_related_fl300', 'court_hearings', type_='foreignkey')

    op.drop_index('ix_court_form_submissions_case_id', 'court_form_submissions')
    op.drop_table('court_form_submissions')

    op.drop_index('ix_court_hearings_case_id', 'court_hearings')
    op.drop_table('court_hearings')

    # Drop columns from cases table
    op.drop_column('cases', 'assigned_court_professional_id')
    op.drop_column('cases', 'forms_workflow_completed_at')
    op.drop_column('cases', 'forms_workflow_started_at')
    op.drop_column('cases', 'activation_status')

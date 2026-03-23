"""Add bug hunt testers table and tester_id columns to existing bug hunt tables.

Revision ID: 20260323_testers
Revises: None
Create Date: 2026-03-23
"""

from alembic import op
import sqlalchemy as sa

revision = '20260323_testers'
down_revision = '20260323_bug_hunts'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Bug hunt testers
    op.create_table(
        'bug_hunt_testers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('cohort_id', sa.String(36), sa.ForeignKey('bug_hunt_cohorts.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('family_id', sa.String(36), sa.ForeignKey('bug_hunt_families.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('tester_name', sa.String(200), nullable=False),
        sa.Column('tester_email', sa.String(255), nullable=False),
        sa.Column('access_token', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('token_expires_at', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='invited'),
        sa.Column('first_accessed_at', sa.DateTime(), nullable=True),
        sa.Column('last_accessed_at', sa.DateTime(), nullable=True),
        sa.Column('email_sent_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Add tester_id to existing bug hunt tables
    op.add_column('bug_hunt_checklist_items',
        sa.Column('tester_id', sa.String(36), sa.ForeignKey('bug_hunt_testers.id', ondelete='SET NULL'), nullable=True))
    op.add_column('bug_hunt_notes',
        sa.Column('tester_id', sa.String(36), sa.ForeignKey('bug_hunt_testers.id', ondelete='SET NULL'), nullable=True))
    op.add_column('bug_hunt_bug_reports',
        sa.Column('tester_id', sa.String(36), sa.ForeignKey('bug_hunt_testers.id', ondelete='SET NULL'), nullable=True))
    op.add_column('bug_hunt_feedback',
        sa.Column('tester_id', sa.String(36), sa.ForeignKey('bug_hunt_testers.id', ondelete='SET NULL'), nullable=True))

    # Make author_id/reported_by/submitted_by nullable for tester submissions
    op.alter_column('bug_hunt_notes', 'author_id', existing_type=sa.String(36), nullable=True)
    op.alter_column('bug_hunt_bug_reports', 'reported_by', existing_type=sa.String(36), nullable=True)
    op.alter_column('bug_hunt_feedback', 'submitted_by', existing_type=sa.String(36), nullable=True)


def downgrade() -> None:
    op.alter_column('bug_hunt_feedback', 'submitted_by', existing_type=sa.String(36), nullable=False)
    op.alter_column('bug_hunt_bug_reports', 'reported_by', existing_type=sa.String(36), nullable=False)
    op.alter_column('bug_hunt_notes', 'author_id', existing_type=sa.String(36), nullable=False)
    op.drop_column('bug_hunt_feedback', 'tester_id')
    op.drop_column('bug_hunt_bug_reports', 'tester_id')
    op.drop_column('bug_hunt_notes', 'tester_id')
    op.drop_column('bug_hunt_checklist_items', 'tester_id')
    op.drop_table('bug_hunt_testers')

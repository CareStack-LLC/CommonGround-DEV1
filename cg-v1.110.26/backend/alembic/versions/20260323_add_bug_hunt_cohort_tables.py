"""Add bug hunt cohort tables for organized QA testing sessions.

Revision ID: 20260323_bug_hunts
Revises: 20260320_superadmin
Create Date: 2026-03-23
"""

from alembic import op
import sqlalchemy as sa

revision = '20260323_bug_hunts'
down_revision = '20260320_superadmin'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Bug hunt cohorts
    op.create_table(
        'bug_hunt_cohorts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('target_feature', sa.String(50), nullable=False, server_default='general'),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('family_count', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('test_instructions', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('seed_config', sa.JSON(), nullable=True),
        sa.Column('summary_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Bug hunt families (seeded test accounts)
    op.create_table(
        'bug_hunt_families',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('cohort_id', sa.String(36), sa.ForeignKey('bug_hunt_cohorts.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id'), nullable=True),
        sa.Column('parent_a_email', sa.String(255), nullable=False),
        sa.Column('parent_a_password', sa.String(100), nullable=False),
        sa.Column('parent_b_email', sa.String(255), nullable=False),
        sa.Column('parent_b_password', sa.String(100), nullable=False),
        sa.Column('parent_a_name', sa.String(200), nullable=False),
        sa.Column('parent_b_name', sa.String(200), nullable=False),
        sa.Column('children_names', sa.JSON(), nullable=True),
        sa.Column('test_status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('tester_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Bug hunt checklist items
    op.create_table(
        'bug_hunt_checklist_items',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('cohort_id', sa.String(36), sa.ForeignKey('bug_hunt_cohorts.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('completed_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Bug hunt notes
    op.create_table(
        'bug_hunt_notes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('cohort_id', sa.String(36), sa.ForeignKey('bug_hunt_cohorts.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('family_id', sa.String(36), sa.ForeignKey('bug_hunt_families.id', ondelete='SET NULL'), nullable=True),
        sa.Column('author_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('note_type', sa.String(20), nullable=False, server_default='observation'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Bug hunt bug reports
    op.create_table(
        'bug_hunt_bug_reports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('cohort_id', sa.String(36), sa.ForeignKey('bug_hunt_cohorts.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('family_id', sa.String(36), sa.ForeignKey('bug_hunt_families.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reported_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False, server_default='medium'),
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        sa.Column('sentry_issue_id', sa.String(100), nullable=True),
        sa.Column('steps_to_reproduce', sa.Text(), nullable=True),
        sa.Column('screenshot_urls', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Bug hunt feedback
    op.create_table(
        'bug_hunt_feedback',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('cohort_id', sa.String(36), sa.ForeignKey('bug_hunt_cohorts.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('family_id', sa.String(36), sa.ForeignKey('bug_hunt_families.id', ondelete='SET NULL'), nullable=True),
        sa.Column('submitted_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('category', sa.String(50), nullable=False, server_default='other'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('feature_area', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('bug_hunt_feedback')
    op.drop_table('bug_hunt_bug_reports')
    op.drop_table('bug_hunt_notes')
    op.drop_table('bug_hunt_checklist_items')
    op.drop_table('bug_hunt_families')
    op.drop_table('bug_hunt_cohorts')

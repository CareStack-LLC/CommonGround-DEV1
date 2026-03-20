"""Add superadmin automation tables: bug triage, leads, campaigns, inbox monitoring.

Revision ID: 20260320_superadmin
Revises: 20260320_blog_mktg
Create Date: 2026-03-20
"""

from alembic import op
import sqlalchemy as sa

revision = '20260320_superadmin'
down_revision = '20260320_blog_mktg'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Bug triage sprints
    op.create_table(
        'bug_triage_sprints',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('summary_json', sa.JSON(), nullable=True),
        sa.Column('sprint_plan_json', sa.JSON(), nullable=True),
        sa.Column('ai_analysis', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Lead lists
    op.create_table(
        'lead_lists',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('lead_type', sa.String(20), nullable=False),
        sa.Column('search_criteria', sa.JSON(), nullable=True),
        sa.Column('sendgrid_list_id', sa.String(100), nullable=True),
        sa.Column('lead_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Leads
    op.create_table(
        'leads',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('lead_list_id', sa.String(36), sa.ForeignKey('lead_lists.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(320), nullable=False, index=True),
        sa.Column('first_name', sa.String(100), nullable=True),
        sa.Column('last_name', sa.String(100), nullable=True),
        sa.Column('company', sa.String(200), nullable=True),
        sa.Column('title', sa.String(200), nullable=True),
        sa.Column('source', sa.String(20), nullable=False, server_default='manual'),
        sa.Column('status', sa.String(20), nullable=False, server_default='new'),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('lead_list_id', 'email', name='uq_lead_list_email'),
    )

    # Email campaigns
    op.create_table(
        'email_campaigns',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('lead_list_id', sa.String(36), sa.ForeignKey('lead_lists.id'), nullable=True),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('html_content', sa.Text(), nullable=True),
        sa.Column('plain_content', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('sendgrid_singlesend_id', sa.String(100), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('stats_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Campaign templates
    op.create_table(
        'campaign_templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('target_audience', sa.String(50), nullable=False),
        sa.Column('subject_template', sa.String(500), nullable=False),
        sa.Column('html_template', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Monitored emails
    op.create_table(
        'monitored_emails',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('gmail_message_id', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('thread_id', sa.String(100), nullable=True),
        sa.Column('from_email', sa.String(320), nullable=False),
        sa.Column('from_name', sa.String(200), nullable=True),
        sa.Column('to_email', sa.String(320), nullable=False),
        sa.Column('subject', sa.String(1000), nullable=False),
        sa.Column('body_preview', sa.String(500), nullable=False),
        sa.Column('body_full', sa.Text(), nullable=False),
        sa.Column('received_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('is_urgent', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('urgency_reason', sa.String(500), nullable=True),
        sa.Column('category', sa.String(50), nullable=False, server_default='other'),
        sa.Column('ai_summary', sa.Text(), nullable=True),
        sa.Column('ai_draft_response', sa.Text(), nullable=True),
        sa.Column('draft_status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Email digests
    op.create_table(
        'email_digests',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('period_start', sa.DateTime(), nullable=False),
        sa.Column('period_end', sa.DateTime(), nullable=False),
        sa.Column('total_emails', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('urgent_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('summary_json', sa.JSON(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Google OAuth tokens
    op.create_table(
        'google_oauth_tokens',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(320), nullable=False, unique=True, index=True),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('refresh_token', sa.Text(), nullable=False),
        sa.Column('token_expiry', sa.DateTime(), nullable=True),
        sa.Column('scopes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('google_oauth_tokens')
    op.drop_table('email_digests')
    op.drop_table('monitored_emails')
    op.drop_table('campaign_templates')
    op.drop_table('email_campaigns')
    op.drop_table('leads')
    op.drop_table('lead_lists')
    op.drop_table('bug_triage_sprints')

"""Add blog_marketing_content table for social media marketing per blog post.

Revision ID: 20260320_blog_mktg
Revises: update_stripe_v3
Create Date: 2026-03-20
"""

from alembic import op
import sqlalchemy as sa

revision = '20260320_blog_mktg'
down_revision = 'update_stripe_v3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'blog_marketing_content',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('blog_post_id', sa.String(36), sa.ForeignKey('blog_posts.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('headline', sa.String(500), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('hashtags', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('cta_text', sa.String(500), nullable=False),
        sa.Column('cta_url', sa.String(2048), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('blog_post_id', 'platform', name='uq_blog_marketing_platform'),
    )


def downgrade() -> None:
    op.drop_table('blog_marketing_content')

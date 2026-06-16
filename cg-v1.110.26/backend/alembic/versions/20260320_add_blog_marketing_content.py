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
    # blog_posts was historically created out-of-band (inline DDL on prod).
    # Create it here when missing so fresh databases can satisfy the FK.
    op.execute("""
        CREATE TABLE IF NOT EXISTS blog_posts (
            id VARCHAR(36) PRIMARY KEY,
            created_at TIMESTAMP NOT NULL DEFAULT now(),
            updated_at TIMESTAMP NOT NULL DEFAULT now(),
            title VARCHAR(500) NOT NULL,
            slug VARCHAR(500) NOT NULL UNIQUE,
            content TEXT NOT NULL,
            excerpt VARCHAR(1000) NOT NULL,
            author VARCHAR(200) NOT NULL DEFAULT 'CommonGround Team',
            category VARCHAR(100) NOT NULL,
            tags JSON NOT NULL DEFAULT '[]',
            featured_image_url VARCHAR(2048),
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            published_at TIMESTAMP,
            seo_title VARCHAR(200),
            seo_description VARCHAR(500)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_blog_posts_slug ON blog_posts (slug)")

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

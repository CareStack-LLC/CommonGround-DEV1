"""Add attachment columns to circle_messages table.

Supports file/image attachments on circle messages with URL, type, name, and size.
Attachments are stored in Supabase storage and analyzed by ARIA for child safety.

Revision ID: add_circle_attachments
Revises: add_circle_msgs
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_circle_attachments'
down_revision = 'add_circle_msgs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('circle_messages', sa.Column('attachment_url', sa.Text(), nullable=True))
    op.add_column('circle_messages', sa.Column('attachment_type', sa.String(20), nullable=True))
    op.add_column('circle_messages', sa.Column('attachment_name', sa.String(255), nullable=True))
    op.add_column('circle_messages', sa.Column('attachment_size', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('circle_messages', 'attachment_size')
    op.drop_column('circle_messages', 'attachment_name')
    op.drop_column('circle_messages', 'attachment_type')
    op.drop_column('circle_messages', 'attachment_url')

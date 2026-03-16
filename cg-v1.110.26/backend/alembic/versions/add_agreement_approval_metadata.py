"""Add approval metadata (IP, user-agent) to agreements for digital signature verification.

Revision ID: add_approval_meta
Revises: add_cat_splits
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_approval_meta'
down_revision = 'add_cat_splits'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('agreements', sa.Column('petitioner_approval_ip', sa.String(45), nullable=True))
    op.add_column('agreements', sa.Column('petitioner_approval_user_agent', sa.Text(), nullable=True))
    op.add_column('agreements', sa.Column('respondent_approval_ip', sa.String(45), nullable=True))
    op.add_column('agreements', sa.Column('respondent_approval_user_agent', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('agreements', 'respondent_approval_user_agent')
    op.drop_column('agreements', 'respondent_approval_ip')
    op.drop_column('agreements', 'petitioner_approval_user_agent')
    op.drop_column('agreements', 'petitioner_approval_ip')

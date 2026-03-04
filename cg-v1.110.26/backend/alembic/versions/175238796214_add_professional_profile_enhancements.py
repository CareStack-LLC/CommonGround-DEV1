"""add_professional_profile_enhancements

Revision ID: 175238796214
Revises: 0947f70af975
Create Date: 2026-01-19 15:57:55.254704

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '175238796214'
down_revision: Union[str, Sequence[str], None] = '0947f70af975'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add profile enhancements to professional_profiles."""
    op.add_column('professional_profiles', sa.Column('profile_photo_url', sa.String(length=500), nullable=True))
    op.add_column('professional_profiles', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('professional_profiles', sa.Column('years_of_experience', sa.Integer(), nullable=True))
    op.add_column('professional_profiles', sa.Column('languages', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Remove profile enhancements from professional_profiles."""
    op.drop_column('professional_profiles', 'languages')
    op.drop_column('professional_profiles', 'years_of_experience')
    op.drop_column('professional_profiles', 'bio')
    op.drop_column('professional_profiles', 'profile_photo_url')

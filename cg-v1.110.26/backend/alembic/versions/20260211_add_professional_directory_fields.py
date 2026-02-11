"""add professional directory fields

Revision ID: add_pro_directory_fields
Revises: add_sh_events
Create Date: 2026-02-11 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_pro_directory_fields'
down_revision: Union[str, Sequence[str], None] = 'add_sh_events'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Professional Profile Fields ---
    op.add_column('professional_profiles', sa.Column('headline', sa.String(length=150), nullable=True))
    op.add_column('professional_profiles', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('professional_profiles', sa.Column('video_url', sa.String(length=500), nullable=True))
    op.add_column('professional_profiles', sa.Column('languages', sa.JSON(), nullable=True))
    op.add_column('professional_profiles', sa.Column('hourly_rate', sa.String(length=50), nullable=True))
    op.add_column('professional_profiles', sa.Column('years_experience', sa.Integer(), nullable=True))
    op.add_column('professional_profiles', sa.Column('education', sa.JSON(), nullable=True))
    op.add_column('professional_profiles', sa.Column('awards', sa.JSON(), nullable=True))
    op.add_column('professional_profiles', sa.Column('consultation_fee', sa.String(length=100), nullable=True))
    op.add_column('professional_profiles', sa.Column('accepted_payment_methods', sa.JSON(), nullable=True))

    # --- Firm Fields ---
    op.add_column('firms', sa.Column('headline', sa.String(length=150), nullable=True))
    op.add_column('firms', sa.Column('video_url', sa.String(length=500), nullable=True))
    op.add_column('firms', sa.Column('social_links', sa.JSON(), nullable=True))
    op.add_column('firms', sa.Column('pricing_structure', sa.JSON(), nullable=True))
    op.add_column('firms', sa.Column('safety_vetted', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    # --- Firm Fields ---
    op.drop_column('firms', 'safety_vetted')
    op.drop_column('firms', 'pricing_structure')
    op.drop_column('firms', 'social_links')
    op.drop_column('firms', 'video_url')
    op.drop_column('firms', 'headline')

    # --- Professional Profile Fields ---
    op.drop_column('professional_profiles', 'accepted_payment_methods')
    op.drop_column('professional_profiles', 'consultation_fee')
    op.drop_column('professional_profiles', 'awards')
    op.drop_column('professional_profiles', 'education')
    op.drop_column('professional_profiles', 'years_experience')
    op.drop_column('professional_profiles', 'hourly_rate')
    op.drop_column('professional_profiles', 'languages')
    op.drop_column('professional_profiles', 'video_url')
    op.drop_column('professional_profiles', 'bio')
    op.drop_column('professional_profiles', 'headline')

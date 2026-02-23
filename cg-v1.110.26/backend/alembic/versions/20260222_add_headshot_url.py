"""add headshot_url to professional_profiles

Revision ID: 20260222_add_headshot_url
Revises: 20260216_add_attendee_fields_to_schedule_events
Create Date: 2026-02-22 11:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.schema import Column
from sqlalchemy.types import String


# revision identifiers, used by Alembic.
revision = '20260222_add_headshot_url'
down_revision = 'add_attendee_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Add headshot_url to professional_profiles
    op.add_column('professional_profiles', sa.Column('headshot_url', sa.String(length=500), nullable=True))


def downgrade():
    # Remove headshot_url from professional_profiles
    op.drop_column('professional_profiles', 'headshot_url')

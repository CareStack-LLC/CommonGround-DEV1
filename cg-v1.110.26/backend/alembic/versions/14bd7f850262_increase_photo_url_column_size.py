"""increase_photo_url_column_size

Revision ID: 14bd7f850262
Revises: s1t2a3r4t5e6r7
Create Date: 2026-01-16 21:08:50.458463

Supabase Storage signed URLs are ~600+ characters.
This migration increases the photo_url column from VARCHAR(500) to VARCHAR(2048)
to accommodate these longer URLs.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '14bd7f850262'
down_revision: Union[str, Sequence[str], None] = 's1t2a3r4t5e6r7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Increase photo_url column size to accommodate Supabase signed URLs."""
    # Children table - child profile photos
    op.alter_column(
        'children',
        'photo_url',
        existing_type=sa.VARCHAR(length=500),
        type_=sa.VARCHAR(length=2048),
        existing_nullable=True
    )

    # User profiles - avatar URLs (may also use signed URLs)
    op.alter_column(
        'user_profiles',
        'avatar_url',
        existing_type=sa.VARCHAR(length=500),
        type_=sa.VARCHAR(length=2048),
        existing_nullable=True
    )

    # Cubbie items - high-value item photos
    op.alter_column(
        'cubbie_items',
        'photo_url',
        existing_type=sa.VARCHAR(length=500),
        type_=sa.VARCHAR(length=2048),
        existing_nullable=True
    )

    # Child photos gallery
    op.alter_column(
        'child_photos',
        'photo_url',
        existing_type=sa.VARCHAR(length=500),
        type_=sa.VARCHAR(length=2048),
        existing_nullable=False
    )
    op.alter_column(
        'child_photos',
        'thumbnail_url',
        existing_type=sa.VARCHAR(length=500),
        type_=sa.VARCHAR(length=2048),
        existing_nullable=True
    )

    # Circle contacts - contact photos
    op.alter_column(
        'circle_contacts',
        'photo_url',
        existing_type=sa.VARCHAR(length=500),
        type_=sa.VARCHAR(length=2048),
        existing_nullable=True
    )


def downgrade() -> None:
    """Revert photo_url column size."""
    op.alter_column(
        'children',
        'photo_url',
        existing_type=sa.VARCHAR(length=2048),
        type_=sa.VARCHAR(length=500),
        existing_nullable=True
    )

    op.alter_column(
        'user_profiles',
        'avatar_url',
        existing_type=sa.VARCHAR(length=2048),
        type_=sa.VARCHAR(length=500),
        existing_nullable=True
    )

    op.alter_column(
        'cubbie_items',
        'photo_url',
        existing_type=sa.VARCHAR(length=2048),
        type_=sa.VARCHAR(length=500),
        existing_nullable=True
    )

    op.alter_column(
        'child_photos',
        'photo_url',
        existing_type=sa.VARCHAR(length=2048),
        type_=sa.VARCHAR(length=500),
        existing_nullable=False
    )
    op.alter_column(
        'child_photos',
        'thumbnail_url',
        existing_type=sa.VARCHAR(length=2048),
        type_=sa.VARCHAR(length=500),
        existing_nullable=True
    )

    op.alter_column(
        'circle_contacts',
        'photo_url',
        existing_type=sa.VARCHAR(length=2048),
        type_=sa.VARCHAR(length=500),
        existing_nullable=True
    )

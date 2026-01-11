"""add_activities_table

Revision ID: 499d3deb006a
Revises: 058211ae8004
Create Date: 2026-01-08 12:21:21.880152

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '499d3deb006a'
down_revision: Union[str, Sequence[str], None] = '058211ae8004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create activities table
    op.create_table(
        'activities',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('activity_type', sa.String(50), nullable=False, index=True),
        sa.Column('category', sa.String(20), nullable=False, index=True),
        sa.Column('actor_id', sa.String(36), nullable=True),
        sa.Column('actor_name', sa.String(100), nullable=False),
        sa.Column('subject_type', sa.String(50), nullable=False),
        sa.Column('subject_id', sa.String(36), nullable=True),
        sa.Column('subject_name', sa.String(100), nullable=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(30), nullable=False, server_default='info'),
        sa.Column('severity', sa.String(10), nullable=False, server_default='info'),
        sa.Column('read_by_parent_a_at', sa.DateTime(), nullable=True),
        sa.Column('read_by_parent_b_at', sa.DateTime(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create composite indexes for common queries
    op.create_index(
        'ix_activities_family_file_created',
        'activities',
        ['family_file_id', 'created_at']
    )
    op.create_index(
        'ix_activities_family_file_type',
        'activities',
        ['family_file_id', 'activity_type']
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes first
    op.drop_index('ix_activities_family_file_type', table_name='activities')
    op.drop_index('ix_activities_family_file_created', table_name='activities')

    # Drop table
    op.drop_table('activities')

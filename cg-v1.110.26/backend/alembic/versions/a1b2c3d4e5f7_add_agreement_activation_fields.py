"""Add agreement activation fields for auto-extraction

Revision ID: a1b2c3d4e5f7
Revises: 913329c7f34c
Create Date: 2025-01-11

Adds:
- FamilyFile: agreement split ratio and default exchange location fields
- ScheduleEvent: quick_accord_id foreign key
- Obligation: quick_accord_id foreign key and split_from_agreement flag
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f7'
down_revision = '913329c7f34c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # =========================================================================
    # FamilyFile - Agreement-derived defaults
    # =========================================================================
    op.add_column(
        'family_files',
        sa.Column('agreement_expense_split_ratio', sa.String(20), nullable=True)
    )
    op.add_column(
        'family_files',
        sa.Column('agreement_split_parent_a_percentage', sa.Integer, nullable=True)
    )
    op.add_column(
        'family_files',
        sa.Column('agreement_split_locked', sa.Boolean, server_default='false', nullable=False)
    )
    op.add_column(
        'family_files',
        sa.Column('agreement_split_source_id', sa.String(36), nullable=True)
    )
    op.add_column(
        'family_files',
        sa.Column('agreement_split_set_at', sa.DateTime, nullable=True)
    )
    op.add_column(
        'family_files',
        sa.Column('default_exchange_location', sa.String(500), nullable=True)
    )
    op.add_column(
        'family_files',
        sa.Column('default_exchange_location_type', sa.String(50), nullable=True)
    )

    # =========================================================================
    # ScheduleEvent - QuickAccord link
    # =========================================================================
    op.add_column(
        'schedule_events',
        sa.Column('quick_accord_id', sa.String(36), nullable=True)
    )
    op.create_index(
        'ix_schedule_events_quick_accord_id',
        'schedule_events',
        ['quick_accord_id']
    )
    op.create_foreign_key(
        'fk_schedule_events_quick_accord',
        'schedule_events',
        'quick_accords',
        ['quick_accord_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # =========================================================================
    # Obligation - QuickAccord link and split_from_agreement
    # =========================================================================
    op.add_column(
        'obligations',
        sa.Column('split_from_agreement', sa.Boolean, server_default='false', nullable=False)
    )
    op.add_column(
        'obligations',
        sa.Column('quick_accord_id', sa.String(36), nullable=True)
    )
    op.create_index(
        'ix_obligations_quick_accord_id',
        'obligations',
        ['quick_accord_id']
    )
    op.create_foreign_key(
        'fk_obligations_quick_accord',
        'obligations',
        'quick_accords',
        ['quick_accord_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Obligation
    op.drop_constraint('fk_obligations_quick_accord', 'obligations', type_='foreignkey')
    op.drop_index('ix_obligations_quick_accord_id', 'obligations')
    op.drop_column('obligations', 'quick_accord_id')
    op.drop_column('obligations', 'split_from_agreement')

    # ScheduleEvent
    op.drop_constraint('fk_schedule_events_quick_accord', 'schedule_events', type_='foreignkey')
    op.drop_index('ix_schedule_events_quick_accord_id', 'schedule_events')
    op.drop_column('schedule_events', 'quick_accord_id')

    # FamilyFile
    op.drop_column('family_files', 'default_exchange_location_type')
    op.drop_column('family_files', 'default_exchange_location')
    op.drop_column('family_files', 'agreement_split_set_at')
    op.drop_column('family_files', 'agreement_split_source_id')
    op.drop_column('family_files', 'agreement_split_locked')
    op.drop_column('family_files', 'agreement_split_parent_a_percentage')
    op.drop_column('family_files', 'agreement_expense_split_ratio')

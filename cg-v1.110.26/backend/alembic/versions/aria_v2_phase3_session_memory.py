"""ARIA V2 Phase 3: Create session memory and sender baseline tables.

Revision ID: aria_v2_phase3
Revises: aria_v2_phase2
Create Date: 2026-04-02
"""

from alembic import op
import sqlalchemy as sa

revision = 'aria_v2_phase3'
down_revision = 'aria_v2_phase2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Session memory table: stores per sender-recipient-day summaries
    op.create_table(
        'aria_session_memory',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('sender_id', sa.String(36), nullable=False, index=True),
        sa.Column('recipient_id', sa.String(36), nullable=False, index=True),
        sa.Column('family_file_id', sa.String(36), nullable=False, index=True),
        sa.Column('session_date', sa.Date(), nullable=False),
        sa.Column('summary', sa.JSON(), nullable=True),
        sa.Column('recurring_patterns', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Composite index for fast lookup by sender-recipient-family-date
    op.create_index(
        'ix_aria_session_memory_lookup',
        'aria_session_memory',
        ['sender_id', 'recipient_id', 'family_file_id', 'session_date'],
    )

    # Sender baseline table: behavioral baseline per sender per family file
    op.create_table(
        'aria_sender_baseline',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('sender_id', sa.String(36), nullable=False, index=True),
        sa.Column('family_file_id', sa.String(36), nullable=False, index=True),
        sa.Column('session_count', sa.Integer(), default=0),
        sa.Column('avg_message_length', sa.Float(), nullable=True),
        sa.Column('avg_frequency', sa.Float(), nullable=True),
        sa.Column('avg_heat_score', sa.Float(), nullable=True),
        sa.Column('sentiment_distribution', sa.JSON(), nullable=True),
        sa.Column('std_deviations', sa.JSON(), nullable=True),
        sa.Column('baseline_established', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Composite index for fast lookup
    op.create_index(
        'ix_aria_sender_baseline_lookup',
        'aria_sender_baseline',
        ['sender_id', 'family_file_id'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index('ix_aria_sender_baseline_lookup', table_name='aria_sender_baseline')
    op.drop_table('aria_sender_baseline')
    op.drop_index('ix_aria_session_memory_lookup', table_name='aria_session_memory')
    op.drop_table('aria_session_memory')

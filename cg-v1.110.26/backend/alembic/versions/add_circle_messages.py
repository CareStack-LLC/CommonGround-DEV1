"""Add circle_messages table and terms fields to circle_users.

Circle Messages enable standalone text messaging between children, parents,
and circle contacts with ARIA child-safety monitoring.

Revision ID: add_circle_msgs
Revises: add_approval_meta
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_circle_msgs'
down_revision = 'add_approval_meta'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create circle_messages table
    op.create_table(
        'circle_messages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('child_id', sa.String(36), sa.ForeignKey('children.id', ondelete='CASCADE'), nullable=False, index=True),

        # Sender
        sa.Column('sender_id', sa.String(36), nullable=False, index=True),
        sa.Column('sender_type', sa.String(20), nullable=False),
        sa.Column('sender_name', sa.String(100), nullable=False),

        # Recipient
        sa.Column('recipient_id', sa.String(36), nullable=False, index=True),
        sa.Column('recipient_type', sa.String(20), nullable=False),

        # Content
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('original_content', sa.Text(), nullable=True),

        # ARIA analysis
        sa.Column('aria_analyzed', sa.Boolean(), default=False, nullable=False),
        sa.Column('aria_flagged', sa.Boolean(), default=False, nullable=False),
        sa.Column('aria_category', sa.String(50), nullable=True),
        sa.Column('aria_reason', sa.Text(), nullable=True),
        sa.Column('aria_score', sa.Float(), nullable=True),

        # Status
        sa.Column('is_delivered', sa.Boolean(), default=True, nullable=False),
        sa.Column('is_read', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_hidden', sa.Boolean(), default=False, nullable=False),

        # Timestamps
        sa.Column('sent_at', sa.DateTime(), nullable=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Composite indexes for efficient queries
    op.create_index(
        'ix_circle_messages_conversation',
        'circle_messages',
        ['child_id', 'sender_id', 'recipient_id', 'sent_at'],
    )
    op.create_index(
        'ix_circle_messages_family_time',
        'circle_messages',
        ['family_file_id', 'child_id', 'sent_at'],
    )
    op.create_index(
        'ix_circle_messages_flagged',
        'circle_messages',
        ['family_file_id', 'aria_flagged'],
    )
    op.create_index(
        'ix_circle_messages_unread',
        'circle_messages',
        ['recipient_id', 'is_read', 'is_hidden'],
    )

    # Add terms fields to circle_users
    op.add_column('circle_users', sa.Column('terms_accepted_at', sa.DateTime(), nullable=True))
    op.add_column('circle_users', sa.Column('terms_version', sa.String(20), nullable=True))


def downgrade() -> None:
    # Remove terms fields from circle_users
    op.drop_column('circle_users', 'terms_version')
    op.drop_column('circle_users', 'terms_accepted_at')

    # Drop indexes
    op.drop_index('ix_circle_messages_unread', table_name='circle_messages')
    op.drop_index('ix_circle_messages_flagged', table_name='circle_messages')
    op.drop_index('ix_circle_messages_family_time', table_name='circle_messages')
    op.drop_index('ix_circle_messages_conversation', table_name='circle_messages')

    # Drop table
    op.drop_table('circle_messages')

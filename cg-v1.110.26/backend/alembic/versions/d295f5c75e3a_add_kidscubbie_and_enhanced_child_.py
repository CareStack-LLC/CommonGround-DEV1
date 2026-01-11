"""add_kidscubbie_and_enhanced_child_profile

Revision ID: d295f5c75e3a
Revises: 8329cf5409d0
Create Date: 2026-01-01 22:08:34.237862

This migration adds:
1. KidsCubbie tables (cubbie_items, cubbie_exchange_items, child_photos)
2. Enhanced Child model with approval workflow and extended fields
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd295f5c75e3a'
down_revision: Union[str, Sequence[str], None] = '8329cf5409d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create cubbie_items table
    op.create_table('cubbie_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('child_id', sa.String(length=36), nullable=False),
        sa.Column('case_id', sa.String(length=36), nullable=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('estimated_value', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('purchase_date', sa.Date(), nullable=True),
        sa.Column('serial_number', sa.String(length=200), nullable=True),
        sa.Column('photo_url', sa.String(length=500), nullable=True),
        sa.Column('added_by', sa.String(length=36), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('current_location', sa.String(length=50), nullable=False),
        sa.Column('last_location_update', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['child_id'], ['children.id'], ),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ),
        # Note: family_files might not exist yet depending on migration order, but referenced in model.
        # Ideally family_file_id is added later if family_files comes later.
        # But for now we create the column, maybe without FK if family_files doesn't exist?
        # Actually, the error `relation "cubbie_items" does not exist` happened when ADDING family_file_id later.
        # So we should NOT add family_file_id here if a later migration adds it.
        # Checking `ed2ad59f5f2d_add_family_file_id_to_cubbie_items.py` adds it.
        # So I will OMIT family_file_id here to avoid conflict with `ed2ad59f5f2d`.
        sa.ForeignKeyConstraint(['added_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cubbie_items_child_id'), 'cubbie_items', ['child_id'], unique=False)
    op.create_index(op.f('ix_cubbie_items_case_id'), 'cubbie_items', ['case_id'], unique=False)

    # Create child_photos table
    op.create_table('child_photos',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('child_id', sa.String(length=36), nullable=False),
        sa.Column('uploaded_by', sa.String(length=36), nullable=False),
        sa.Column('photo_url', sa.String(length=500), nullable=False),
        sa.Column('thumbnail_url', sa.String(length=500), nullable=True),
        sa.Column('caption', sa.String(length=500), nullable=True),
        sa.Column('is_profile_photo', sa.Boolean(), nullable=False),
        sa.Column('taken_at', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['child_id'], ['children.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_child_photos_child_id'), 'child_photos', ['child_id'], unique=False)

    # Create cubbie_exchange_items table
    op.create_table('cubbie_exchange_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('exchange_id', sa.String(length=36), nullable=False),
        sa.Column('cubbie_item_id', sa.String(length=36), nullable=False),
        sa.Column('sent_by', sa.String(length=36), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=False),
        sa.Column('acknowledged_by', sa.String(length=36), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(), nullable=True),
        sa.Column('condition_sent', sa.String(length=50), nullable=True),
        sa.Column('condition_received', sa.String(length=50), nullable=True),
        sa.Column('condition_notes', sa.Text(), nullable=True),
        sa.Column('photo_sent_url', sa.String(length=500), nullable=True),
        sa.Column('photo_received_url', sa.String(length=500), nullable=True),
        sa.Column('is_disputed', sa.Boolean(), nullable=False),
        sa.Column('dispute_notes', sa.Text(), nullable=True),
        sa.Column('dispute_resolved', sa.Boolean(), nullable=False),
        sa.Column('dispute_resolved_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['exchange_id'], ['custody_exchange_instances.id'], ),
        sa.ForeignKeyConstraint(['cubbie_item_id'], ['cubbie_items.id'], ),
        sa.ForeignKeyConstraint(['sent_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['acknowledged_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cubbie_exchange_items_exchange_id'), 'cubbie_exchange_items', ['exchange_id'], unique=False)
    op.create_index(op.f('ix_cubbie_exchange_items_cubbie_item_id'), 'cubbie_exchange_items', ['cubbie_item_id'], unique=False)

    # === ADD COLUMNS TO CHILDREN TABLE ===

    # Approval workflow columns
    op.add_column('children', sa.Column('status', sa.String(length=50), nullable=True))
    op.add_column('children', sa.Column('created_by', sa.String(length=36), nullable=True))
    op.add_column('children', sa.Column('approved_by_a', sa.String(length=36), nullable=True))
    op.add_column('children', sa.Column('approved_by_b', sa.String(length=36), nullable=True))
    op.add_column('children', sa.Column('approved_at_a', sa.DateTime(), nullable=True))
    op.add_column('children', sa.Column('approved_at_b', sa.DateTime(), nullable=True))

    # Extended medical columns
    op.add_column('children', sa.Column('blood_type', sa.String(length=10), nullable=True))
    op.add_column('children', sa.Column('dentist_name', sa.String(length=200), nullable=True))
    op.add_column('children', sa.Column('dentist_phone', sa.String(length=20), nullable=True))
    op.add_column('children', sa.Column('therapist_name', sa.String(length=200), nullable=True))
    op.add_column('children', sa.Column('therapist_phone', sa.String(length=20), nullable=True))

    # Extended education columns
    op.add_column('children', sa.Column('school_address', sa.String(length=500), nullable=True))
    op.add_column('children', sa.Column('teacher_email', sa.String(length=255), nullable=True))

    # Preferences columns
    op.add_column('children', sa.Column('favorite_foods', sa.Text(), nullable=True))
    op.add_column('children', sa.Column('food_dislikes', sa.Text(), nullable=True))
    op.add_column('children', sa.Column('favorite_activities', sa.Text(), nullable=True))
    op.add_column('children', sa.Column('comfort_items', sa.Text(), nullable=True))
    op.add_column('children', sa.Column('bedtime_routine', sa.Text(), nullable=True))

    # Size columns
    op.add_column('children', sa.Column('clothing_size', sa.String(length=20), nullable=True))
    op.add_column('children', sa.Column('shoe_size', sa.String(length=20), nullable=True))
    op.add_column('children', sa.Column('sizes_updated_at', sa.DateTime(), nullable=True))

    # Personality columns
    op.add_column('children', sa.Column('temperament_notes', sa.Text(), nullable=True))
    op.add_column('children', sa.Column('fears_anxieties', sa.Text(), nullable=True))
    op.add_column('children', sa.Column('calming_strategies', sa.Text(), nullable=True))

    # Emergency and attribution columns
    op.add_column('children', sa.Column('emergency_contacts', sa.Text(), nullable=True))
    op.add_column('children', sa.Column('field_contributors', sa.Text(), nullable=True))

    # Court access control columns
    op.add_column('children', sa.Column('court_restricted_fields', sa.Text(), nullable=True))
    op.add_column('children', sa.Column('restricted_parent_id', sa.String(length=36), nullable=True))

    # Create indexes and foreign keys for children
    op.create_index('ix_children_status', 'children', ['status'], unique=False)
    op.create_foreign_key('fk_children_created_by', 'children', 'users', ['created_by'], ['id'])
    op.create_foreign_key('fk_children_approved_by_a', 'children', 'users', ['approved_by_a'], ['id'])
    op.create_foreign_key('fk_children_approved_by_b', 'children', 'users', ['approved_by_b'], ['id'])
    op.create_foreign_key('fk_children_restricted_parent_id', 'children', 'users', ['restricted_parent_id'], ['id'])

    # Set default status for existing children to 'active'
    op.execute("UPDATE children SET status = 'active' WHERE status IS NULL")

    # Make status not nullable after setting defaults
    op.alter_column('children', 'status', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove foreign keys from children
    op.drop_constraint('fk_children_restricted_parent_id', 'children', type_='foreignkey')
    op.drop_constraint('fk_children_approved_by_b', 'children', type_='foreignkey')
    op.drop_constraint('fk_children_approved_by_a', 'children', type_='foreignkey')
    op.drop_constraint('fk_children_created_by', 'children', type_='foreignkey')
    op.drop_index('ix_children_status', table_name='children')

    # Remove columns from children
    op.drop_column('children', 'restricted_parent_id')
    op.drop_column('children', 'court_restricted_fields')
    op.drop_column('children', 'field_contributors')
    op.drop_column('children', 'emergency_contacts')
    op.drop_column('children', 'calming_strategies')
    op.drop_column('children', 'fears_anxieties')
    op.drop_column('children', 'temperament_notes')
    op.drop_column('children', 'sizes_updated_at')
    op.drop_column('children', 'shoe_size')
    op.drop_column('children', 'clothing_size')
    op.drop_column('children', 'bedtime_routine')
    op.drop_column('children', 'comfort_items')
    op.drop_column('children', 'favorite_activities')
    op.drop_column('children', 'food_dislikes')
    op.drop_column('children', 'favorite_foods')
    op.drop_column('children', 'teacher_email')
    op.drop_column('children', 'school_address')
    op.drop_column('children', 'therapist_phone')
    op.drop_column('children', 'therapist_name')
    op.drop_column('children', 'dentist_phone')
    op.drop_column('children', 'dentist_name')
    op.drop_column('children', 'blood_type')
    op.drop_column('children', 'approved_at_b')
    op.drop_column('children', 'approved_at_a')
    op.drop_column('children', 'approved_by_b')
    op.drop_column('children', 'approved_by_a')
    op.drop_column('children', 'created_by')
    op.drop_column('children', 'status')

    # Drop KidsCubbie tables
    op.drop_index(op.f('ix_cubbie_exchange_items_cubbie_item_id'), table_name='cubbie_exchange_items')
    op.drop_index(op.f('ix_cubbie_exchange_items_exchange_id'), table_name='cubbie_exchange_items')
    op.drop_table('cubbie_exchange_items')
    op.drop_index(op.f('ix_child_photos_child_id'), table_name='child_photos')
    op.drop_table('child_photos')
    op.drop_index(op.f('ix_cubbie_items_case_id'), table_name='cubbie_items')
    op.drop_index(op.f('ix_cubbie_items_child_id'), table_name='cubbie_items')
    op.drop_table('cubbie_items')

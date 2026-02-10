"""add silent handoff to schedule events

Revision ID: add_sh_events
Revises: merge_2026_02_04
Create Date: 2026-02-10 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_sh_events'
down_revision: Union[str, Sequence[str], None] = 'merge_2026_02_04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add Silent Handoff columns to schedule_events
    # Note: location (string) already exists
    
    op.add_column('schedule_events', sa.Column('silent_handoff_enabled', sa.Boolean(), server_default='false', nullable=False))
    
    # Geolocation for the event
    op.add_column('schedule_events', sa.Column('location_lat', sa.Float(), nullable=True))
    op.add_column('schedule_events', sa.Column('location_lng', sa.Float(), nullable=True))
    op.add_column('schedule_events', sa.Column('geofence_radius_meters', sa.Integer(), server_default='100', nullable=False))
    
    # Check-in window
    op.add_column('schedule_events', sa.Column('check_in_window_before_minutes', sa.Integer(), server_default='30', nullable=False))
    op.add_column('schedule_events', sa.Column('check_in_window_after_minutes', sa.Integer(), server_default='30', nullable=False))
    
    # QR Confirmation
    op.add_column('schedule_events', sa.Column('qr_confirmation_required', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('schedule_events', 'qr_confirmation_required')
    op.drop_column('schedule_events', 'check_in_window_after_minutes')
    op.drop_column('schedule_events', 'check_in_window_before_minutes')
    op.drop_column('schedule_events', 'geofence_radius_meters')
    op.drop_column('schedule_events', 'location_lng')
    op.drop_column('schedule_events', 'location_lat')
    op.drop_column('schedule_events', 'silent_handoff_enabled')

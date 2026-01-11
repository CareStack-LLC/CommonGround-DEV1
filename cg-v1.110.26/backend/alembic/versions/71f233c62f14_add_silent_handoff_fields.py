"""add_silent_handoff_fields

Revision ID: 71f233c62f14
Revises: 5bdc949ee143
Create Date: 2026-01-03 19:36:51.171761

Silent Handoff Feature:
- GPS-verified check-ins for custody exchanges
- Geofence location with radius
- Exchange window time boundaries
- QR code mutual confirmation
- Handoff outcome tracking
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '71f233c62f14'
down_revision: Union[str, Sequence[str], None] = '5bdc949ee143'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Silent Handoff fields to custody exchange tables."""

    # ============================================================
    # CustodyExchange - Geofence & Settings
    # ============================================================

    # Geofence location (lat/lng from geocoded address)
    op.add_column('custody_exchanges',
        sa.Column('location_lat', sa.Float(), nullable=True))
    op.add_column('custody_exchanges',
        sa.Column('location_lng', sa.Float(), nullable=True))
    op.add_column('custody_exchanges',
        sa.Column('geofence_radius_meters', sa.Integer(), server_default='100', nullable=False))

    # Exchange window settings
    op.add_column('custody_exchanges',
        sa.Column('check_in_window_before_minutes', sa.Integer(), server_default='30', nullable=False))
    op.add_column('custody_exchanges',
        sa.Column('check_in_window_after_minutes', sa.Integer(), server_default='30', nullable=False))

    # Silent Handoff mode toggles
    op.add_column('custody_exchanges',
        sa.Column('silent_handoff_enabled', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('custody_exchanges',
        sa.Column('qr_confirmation_required', sa.Boolean(), server_default='false', nullable=False))

    # ============================================================
    # CustodyExchangeInstance - GPS Verification Data
    # ============================================================

    # From parent GPS check-in data
    op.add_column('custody_exchange_instances',
        sa.Column('from_parent_check_in_lat', sa.Float(), nullable=True))
    op.add_column('custody_exchange_instances',
        sa.Column('from_parent_check_in_lng', sa.Float(), nullable=True))
    op.add_column('custody_exchange_instances',
        sa.Column('from_parent_device_accuracy', sa.Float(), nullable=True))
    op.add_column('custody_exchange_instances',
        sa.Column('from_parent_distance_meters', sa.Float(), nullable=True))
    op.add_column('custody_exchange_instances',
        sa.Column('from_parent_in_geofence', sa.Boolean(), nullable=True))

    # To parent GPS check-in data
    op.add_column('custody_exchange_instances',
        sa.Column('to_parent_check_in_lat', sa.Float(), nullable=True))
    op.add_column('custody_exchange_instances',
        sa.Column('to_parent_check_in_lng', sa.Float(), nullable=True))
    op.add_column('custody_exchange_instances',
        sa.Column('to_parent_device_accuracy', sa.Float(), nullable=True))
    op.add_column('custody_exchange_instances',
        sa.Column('to_parent_distance_meters', sa.Float(), nullable=True))
    op.add_column('custody_exchange_instances',
        sa.Column('to_parent_in_geofence', sa.Boolean(), nullable=True))

    # QR confirmation (mutual verification)
    op.add_column('custody_exchange_instances',
        sa.Column('qr_confirmation_token', sa.String(64), nullable=True))
    op.add_column('custody_exchange_instances',
        sa.Column('qr_confirmed_at', sa.DateTime(), nullable=True))
    op.add_column('custody_exchange_instances',
        sa.Column('qr_confirmed_by', sa.String(36), nullable=True))

    # Handoff outcome tracking
    op.add_column('custody_exchange_instances',
        sa.Column('handoff_outcome', sa.String(30), nullable=True))

    # Exchange window tracking
    op.add_column('custody_exchange_instances',
        sa.Column('window_start', sa.DateTime(), nullable=True))
    op.add_column('custody_exchange_instances',
        sa.Column('window_end', sa.DateTime(), nullable=True))
    op.add_column('custody_exchange_instances',
        sa.Column('auto_closed', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('custody_exchange_instances',
        sa.Column('auto_closed_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove Silent Handoff fields from custody exchange tables."""

    # CustodyExchangeInstance - Remove GPS verification columns
    op.drop_column('custody_exchange_instances', 'auto_closed_at')
    op.drop_column('custody_exchange_instances', 'auto_closed')
    op.drop_column('custody_exchange_instances', 'window_end')
    op.drop_column('custody_exchange_instances', 'window_start')
    op.drop_column('custody_exchange_instances', 'handoff_outcome')
    op.drop_column('custody_exchange_instances', 'qr_confirmed_by')
    op.drop_column('custody_exchange_instances', 'qr_confirmed_at')
    op.drop_column('custody_exchange_instances', 'qr_confirmation_token')
    op.drop_column('custody_exchange_instances', 'to_parent_in_geofence')
    op.drop_column('custody_exchange_instances', 'to_parent_distance_meters')
    op.drop_column('custody_exchange_instances', 'to_parent_device_accuracy')
    op.drop_column('custody_exchange_instances', 'to_parent_check_in_lng')
    op.drop_column('custody_exchange_instances', 'to_parent_check_in_lat')
    op.drop_column('custody_exchange_instances', 'from_parent_in_geofence')
    op.drop_column('custody_exchange_instances', 'from_parent_distance_meters')
    op.drop_column('custody_exchange_instances', 'from_parent_device_accuracy')
    op.drop_column('custody_exchange_instances', 'from_parent_check_in_lng')
    op.drop_column('custody_exchange_instances', 'from_parent_check_in_lat')

    # CustodyExchange - Remove geofence/settings columns
    op.drop_column('custody_exchanges', 'qr_confirmation_required')
    op.drop_column('custody_exchanges', 'silent_handoff_enabled')
    op.drop_column('custody_exchanges', 'check_in_window_after_minutes')
    op.drop_column('custody_exchanges', 'check_in_window_before_minutes')
    op.drop_column('custody_exchanges', 'geofence_radius_meters')
    op.drop_column('custody_exchanges', 'location_lng')
    op.drop_column('custody_exchanges', 'location_lat')

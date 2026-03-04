"""Add custody order models for FL-311 extraction

Revision ID: 63a2488603bd
Revises: 7e60b95aa043
Create Date: 2026-01-02 11:00:24.803594

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '63a2488603bd'
down_revision: Union[str, Sequence[str], None] = '7e60b95aa043'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create custody_orders table
    op.create_table(
        'custody_orders',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('case_id', sa.String(length=36), nullable=False),
        sa.Column('agreement_id', sa.String(length=36), nullable=True),
        sa.Column('form_type', sa.String(length=50), nullable=False),
        sa.Column('form_state', sa.String(length=2), nullable=False),
        sa.Column('court_case_number', sa.String(length=100), nullable=True),
        sa.Column('court_name', sa.String(length=200), nullable=True),
        sa.Column('court_county', sa.String(length=100), nullable=True),
        sa.Column('order_type', sa.String(length=50), nullable=False),
        sa.Column('is_court_ordered', sa.Boolean(), nullable=False),
        sa.Column('order_date', sa.Date(), nullable=True),
        sa.Column('effective_date', sa.Date(), nullable=True),
        sa.Column('expiration_date', sa.Date(), nullable=True),
        sa.Column('petitioner_id', sa.String(length=36), nullable=True),
        sa.Column('respondent_id', sa.String(length=36), nullable=True),
        sa.Column('other_party_id', sa.String(length=36), nullable=True),
        sa.Column('physical_custody', sa.String(length=20), nullable=False),
        sa.Column('legal_custody', sa.String(length=20), nullable=False),
        sa.Column('visitation_type', sa.String(length=30), nullable=False),
        sa.Column('visitation_document_pages', sa.Integer(), nullable=True),
        sa.Column('visitation_document_date', sa.Date(), nullable=True),
        sa.Column('has_abuse_allegations', sa.Boolean(), nullable=False),
        sa.Column('abuse_alleged_against', sa.String(length=50), nullable=True),
        sa.Column('has_substance_abuse_allegations', sa.Boolean(), nullable=False),
        sa.Column('substance_abuse_alleged_against', sa.String(length=50), nullable=True),
        sa.Column('abuse_allegation_details', sa.Text(), nullable=True),
        sa.Column('travel_restriction_state', sa.Boolean(), nullable=False),
        sa.Column('travel_restriction_counties', sa.JSON(), nullable=True),
        sa.Column('travel_restriction_other', sa.Text(), nullable=True),
        sa.Column('requires_written_permission', sa.Boolean(), nullable=False),
        sa.Column('abduction_risk', sa.Boolean(), nullable=False),
        sa.Column('abduction_prevention_orders', sa.Text(), nullable=True),
        sa.Column('mediation_required', sa.Boolean(), nullable=False),
        sa.Column('mediation_date', sa.DateTime(), nullable=True),
        sa.Column('mediation_location', sa.String(length=300), nullable=True),
        sa.Column('other_provisions', sa.Text(), nullable=True),
        sa.Column('source_pdf_url', sa.Text(), nullable=True),
        sa.Column('source_pdf_hash', sa.String(length=64), nullable=True),
        sa.Column('extracted_at', sa.DateTime(), nullable=True),
        sa.Column('extracted_by', sa.String(length=36), nullable=True),
        sa.Column('extraction_confidence', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('extraction_notes', sa.Text(), nullable=True),
        sa.Column('requires_review', sa.Boolean(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by', sa.String(length=36), nullable=True),
        sa.Column('raw_extracted_data', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id']),
        sa.ForeignKeyConstraint(['agreement_id'], ['agreements.id']),
    )
    op.create_index(op.f('ix_custody_orders_case_id'), 'custody_orders', ['case_id'], unique=False)

    # Create custody_order_children table
    op.create_table(
        'custody_order_children',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('custody_order_id', sa.String(length=36), nullable=False),
        sa.Column('child_id', sa.String(length=36), nullable=True),
        sa.Column('child_name', sa.String(length=200), nullable=False),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('age_at_filing', sa.Integer(), nullable=True),
        sa.Column('physical_custody', sa.String(length=20), nullable=True),
        sa.Column('legal_custody', sa.String(length=20), nullable=True),
        sa.Column('special_needs', sa.Text(), nullable=True),
        sa.Column('school_info', sa.String(length=300), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['custody_order_id'], ['custody_orders.id']),
        sa.ForeignKeyConstraint(['child_id'], ['children.id']),
    )
    op.create_index(op.f('ix_custody_order_children_custody_order_id'), 'custody_order_children', ['custody_order_id'], unique=False)

    # Create visitation_schedules table
    op.create_table(
        'visitation_schedules',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('custody_order_id', sa.String(length=36), nullable=False),
        sa.Column('parent_type', sa.String(length=20), nullable=False),
        sa.Column('schedule_type', sa.String(length=30), nullable=False),
        sa.Column('weekend_number', sa.String(length=20), nullable=True),
        sa.Column('start_day', sa.String(length=20), nullable=True),
        sa.Column('end_day', sa.String(length=20), nullable=True),
        sa.Column('start_time', sa.Time(), nullable=True),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('start_at_school', sa.Boolean(), nullable=False),
        sa.Column('start_after_school', sa.Boolean(), nullable=False),
        sa.Column('end_at_school', sa.Boolean(), nullable=False),
        sa.Column('end_after_school', sa.Boolean(), nullable=False),
        sa.Column('effective_start_date', sa.Date(), nullable=True),
        sa.Column('effective_end_date', sa.Date(), nullable=True),
        sa.Column('fifth_weekend_rule', sa.String(length=50), nullable=True),
        sa.Column('fifth_weekend_start_date', sa.Date(), nullable=True),
        sa.Column('is_virtual', sa.Boolean(), nullable=False),
        sa.Column('virtual_platform', sa.String(length=100), nullable=True),
        sa.Column('virtual_schedule_notes', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['custody_order_id'], ['custody_orders.id']),
    )
    op.create_index(op.f('ix_visitation_schedules_custody_order_id'), 'visitation_schedules', ['custody_order_id'], unique=False)

    # Create supervised_visitations table
    op.create_table(
        'supervised_visitations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('custody_order_id', sa.String(length=36), nullable=False),
        sa.Column('supervised_parent', sa.String(length=20), nullable=False),
        sa.Column('supervision_reason', sa.Text(), nullable=True),
        sa.Column('supervisor_name', sa.String(length=200), nullable=True),
        sa.Column('supervisor_phone', sa.String(length=20), nullable=True),
        sa.Column('supervisor_type', sa.String(length=30), nullable=False),
        sa.Column('supervisor_agency', sa.String(length=200), nullable=True),
        sa.Column('petitioner_cost_percent', sa.Integer(), nullable=True),
        sa.Column('respondent_cost_percent', sa.Integer(), nullable=True),
        sa.Column('other_party_cost_percent', sa.Integer(), nullable=True),
        sa.Column('location_type', sa.String(length=30), nullable=False),
        sa.Column('location_address', sa.String(length=500), nullable=True),
        sa.Column('location_notes', sa.Text(), nullable=True),
        sa.Column('frequency', sa.String(length=50), nullable=True),
        sa.Column('hours_per_visit', sa.Integer(), nullable=True),
        sa.Column('schedule_notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['custody_order_id'], ['custody_orders.id']),
        sa.UniqueConstraint('custody_order_id'),
    )
    op.create_index(op.f('ix_supervised_visitations_custody_order_id'), 'supervised_visitations', ['custody_order_id'], unique=True)

    # Create exchange_rules table
    op.create_table(
        'exchange_rules',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('custody_order_id', sa.String(length=36), nullable=False),
        sa.Column('require_licensed_driver', sa.Boolean(), nullable=False),
        sa.Column('require_insured_driver', sa.Boolean(), nullable=False),
        sa.Column('require_registered_vehicle', sa.Boolean(), nullable=False),
        sa.Column('require_child_restraints', sa.Boolean(), nullable=False),
        sa.Column('transport_to_provider', sa.String(length=200), nullable=True),
        sa.Column('transport_from_provider', sa.String(length=200), nullable=True),
        sa.Column('exchange_start_address', sa.String(length=500), nullable=True),
        sa.Column('exchange_end_address', sa.String(length=500), nullable=True),
        sa.Column('exchange_location_type', sa.String(length=50), nullable=True),
        sa.Column('exchange_protocol', sa.String(length=30), nullable=False),
        sa.Column('curbside_exchange', sa.Boolean(), nullable=False),
        sa.Column('other_rules', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['custody_order_id'], ['custody_orders.id']),
        sa.UniqueConstraint('custody_order_id'),
    )
    op.create_index(op.f('ix_exchange_rules_custody_order_id'), 'exchange_rules', ['custody_order_id'], unique=True)

    # Create holiday_schedules table
    op.create_table(
        'holiday_schedules',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('custody_order_id', sa.String(length=36), nullable=False),
        sa.Column('holiday_name', sa.String(length=100), nullable=False),
        sa.Column('holiday_type', sa.String(length=30), nullable=False),
        sa.Column('assigned_to', sa.String(length=20), nullable=False),
        sa.Column('odd_years_to', sa.String(length=20), nullable=True),
        sa.Column('even_years_to', sa.String(length=20), nullable=True),
        sa.Column('start_day', sa.String(length=100), nullable=True),
        sa.Column('end_day', sa.String(length=100), nullable=True),
        sa.Column('start_time', sa.Time(), nullable=True),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('duration_days', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['custody_order_id'], ['custody_orders.id']),
    )
    op.create_index(op.f('ix_holiday_schedules_custody_order_id'), 'holiday_schedules', ['custody_order_id'], unique=False)

    # Create agreement_uploads table
    op.create_table(
        'agreement_uploads',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('case_id', sa.String(length=36), nullable=False),
        sa.Column('uploaded_by', sa.String(length=36), nullable=False),
        sa.Column('uploaded_by_type', sa.String(length=20), nullable=False),
        sa.Column('original_filename', sa.String(length=500), nullable=False),
        sa.Column('file_url', sa.Text(), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('file_hash', sa.String(length=64), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('document_type', sa.String(length=50), nullable=False),
        sa.Column('form_type', sa.String(length=50), nullable=True),
        sa.Column('state', sa.String(length=2), nullable=True),
        sa.Column('extraction_status', sa.String(length=30), nullable=False),
        sa.Column('extraction_started_at', sa.DateTime(), nullable=True),
        sa.Column('extraction_completed_at', sa.DateTime(), nullable=True),
        sa.Column('extraction_error', sa.Text(), nullable=True),
        sa.Column('custody_order_id', sa.String(length=36), nullable=True),
        sa.Column('extraction_confidence', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('raw_text', sa.Text(), nullable=True),
        sa.Column('raw_extracted_json', sa.JSON(), nullable=True),
        sa.Column('requires_review', sa.Boolean(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by', sa.String(length=36), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id']),
        sa.ForeignKeyConstraint(['custody_order_id'], ['custody_orders.id']),
    )
    op.create_index(op.f('ix_agreement_uploads_case_id'), 'agreement_uploads', ['case_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_agreement_uploads_case_id'), table_name='agreement_uploads')
    op.drop_table('agreement_uploads')
    op.drop_index(op.f('ix_holiday_schedules_custody_order_id'), table_name='holiday_schedules')
    op.drop_table('holiday_schedules')
    op.drop_index(op.f('ix_exchange_rules_custody_order_id'), table_name='exchange_rules')
    op.drop_table('exchange_rules')
    op.drop_index(op.f('ix_supervised_visitations_custody_order_id'), table_name='supervised_visitations')
    op.drop_table('supervised_visitations')
    op.drop_index(op.f('ix_visitation_schedules_custody_order_id'), table_name='visitation_schedules')
    op.drop_table('visitation_schedules')
    op.drop_index(op.f('ix_custody_order_children_custody_order_id'), table_name='custody_order_children')
    op.drop_table('custody_order_children')
    op.drop_index(op.f('ix_custody_orders_case_id'), table_name='custody_orders')
    op.drop_table('custody_orders')

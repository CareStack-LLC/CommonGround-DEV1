"""add chore completion photo columns (Wave 3 C2 — proof-of-completion)

Adds optional photo-proof fields so a child can attach a picture and a
short note when marking a chore complete, giving the reviewing parent
something concrete to look at before approving.

    completion_photo_url     — signed URL (or public URL) for rendering
    completion_photo_bucket  — Supabase bucket name (audit / cleanup)
    completion_photo_key     — object key within the bucket
    completion_note          — short free-text note from the child

All four columns are nullable — photos stay strictly optional.

Revision ID: add_chore_completion_photo_20260417
Revises: add_cs_interventions_20260416
Create Date: 2026-04-17
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "add_chore_completion_photo_20260417"
down_revision: Union[str, Sequence[str], None] = "add_cs_interventions_20260416"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chores",
        sa.Column("completion_photo_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "chores",
        sa.Column("completion_photo_bucket", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "chores",
        sa.Column("completion_photo_key", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "chores",
        sa.Column("completion_note", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("chores", "completion_note")
    op.drop_column("chores", "completion_photo_key")
    op.drop_column("chores", "completion_photo_bucket")
    op.drop_column("chores", "completion_photo_url")

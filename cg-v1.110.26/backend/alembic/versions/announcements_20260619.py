"""Platform announcements table.

Idempotent.

Revision ID: announcements_20260619
Revises: pro_recording_requests_20260618
Create Date: 2026-06-19
"""

from alembic import op


revision = "announcements_20260619"
down_revision = "pro_recording_requests_20260618"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS announcements (
            id VARCHAR(36) PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            body TEXT NOT NULL,
            level VARCHAR(20) NOT NULL DEFAULT 'info',
            audience VARCHAR(20) NOT NULL DEFAULT 'all',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            starts_at TIMESTAMP,
            ends_at TIMESTAMP,
            created_by VARCHAR(36),
            created_by_email VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_announcements_active "
        "ON announcements (is_active)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS announcements")

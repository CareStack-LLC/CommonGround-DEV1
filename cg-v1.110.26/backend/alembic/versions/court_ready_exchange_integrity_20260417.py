"""court-ready exchange integrity: triage bad rows, CHECK, trigger, source cols

Revision ID: court_ready_20260417
Revises: fccff6f93293
Create Date: 2026-04-17 10:00:00.000000

Hardens ``custody_exchange_instances`` for court-grade custody tracking.

1. Any row with ``status='completed'`` whose parent ``custody_exchanges`` row is
   missing ``from_parent_id`` or ``to_parent_id`` is reverted to
   ``status='disputed'`` with a note — these are data-quality defects where
   an exchange was marked complete without both parties identified.
2. Adds a CHECK constraint: completed implies both ``*_checked_in`` booleans
   are true.
3. Adds a BEFORE INSERT/UPDATE trigger that raises if an instance is promoted
   to completed while the parent exchange lacks either parent id.
4. Adds ``from_parent_check_in_source`` and ``to_parent_check_in_source``
   columns capturing which signal (gps/qr/manual/silent_geofence/
   coparent_confirm) fired each check-in — required for the court evidence
   chain.

See docs/architecture/ADR-001-percentage-contract.md.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "court_ready_20260417"
down_revision: Union[str, Sequence[str], None] = "fccff6f93293"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1a. Triage completed rows whose parent exchange lacks a from/to parent.
    #     These are the "unassigned → unassigned" rows the user saw.
    op.execute(
        """
        UPDATE custody_exchange_instances AS ci
        SET status = 'disputed',
            handoff_outcome = COALESCE(ci.handoff_outcome, 'one_party_present'),
            notes = COALESCE(ci.notes || E'\\n', '') ||
                    '[auto] reverted from completed: missing parent identification '
                    '(court_ready_exchange_integrity_20260417)'
        FROM custody_exchanges AS e
        WHERE ci.exchange_id = e.id
          AND ci.status = 'completed'
          AND (e.from_parent_id IS NULL OR e.to_parent_id IS NULL);
        """
    )

    # 1b. Triage completed rows where one party never checked in. This is the
    #     QR-one-scan bug in the legacy ``confirm_qr`` path, which could set
    #     ``status='completed'`` even when ``from_parent_checked_in=FALSE``.
    #     The CHECK constraint in step 3 would reject these rows; revert first.
    op.execute(
        """
        UPDATE custody_exchange_instances
        SET status = 'disputed',
            handoff_outcome = COALESCE(handoff_outcome, 'disputed'),
            notes = COALESCE(notes || E'\\n', '') ||
                    '[auto] reverted from completed: one or both check-ins '
                    'missing (court_ready_exchange_integrity_20260417)'
        WHERE status = 'completed'
          AND (from_parent_checked_in = FALSE OR to_parent_checked_in = FALSE);
        """
    )

    # 2. Source columns — nullable for historical rows, tagged by every new
    #    check-in path in app.services.custody_exchange.
    op.add_column(
        "custody_exchange_instances",
        sa.Column("from_parent_check_in_source", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "custody_exchange_instances",
        sa.Column("to_parent_check_in_source", sa.String(length=20), nullable=True),
    )

    # 3. CHECK constraint: completed implies both parents checked in.
    op.execute(
        """
        ALTER TABLE custody_exchange_instances
        ADD CONSTRAINT ck_completed_instance_requires_both_checkins
        CHECK (
            status <> 'completed'
            OR (from_parent_checked_in = TRUE AND to_parent_checked_in = TRUE)
        );
        """
    )

    # 4. Trigger: completed implies parent exchange has both parent ids.
    #    CHECK can't span tables so we use a trigger.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION enforce_completed_exchange_parents()
        RETURNS trigger AS $$
        BEGIN
          IF NEW.status = 'completed' THEN
            IF NOT EXISTS (
              SELECT 1 FROM custody_exchanges e
              WHERE e.id = NEW.exchange_id
                AND e.from_parent_id IS NOT NULL
                AND e.to_parent_id IS NOT NULL
            ) THEN
              RAISE EXCEPTION
                'Cannot mark instance % completed: parent exchange lacks from_parent_id/to_parent_id',
                NEW.id;
            END IF;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        DROP TRIGGER IF EXISTS trg_enforce_completed_exchange_parents
            ON custody_exchange_instances;
        CREATE TRIGGER trg_enforce_completed_exchange_parents
        BEFORE INSERT OR UPDATE OF status ON custody_exchange_instances
        FOR EACH ROW EXECUTE FUNCTION enforce_completed_exchange_parents();
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        "DROP TRIGGER IF EXISTS trg_enforce_completed_exchange_parents "
        "ON custody_exchange_instances;"
    )
    op.execute("DROP FUNCTION IF EXISTS enforce_completed_exchange_parents();")
    op.execute(
        "ALTER TABLE custody_exchange_instances "
        "DROP CONSTRAINT IF EXISTS ck_completed_instance_requires_both_checkins;"
    )
    op.drop_column("custody_exchange_instances", "to_parent_check_in_source")
    op.drop_column("custody_exchange_instances", "from_parent_check_in_source")

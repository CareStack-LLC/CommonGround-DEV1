"""Reliability batch 1: custody exchange auto-close race.

Two concurrent schedulers (one per web instance) used to be able to
double-close the same expired exchange instance. With FOR UPDATE SKIP
LOCKED + post-lock rechecks, each instance must be closed exactly once.
"""

import asyncio
from datetime import datetime, timedelta

import pytest
from sqlalchemy import delete, select

from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.family_file import FamilyFile
from app.models.user import User
from app.services.custody_exchange import CustodyExchangeService

pytestmark = pytest.mark.asyncio


async def _seed(session_factory, unique_id, n_instances=4):
    """Create a user, family file, exchange, and N expired scheduled instances."""
    ids = {
        "user": unique_id(),
        "user_b": unique_id(),
        "family_file": unique_id(),
        "exchange": unique_id(),
        "instances": [unique_id() for _ in range(n_instances)],
    }
    now = datetime.utcnow()
    async with session_factory() as db:
        db.add(User(
            id=ids["user"], supabase_id=unique_id(),
            email=f"test-{ids['user']}@example.com",
            first_name="Test", last_name="ParentA",
            email_verified=True, phone_verified=False, is_active=True,
            is_deleted=False, mfa_enabled=False,
        ))
        db.add(User(
            id=ids["user_b"], supabase_id=unique_id(),
            email=f"test-{ids['user_b']}@example.com",
            first_name="Test", last_name="ParentB",
            email_verified=True, phone_verified=False, is_active=True,
            is_deleted=False, mfa_enabled=False,
        ))
        db.add(FamilyFile(
            id=ids["family_file"],
            family_file_number=f"TEST-{ids['family_file'][:8]}",
            title="Auto-close race test",
            created_by=ids["user"],
            parent_a_id=ids["user"],
            parent_b_id=ids["user_b"],
        ))
        db.add(CustodyExchange(
            id=ids["exchange"],
            family_file_id=ids["family_file"],
            created_by=ids["user"],
            from_parent_id=ids["user"],
            to_parent_id=ids["user_b"],
            exchange_type="dropoff",
            child_ids=[],
            scheduled_time=now - timedelta(hours=3),
            duration_minutes=30,
            is_recurring=False,
            status="active",
            notes_visible_to_coparent=False,
        ))
        for iid in ids["instances"]:
            db.add(CustodyExchangeInstance(
                id=iid,
                exchange_id=ids["exchange"],
                scheduled_time=now - timedelta(hours=3),
                status="scheduled",
                window_end=now - timedelta(hours=1),
                auto_closed=False,
                from_parent_checked_in=False,
                to_parent_checked_in=False,
            ))
        await db.commit()
    return ids


async def _cleanup(session_factory, ids):
    async with session_factory() as db:
        await db.execute(delete(CustodyExchangeInstance).where(
            CustodyExchangeInstance.id.in_(ids["instances"])))
        await db.execute(delete(CustodyExchange).where(
            CustodyExchange.id == ids["exchange"]))
        await db.execute(delete(FamilyFile).where(
            FamilyFile.id == ids["family_file"]))
        await db.execute(delete(User).where(
            User.id.in_([ids["user"], ids["user_b"]])))
        await db.commit()


async def test_concurrent_auto_close_closes_each_instance_once(
    session_factory, unique_id, monkeypatch
):
    ids = await _seed(session_factory, unique_id)

    # Count attorney notifications per instance — a double-close would
    # notify twice for the same instance id.
    notified: list[str] = []

    async def _fake_notify(db, family_file_id, exchange_instance_id, **kwargs):
        notified.append(exchange_instance_id)

    import app.services.aria_attorney_notify as notify_mod
    monkeypatch.setattr(
        notify_mod, "notify_attorneys_on_missed_exchange", _fake_notify
    )

    try:
        async def run_sweep():
            async with session_factory() as db:
                return await CustodyExchangeService.auto_close_expired_windows(db)

        await asyncio.gather(run_sweep(), run_sweep())

        async with session_factory() as db:
            rows = (await db.execute(
                select(CustodyExchangeInstance).where(
                    CustodyExchangeInstance.id.in_(ids["instances"]))
            )).scalars().all()

        assert len(rows) == len(ids["instances"])
        for row in rows:
            assert row.auto_closed is True
            assert row.auto_closed_at is not None
            assert row.status == "missed"
            assert row.handoff_outcome == "missed"

        # Each of OUR instances notified exactly once (other dev-DB rows may
        # also have been swept; filter to ours).
        ours = [iid for iid in notified if iid in ids["instances"]]
        assert sorted(ours) == sorted(ids["instances"]), (
            f"expected one notification per instance, got {ours}"
        )
    finally:
        await _cleanup(session_factory, ids)

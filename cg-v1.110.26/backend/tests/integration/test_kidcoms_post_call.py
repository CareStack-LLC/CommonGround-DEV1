"""Reliability batch 1: KidComs post-call ARIA analysis (child-safety gap).

A completed KidComs session must get a persisted full-transcript ARIA
report; the run must be idempotent; severe findings must notify both
parents via websocket + durable email.
"""

from datetime import datetime, timedelta

import pytest
from sqlalchemy import delete, select

from app.models.child import Child
from app.models.family_file import FamilyFile
from app.models.kidcoms import KidComsMessage, KidComsSession
from app.models.user import User
from app.services.aria_call_monitor import (
    analyze_and_report_kidcoms_session,
    aria_call_monitor,
)

pytestmark = pytest.mark.asyncio


async def _seed(session_factory, unique_id, include_severe=True):
    ids = {
        "parent_a": unique_id(),
        "parent_b": unique_id(),
        "family_file": unique_id(),
        "child": unique_id(),
        "session": unique_id(),
        "messages": [],
    }
    now = datetime.utcnow()
    async with session_factory() as db:
        for key, last in (("parent_a", "A"), ("parent_b", "B")):
            db.add(User(
                id=ids[key], supabase_id=unique_id(),
                email=f"test-{ids[key]}@example.com",
                first_name="Test", last_name=f"Parent{last}",
                email_verified=True, phone_verified=False, is_active=True,
                is_deleted=False, mfa_enabled=False,
            ))
        db.add(FamilyFile(
            id=ids["family_file"],
            family_file_number=f"TEST-{ids['family_file'][:8]}",
            title="KidComs post-call test",
            created_by=ids["parent_a"],
            parent_a_id=ids["parent_a"],
            parent_b_id=ids["parent_b"],
        ))
        await db.commit()

        db.add(Child(
            id=ids["child"],
            family_file_id=ids["family_file"],
            first_name="Kid", last_name="Test",
            date_of_birth=now - timedelta(days=365 * 9),
            has_special_needs=False, has_iep=False, has_504=False,
            is_active=True, status="active",
        ))
        await db.commit()

        db.add(KidComsSession(
            id=ids["session"],
            family_file_id=ids["family_file"],
            child_id=ids["child"],
            session_type="video_call",
            status="completed",
            daily_room_name=f"test-room-{ids['session'][:8]}",
            daily_room_url="https://example.daily.co/test",
            initiated_by_id=ids["child"],
            initiated_by_type="child",
            started_at=now - timedelta(minutes=20),
            ended_at=now,
            duration_seconds=1200,
        ))
        await db.commit()

        contents = [("Hi sweetie, how was school today?", False)]
        if include_severe:
            # Pre-analyzed severe chunk (as the realtime shield would store it)
            contents.append(("threatening content placeholder", True))
        for content, severe in contents:
            mid = unique_id()
            ids["messages"].append(mid)
            db.add(KidComsMessage(
                id=mid,
                session_id=ids["session"],
                sender_id=ids["parent_a"],
                sender_type="parent",
                sender_name="Test ParentA",
                content=content,
                aria_analyzed=severe,
                aria_flagged=severe,
                aria_score=0.9 if severe else None,
                aria_category="threatening" if severe else None,
                sent_at=now - timedelta(minutes=10),
            ))
        await db.commit()
    return ids


async def _cleanup(session_factory, ids):
    async with session_factory() as db:
        await db.execute(delete(KidComsMessage).where(
            KidComsMessage.session_id == ids["session"]))
        await db.execute(delete(KidComsSession).where(
            KidComsSession.id == ids["session"]))
        await db.execute(delete(Child).where(Child.id == ids["child"]))
        await db.execute(delete(FamilyFile).where(
            FamilyFile.id == ids["family_file"]))
        await db.execute(delete(User).where(
            User.id.in_([ids["parent_a"], ids["parent_b"]])))
        await db.commit()


async def test_report_persisted_and_idempotent(session_factory, unique_id):
    ids = await _seed(session_factory, unique_id)
    try:
        async with session_factory() as db:
            report = await aria_call_monitor.analyze_full_kidcoms_session(
                db, ids["session"])

        assert report is not None
        assert report["total_chunks"] == 2
        assert report["severe_violations_count"] == 1
        assert report["severe_violations"][0]["categories"] == ["threatening"]
        assert report["flags_count"] == 1
        assert report["recommendations"]

        async with session_factory() as db:
            session = (await db.execute(
                select(KidComsSession).where(KidComsSession.id == ids["session"])
            )).scalar_one()
            assert session.aria_report is not None
            assert session.aria_analyzed_at is not None

            # Idempotent: second run returns the stored report unchanged
            again = await aria_call_monitor.analyze_full_kidcoms_session(
                db, ids["session"])
            assert again["generated_at"] == report["generated_at"]
    finally:
        await _cleanup(session_factory, ids)


async def test_severe_findings_notify_both_parents(
    session_factory, unique_id, monkeypatch
):
    ids = await _seed(session_factory, unique_id)

    # Route the background task's own session to the test database.
    import app.core.database as database
    monkeypatch.setattr(database, "AsyncSessionLocal", session_factory)

    ws_sent: list[str] = []
    emails: list[str] = []

    async def _fake_ws(message, user_id):
        ws_sent.append(user_id)

    async def _fake_email(to_email, to_name, category, suggestion=None, **kw):
        emails.append(to_email)
        return "msg-id"

    import app.core.websocket as ws_mod
    monkeypatch.setattr(ws_mod.manager, "send_personal_message", _fake_ws)
    import app.services.email as email_mod
    monkeypatch.setattr(
        email_mod.email_service, "send_aria_intervention", _fake_email
    )

    try:
        await analyze_and_report_kidcoms_session(ids["session"])

        assert sorted(ws_sent) == sorted([ids["parent_a"], ids["parent_b"]])
        assert sorted(emails) == sorted([
            f"test-{ids['parent_a']}@example.com",
            f"test-{ids['parent_b']}@example.com",
        ])
    finally:
        await _cleanup(session_factory, ids)


async def test_clean_call_does_not_notify(session_factory, unique_id, monkeypatch):
    ids = await _seed(session_factory, unique_id, include_severe=False)

    import app.core.database as database
    monkeypatch.setattr(database, "AsyncSessionLocal", session_factory)

    ws_sent: list[str] = []

    async def _fake_ws(message, user_id):
        ws_sent.append(user_id)

    import app.core.websocket as ws_mod
    monkeypatch.setattr(ws_mod.manager, "send_personal_message", _fake_ws)

    try:
        await analyze_and_report_kidcoms_session(ids["session"])
        assert ws_sent == []

        async with session_factory() as db:
            session = (await db.execute(
                select(KidComsSession).where(KidComsSession.id == ids["session"])
            )).scalar_one()
            assert session.aria_report is not None  # report still persisted
            assert session.aria_report["severe_violations_count"] == 0
    finally:
        await _cleanup(session_factory, ids)

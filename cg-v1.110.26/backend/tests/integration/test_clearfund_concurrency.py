"""Reliability batch 1: ClearFund funding race.

Two concurrent record_funding calls used to lose one update (both read the
same amount_funded snapshot) and could double-fire the funded transition's
virtual-card issuance. With obligation/funding row locks, the final amount
must equal the sum of payments and the card must be issued exactly once.
"""

import asyncio
from decimal import Decimal

import pytest
from sqlalchemy import delete, select

from app.models.clearfund import Obligation, ObligationFunding
from app.models.payment import PaymentLedger
from app.models.family_file import FamilyFile
from app.models.user import User
from app.schemas.clearfund import FundingCreate
from app.services.clearfund import ClearFundService

pytestmark = pytest.mark.asyncio


async def _seed(session_factory, unique_id):
    ids = {
        "user": unique_id(),
        "user_b": unique_id(),
        "family_file": unique_id(),
        "obligation": unique_id(),
        "funding": unique_id(),
    }
    async with session_factory() as db:
        db.add(User(
            id=ids["user"], supabase_id=unique_id(),
            email=f"test-{ids['user']}@example.com",
            first_name="Test", last_name="Payer",
            email_verified=True, phone_verified=False, is_active=True,
            is_deleted=False, mfa_enabled=False,
        ))
        db.add(User(
            id=ids["user_b"], supabase_id=unique_id(),
            email=f"test-{ids['user_b']}@example.com",
            first_name="Test", last_name="Other",
            email_verified=True, phone_verified=False, is_active=True,
            is_deleted=False, mfa_enabled=False,
        ))
        db.add(FamilyFile(
            id=ids["family_file"],
            family_file_number=f"TEST-{ids['family_file'][:8]}",
            title="ClearFund race test",
            created_by=ids["user"],
            parent_a_id=ids["user"],
            parent_b_id=ids["user_b"],
        ))
        # Obligation.family_file_id is a plain String column (no SQLAlchemy
        # ForeignKey metadata), so flush ordering doesn't know the dependency
        # — persist the family file first.
        await db.commit()
        db.add(Obligation(
            id=ids["obligation"],
            family_file_id=ids["family_file"],
            source_type="manual",
            purpose_category="other",
            title="Race test obligation",
            total_amount=Decimal("100.00"),
            petitioner_share=Decimal("100.00"),
            respondent_share=Decimal("0.00"),
            petitioner_percentage=Decimal("100.00"),
            status="open",
            amount_funded=Decimal("0.00"),
            amount_spent=Decimal("0.00"),
            amount_verified=Decimal("0.00"),
            verification_required=False,
            receipt_required=False,
            receipt_deadline_hours=72,
            is_recurring=False,
            created_by=ids["user"],
        ))
        db.add(ObligationFunding(
            id=ids["funding"],
            obligation_id=ids["obligation"],
            parent_id=ids["user"],
            amount_required=Decimal("100.00"),
            amount_funded=Decimal("0.00"),
            is_fully_funded=False,
        ))
        await db.commit()
    return ids


async def _cleanup(session_factory, ids):
    async with session_factory() as db:
        await db.execute(delete(PaymentLedger).where(
            PaymentLedger.obligation_id == ids["obligation"]))
        await db.execute(delete(ObligationFunding).where(
            ObligationFunding.obligation_id == ids["obligation"]))
        await db.execute(delete(Obligation).where(
            Obligation.id == ids["obligation"]))
        await db.execute(delete(FamilyFile).where(
            FamilyFile.id == ids["family_file"]))
        await db.execute(delete(User).where(
            User.id.in_([ids["user"], ids["user_b"]])))
        await db.commit()


async def test_concurrent_fundings_do_not_lose_updates(
    session_factory, unique_id, monkeypatch
):
    ids = await _seed(session_factory, unique_id)

    card_issuances = []

    async def _fake_issue_card(db, obligation_id):
        card_issuances.append(obligation_id)

    import app.services.clearfund as clearfund_mod
    monkeypatch.setattr(
        clearfund_mod, "issue_virtual_card_on_funding", _fake_issue_card
    )

    async def _noop_broadcast(*args, **kwargs):
        return None

    monkeypatch.setattr(
        clearfund_mod.realtime_service, "broadcast_payment_received", _noop_broadcast
    )
    monkeypatch.setattr(
        clearfund_mod.realtime_service, "broadcast_obligation_updated", _noop_broadcast
    )

    try:
        async def fund_50():
            async with session_factory() as db:
                user = (await db.execute(
                    select(User).where(User.id == ids["user"])
                )).scalar_one()
                service = ClearFundService(db)
                return await service.record_funding(
                    ids["obligation"],
                    FundingCreate(amount=Decimal("50.00")),
                    user,
                )

        await asyncio.gather(fund_50(), fund_50())

        async with session_factory() as db:
            obligation = (await db.execute(
                select(Obligation).where(Obligation.id == ids["obligation"])
            )).scalar_one()
            funding = (await db.execute(
                select(ObligationFunding).where(
                    ObligationFunding.id == ids["funding"])
            )).scalar_one()

        assert obligation.amount_funded == Decimal("100.00"), (
            f"lost update: amount_funded={obligation.amount_funded}"
        )
        assert obligation.status == "funded"
        assert funding.amount_funded == Decimal("100.00")
        assert funding.is_fully_funded is True
        assert card_issuances == [ids["obligation"]], (
            f"virtual card issued {len(card_issuances)} times, expected once"
        )
    finally:
        await _cleanup(session_factory, ids)

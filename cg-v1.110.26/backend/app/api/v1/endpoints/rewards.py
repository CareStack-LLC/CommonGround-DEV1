"""
Wave 3 C3 — Rewards store endpoints.

Parent endpoints (JWT parent auth):
    POST   /rewards                              create a reward
    GET    /rewards?family_file_id=...           list catalog (all — active + disabled)
    PATCH  /rewards/{id}                         edit
    DELETE /rewards/{id}                         soft-delete (is_active=False)

    GET  /rewards/redemptions?family_file_id=... list redemptions (any status)
    POST /rewards/redemptions/{id}/fulfill       mark delivered
    POST /rewards/redemptions/{id}/cancel        refund + cancel

Child endpoints (child-user JWT):
    GET  /rewards/catalog                        list active rewards for my family
    POST /rewards/redeem                         request a redemption (debits wallet)
    GET  /rewards/my-redemptions                 the child's history
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_child_user, get_current_user
from app.models.child import Child
from app.models.family_file import FamilyFile
from app.models.kidcoms import ChildUser
from app.models.reward import RedemptionStatus, Reward, RewardRedemption
from app.models.user import User
from app.models.wallet import WalletTransaction
from app.schemas.reward import (
    RewardCreate,
    RewardRedemptionCreate,
    RewardRedemptionResponse,
    RewardResponse,
    RewardUpdate,
)
from app.services.wallet_service import wallet_service

logger = logging.getLogger(__name__)
router = APIRouter()


async def _verify_parent_of(db: AsyncSession, user: User, family_file_id: str) -> FamilyFile:
    ff = (
        await db.execute(select(FamilyFile).where(FamilyFile.id == family_file_id))
    ).scalar_one_or_none()
    if not ff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family file not found")
    if str(user.id) not in (str(ff.parent_a_id), str(ff.parent_b_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a parent on this family file")
    return ff


async def _child_family_file_id(db: AsyncSession, child_id: str) -> str:
    child = (await db.execute(select(Child).where(Child.id == child_id))).scalar_one_or_none()
    if not child or not child.family_file_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child or family file not found")
    return str(child.family_file_id)


# ─────────────────────────── Parent: catalog CRUD ─────────────────────────


@router.post("", response_model=RewardResponse, status_code=status.HTTP_201_CREATED)
async def create_reward(
    payload: RewardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_parent_of(db, current_user, payload.family_file_id)
    reward = Reward(
        id=str(uuid.uuid4()),
        family_file_id=payload.family_file_id,
        created_by=str(current_user.id),
        title=payload.title,
        description=payload.description,
        cost_amount=payload.cost_amount,
        image_emoji=payload.image_emoji,
        stock_limit=payload.stock_limit,
        is_active=True,
    )
    db.add(reward)
    await db.commit()
    await db.refresh(reward)
    return reward


@router.get("", response_model=List[RewardResponse])
async def list_rewards_for_family(
    family_file_id: str = Query(...),
    include_inactive: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_parent_of(db, current_user, family_file_id)
    filters = [Reward.family_file_id == family_file_id]
    if not include_inactive:
        filters.append(Reward.is_active.is_(True))
    rows = await db.execute(
        select(Reward).where(and_(*filters)).order_by(Reward.cost_amount.asc())
    )
    return list(rows.scalars().all())


@router.patch("/{reward_id}", response_model=RewardResponse)
async def update_reward(
    reward_id: str,
    payload: RewardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reward = (
        await db.execute(select(Reward).where(Reward.id == reward_id))
    ).scalar_one_or_none()
    if not reward:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reward not found")
    await _verify_parent_of(db, current_user, reward.family_file_id)

    for field in ("title", "description", "cost_amount", "image_emoji", "stock_limit", "is_active"):
        val = getattr(payload, field)
        if val is not None:
            setattr(reward, field, val)

    await db.commit()
    await db.refresh(reward)
    return reward


@router.delete("/{reward_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reward(
    reward_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reward = (
        await db.execute(select(Reward).where(Reward.id == reward_id))
    ).scalar_one_or_none()
    if not reward:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reward not found")
    await _verify_parent_of(db, current_user, reward.family_file_id)
    # Soft-delete so past redemptions keep their title/cost intact for history.
    reward.is_active = False
    await db.commit()


# ───────────────────────── Child: browse + redeem ────────────────────────


@router.get("/catalog", response_model=List[RewardResponse])
async def list_catalog_as_child(
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    ff_id = await _child_family_file_id(db, current_child.child_id)
    rows = await db.execute(
        select(Reward)
        .where(and_(Reward.family_file_id == ff_id, Reward.is_active.is_(True)))
        .order_by(Reward.cost_amount.asc())
    )
    return list(rows.scalars().all())


@router.post("/redeem", response_model=RewardRedemptionResponse, status_code=status.HTTP_201_CREATED)
async def redeem_reward(
    payload: RewardRedemptionCreate,
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    reward = (
        await db.execute(select(Reward).where(Reward.id == payload.reward_id))
    ).scalar_one_or_none()
    if not reward or not reward.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This reward isn't available anymore.",
        )

    # Reward must belong to this child's family file.
    ff_id = await _child_family_file_id(db, current_child.child_id)
    if str(reward.family_file_id) != ff_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can't redeem rewards from another family.",
        )

    # Stock check.
    if reward.stock_limit is not None:
        taken = (
            await db.execute(
                select(RewardRedemption).where(
                    and_(
                        RewardRedemption.reward_id == reward.id,
                        RewardRedemption.status != RedemptionStatus.CANCELLED,
                    )
                )
            )
        ).scalars().all()
        if len(taken) >= reward.stock_limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This reward is sold out.",
            )

    # Wallet check.
    wallet = await wallet_service.get_child_wallet(db, current_child.child_id)
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your wallet isn't ready yet — ask a parent to set it up.",
        )
    balances = await wallet_service.calculate_balance(db, wallet.id)
    if balances["available_balance"] < reward.cost_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough in your wallet yet. Save up a little more!",
        )

    # Debit wallet.
    txn = WalletTransaction(
        id=str(uuid.uuid4()),
        wallet_id=wallet.id,
        transaction_type="transfer_out",
        amount=reward.cost_amount,
        net_amount=reward.cost_amount,
        fee_amount=Decimal(0),
        currency="USD",
        description=f"Reward redeemed: {reward.title}",
        status="completed",
        completed_at=datetime.utcnow(),
        source_type="reward_redemption",
    )
    db.add(txn)
    await db.flush()

    redemption = RewardRedemption(
        id=str(uuid.uuid4()),
        reward_id=reward.id,
        child_id=current_child.child_id,
        family_file_id=ff_id,
        cost_at_redemption=reward.cost_amount,
        status=RedemptionStatus.REQUESTED,
        wallet_transaction_id=txn.id,
    )
    db.add(redemption)
    await db.commit()
    await db.refresh(redemption)

    # Notify both parents so they see the fulfillment queue grow. Best-effort.
    try:
        from app.models.child import Child
        from app.models.family_file import FamilyFile
        from app.models.notification import NotificationType
        from app.services.notification_service import NotificationService

        ff = (
            await db.execute(select(FamilyFile).where(FamilyFile.id == ff_id))
        ).scalar_one_or_none()
        child = (
            await db.execute(select(Child).where(Child.id == current_child.child_id))
        ).scalar_one_or_none()
        child_name = child.first_name if child else "Your child"
        service = NotificationService()
        for parent_id in (ff.parent_a_id, ff.parent_b_id) if ff else ():
            if parent_id:
                await service.create(
                    db=db,
                    user_id=str(parent_id),
                    notification_type=NotificationType.REWARD_REDEEMED.value,
                    title=f"{child_name} redeemed a reward",
                    body=f"{reward.title} — time to deliver!",
                    action_url=f"/family-files/{ff_id}/rewards",
                    family_file_id=ff_id,
                    send_email=False,
                )
    except Exception as notify_exc:  # pragma: no cover — best-effort
        logger.warning("reward-redeemed notification failed for %s: %s", redemption.id, notify_exc)

    return redemption


@router.get("/my-redemptions", response_model=List[RewardRedemptionResponse])
async def list_my_redemptions(
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(RewardRedemption)
        .where(RewardRedemption.child_id == current_child.child_id)
        .order_by(RewardRedemption.created_at.desc())
    )
    return list(rows.scalars().all())


# ──────────────────────── Parent: fulfillment queue ───────────────────────


@router.get("/redemptions", response_model=List[RewardRedemptionResponse])
async def list_redemptions_for_family(
    family_file_id: str = Query(...),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_parent_of(db, current_user, family_file_id)
    filters = [RewardRedemption.family_file_id == family_file_id]
    if status_filter:
        filters.append(RewardRedemption.status == status_filter)
    rows = await db.execute(
        select(RewardRedemption).where(and_(*filters)).order_by(RewardRedemption.created_at.desc())
    )
    return list(rows.scalars().all())


@router.post("/redemptions/{redemption_id}/fulfill", response_model=RewardRedemptionResponse)
async def fulfill_redemption(
    redemption_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = (
        await db.execute(select(RewardRedemption).where(RewardRedemption.id == redemption_id))
    ).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Redemption not found")
    await _verify_parent_of(db, current_user, r.family_file_id)
    if r.status == RedemptionStatus.FULFILLED:
        return r  # idempotent
    if r.status == RedemptionStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This redemption was cancelled and cannot be fulfilled.",
        )
    r.status = RedemptionStatus.FULFILLED
    r.fulfilled_by = str(current_user.id)
    r.fulfilled_at = datetime.utcnow()
    await db.commit()
    await db.refresh(r)
    return r


@router.post("/redemptions/{redemption_id}/cancel", response_model=RewardRedemptionResponse)
async def cancel_redemption(
    redemption_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = (
        await db.execute(select(RewardRedemption).where(RewardRedemption.id == redemption_id))
    ).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Redemption not found")
    await _verify_parent_of(db, current_user, r.family_file_id)
    if r.status == RedemptionStatus.CANCELLED:
        return r  # idempotent
    if r.status == RedemptionStatus.FULFILLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This redemption is already fulfilled.",
        )

    # Refund the child's wallet with a matching credit transaction.
    wallet = await wallet_service.get_child_wallet(db, r.child_id)
    if wallet:
        refund_txn = WalletTransaction(
            id=str(uuid.uuid4()),
            wallet_id=wallet.id,
            transaction_type="refund",
            amount=r.cost_at_redemption,
            net_amount=r.cost_at_redemption,
            fee_amount=Decimal(0),
            currency="USD",
            description="Reward redemption refund",
            status="completed",
            completed_at=datetime.utcnow(),
            source_type="reward_redemption_refund",
            source_id=str(r.id),
        )
        db.add(refund_txn)

    r.status = RedemptionStatus.CANCELLED
    await db.commit()
    await db.refresh(r)
    return r

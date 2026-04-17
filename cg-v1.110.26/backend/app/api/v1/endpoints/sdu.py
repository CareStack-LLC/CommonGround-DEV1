"""
Wave 4-Alt — SDU (State Disbursement Unit) lookup + payment-log endpoints.

Child support at CommonGround is routed through each parent's state SDU.
This endpoint cluster provides:

    GET  /sdu/states                    list all SDUs (for a state selector)
    GET  /sdu/states/{state_code}       details for one state

    POST /sdu/payment-logs              log a child-support payment
    GET  /sdu/payment-logs              list logs for a family file / obligation
    PATCH /sdu/payment-logs/{id}        edit a log (payer within 48h, otherwise admin only)
    POST /sdu/payment-logs/{id}/contest other parent flags a log as disputed
    POST /sdu/payment-logs/{id}/verify  mark as verified (optional — e.g. after
                                        receipt confirmation)
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.child_support_payment_log import ChildSupportPaymentLog
from app.models.family_file import FamilyFile
from app.models.user import User
from app.services.sdu_registry import (
    FEDERAL_FALLBACK_URL,
    get_sdu,
    list_sdus,
    sdu_to_dict,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ───────────────────────────── Pydantic schemas ──────────────────────────


class SduInfoResponse(BaseModel):
    state_code: str
    state_name: str
    sdu_name: str
    sdu_url: str
    info_url: str
    phone: Optional[str]
    requires_county: bool
    accepts_online: bool
    notes: Optional[str] = None


class PaymentLogCreate(BaseModel):
    family_file_id: str
    obligation_id: Optional[str] = None
    payer_id: Optional[str] = None  # defaults to current_user
    state_code: str = Field(..., min_length=2, max_length=2)
    county: Optional[str] = Field(None, max_length=100)
    amount: Decimal = Field(..., gt=0, le=100000)
    payment_date: datetime
    confirmation_number: Optional[str] = Field(None, max_length=200)
    receipt_url: Optional[str] = Field(None, max_length=500)
    payment_channel: str = Field(default="sdu", pattern="^(sdu|informal)$")
    notes: Optional[str] = Field(None, max_length=2000)


class PaymentLogUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, le=100000)
    payment_date: Optional[datetime] = None
    confirmation_number: Optional[str] = Field(None, max_length=200)
    receipt_url: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=2000)


class ContestRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class PaymentLogResponse(BaseModel):
    id: str
    family_file_id: str
    obligation_id: Optional[str]
    logged_by: str
    payer_id: str
    state_code: str
    county: Optional[str]
    amount: Decimal
    currency: str
    payment_date: datetime
    confirmation_number: Optional[str]
    receipt_url: Optional[str]
    payment_channel: str
    notes: Optional[str]
    status: str
    contested_by: Optional[str]
    contested_reason: Optional[str]
    contested_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ───────────────────────────── SDU registry reads ────────────────────────


@router.get("/states", response_model=List[SduInfoResponse])
async def list_state_sdus():
    """Public — returns all 50 states + DC with SDU metadata for a dropdown."""
    return [sdu_to_dict(e) for e in list_sdus()]


@router.get("/states/{state_code}", response_model=SduInfoResponse)
async def get_state_sdu(state_code: str):
    entry = get_sdu(state_code)
    if not entry:
        # Fall back to the federal index rather than 404 — parents in an
        # unlisted territory (USVI, PR, etc.) still need a destination.
        return SduInfoResponse(
            state_code=state_code.upper(),
            state_name=state_code.upper(),
            sdu_name="Federal Child Support Index",
            sdu_url=FEDERAL_FALLBACK_URL,
            info_url=FEDERAL_FALLBACK_URL,
            phone=None,
            requires_county=False,
            accepts_online=False,
            notes="Your state isn't in our directory. Use the federal index to find your SDU.",
        )
    return sdu_to_dict(entry)


# ───────────────────────────── Helpers ───────────────────────────────────


async def _verify_parent_of(db: AsyncSession, user: User, family_file_id: str) -> FamilyFile:
    ff = (
        await db.execute(select(FamilyFile).where(FamilyFile.id == family_file_id))
    ).scalar_one_or_none()
    if not ff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family file not found")
    if str(user.id) not in (str(ff.parent_a_id), str(ff.parent_b_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a parent on this family file")
    return ff


# ───────────────────────────── Payment log CRUD ──────────────────────────


@router.post("/payment-logs", response_model=PaymentLogResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_log(
    payload: PaymentLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ff = await _verify_parent_of(db, current_user, payload.family_file_id)

    payer_id = payload.payer_id or str(current_user.id)
    # Only allow logging on behalf of the other parent if the caller is a
    # parent on this family file (prevents strangers from back-filling).
    if payer_id not in (str(ff.parent_a_id), str(ff.parent_b_id)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payer must be one of the parents on this family file.",
        )

    # Validate state code.
    if payload.payment_channel == "sdu" and not get_sdu(payload.state_code):
        logger.info("payment log: unknown state_code=%s — accepting anyway for directory fallback", payload.state_code)

    log = ChildSupportPaymentLog(
        id=str(uuid.uuid4()),
        family_file_id=payload.family_file_id,
        obligation_id=payload.obligation_id,
        logged_by=str(current_user.id),
        payer_id=payer_id,
        state_code=payload.state_code.upper(),
        county=payload.county,
        amount=payload.amount,
        payment_date=payload.payment_date,
        confirmation_number=payload.confirmation_number,
        receipt_url=payload.receipt_url,
        payment_channel=payload.payment_channel,
        notes=payload.notes,
        status="logged",
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    # Notify the other parent so they see the log in their timeline.
    # Best-effort — never break the write on notification failure.
    try:
        from app.models.notification import NotificationType
        from app.services.notification_service import NotificationService

        other_parent_id = (
            ff.parent_b_id if str(ff.parent_a_id) == str(current_user.id) else ff.parent_a_id
        )
        if other_parent_id:
            svc = NotificationService()
            await svc.create(
                db=db,
                user_id=str(other_parent_id),
                notification_type=NotificationType.OTHER.value,
                title="Child-support payment logged",
                body=(
                    f"A payment of ${payload.amount} was logged on "
                    f"{payload.payment_date.strftime('%b %d, %Y')}"
                ),
                action_url=f"/family-files/{payload.family_file_id}/child-support",
                family_file_id=str(payload.family_file_id),
                send_email=False,
            )
    except Exception as exc:  # pragma: no cover — best-effort
        logger.warning("payment-log notification failed for log=%s: %s", log.id, exc)

    return log


@router.get("/payment-logs", response_model=List[PaymentLogResponse])
async def list_payment_logs(
    family_file_id: str = Query(...),
    obligation_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_parent_of(db, current_user, family_file_id)

    filters = [ChildSupportPaymentLog.family_file_id == family_file_id]
    if obligation_id:
        filters.append(ChildSupportPaymentLog.obligation_id == obligation_id)
    if status_filter:
        filters.append(ChildSupportPaymentLog.status == status_filter)

    rows = await db.execute(
        select(ChildSupportPaymentLog)
        .where(and_(*filters))
        .order_by(ChildSupportPaymentLog.payment_date.desc())
    )
    return list(rows.scalars().all())


@router.patch("/payment-logs/{log_id}", response_model=PaymentLogResponse)
async def update_payment_log(
    log_id: str,
    payload: PaymentLogUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log = (
        await db.execute(select(ChildSupportPaymentLog).where(ChildSupportPaymentLog.id == log_id))
    ).scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment log not found")
    await _verify_parent_of(db, current_user, log.family_file_id)

    # Edit window: only the logger, only within 48h. After that the record
    # is frozen for court-evidence integrity (same principle as the message
    # audit log and exchange logs).
    if str(log.logged_by) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the person who logged the payment can edit it.",
        )
    if datetime.utcnow() - log.created_at > timedelta(hours=48):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment logs older than 48 hours are locked. Add a correction note via /contest instead.",
        )

    for field in ("amount", "payment_date", "confirmation_number", "receipt_url", "notes"):
        val = getattr(payload, field)
        if val is not None:
            setattr(log, field, val)

    await db.commit()
    await db.refresh(log)
    return log


@router.post("/payment-logs/{log_id}/contest", response_model=PaymentLogResponse)
async def contest_payment_log(
    log_id: str,
    payload: ContestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log = (
        await db.execute(select(ChildSupportPaymentLog).where(ChildSupportPaymentLog.id == log_id))
    ).scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment log not found")
    await _verify_parent_of(db, current_user, log.family_file_id)

    if str(log.logged_by) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can't contest a payment you logged yourself.",
        )

    log.status = "contested"
    log.contested_by = str(current_user.id)
    log.contested_reason = payload.reason
    log.contested_at = datetime.utcnow()
    await db.commit()
    await db.refresh(log)
    return log


@router.post("/payment-logs/{log_id}/verify", response_model=PaymentLogResponse)
async def mark_payment_log_verified(
    log_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log = (
        await db.execute(select(ChildSupportPaymentLog).where(ChildSupportPaymentLog.id == log_id))
    ).scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment log not found")
    await _verify_parent_of(db, current_user, log.family_file_id)

    if log.status == "contested":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contested logs cannot be marked verified — resolve the dispute first.",
        )
    log.status = "verified"
    await db.commit()
    await db.refresh(log)
    return log

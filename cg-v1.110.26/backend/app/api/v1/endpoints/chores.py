"""
Wave 3 C2 — Chores / Tasks endpoints.

Parent endpoints (JWT parent auth):
    POST   /chores                                 create a chore
    GET    /chores?family_file_id=...              list chores on a family file
    PATCH  /chores/{id}                            edit before it's completed
    POST   /chores/{id}/approve                    mark approved + credit wallet
    POST   /chores/{id}/reject                     send back with feedback
    DELETE /chores/{id}                            cancel a chore

Child endpoints (child-user JWT):
    GET  /chores/mine                              list the child's own chores
    POST /chores/{id}/complete                     child marks chore done
"""

from __future__ import annotations

import io
import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from PIL import Image, ImageOps
# Register HEIC/HEIF as a readable Pillow format. Import is side-effectful
# and a no-op if unavailable — we log and fall through rather than crash.
try:  # pragma: no cover — optional at runtime
    from pillow_heif import register_heif_opener

    register_heif_opener()
    _HEIF_SUPPORTED = True
except Exception:  # pragma: no cover
    _HEIF_SUPPORTED = False
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_child_user, get_current_user
from app.models.chore import Chore, ChoreStatus
from app.models.family_file import FamilyFile
from app.models.kidcoms import ChildUser
from app.models.user import User
from app.models.wallet import WalletTransaction
from app.schemas.chore import ChoreCreate, ChoreRejectRequest, ChoreResponse, ChoreUpdate
from app.services.storage import SupabaseStorageService
from app.services.wallet_service import wallet_service

# Photo proof-of-completion storage constraints. Kept in this module because
# the /complete endpoint is the only caller and we want easy tweakability.
CHORE_PROOF_BUCKET = "chore-proofs"
CHORE_PROOF_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
CHORE_PROOF_ALLOWED_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
}
CHORE_PROOF_EXT_BY_TYPE = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
}

# Formats we can safely decode + re-encode to drop metadata. HEIC is in
# the list when pillow-heif registered successfully (see import block
# above); otherwise we pass HEIC bytes through untouched.
EXIF_STRIPPABLE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    *({"image/heic", "image/heif"} if _HEIF_SUPPORTED else set()),
}

logger = logging.getLogger(__name__)
router = APIRouter()


def _strip_exif(file_bytes: bytes, content_type: str) -> bytes:
    """Re-encode the image without EXIF / ICC metadata.

    Kid-taken photos typically carry GPS coordinates, device identifiers,
    and timestamps. None of that belongs in a parent-viewable chore proof,
    so we decode and re-save the pixels and nothing else. Applies orientation
    before dropping EXIF so the saved image looks the same as the original.

    If the format is HEIC or re-encoding fails for any reason, we log and
    return the original bytes — the upload still succeeds, with the original
    metadata still attached. Kids should prefer JPEG/PNG for full stripping.
    """
    if content_type not in EXIF_STRIPPABLE_TYPES:
        return file_bytes
    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            # Rotate/flip per EXIF before dropping it so the rendered image
            # stays right-side up.
            img = ImageOps.exif_transpose(img)

            # Flatten PNG alpha to white for JPEG output, but otherwise keep
            # the incoming format so content-type / key extension stay valid.
            save_format = img.format or "JPEG"
            # HEIF/HEIC re-encode back to HEIF using pillow-heif's writer.
            # Anything that needs RGB (JPEG, HEIF) gets mode-converted first.
            needs_rgb = save_format.upper() in {"JPEG", "HEIF", "HEIC"}
            if needs_rgb and img.mode != "RGB":
                img = img.convert("RGB")

            out = io.BytesIO()
            save_kwargs: dict = {"format": save_format}
            fmt_upper = save_format.upper()
            if fmt_upper == "JPEG":
                save_kwargs["quality"] = 88
                save_kwargs["optimize"] = True
            elif fmt_upper == "WEBP":
                save_kwargs["quality"] = 88
                save_kwargs["method"] = 4
            elif fmt_upper in {"HEIF", "HEIC"}:
                save_kwargs["quality"] = 85
            # Do NOT pass `exif=...` — omitting it means Pillow writes none.
            img.save(out, **save_kwargs)
            return out.getvalue()
    except Exception as exc:
        # Never block the upload on a metadata-stripping miss. Log so we
        # can see if a specific format is failing a lot.
        logger.warning("EXIF strip failed (%s): %s", content_type, exc)
        return file_bytes


async def _verify_parent_of(db: AsyncSession, user: User, family_file_id: str) -> FamilyFile:
    result = await db.execute(select(FamilyFile).where(FamilyFile.id == family_file_id))
    ff = result.scalar_one_or_none()
    if not ff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family file not found")
    if str(user.id) not in (str(ff.parent_a_id), str(ff.parent_b_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a parent on this family file")
    return ff


async def _credit_chore_reward(db: AsyncSession, chore: Chore) -> Optional[str]:
    """Create a wallet credit transaction for a completed+approved chore.

    Returns the transaction id, or None if the child has no wallet yet.
    Idempotent via the `reward_credited` flag on the chore row.
    """
    if chore.reward_credited or not chore.reward_amount or chore.reward_amount <= 0:
        return None

    wallet = await wallet_service.get_child_wallet(db, chore.child_id)
    if not wallet:
        logger.info(
            "chore %s: child %s has no wallet; skipping credit (parent can retry later)",
            chore.id, chore.child_id,
        )
        return None

    txn = WalletTransaction(
        id=str(uuid.uuid4()),
        wallet_id=wallet.id,
        transaction_type="gift_received",
        amount=chore.reward_amount,
        net_amount=chore.reward_amount,
        fee_amount=Decimal(0),
        currency="USD",
        description=f"Chore reward: {chore.title}",
        status="completed",
        completed_at=datetime.utcnow(),
        source_type="chore",
        source_id=str(chore.id),
        extra_data={"chore_id": str(chore.id)},
    )
    db.add(txn)
    chore.reward_credited = True
    return txn.id


async def _refresh_chore_proof_url(chore: Chore, expires_in: int = 86400) -> None:
    """Re-sign the proof photo URL so list/fetch responses always hand back
    a working link. No-op for chores without a stored photo.

    The original signed URL from upload has a 24-hour TTL, so parents who
    open the review UI the next day would otherwise hit a dead link.
    Best-effort — swallows errors so a flaky storage call can't break
    listing the chores.
    """
    if not chore.completion_photo_bucket or not chore.completion_photo_key:
        return
    try:
        url = await SupabaseStorageService().get_signed_url(
            bucket=chore.completion_photo_bucket,
            path=chore.completion_photo_key,
            expires_in=expires_in,
        )
        if url:
            chore.completion_photo_url = url
    except Exception as exc:  # pragma: no cover — best-effort
        logger.warning(
            "chore %s: could not refresh signed photo URL: %s", chore.id, exc
        )


async def _delete_chore_proof_photo(chore: Chore) -> None:
    """Best-effort deletion of a chore's proof-of-completion photo.

    Called on /cancel and chore deletion. Never raises — a dangling object
    is far less bad than failing the parent's cancel action over a storage
    hiccup. Clears the on-row fields regardless.
    """
    bucket = chore.completion_photo_bucket
    key = chore.completion_photo_key
    if bucket and key:
        try:
            await SupabaseStorageService().delete_file(bucket, key)
        except Exception as exc:  # pragma: no cover — best-effort
            logger.warning(
                "chore %s: failed to delete proof photo %s/%s: %s",
                chore.id, bucket, key, exc,
            )
    chore.completion_photo_url = None
    chore.completion_photo_bucket = None
    chore.completion_photo_key = None


# ────────────────────────────── Parent endpoints ──────────────────────────


@router.post("", response_model=ChoreResponse, status_code=status.HTTP_201_CREATED)
async def create_chore(
    payload: ChoreCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_parent_of(db, current_user, payload.family_file_id)

    chore = Chore(
        id=str(uuid.uuid4()),
        family_file_id=payload.family_file_id,
        child_id=payload.child_id,
        assigned_by=str(current_user.id),
        title=payload.title,
        description=payload.description,
        reward_amount=payload.reward_amount,
        due_at=payload.due_at,
        status=ChoreStatus.PENDING,
    )
    db.add(chore)
    await db.commit()
    await db.refresh(chore)
    return chore


@router.get("", response_model=List[ChoreResponse])
async def list_chores_for_family(
    family_file_id: str = Query(...),
    child_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_parent_of(db, current_user, family_file_id)

    filters = [Chore.family_file_id == family_file_id]
    if child_id:
        filters.append(Chore.child_id == child_id)
    if status_filter:
        filters.append(Chore.status == status_filter)

    rows = await db.execute(
        select(Chore).where(and_(*filters)).order_by(Chore.created_at.desc())
    )
    chores = list(rows.scalars().all())
    # Re-sign photo URLs so the review UI always gets live links, even days
    # after the child hit "I did it!". We do NOT commit — the refreshed URL
    # is returned in the response but the stale value on the row doesn't
    # matter (we re-sign every read).
    for c in chores:
        await _refresh_chore_proof_url(c)
    return chores


@router.patch("/{chore_id}", response_model=ChoreResponse)
async def update_chore(
    chore_id: str,
    payload: ChoreUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chore = (await db.execute(select(Chore).where(Chore.id == chore_id))).scalar_one_or_none()
    if not chore:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chore not found")
    await _verify_parent_of(db, current_user, chore.family_file_id)

    if chore.status in (ChoreStatus.APPROVED, ChoreStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This chore is already closed and cannot be edited.",
        )

    if payload.title is not None:
        chore.title = payload.title
    if payload.description is not None:
        chore.description = payload.description
    if payload.reward_amount is not None:
        chore.reward_amount = payload.reward_amount
    if payload.due_at is not None:
        chore.due_at = payload.due_at

    await db.commit()
    await db.refresh(chore)
    return chore


@router.delete("/{chore_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_chore(
    chore_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chore = (await db.execute(select(Chore).where(Chore.id == chore_id))).scalar_one_or_none()
    if not chore:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chore not found")
    await _verify_parent_of(db, current_user, chore.family_file_id)

    if chore.status == ChoreStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approved chores can't be cancelled — the reward was already paid.",
        )
    # Best-effort remove the proof-of-completion photo, if any. Approve /
    # reject leave it in place for audit history; cancel discards the work.
    await _delete_chore_proof_photo(chore)
    chore.status = ChoreStatus.CANCELLED
    await db.commit()


@router.post("/{chore_id}/approve", response_model=ChoreResponse)
async def approve_chore(
    chore_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chore = (await db.execute(select(Chore).where(Chore.id == chore_id))).scalar_one_or_none()
    if not chore:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chore not found")
    await _verify_parent_of(db, current_user, chore.family_file_id)

    if chore.status == ChoreStatus.APPROVED:
        # Idempotent.
        return chore
    if chore.status not in (ChoreStatus.COMPLETED, ChoreStatus.PENDING):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve a chore with status '{chore.status}'.",
        )

    chore.status = ChoreStatus.APPROVED
    chore.approved_at = datetime.utcnow()
    chore.approved_by = str(current_user.id)
    chore.rejection_reason = None
    await _credit_chore_reward(db, chore)
    await db.commit()
    await db.refresh(chore)
    await _refresh_chore_proof_url(chore)
    return chore


@router.post("/{chore_id}/reject", response_model=ChoreResponse)
async def reject_chore(
    chore_id: str,
    payload: ChoreRejectRequest = Body(default_factory=ChoreRejectRequest),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chore = (await db.execute(select(Chore).where(Chore.id == chore_id))).scalar_one_or_none()
    if not chore:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chore not found")
    await _verify_parent_of(db, current_user, chore.family_file_id)

    if chore.status != ChoreStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only chores marked complete by the child can be rejected.",
        )
    chore.status = ChoreStatus.REJECTED
    chore.rejection_reason = payload.reason
    chore.completed_at = None  # child will re-complete
    # NB: leave completion_photo_* in place — the rejected submission stays
    # visible in history until the child re-completes with a new photo
    # (which triggers a delete of the prior one).
    await db.commit()
    await db.refresh(chore)
    await _refresh_chore_proof_url(chore)
    return chore


# ────────────────────────────── Child endpoints ───────────────────────────


@router.get("/mine", response_model=List[ChoreResponse])
async def list_my_chores(
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(Chore)
        .where(Chore.child_id == current_child.child_id)
        .order_by(Chore.created_at.desc())
    )
    chores = list(rows.scalars().all())
    for c in chores:
        await _refresh_chore_proof_url(c)
    return chores


@router.post("/{chore_id}/complete", response_model=ChoreResponse)
async def mark_chore_complete(
    chore_id: str,
    photo: Optional[UploadFile] = File(
        None,
        description="Optional proof-of-completion photo (≤5 MB, jpeg/png/webp/heic).",
    ),
    note: Optional[str] = Form(
        None,
        description="Optional short note from the child (≤500 chars).",
        max_length=500,
    ),
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    """Child marks a chore complete. Photo + note are both optional.

    Accepts multipart/form-data so the request can carry a file. When no
    file is sent the endpoint still works — photo-proof is a nice-to-have,
    never a gate on completion.
    """
    chore = (await db.execute(select(Chore).where(Chore.id == chore_id))).scalar_one_or_none()
    if not chore:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chore not found")
    if chore.child_id != current_child.child_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This chore isn't assigned to you.",
        )
    if chore.status not in (ChoreStatus.PENDING, ChoreStatus.REJECTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete a chore with status '{chore.status}'.",
        )

    # If the child is re-completing after a rejection and there was a
    # previous proof photo, dump it so the new submission stands alone.
    if chore.completion_photo_key:
        await _delete_chore_proof_photo(chore)

    # Optional photo upload. We validate size + content-type server-side
    # even though the client already limits it — defense in depth.
    photo_url: Optional[str] = None
    photo_bucket: Optional[str] = None
    photo_key: Optional[str] = None
    if photo is not None and photo.filename:
        content_type = (photo.content_type or "").lower()
        if content_type not in CHORE_PROOF_ALLOWED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Photo must be JPEG, PNG, WebP, or HEIC.",
            )
        file_bytes = await photo.read()
        if len(file_bytes) > CHORE_PROOF_MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Photo too large. Maximum size is 5 MB.",
            )
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Photo file is empty.",
            )

        # Scrub EXIF/GPS/ICC metadata before the bytes leave this process.
        # For HEIC we currently pass through — see _strip_exif.
        file_bytes = _strip_exif(file_bytes, content_type)

        ext = CHORE_PROOF_EXT_BY_TYPE.get(content_type, "jpg")
        photo_key = f"{chore.family_file_id}/{chore.id}/{uuid.uuid4()}.{ext}"
        photo_bucket = CHORE_PROOF_BUCKET
        try:
            photo_url = await SupabaseStorageService().upload_file(
                bucket=photo_bucket,
                path=photo_key,
                file_content=file_bytes,
                content_type=content_type,
                upsert=False,
            )
        except Exception as upload_exc:
            logger.exception("chore %s: proof photo upload failed", chore.id)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not save your photo — try again in a moment.",
            ) from upload_exc

    chore.status = ChoreStatus.COMPLETED
    chore.completed_at = datetime.utcnow()
    chore.rejection_reason = None
    chore.completion_note = note.strip() if note and note.strip() else None
    chore.completion_photo_url = photo_url
    chore.completion_photo_bucket = photo_bucket
    chore.completion_photo_key = photo_key
    await db.commit()
    await db.refresh(chore)

    # Notify both parents that a chore is awaiting review. Best-effort —
    # notification failures never break the child's "I did it!" flow.
    try:
        from app.models.child import Child
        from app.models.notification import NotificationType
        from app.services.notification_service import NotificationService

        ff = (
            await db.execute(select(FamilyFile).where(FamilyFile.id == chore.family_file_id))
        ).scalar_one_or_none()
        child = (
            await db.execute(select(Child).where(Child.id == chore.child_id))
        ).scalar_one_or_none()
        child_name = child.first_name if child else "Your child"
        service = NotificationService()
        for parent_id in (ff.parent_a_id, ff.parent_b_id) if ff else ():
            if parent_id:
                await service.create(
                    db=db,
                    user_id=str(parent_id),
                    notification_type=NotificationType.CHORE_COMPLETED.value,
                    title=f"{child_name} marked a chore complete",
                    body=f"Ready for your review: {chore.title}",
                    action_url=f"/family-files/{chore.family_file_id}/chores",
                    family_file_id=str(chore.family_file_id),
                    send_email=False,  # in-app only for chores — avoid email noise
                )
    except Exception as notify_exc:  # pragma: no cover — best-effort
        logger.warning("chore-completed notification failed for %s: %s", chore.id, notify_exc)

    return chore

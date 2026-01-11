"""
Custody Exchange (Pickup/Dropoff) API endpoints.

Dedicated endpoints for managing custody exchanges separate from regular events.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.utils.timezone import strip_tz
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.custody_exchange import (
    CustodyExchangeCreate,
    CustodyExchangeUpdate,
    CustodyExchangeResponse,
    CustodyExchangeInstanceResponse,
    CheckInRequest,
    SilentHandoffCheckInRequest,
    QRConfirmationRequest,
    GeocodeAddressRequest,
    GeocodeAddressResponse,
    WindowStatusResponse,
    QRTokenResponse,
)
from app.services.custody_exchange import CustodyExchangeService
from app.services.geolocation import GeolocationService
from app.services.activity import log_exchange_activity

router = APIRouter()


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=CustodyExchangeResponse,
    summary="Create custody exchange",
    description="Create a new pickup/dropoff schedule. Can be one-time or recurring."
)
async def create_exchange(
    exchange_data: CustodyExchangeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new custody exchange (pickup/dropoff).

    - **exchange_type**: pickup, dropoff, or both
    - **is_recurring**: Set to true for repeating exchanges
    - **recurrence_pattern**: weekly, biweekly, monthly, or custom
    - **recurrence_days**: Days of week (0=Sun, 1=Mon, ..., 6=Sat)
    """
    try:
        exchange = await CustodyExchangeService.create_exchange(
            db=db,
            case_id=exchange_data.case_id,
            created_by=current_user.id,
            exchange_type=exchange_data.exchange_type,
            scheduled_time=exchange_data.scheduled_time,
            title=exchange_data.title,
            from_parent_id=exchange_data.from_parent_id,
            to_parent_id=exchange_data.to_parent_id,
            child_ids=exchange_data.child_ids,
            pickup_child_ids=exchange_data.pickup_child_ids,
            dropoff_child_ids=exchange_data.dropoff_child_ids,
            location=exchange_data.location,
            location_notes=exchange_data.location_notes,
            duration_minutes=exchange_data.duration_minutes,
            is_recurring=exchange_data.is_recurring,
            recurrence_pattern=exchange_data.recurrence_pattern,
            recurrence_days=exchange_data.recurrence_days,
            recurrence_end_date=exchange_data.recurrence_end_date,
            items_to_bring=exchange_data.items_to_bring,
            special_instructions=exchange_data.special_instructions,
            notes_visible_to_coparent=exchange_data.notes_visible_to_coparent,
            # Silent Handoff settings
            location_lat=exchange_data.location_lat,
            location_lng=exchange_data.location_lng,
            geofence_radius_meters=exchange_data.geofence_radius_meters,
            check_in_window_before_minutes=exchange_data.check_in_window_before_minutes,
            check_in_window_after_minutes=exchange_data.check_in_window_after_minutes,
            silent_handoff_enabled=exchange_data.silent_handoff_enabled,
            qr_confirmation_required=exchange_data.qr_confirmation_required,
        )

        # Get other parent info for perspective-aware display
        other_parent_name, other_parent_id = await CustodyExchangeService.get_other_parent_info(
            db=db,
            exchange=exchange,
            viewer_id=current_user.id
        )

        filtered_data = CustodyExchangeService.filter_for_viewer(
            exchange=exchange,
            viewer_id=current_user.id,
            other_parent_name=other_parent_name,
            other_parent_id=other_parent_id
        )

        return CustodyExchangeResponse(**filtered_data)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/{exchange_id}",
    response_model=CustodyExchangeResponse,
    summary="Get custody exchange",
    description="Get a custody exchange by ID."
)
async def get_exchange(
    exchange_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a custody exchange by ID."""

    exchange = await CustodyExchangeService.get_exchange(
        db=db,
        exchange_id=exchange_id,
        viewer_id=current_user.id
    )

    if not exchange:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange not found or no access"
        )

    # Get other parent info for perspective-aware display
    other_parent_name, other_parent_id = await CustodyExchangeService.get_other_parent_info(
        db=db,
        exchange=exchange,
        viewer_id=current_user.id
    )

    filtered_data = CustodyExchangeService.filter_for_viewer(
        exchange=exchange,
        viewer_id=current_user.id,
        other_parent_name=other_parent_name,
        other_parent_id=other_parent_id
    )

    return CustodyExchangeResponse(**filtered_data)


@router.get(
    "/case/{case_id}",
    response_model=List[CustodyExchangeResponse],
    summary="List exchanges for case",
    description="Get all custody exchanges for a case."
)
async def list_exchanges(
    case_id: str,
    status: Optional[str] = Query(None, pattern="^(active|paused|cancelled)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all custody exchanges for a case."""

    exchanges = await CustodyExchangeService.list_exchanges_for_case(
        db=db,
        case_id=case_id,
        viewer_id=current_user.id,
        status=status,
        include_instances=True
    )

    result = []
    for e in exchanges:
        # Get other parent info for perspective-aware display
        other_parent_name, other_parent_id = await CustodyExchangeService.get_other_parent_info(
            db=db,
            exchange=e,
            viewer_id=current_user.id
        )

        result.append(CustodyExchangeResponse(**CustodyExchangeService.filter_for_viewer(
            exchange=e,
            viewer_id=current_user.id,
            other_parent_name=other_parent_name,
            other_parent_id=other_parent_id
        )))

    return result


@router.get(
    "/case/{case_id}/upcoming",
    response_model=List[CustodyExchangeInstanceResponse],
    summary="Get upcoming exchanges",
    description="Get upcoming exchange instances for a case."
)
async def get_upcoming_exchanges(
    case_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get upcoming exchange instances for a case."""

    # Strip timezone info from dates for database compatibility
    start_date_naive = strip_tz(start_date)
    end_date_naive = strip_tz(end_date)

    instances = await CustodyExchangeService.get_upcoming_instances(
        db=db,
        case_id=case_id,
        viewer_id=current_user.id,
        start_date=start_date_naive,
        end_date=end_date_naive,
        limit=limit
    )

    result = []
    for instance in instances:
        # Get other parent info for perspective-aware display
        other_parent_name, other_parent_id = await CustodyExchangeService.get_other_parent_info(
            db=db,
            exchange=instance.exchange,
            viewer_id=current_user.id
        )

        exchange_data = CustodyExchangeService.filter_for_viewer(
            exchange=instance.exchange,
            viewer_id=current_user.id,
            other_parent_name=other_parent_name,
            other_parent_id=other_parent_id
        )

        result.append(CustodyExchangeInstanceResponse(
            id=instance.id,
            exchange_id=instance.exchange_id,
            scheduled_time=instance.scheduled_time,
            status=instance.status,
            from_parent_checked_in=instance.from_parent_checked_in,
            from_parent_check_in_time=instance.from_parent_check_in_time,
            to_parent_checked_in=instance.to_parent_checked_in,
            to_parent_check_in_time=instance.to_parent_check_in_time,
            completed_at=instance.completed_at,
            notes=instance.notes,
            override_location=instance.override_location,
            override_time=instance.override_time,
            exchange=CustodyExchangeResponse(**exchange_data),
            created_at=instance.created_at,
            updated_at=instance.updated_at,
        ))

    return result


@router.put(
    "/{exchange_id}",
    response_model=CustodyExchangeResponse,
    summary="Update custody exchange",
    description="Update a custody exchange."
)
async def update_exchange(
    exchange_id: str,
    exchange_data: CustodyExchangeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a custody exchange."""

    updates = exchange_data.model_dump(exclude_unset=True)

    exchange = await CustodyExchangeService.update_exchange(
        db=db,
        exchange_id=exchange_id,
        user_id=current_user.id,
        **updates
    )

    if not exchange:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange not found or no access"
        )

    # Get other parent info for perspective-aware display
    other_parent_name, other_parent_id = await CustodyExchangeService.get_other_parent_info(
        db=db,
        exchange=exchange,
        viewer_id=current_user.id
    )

    filtered_data = CustodyExchangeService.filter_for_viewer(
        exchange=exchange,
        viewer_id=current_user.id,
        other_parent_name=other_parent_name,
        other_parent_id=other_parent_id
    )

    return CustodyExchangeResponse(**filtered_data)


@router.post(
    "/instances/{instance_id}/check-in",
    response_model=CustodyExchangeInstanceResponse,
    summary="Check in for exchange",
    description="Record a parent check-in for an exchange instance."
)
async def check_in(
    instance_id: str,
    check_in_data: CheckInRequest = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Record a parent check-in for an exchange instance."""

    notes = check_in_data.notes if check_in_data else None

    instance = await CustodyExchangeService.check_in(
        db=db,
        instance_id=instance_id,
        user_id=current_user.id,
        notes=notes
    )

    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found or no access"
        )

    # Log activity when exchange is completed (both parents checked in)
    if instance.status == "completed" and instance.exchange.family_file_id:
        try:
            actor_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
            await log_exchange_activity(
                db=db,
                family_file_id=instance.exchange.family_file_id,
                actor_id=str(current_user.id),
                actor_name=actor_name or "Co-parent",
                exchange_id=str(instance.id),
                action="completed",
                exchange_time=instance.completed_at,
            )
        except Exception as e:
            print(f"Activity logging failed: {e}")

    # Get other parent info for perspective-aware display
    other_parent_name, other_parent_id = await CustodyExchangeService.get_other_parent_info(
        db=db,
        exchange=instance.exchange,
        viewer_id=current_user.id
    )

    exchange_data = CustodyExchangeService.filter_for_viewer(
        exchange=instance.exchange,
        viewer_id=current_user.id,
        other_parent_name=other_parent_name,
        other_parent_id=other_parent_id
    )

    return CustodyExchangeInstanceResponse(
        id=instance.id,
        exchange_id=instance.exchange_id,
        scheduled_time=instance.scheduled_time,
        status=instance.status,
        from_parent_checked_in=instance.from_parent_checked_in,
        from_parent_check_in_time=instance.from_parent_check_in_time,
        to_parent_checked_in=instance.to_parent_checked_in,
        to_parent_check_in_time=instance.to_parent_check_in_time,
        completed_at=instance.completed_at,
        notes=instance.notes,
        override_location=instance.override_location,
        override_time=instance.override_time,
        exchange=CustodyExchangeResponse(**exchange_data),
        created_at=instance.created_at,
        updated_at=instance.updated_at,
    )


@router.post(
    "/instances/{instance_id}/cancel",
    response_model=CustodyExchangeInstanceResponse,
    summary="Cancel exchange instance",
    description="Cancel a specific exchange instance."
)
async def cancel_instance(
    instance_id: str,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel a specific exchange instance."""

    instance = await CustodyExchangeService.cancel_instance(
        db=db,
        instance_id=instance_id,
        user_id=current_user.id,
        notes=notes
    )

    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found or no access"
        )

    # Get other parent info for perspective-aware display
    other_parent_name, other_parent_id = await CustodyExchangeService.get_other_parent_info(
        db=db,
        exchange=instance.exchange,
        viewer_id=current_user.id
    )

    exchange_data = CustodyExchangeService.filter_for_viewer(
        exchange=instance.exchange,
        viewer_id=current_user.id,
        other_parent_name=other_parent_name,
        other_parent_id=other_parent_id
    )

    return CustodyExchangeInstanceResponse(
        id=instance.id,
        exchange_id=instance.exchange_id,
        scheduled_time=instance.scheduled_time,
        status=instance.status,
        from_parent_checked_in=instance.from_parent_checked_in,
        from_parent_check_in_time=instance.from_parent_check_in_time,
        to_parent_checked_in=instance.to_parent_checked_in,
        to_parent_check_in_time=instance.to_parent_check_in_time,
        completed_at=instance.completed_at,
        notes=instance.notes,
        override_location=instance.override_location,
        override_time=instance.override_time,
        exchange=CustodyExchangeResponse(**exchange_data),
        created_at=instance.created_at,
        updated_at=instance.updated_at,
    )


@router.delete(
    "/{exchange_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete custody exchange",
    description="Delete a custody exchange and all its instances."
)
async def delete_exchange(
    exchange_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a custody exchange."""

    exchange = await CustodyExchangeService.get_exchange(
        db=db,
        exchange_id=exchange_id,
        viewer_id=current_user.id
    )

    if not exchange:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange not found or no access"
        )

    # Only creator can delete
    if exchange.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator can delete this exchange"
        )

    await db.delete(exchange)
    await db.commit()


# ============================================================
# Silent Handoff Endpoints
# ============================================================

@router.post(
    "/instances/{instance_id}/check-in/gps",
    response_model=CustodyExchangeInstanceResponse,
    summary="GPS-verified check-in (Silent Handoff)",
    description="Check in with GPS location verification. Privacy: GPS is captured only at this moment, not continuously tracked."
)
async def check_in_with_gps(
    instance_id: str,
    check_in_data: SilentHandoffCheckInRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    GPS-verified check-in for Silent Handoff.

    Records GPS coordinates at check-in moment only (no continuous tracking).
    Calculates distance from exchange location and geofence status.

    - **latitude/longitude**: User's current GPS position
    - **device_accuracy_meters**: Device-reported GPS accuracy
    - **notes**: Optional check-in notes
    """
    instance = await CustodyExchangeService.check_in_with_gps(
        db=db,
        instance_id=instance_id,
        user_id=current_user.id,
        latitude=check_in_data.latitude,
        longitude=check_in_data.longitude,
        device_accuracy=check_in_data.device_accuracy_meters,
        notes=check_in_data.notes
    )

    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange instance not found or no access"
        )

    # Get other parent info for perspective-aware display
    other_parent_name, other_parent_id = await CustodyExchangeService.get_other_parent_info(
        db=db,
        exchange=instance.exchange,
        viewer_id=current_user.id
    )

    exchange_data = CustodyExchangeService.filter_for_viewer(
        exchange=instance.exchange,
        viewer_id=current_user.id,
        other_parent_name=other_parent_name,
        other_parent_id=other_parent_id
    )

    return CustodyExchangeInstanceResponse(
        id=instance.id,
        exchange_id=instance.exchange_id,
        scheduled_time=instance.scheduled_time,
        status=instance.status,
        from_parent_checked_in=instance.from_parent_checked_in,
        from_parent_check_in_time=instance.from_parent_check_in_time,
        to_parent_checked_in=instance.to_parent_checked_in,
        to_parent_check_in_time=instance.to_parent_check_in_time,
        completed_at=instance.completed_at,
        notes=instance.notes,
        override_location=instance.override_location,
        override_time=instance.override_time,
        # Silent Handoff GPS data
        from_parent_check_in_lat=instance.from_parent_check_in_lat,
        from_parent_check_in_lng=instance.from_parent_check_in_lng,
        from_parent_device_accuracy=instance.from_parent_device_accuracy,
        from_parent_distance_meters=instance.from_parent_distance_meters,
        from_parent_in_geofence=instance.from_parent_in_geofence,
        to_parent_check_in_lat=instance.to_parent_check_in_lat,
        to_parent_check_in_lng=instance.to_parent_check_in_lng,
        to_parent_device_accuracy=instance.to_parent_device_accuracy,
        to_parent_distance_meters=instance.to_parent_distance_meters,
        to_parent_in_geofence=instance.to_parent_in_geofence,
        qr_confirmed_at=instance.qr_confirmed_at,
        handoff_outcome=instance.handoff_outcome,
        window_start=instance.window_start,
        window_end=instance.window_end,
        auto_closed=instance.auto_closed,
        exchange=CustodyExchangeResponse(**exchange_data),
        created_at=instance.created_at,
        updated_at=instance.updated_at,
    )


@router.get(
    "/instances/{instance_id}/window-status",
    response_model=WindowStatusResponse,
    summary="Get exchange window status",
    description="Check if current time is within the exchange check-in window."
)
async def get_window_status(
    instance_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the current status of the exchange window.

    Returns whether the user can currently check in, and timing details.
    """
    instance = await CustodyExchangeService.get_instance_with_exchange(
        db=db,
        instance_id=instance_id
    )

    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange instance not found"
        )

    exchange = instance.exchange
    now = datetime.utcnow()

    # Calculate window
    window_start, window_end = CustodyExchangeService.calculate_exchange_window(
        instance.scheduled_time,
        exchange.check_in_window_before_minutes,
        exchange.check_in_window_after_minutes
    )

    is_within = window_start <= now <= window_end
    is_before = now < window_start
    is_after = now > window_end

    # Calculate minutes
    if is_before:
        minutes_until = (window_start - now).total_seconds() / 60
        minutes_remaining = (window_end - window_start).total_seconds() / 60
    elif is_within:
        minutes_until = 0
        minutes_remaining = (window_end - now).total_seconds() / 60
    else:
        minutes_until = 0
        minutes_remaining = 0

    return WindowStatusResponse(
        instance_id=instance.id,
        scheduled_time=instance.scheduled_time,
        window_start=window_start,
        window_end=window_end,
        is_within_window=is_within,
        is_before_window=is_before,
        is_after_window=is_after,
        minutes_until_window=max(0, minutes_until),
        minutes_remaining=max(0, minutes_remaining)
    )


@router.get(
    "/instances/{instance_id}/qr-token",
    response_model=QRTokenResponse,
    summary="Get QR confirmation token",
    description="Get the QR token to display for mutual confirmation. Only available after both parents have checked in."
)
async def get_qr_token(
    instance_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the QR confirmation token for this exchange instance.

    The QR token is generated after both parents have checked in
    (when QR confirmation is required). Display this as a QR code
    for the other parent to scan.
    """
    instance = await CustodyExchangeService.get_instance_with_exchange(
        db=db,
        instance_id=instance_id
    )

    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange instance not found"
        )

    if not instance.qr_confirmation_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR token not available. Both parents must check in first, or QR confirmation is not required for this exchange."
        )

    return QRTokenResponse(
        token=instance.qr_confirmation_token,
        instance_id=instance.id
    )


@router.post(
    "/instances/{instance_id}/confirm-qr",
    response_model=CustodyExchangeInstanceResponse,
    summary="Confirm exchange via QR scan",
    description="Complete the exchange by scanning the QR code displayed by the other parent."
)
async def confirm_qr(
    instance_id: str,
    confirmation: QRConfirmationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Confirm the exchange by providing the QR token.

    Scan the QR code displayed by the other parent and submit
    the token to complete the exchange with mutual verification.
    """
    try:
        instance = await CustodyExchangeService.confirm_qr(
            db=db,
            instance_id=instance_id,
            user_id=current_user.id,
            confirmation_token=confirmation.confirmation_token
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange instance not found"
        )

    # Get other parent info for perspective-aware display
    other_parent_name, other_parent_id = await CustodyExchangeService.get_other_parent_info(
        db=db,
        exchange=instance.exchange,
        viewer_id=current_user.id
    )

    exchange_data = CustodyExchangeService.filter_for_viewer(
        exchange=instance.exchange,
        viewer_id=current_user.id,
        other_parent_name=other_parent_name,
        other_parent_id=other_parent_id
    )

    return CustodyExchangeInstanceResponse(
        id=instance.id,
        exchange_id=instance.exchange_id,
        scheduled_time=instance.scheduled_time,
        status=instance.status,
        from_parent_checked_in=instance.from_parent_checked_in,
        from_parent_check_in_time=instance.from_parent_check_in_time,
        to_parent_checked_in=instance.to_parent_checked_in,
        to_parent_check_in_time=instance.to_parent_check_in_time,
        completed_at=instance.completed_at,
        notes=instance.notes,
        override_location=instance.override_location,
        override_time=instance.override_time,
        from_parent_check_in_lat=instance.from_parent_check_in_lat,
        from_parent_check_in_lng=instance.from_parent_check_in_lng,
        from_parent_device_accuracy=instance.from_parent_device_accuracy,
        from_parent_distance_meters=instance.from_parent_distance_meters,
        from_parent_in_geofence=instance.from_parent_in_geofence,
        to_parent_check_in_lat=instance.to_parent_check_in_lat,
        to_parent_check_in_lng=instance.to_parent_check_in_lng,
        to_parent_device_accuracy=instance.to_parent_device_accuracy,
        to_parent_distance_meters=instance.to_parent_distance_meters,
        to_parent_in_geofence=instance.to_parent_in_geofence,
        qr_confirmed_at=instance.qr_confirmed_at,
        handoff_outcome=instance.handoff_outcome,
        window_start=instance.window_start,
        window_end=instance.window_end,
        auto_closed=instance.auto_closed,
        exchange=CustodyExchangeResponse(**exchange_data),
        created_at=instance.created_at,
        updated_at=instance.updated_at,
    )


@router.post(
    "/geocode",
    response_model=GeocodeAddressResponse,
    summary="Geocode address to coordinates",
    description="Convert a street address to GPS coordinates for geofence setup."
)
async def geocode_address(
    request: GeocodeAddressRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Geocode a street address to GPS coordinates.

    Use this to set up the geofence location for Silent Handoff.
    Returns latitude, longitude, formatted address, and accuracy level.
    """
    result = await GeolocationService.geocode_address(request.address)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not geocode address. Please try a more specific address."
        )

    return GeocodeAddressResponse(
        latitude=result["latitude"],
        longitude=result["longitude"],
        formatted_address=result["formatted_address"],
        accuracy=result["accuracy"]
    )


# ============================================================
# Custody Status Tracker Endpoints
# ============================================================

@router.get(
    "/family-file/{family_file_id}/custody-status",
    summary="Get current custody status",
    description="Get current custody status for the dashboard - where are the kids right now?"
)
async def get_custody_status(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the current custody status for a family file.

    Returns:
    - Which parent currently has each child
    - Time remaining until next exchange
    - Progress bar percentage
    - Next exchange details

    This powers the "Kids are with You" card on the dashboard.
    """
    from app.schemas.custody_exchange import CustodyStatusResponse, ChildCustodyStatus

    custody_status = await CustodyExchangeService.get_custody_status(
        db=db,
        family_file_id=family_file_id,
        user_id=current_user.id
    )

    if not custody_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found or no access"
        )

    # Convert children dicts to ChildCustodyStatus models
    children_models = [
        ChildCustodyStatus(**child) for child in custody_status["children"]
    ]
    custody_status["children"] = children_models

    return CustodyStatusResponse(**custody_status)

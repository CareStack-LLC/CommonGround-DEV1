"""
ClearFund API endpoints - Purpose-locked financial obligations.

Endpoints for managing obligations, funding, verification, and ledger entries.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.clearfund import (
    ObligationCreate,
    ObligationCreateFromRequest,
    ObligationUpdate,
    ObligationResponse,
    ObligationListResponse,
    ObligationCancel,
    ObligationFilters,
    FundingCreate,
    FundingStatusResponse,
    AttestationCreate,
    AttestationResponse,
    VerificationCreate,
    ReceiptUpload,
    VerificationArtifactResponse,
    LedgerListResponse,
    PrepaymentCreate,
    BalanceSummary,
    ClearFundAnalytics,
    ObligationMetrics,
)
from app.services.clearfund import ClearFundService, LedgerService
from app.services.activity import log_expense_activity

router = APIRouter()


# ============================================================================
# Obligation Endpoints
# ============================================================================

@router.post("/obligations/", status_code=status.HTTP_201_CREATED)
async def create_obligation(
    data: ObligationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ObligationResponse:
    """
    Create a new financial obligation.

    Creates an obligation that both parents must fund according to their
    agreed-upon split. The purpose is locked at creation.
    """
    service = ClearFundService(db)
    obligation = await service.create_obligation(data, current_user)

    # Log activity for the expense request
    if obligation.family_file_id:
        actor_name = f"{current_user.first_name} {current_user.last_name}".strip() or "A parent"
        try:
            await log_expense_activity(
                db=db,
                family_file_id=obligation.family_file_id,
                actor_id=str(current_user.id),
                actor_name=actor_name,
                expense_id=str(obligation.id),
                expense_description=obligation.title,
                amount=float(obligation.total_amount),
                action="requested"
            )
        except Exception as e:
            # Don't fail obligation creation if activity logging fails
            print(f"Failed to log expense activity: {e}")

    return ObligationResponse.model_validate(obligation)


@router.post("/obligations/from-request", status_code=status.HTTP_201_CREATED)
async def create_from_request(
    data: ObligationCreateFromRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ObligationResponse:
    """
    Create an obligation from an approved expense request.

    Converts an approved expense request into a trackable obligation
    with funding requirements and verification.
    """
    service = ClearFundService(db)
    obligation = await service.create_from_expense_request(
        data.expense_request_id, current_user
    )
    return ObligationResponse.model_validate(obligation)


@router.get("/obligations/")
async def list_obligations(
    case_id: str = Query(..., description="Case ID"),
    agreement_id: Optional[str] = Query(None, description="Filter by SharedCare Agreement ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status(es), comma-separated"),
    category: Optional[str] = Query(None, description="Filter by category(ies), comma-separated"),
    is_overdue: Optional[bool] = Query(None, description="Only overdue obligations"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ObligationListResponse:
    """
    List obligations for a case with optional filters.

    Supports filtering by status, category, overdue state, and agreement_id.
    Results are paginated.
    """
    # Build filters
    filters = ObligationFilters(
        status=status_filter.split(",") if status_filter else None,
        purpose_category=category.split(",") if category else None,
        is_overdue=is_overdue,
        agreement_id=agreement_id,
    )

    service = ClearFundService(db)
    obligations, total = await service.list_obligations(
        case_id, filters, page, page_size, current_user
    )

    return ObligationListResponse(
        items=[ObligationResponse.model_validate(o) for o in obligations],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/obligations/{obligation_id}")
async def get_obligation(
    obligation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ObligationResponse:
    """Get obligation details."""
    service = ClearFundService(db)
    obligation = await service.get_obligation(obligation_id, current_user)
    return ObligationResponse.model_validate(obligation)


@router.put("/obligations/{obligation_id}")
async def update_obligation(
    obligation_id: str,
    data: ObligationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ObligationResponse:
    """
    Update obligation details.

    Only certain fields can be updated (due_date, notes, receipt_required).
    Purpose and amounts are immutable after creation.
    """
    service = ClearFundService(db)
    obligation = await service.update_obligation(obligation_id, data, current_user)
    return ObligationResponse.model_validate(obligation)


@router.post("/obligations/{obligation_id}/cancel")
async def cancel_obligation(
    obligation_id: str,
    data: ObligationCancel,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ObligationResponse:
    """
    Cancel an obligation.

    Only open or partially funded obligations can be cancelled.
    Requires a reason for audit purposes.
    """
    service = ClearFundService(db)
    obligation = await service.cancel_obligation(
        obligation_id, data.reason, current_user
    )
    return ObligationResponse.model_validate(obligation)


# ============================================================================
# Funding Endpoints
# ============================================================================

@router.post("/obligations/{obligation_id}/fund")
async def record_funding(
    obligation_id: str,
    data: FundingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Record a funding payment.

    Records that the current user has contributed toward their share
    of the obligation.
    """
    service = ClearFundService(db)
    funding = await service.record_funding(obligation_id, data, current_user)
    return {
        "funding_id": funding.id,
        "amount_funded": str(funding.amount_funded),
        "amount_required": str(funding.amount_required),
        "is_fully_funded": funding.is_fully_funded,
        "message": "Funding recorded successfully"
    }


@router.get("/obligations/{obligation_id}/funding")
async def get_funding_status(
    obligation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get funding status for an obligation.

    Shows how much each parent has contributed toward their share.
    """
    service = ClearFundService(db)
    return await service.get_funding_status(obligation_id, current_user)


# ============================================================================
# Attestation Endpoints
# ============================================================================

@router.post("/obligations/{obligation_id}/attest")
async def create_attestation(
    obligation_id: str,
    data: AttestationCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AttestationResponse:
    """
    Create an attestation (sworn statement).

    A legal attestation declaring the purpose of the obligation
    and committing to proper use of funds.
    """
    service = ClearFundService(db)
    attestation = await service.create_attestation(
        obligation_id,
        data,
        current_user,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return AttestationResponse.model_validate(attestation)


@router.get("/obligations/{obligation_id}/attestation")
async def get_attestation(
    obligation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Optional[AttestationResponse]:
    """Get attestation for an obligation."""
    service = ClearFundService(db)
    attestation = await service.get_attestation(obligation_id, current_user)
    if attestation:
        return AttestationResponse.model_validate(attestation)
    return None


# ============================================================================
# Verification Endpoints
# ============================================================================

@router.post("/obligations/{obligation_id}/verify")
async def record_verification(
    obligation_id: str,
    data: VerificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> VerificationArtifactResponse:
    """
    Record a verification artifact.

    Provides proof that funds were spent as intended (transaction data,
    vendor confirmation, etc.)
    """
    service = ClearFundService(db)
    artifact = await service.record_verification(obligation_id, data, current_user)
    return VerificationArtifactResponse.model_validate(artifact)


@router.post("/obligations/{obligation_id}/receipt")
async def upload_receipt(
    obligation_id: str,
    receipt_url: str = Query(..., description="URL of uploaded receipt"),
    receipt_file_name: str = Query(..., description="File name"),
    receipt_file_type: str = Query("image/jpeg", description="MIME type"),
    amount: float = Query(..., gt=0, description="Receipt amount"),
    vendor_name: Optional[str] = Query(None, description="Vendor name"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> VerificationArtifactResponse:
    """
    Upload a receipt as verification.

    Attaches a receipt image/document as proof of purchase.
    """
    from decimal import Decimal

    service = ClearFundService(db)
    artifact = await service.upload_receipt(
        obligation_id,
        receipt_url,
        receipt_file_name,
        receipt_file_type,
        Decimal(str(amount)),
        vendor_name,
        current_user
    )
    return VerificationArtifactResponse.model_validate(artifact)


@router.get("/obligations/{obligation_id}/artifacts")
async def list_artifacts(
    obligation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> list[VerificationArtifactResponse]:
    """List all verification artifacts for an obligation."""
    service = ClearFundService(db)
    obligation = await service.get_obligation(obligation_id, current_user)
    return [
        VerificationArtifactResponse.model_validate(a)
        for a in obligation.verification_artifacts
    ]


# ============================================================================
# Completion Endpoints
# ============================================================================

@router.post("/obligations/{obligation_id}/complete")
async def complete_obligation(
    obligation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ObligationResponse:
    """
    Mark an obligation as completed.

    Only verified (or funded, if verification not required) obligations
    can be marked complete.
    """
    service = ClearFundService(db)
    obligation = await service.complete_obligation(obligation_id, current_user)
    return ObligationResponse.model_validate(obligation)


# ============================================================================
# Ledger Endpoints
# ============================================================================

@router.get("/ledger/")
async def get_ledger(
    case_id: str = Query(..., description="Case ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LedgerListResponse:
    """
    Get ledger entries for a case.

    Returns the complete financial ledger showing all transactions
    and running balances.
    """
    from app.schemas.clearfund import LedgerEntry

    service = LedgerService(db)
    entries, total = await service.get_ledger_entries(
        case_id, current_user, page, page_size
    )

    return LedgerListResponse(
        items=[LedgerEntry.model_validate(e) for e in entries],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/ledger/balance")
async def get_balance(
    case_id: str = Query(..., description="Case ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BalanceSummary:
    """
    Get balance summary for a case.

    Shows who owes whom and overall financial status.
    """
    service = ClearFundService(db)
    return await service.get_balance_summary(case_id, current_user)


@router.post("/ledger/prepayment")
async def record_prepayment(
    case_id: str = Query(..., description="Case ID"),
    data: PrepaymentCreate = ...,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Record a prepayment credit.

    Adds a credit to the ledger that can be applied to future obligations
    using FIFO (first-in, first-out).
    """
    service = LedgerService(db)
    entry = await service.record_prepayment(
        case_id,
        data.amount,
        data.description,
        current_user,
        data.stripe_payment_intent_id,
    )
    return {
        "ledger_id": entry.id,
        "amount": str(entry.amount),
        "message": "Prepayment recorded successfully"
    }


# ============================================================================
# Analytics Endpoints
# ============================================================================

@router.get("/analytics/")
async def get_analytics(
    case_id: str = Query(..., description="Case ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ClearFundAnalytics:
    """
    Get ClearFund dashboard analytics.

    Returns summary metrics, balances, and recent activity.
    """
    service = ClearFundService(db)

    # Get metrics and balance
    metrics = await service.get_obligation_metrics(case_id, current_user)
    balance = await service.get_balance_summary(case_id, current_user)

    # Get recent activity
    obligations, _ = await service.list_obligations(
        case_id, current_user, page=1, page_size=5
    )

    return ClearFundAnalytics(
        case_id=case_id,
        balance_summary=balance,
        obligation_metrics=metrics,
        monthly_totals=[],  # TODO: Implement
        recent_activity=[
            ObligationResponse.model_validate(o) for o in obligations
        ],
    )


@router.get("/analytics/metrics")
async def get_metrics(
    case_id: str = Query(..., description="Case ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ObligationMetrics:
    """Get obligation metrics for dashboard cards."""
    service = ClearFundService(db)
    return await service.get_obligation_metrics(case_id, current_user)

"""
Court Form Workflow API endpoints.

Endpoints for California family court form workflow:
FL-300, FL-311, FL-320, FL-340, FL-341, FL-342
"""

from datetime import datetime, date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings

# HTTP Bearer scheme for court professional tokens
court_bearer_scheme = HTTPBearer(auto_error=False)
from app.models.user import User
from app.models.court_form import (
    CourtFormType,
    CourtFormStatus,
    FormSubmissionSource,
    ServiceType,
    HearingType,
    HearingOutcome,
)
from app.schemas.court_form import (
    # Form Submissions
    CourtFormSubmissionCreate,
    CourtFormSubmissionUpdate,
    CourtFormSubmissionResponse,
    CourtFormSubmissionSummary,
    # Form Actions
    FormSubmitRequest,
    FormApproveRequest,
    FormRejectRequest,
    FormResubmitRequest,
    FormMarkServedRequest,
    FormAllowEditsRequest,
    FormRevokeEditsRequest,
    # FL-specific
    FL300CreateRequest,
    FL311CreateRequest,
    FL320CreateRequest,
    FL340CreateRequest,
    FL341CreateRequest,
    FL342CreateRequest,
    # Requirements
    CaseFormRequirementCreate,
    CaseFormRequirementResponse,
    # Proof of Service
    ProofOfServiceCreate,
    ProofOfServiceResponse,
    # Hearings
    CourtHearingCreate,
    CourtHearingUpdate,
    CourtHearingResponse,
    CourtHearingOutcomeRequest,
    CourtHearingContinueRequest,
    # Respondent Access
    RespondentVerifyRequest,
    RespondentVerifyResponse,
    # Progress
    CaseFormProgress,
    CaseActivationRequest,
    # Lists
    CaseFormsListResponse,
)
from app.services.court_form import CourtFormService

router = APIRouter()


# =============================================================================
# Helper: Extract court professional ID from token
# =============================================================================

async def get_court_professional_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(court_bearer_scheme),
) -> str:
    """
    Extract the court professional ID from a court token.
    Court tokens have a role like "court_clerk", "gal", etc. and the professional ID is in the "sub" claim.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )

    try:
        secret_key = settings.JWT_SECRET_KEY or settings.SECRET_KEY
        payload = jwt.decode(
            credentials.credentials,
            secret_key,
            algorithms=[settings.JWT_ALGORITHM]
        )

        # Verify this is a court professional token by checking the role
        # Court professionals have roles like: court_clerk, gal, mediator, judge, etc.
        role = payload.get("role", "")
        court_roles = ["court_clerk", "gal", "mediator", "judge", "attorney", "evaluator"]

        # Also accept tokens with type="court" for backwards compatibility
        token_type = payload.get("type", "")
        is_court_token = token_type == "court" or role in court_roles

        if not is_court_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token - court professional token required",
            )

        professional_id = payload.get("sub")
        if not professional_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token - missing subject",
            )

        return professional_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


# =============================================================================
# Form Submission - Parent Endpoints
# =============================================================================

@router.post(
    "/fl300/start/{case_id}",
    response_model=CourtFormSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start FL-300 submission",
)
async def start_fl300(
    case_id: str,
    data: Optional[FL300CreateRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start a new FL-300 (Request for Order) submission.

    This is the first form in the court workflow, submitted by the petitioner.
    """
    service = CourtFormService(db)

    form_data = data.form_data.model_dump() if data and data.form_data else None
    aria_assisted = data.aria_assisted if data else False

    submission = await service.create_form_submission(
        case_id=case_id,
        form_type=CourtFormType.FL_300,
        parent_id=str(current_user.id),
        form_data=form_data,
        submission_source=FormSubmissionSource.PARENT_ARIA if aria_assisted else FormSubmissionSource.PARENT_PLATFORM,
        aria_assisted=aria_assisted,
    )

    await db.commit()
    return submission


@router.post(
    "/fl311/start/{case_id}",
    response_model=CourtFormSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start FL-311 submission",
)
async def start_fl311(
    case_id: str,
    data: Optional[FL311CreateRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start a new FL-311 (Child Custody and Visitation Application) submission.

    This form details the custody and visitation proposal from the petitioner.
    """
    service = CourtFormService(db)

    form_data = data.form_data.model_dump() if data and data.form_data else None
    aria_assisted = data.aria_assisted if data else False

    submission = await service.create_form_submission(
        case_id=case_id,
        form_type=CourtFormType.FL_311,
        parent_id=str(current_user.id),
        form_data=form_data,
        submission_source=FormSubmissionSource.PARENT_ARIA if aria_assisted else FormSubmissionSource.PARENT_PLATFORM,
        aria_assisted=aria_assisted,
    )

    await db.commit()
    return submission


@router.post(
    "/fl320/start/{case_id}",
    response_model=CourtFormSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start FL-320 response",
)
async def start_fl320(
    case_id: str,
    data: FL320CreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start a new FL-320 (Responsive Declaration) submission.

    This is the respondent's response to the FL-300, either consenting
    or counter-proposing the petitioner's requests.
    """
    service = CourtFormService(db)

    try:
        submission = await service.create_fl320_response(
            case_id=case_id,
            parent_id=str(current_user.id),
            responds_to_form_id=data.responds_to_form_id,
            form_data=data.form_data.model_dump(),
            aria_assisted=data.aria_assisted,
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put(
    "/{submission_id}",
    response_model=CourtFormSubmissionResponse,
    summary="Update form data (Parent)",
)
async def update_form(
    submission_id: str,
    data: CourtFormSubmissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Parent updates form data.

    Allowed when:
    - Form is in draft status (always editable)
    - Form is submitted but edits_allowed=True (clerk allowed corrections)
    """
    service = CourtFormService(db)

    try:
        submission = await service.parent_update_form_data(
            submission_id=submission_id,
            form_data=data.form_data,
            parent_id=str(current_user.id),
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/{submission_id}/submit",
    response_model=CourtFormSubmissionResponse,
    summary="Submit form for review",
)
async def submit_form(
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a form for court review.

    Changes status from draft to submitted.
    """
    service = CourtFormService(db)

    try:
        submission = await service.submit_form_for_review(
            submission_id=submission_id,
            parent_id=str(current_user.id),
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/{submission_id}/resubmit",
    response_model=CourtFormSubmissionResponse,
    summary="Resubmit form after corrections (Parent)",
)
async def resubmit_form(
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Parent resubmits form after making clerk-allowed corrections.

    Clears the edits_allowed flag and sends form back for review.
    """
    service = CourtFormService(db)

    try:
        submission = await service.parent_resubmit_form(
            submission_id=submission_id,
            parent_id=str(current_user.id),
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/{submission_id}",
    response_model=CourtFormSubmissionResponse,
    summary="Get form submission",
)
async def get_form(
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a form submission by ID."""
    service = CourtFormService(db)

    submission = await service.get_submission(submission_id)
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form submission not found",
        )

    return submission


@router.get(
    "/case/{case_id}",
    response_model=CaseFormsListResponse,
    summary="List forms for case",
)
async def list_case_forms(
    case_id: str,
    form_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all form submissions for a case."""
    service = CourtFormService(db)

    ft = CourtFormType(form_type) if form_type else None
    forms = await service.get_case_forms(case_id, ft)

    return CaseFormsListResponse(
        case_id=case_id,
        forms=[CourtFormSubmissionSummary.model_validate(f) for f in forms],
        total=len(forms),
    )


@router.get(
    "/case/{case_id}/progress",
    response_model=CaseFormProgress,
    summary="Get workflow progress",
)
async def get_case_progress(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the overall form workflow progress for a case."""
    service = CourtFormService(db)

    try:
        progress = await service.get_case_form_progress(case_id)
        return progress
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# =============================================================================
# Respondent Verification
# =============================================================================

@router.post(
    "/respondent/verify",
    response_model=RespondentVerifyResponse,
    summary="Verify respondent access code",
)
async def verify_respondent(
    data: RespondentVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Verify respondent access code.

    When FL-300 is approved, respondent receives an access code.
    This verifies the code and grants case access.
    """
    service = CourtFormService(db)

    verified, message = await service.verify_respondent_access(
        case_id=data.case_id,
        access_code=data.access_code,
        user_id=str(current_user.id),
    )

    await db.commit()

    return RespondentVerifyResponse(
        verified=verified,
        case_id=data.case_id if verified else None,
        message=message,
    )


# =============================================================================
# Proof of Service
# =============================================================================

@router.post(
    "/proof-of-service",
    response_model=ProofOfServiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="File proof of service",
)
async def file_proof_of_service(
    data: ProofOfServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    File proof of service for a form.

    Used when respondent is not on platform and was served
    documents in person, by mail, etc.
    """
    service = CourtFormService(db)

    proof = await service.file_proof_of_service(
        case_id=data.case_id,
        served_form_id=data.served_form_id,
        service_type=data.service_type,
        served_to_name=data.served_to_name,
        served_on_date=data.served_on_date,
        served_by_name=data.served_by_name,
        served_at_address=data.served_at_address,
        served_by_relationship=data.served_by_relationship,
        notes=data.notes,
    )

    await db.commit()
    return proof


# =============================================================================
# Court Staff - Form Review
# =============================================================================

@router.post(
    "/{submission_id}/allow-edits",
    response_model=CourtFormSubmissionResponse,
    summary="Allow parent to make edits (Court Staff)",
)
async def allow_parent_edits(
    submission_id: str,
    data: FormAllowEditsRequest,
    db: AsyncSession = Depends(get_db),
    professional_id: str = Depends(get_court_professional_id),
):
    """
    Court staff allows the parent to make corrections to a submitted form.

    Used when a form needs corrections but the clerk cannot edit directly.
    The parent will be notified and can make edits, then resubmit.
    """
    service = CourtFormService(db)

    try:
        submission = await service.allow_parent_edits(
            submission_id=submission_id,
            professional_id=professional_id,
            notes=data.notes,
            sections=data.sections,
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/{submission_id}/revoke-edits",
    response_model=CourtFormSubmissionResponse,
    summary="Revoke parent edit permission (Court Staff)",
)
async def revoke_parent_edits(
    submission_id: str,
    data: Optional[FormRevokeEditsRequest] = None,
    db: AsyncSession = Depends(get_db),
    professional_id: str = Depends(get_court_professional_id),
):
    """
    Court staff revokes the parent's permission to edit a submitted form.

    Used when edits are no longer needed or the window has passed.
    """
    service = CourtFormService(db)

    try:
        notes = data.notes if data else None
        submission = await service.revoke_parent_edits(
            submission_id=submission_id,
            professional_id=professional_id,
            notes=notes,
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/{submission_id}/approve",
    response_model=CourtFormSubmissionResponse,
    summary="Approve form (Court Staff)",
)
async def approve_form(
    submission_id: str,
    data: FormApproveRequest,
    db: AsyncSession = Depends(get_db),
    professional_id: str = Depends(get_court_professional_id),
):
    """
    Court staff approves a submitted form.

    For FL-300, this triggers respondent notification.
    """
    service = CourtFormService(db)

    try:
        submission = await service.approve_form(
            submission_id=submission_id,
            professional_id=professional_id,
            notes=data.notes,
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/{submission_id}/reject",
    response_model=CourtFormSubmissionResponse,
    summary="Reject form (Court Staff)",
)
async def reject_form(
    submission_id: str,
    data: FormRejectRequest,
    db: AsyncSession = Depends(get_db),
    professional_id: str = Depends(get_court_professional_id),
):
    """Court staff rejects a submitted form."""
    service = CourtFormService(db)

    try:
        submission = await service.reject_form(
            submission_id=submission_id,
            professional_id=professional_id,
            reason=data.reason,
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/{submission_id}/request-resubmission",
    response_model=CourtFormSubmissionResponse,
    summary="Request form resubmission (Court Staff)",
)
async def request_resubmission(
    submission_id: str,
    data: FormResubmitRequest,
    db: AsyncSession = Depends(get_db),
    professional_id: str = Depends(get_court_professional_id),
):
    """Court staff requests corrections and resubmission."""
    service = CourtFormService(db)

    try:
        submission = await service.request_resubmission(
            submission_id=submission_id,
            professional_id=professional_id,
            issues=data.issues,
            notes=data.notes,
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/{submission_id}/mark-served",
    response_model=CourtFormSubmissionResponse,
    summary="Mark FL-300 as served (Court Staff)",
)
async def mark_form_served(
    submission_id: str,
    data: FormMarkServedRequest,
    db: AsyncSession = Depends(get_db),
    professional_id: str = Depends(get_court_professional_id),
):
    """Mark FL-300 as served to respondent."""
    service = CourtFormService(db)

    try:
        submission = await service.mark_form_as_served(
            submission_id=submission_id,
            professional_id=professional_id,
            service_type=data.service_type,
            served_on_date=data.served_on_date,
            notes=data.notes,
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# =============================================================================
# Court Staff - Hearing Management
# =============================================================================

@router.post(
    "/hearings",
    response_model=CourtHearingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule hearing (Court Staff)",
)
async def schedule_hearing(
    data: CourtHearingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Schedule a court hearing."""
    service = CourtFormService(db)

    hearing = await service.schedule_hearing(
        case_id=data.case_id,
        hearing_type=data.hearing_type,
        title=data.title,
        scheduled_date=data.scheduled_date,
        scheduled_time=data.scheduled_time,
        court_name=data.court_name,
        department=data.department,
        courtroom=data.courtroom,
        judge_name=data.judge_name,
        related_fl300_id=data.related_fl300_id,
        description=data.description,
        notes=data.notes,
    )

    await db.commit()
    return hearing


@router.put(
    "/hearings/{hearing_id}",
    response_model=CourtHearingResponse,
    summary="Update hearing (Court Staff)",
)
async def update_hearing(
    hearing_id: str,
    data: CourtHearingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a court hearing."""
    service = CourtFormService(db)

    hearing = await service.get_hearing(hearing_id)
    if not hearing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hearing not found",
        )

    # Update fields
    for field, value in data.model_dump(exclude_unset=True).items():
        if hasattr(hearing, field) and value is not None:
            setattr(hearing, field, value.value if hasattr(value, 'value') else value)

    hearing.updated_at = datetime.utcnow()
    await db.commit()

    return hearing


@router.get(
    "/hearings/{hearing_id}",
    response_model=CourtHearingResponse,
    summary="Get hearing",
)
async def get_hearing(
    hearing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a court hearing by ID."""
    service = CourtFormService(db)

    hearing = await service.get_hearing(hearing_id)
    if not hearing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hearing not found",
        )

    return hearing


@router.post(
    "/hearings/{hearing_id}/record-outcome",
    response_model=CourtHearingResponse,
    summary="Record hearing outcome (Court Staff)",
)
async def record_hearing_outcome(
    hearing_id: str,
    data: CourtHearingOutcomeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record the outcome of a court hearing."""
    service = CourtFormService(db)

    try:
        hearing = await service.record_hearing_outcome(
            hearing_id=hearing_id,
            professional_id=str(current_user.id),
            outcome=data.outcome,
            petitioner_attended=data.petitioner_attended,
            respondent_attended=data.respondent_attended,
            outcome_notes=data.outcome_notes,
        )
        await db.commit()
        return hearing
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/hearings/{hearing_id}/continue",
    response_model=CourtHearingResponse,
    summary="Continue hearing to new date (Court Staff)",
)
async def continue_hearing(
    hearing_id: str,
    data: CourtHearingContinueRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Continue a hearing to a new date."""
    service = CourtFormService(db)

    try:
        new_hearing = await service.continue_hearing(
            hearing_id=hearing_id,
            new_date=data.new_date,
            new_time=data.new_time,
            reason=data.reason,
        )
        await db.commit()
        return new_hearing
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# =============================================================================
# Court Staff - Order Entry
# =============================================================================

@router.post(
    "/orders/fl340",
    response_model=CourtFormSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enter FL-340 order (Court Staff)",
)
async def enter_fl340(
    data: FL340CreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Enter FL-340 (Findings and Order After Hearing).

    This is the judge's order after the hearing.
    """
    service = CourtFormService(db)

    submission = await service.enter_fl340_order(
        case_id=data.case_id,
        hearing_id=data.hearing_id,
        professional_id=str(current_user.id),
        form_data=data.form_data.model_dump(),
    )

    await db.commit()
    return submission


@router.post(
    "/orders/fl340/{fl340_id}/attach-fl341",
    response_model=CourtFormSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Attach FL-341 to order (Court Staff)",
)
async def attach_fl341(
    fl340_id: str,
    data: FL341CreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Attach FL-341 (Child Custody and Visitation Order) to FL-340.
    """
    service = CourtFormService(db)

    try:
        submission = await service.attach_fl341(
            fl340_id=fl340_id,
            professional_id=str(current_user.id),
            form_data=data.form_data.model_dump(),
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/orders/fl340/{fl340_id}/attach-fl342",
    response_model=CourtFormSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Attach FL-342 to order (Court Staff)",
)
async def attach_fl342(
    fl340_id: str,
    data: FL342CreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Attach FL-342 (Child Support Information and Order) to FL-340.
    """
    service = CourtFormService(db)

    try:
        submission = await service.attach_fl342(
            fl340_id=fl340_id,
            professional_id=str(current_user.id),
            form_data=data.form_data.model_dump(),
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/orders/fl340/{fl340_id}/finalize",
    response_model=CourtFormSubmissionResponse,
    summary="Finalize FL-340 order (Court Staff)",
)
async def finalize_fl340(
    fl340_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Finalize FL-340 order and activate case.

    This marks the order as entered and activates the case.
    """
    service = CourtFormService(db)

    try:
        submission = await service.finalize_fl340_order(
            fl340_id=fl340_id,
            professional_id=str(current_user.id),
        )
        await db.commit()
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# =============================================================================
# Case Activation
# =============================================================================

@router.post(
    "/case/{case_id}/activate",
    summary="Manually activate case (Court Staff)",
)
async def activate_case(
    case_id: str,
    data: Optional[CaseActivationRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually activate a case.

    Normally cases are activated when FL-340 is finalized,
    but this allows manual activation if needed.
    """
    service = CourtFormService(db)

    try:
        case = await service.activate_case(
            case_id=case_id,
            professional_id=str(current_user.id),
        )
        await db.commit()
        return {
            "case_id": case_id,
            "status": "active",
            "message": "Case activated successfully",
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

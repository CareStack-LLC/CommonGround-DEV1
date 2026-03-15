"""
Agreement endpoints for custody agreement management.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Body, status, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.database import get_db
from app.models.agreement import Agreement, AgreementSection
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.agreement import (
    AgreementCreate,
    AgreementResponse,
    AgreementSectionResponse,
    AgreementSectionCreate,
    AgreementSectionUpdate,
    AgreementWithSections,
    ApprovalRequest
)
from app.services.agreement import AgreementService
from app.services.aria_agreement import AriaAgreementService

router = APIRouter()


# ARIA Chat Models
class AriaChatMessage(BaseModel):
    message: str


class AriaChatResponse(BaseModel):
    response: str
    conversation_id: str
    message_count: int
    is_finalized: bool

# Note: Case-specific agreement endpoints (create, get by case_id) are in cases.py router


@router.get("/{agreement_id}", response_model=AgreementWithSections)
async def get_agreement(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get specific agreement by ID.

    Args:
        agreement_id: ID of the agreement

    Returns:
        Agreement with all sections
    """
    agreement_service = AgreementService(db)
    agreement = await agreement_service.get_agreement(agreement_id, current_user)

    # Calculate completion percentage
    completion = await agreement_service.get_completion_percentage(agreement)

    return {
        "agreement": AgreementResponse(
            id=agreement.id,
            case_id=agreement.case_id,
            family_file_id=agreement.family_file_id,
            title=agreement.title,
            version=agreement.version,
            status=agreement.status,
            petitioner_approved=agreement.petitioner_approved,
            respondent_approved=agreement.respondent_approved,
            effective_date=agreement.effective_date,
            pdf_url=agreement.pdf_url,
            created_at=agreement.created_at,
            updated_at=agreement.updated_at
        ),
        "sections": [
            AgreementSectionResponse(
                id=s.id,
                agreement_id=s.agreement_id,
                section_number=s.section_number,
                section_title=s.section_title,
                section_type=s.section_type,
                content=s.content,
                structured_data=s.structured_data,
                display_order=s.display_order,
                is_required=s.is_required,
                is_completed=s.is_completed
            )
            for s in sorted(agreement.sections, key=lambda x: x.display_order)
        ],
        "completion_percentage": completion
    }


@router.post("/sections", response_model=AgreementSectionResponse, status_code=status.HTTP_201_CREATED)
async def create_section(
    create_data: AgreementSectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new agreement section.

    Args:
        create_data: Section creation data

    Returns:
        Created section
    """
    agreement_service = AgreementService(db)
    section = await agreement_service.create_section(create_data, current_user)

    return AgreementSectionResponse(
        id=section.id,
        agreement_id=section.agreement_id,
        section_number=section.section_number,
        section_title=section.section_title,
        section_type=section.section_type,
        content=section.content,
        structured_data=section.structured_data,
        display_order=section.display_order,
        is_required=section.is_required,
        is_completed=section.is_completed
    )


@router.put("/sections/{section_id}", response_model=AgreementSectionResponse)
async def update_section(
    section_id: str,
    update_data: AgreementSectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an agreement section.

    Args:
        section_id: ID of the section
        update_data: Section update data

    Returns:
        Updated section
    """
    agreement_service = AgreementService(db)
    section = await agreement_service.update_section(section_id, update_data, current_user)

    return AgreementSectionResponse(
        id=section.id,
        agreement_id=section.agreement_id,
        section_number=section.section_number,
        section_title=section.section_title,
        section_type=section.section_type,
        content=section.content,
        structured_data=section.structured_data,
        display_order=section.display_order,
        is_required=section.is_required,
        is_completed=section.is_completed
    )


@router.post("/{agreement_id}/submit")
async def submit_for_approval(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit agreement for dual approval.

    Compiles rules and generates PDF.

    Args:
        agreement_id: ID of the agreement

    Returns:
        Updated agreement status
    """
    agreement_service = AgreementService(db)
    agreement = await agreement_service.submit_for_approval(agreement_id, current_user)

    return {
        "id": agreement.id,
        "status": agreement.status,
        "pdf_url": agreement.pdf_url,
        "message": "Agreement submitted for approval. Both parents must approve."
    }


@router.post("/{agreement_id}/approve")
async def approve_agreement(
    agreement_id: str,
    approval_data: ApprovalRequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve an agreement.

    Requires both parents to approve before becoming active.

    Args:
        agreement_id: ID of the agreement
        approval_data: Optional approval notes

    Returns:
        Updated agreement status
    """
    agreement_service = AgreementService(db)
    agreement = await agreement_service.approve_agreement(
        agreement_id,
        current_user,
        approval_data.notes
    )

    return {
        "id": agreement.id,
        "status": agreement.status,
        "petitioner_approved": agreement.petitioner_approved,
        "respondent_approved": agreement.respondent_approved,
        "effective_date": agreement.effective_date,
        "message": "Agreement fully approved! You can now activate it to make it the active agreement." if agreement.status == "approved" else "Approval recorded. Waiting for other parent."
    }


@router.post("/{agreement_id}/activate")
async def activate_agreement(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Activate an approved agreement.

    Deactivates any currently active agreements for the same case.

    Args:
        agreement_id: ID of the agreement to activate

    Returns:
        Updated agreement status
    """
    agreement_service = AgreementService(db)
    agreement = await agreement_service.activate_agreement(agreement_id, current_user)

    return {
        "id": agreement.id,
        "status": agreement.status,
        "effective_date": agreement.effective_date,
        "message": "Agreement activated successfully!"
    }


@router.post("/{agreement_id}/deactivate")
async def deactivate_agreement(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deactivate an active agreement.

    Args:
        agreement_id: ID of the agreement to deactivate

    Returns:
        Updated agreement status
    """
    agreement_service = AgreementService(db)
    agreement = await agreement_service.deactivate_agreement(agreement_id, current_user)

    return {
        "id": agreement.id,
        "status": agreement.status,
        "message": "Agreement deactivated successfully!"
    }


@router.delete("/{agreement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agreement(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an agreement (only if in draft status).

    Args:
        agreement_id: ID of the agreement

    Returns:
        No content
    """
    agreement_service = AgreementService(db)
    await agreement_service.delete_agreement(agreement_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{agreement_id}/pdf")
async def download_agreement_pdf(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Download agreement as PDF.

    Args:
        agreement_id: ID of the agreement

    Returns:
        PDF file
    """
    agreement_service = AgreementService(db)
    agreement = await agreement_service.get_agreement(agreement_id, current_user)

    # Generate PDF
    pdf_bytes = await agreement_service.generate_pdf(agreement)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="agreement_{agreement_id}.pdf"'
        }
    )


# ============================================================================
# Family File Summary Endpoints
# ============================================================================


class ExchangeScheduleItem(BaseModel):
    """A single exchange schedule entry."""
    day_of_week: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None


class ExchangeSummaryResponse(BaseModel):
    """Response model for exchange schedule summary."""
    schedules: List[ExchangeScheduleItem]
    agreement_title: Optional[str] = None


class FinancialSummaryResponse(BaseModel):
    """Response model for financial summary."""
    child_support_amount: Optional[float] = None
    child_support_frequency: Optional[str] = None
    child_support_payer: Optional[str] = None
    child_support_payee: Optional[str] = None
    expense_split_percentage: Optional[Dict[str, float]] = None
    special_provisions: List[str] = []
    agreement_title: Optional[str] = None


async def _get_active_agreement_for_family(
    db: AsyncSession, family_file_id: str, current_user
) -> Optional[Agreement]:
    """
    Find the active agreement for a family file.

    Falls back to the most recent approved/pending/draft agreement
    if no active agreement exists.
    """
    # Try active agreement first
    result = await db.execute(
        select(Agreement)
        .options(selectinload(Agreement.sections))
        .where(Agreement.family_file_id == family_file_id)
        .where(Agreement.status == "active")
        .order_by(Agreement.version.desc())
        .limit(1)
    )
    agreement = result.scalars().first()
    if agreement:
        return agreement

    # Fall back to most recent non-inactive agreement
    result = await db.execute(
        select(Agreement)
        .options(selectinload(Agreement.sections))
        .where(Agreement.family_file_id == family_file_id)
        .where(Agreement.status.in_(["approved", "pending_approval", "draft"]))
        .order_by(Agreement.version.desc())
        .limit(1)
    )
    return result.scalars().first()


@router.get(
    "/family-file/{family_file_id}/exchange-summary",
    response_model=ExchangeSummaryResponse,
)
async def get_exchange_summary(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get exchange schedule summary for a family file's active agreement.

    Extracts exchange/custody schedule information from agreement sections
    with section_type 'schedule' or 'custody'.

    Args:
        family_file_id: ID of the family file

    Returns:
        Exchange schedule summary with locations and times
    """
    agreement = await _get_active_agreement_for_family(db, family_file_id, current_user)

    if not agreement:
        return ExchangeSummaryResponse(schedules=[], agreement_title=None)

    schedules: List[ExchangeScheduleItem] = []

    for section in agreement.sections:
        if section.section_type not in ("schedule", "custody"):
            continue
        if not section.structured_data:
            continue

        data = section.structured_data

        # Handle structured_data that contains a list of exchanges directly
        exchange_list = data.get("exchanges") or data.get("exchange_schedule") or []
        if isinstance(exchange_list, list):
            for entry in exchange_list:
                if isinstance(entry, dict):
                    schedules.append(ExchangeScheduleItem(
                        day_of_week=entry.get("day_of_week") or entry.get("day"),
                        time=entry.get("time"),
                        location=entry.get("location"),
                    ))

        # Also check for a single exchange record at the top level
        if data.get("day_of_week") or data.get("day"):
            schedules.append(ExchangeScheduleItem(
                day_of_week=data.get("day_of_week") or data.get("day"),
                time=data.get("time"),
                location=data.get("location"),
            ))

    return ExchangeSummaryResponse(
        schedules=schedules,
        agreement_title=agreement.title,
    )


@router.get(
    "/family-file/{family_file_id}/financial-summary",
    response_model=FinancialSummaryResponse,
)
async def get_financial_summary(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get financial summary for a family file's active agreement.

    Extracts financial information from agreement sections
    with section_type 'financial'.

    Args:
        family_file_id: ID of the family file

    Returns:
        Financial summary including child support and expense split details
    """
    agreement = await _get_active_agreement_for_family(db, family_file_id, current_user)

    if not agreement:
        return FinancialSummaryResponse(agreement_title=None)

    # Collect financial data from all financial sections
    child_support_amount: Optional[float] = None
    child_support_frequency: Optional[str] = None
    child_support_payer: Optional[str] = None
    child_support_payee: Optional[str] = None
    expense_split_percentage: Optional[Dict[str, float]] = None
    special_provisions: List[str] = []

    for section in agreement.sections:
        if section.section_type != "financial":
            continue
        if not section.structured_data:
            continue

        data = section.structured_data

        # Extract child support details
        if data.get("child_support_amount") is not None:
            child_support_amount = float(data["child_support_amount"])
        if data.get("child_support_frequency"):
            child_support_frequency = data["child_support_frequency"]
        if data.get("child_support_payer"):
            child_support_payer = data["child_support_payer"]
        if data.get("child_support_payee"):
            child_support_payee = data["child_support_payee"]

        # Extract expense split
        if data.get("expense_split_percentage"):
            expense_split_percentage = data["expense_split_percentage"]
        elif data.get("expense_split"):
            expense_split_percentage = data["expense_split"]

        # Extract special provisions
        provisions = data.get("special_provisions") or data.get("provisions") or []
        if isinstance(provisions, list):
            special_provisions.extend(provisions)
        elif isinstance(provisions, str):
            special_provisions.append(provisions)

    return FinancialSummaryResponse(
        child_support_amount=child_support_amount,
        child_support_frequency=child_support_frequency,
        child_support_payer=child_support_payer,
        child_support_payee=child_support_payee,
        expense_split_percentage=expense_split_percentage,
        special_provisions=special_provisions,
        agreement_title=agreement.title,
    )


# ============================================================================
# ARIA Conversational Agreement Building
# ============================================================================

@router.post("/{agreement_id}/aria/message", response_model=AriaChatResponse)
async def send_aria_message(
    agreement_id: str,
    message_data: AriaChatMessage,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message to ARIA for conversational agreement building.

    ARIA will respond naturally and guide the conversation to extract
    all necessary custody agreement information.

    Args:
        agreement_id: ID of the agreement being built
        message_data: User's message to ARIA

    Returns:
        ARIA's response and conversation state
    """
    aria_service = AriaAgreementService(db)
    result = await aria_service.send_message(
        agreement_id,
        current_user,
        message_data.message
    )

    return AriaChatResponse(**result)


@router.get("/{agreement_id}/aria/conversation")
async def get_aria_conversation(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get full conversation history with ARIA.

    Returns:
        Complete conversation including messages, summary, and extracted data
    """
    aria_service = AriaAgreementService(db)
    return await aria_service.get_conversation_history(agreement_id, current_user)


@router.post("/{agreement_id}/aria/summary")
async def generate_aria_summary(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a parent-readable summary of the conversation.

    ARIA will create a comprehensive summary of all discussed topics
    in clear, accessible language.

    Returns:
        Generated summary
    """
    aria_service = AriaAgreementService(db)
    return await aria_service.generate_summary(agreement_id, current_user)


@router.post("/{agreement_id}/aria/extract")
async def extract_aria_data(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Extract structured data from the conversation.

    Converts natural language discussion into database-ready structured data.

    Returns:
        Extracted structured data mapped to agreement sections with human-readable preview
    """
    aria_service = AriaAgreementService(db)
    result = await aria_service.extract_structured_data(agreement_id, current_user)

    # Add human-readable preview
    result['preview'] = aria_service.generate_extraction_preview(result['extracted_data'])

    return result


@router.post("/{agreement_id}/aria/finalize")
async def finalize_aria_agreement(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Finalize the ARIA conversation and write data to agreement sections.

    This takes the extracted structured data and creates/updates all
    agreement sections with the information from the conversation.

    Returns:
        Updated agreement with all sections populated
    """
    aria_service = AriaAgreementService(db)
    agreement = await aria_service.finalize_agreement(agreement_id, current_user)

    # Return updated agreement with sections
    agreement_service = AgreementService(db)
    return await agreement_service.get_agreement(agreement_id, current_user)


class QuickSummaryResponse(BaseModel):
    """Response model for quick agreement summary."""
    summary: str
    key_points: List[str]
    completion_percentage: int
    status: str


@router.get("/{agreement_id}/quick-summary", response_model=QuickSummaryResponse)
async def get_agreement_quick_summary(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a quick, plain-English summary of an agreement for dashboard display.

    This generates a brief summary without requiring the full ARIA conversation.
    Uses AI to create a parent-readable summary from the agreement sections.

    Returns:
        Quick summary with key points and completion percentage
    """
    agreement_service = AgreementService(db)
    return await agreement_service.generate_quick_summary(agreement_id, current_user)

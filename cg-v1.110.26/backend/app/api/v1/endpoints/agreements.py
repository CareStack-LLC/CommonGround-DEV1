"""
Agreement endpoints for custody agreement management.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Body, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
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

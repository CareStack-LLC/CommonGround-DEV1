"""
Agreement endpoints for custody agreement management.
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Body, File, UploadFile, HTTPException, status, Response, Request
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
    ApprovalRequest,
    AgreementVersionResponse
)
from app.services.agreement import AgreementService
from app.services.aria_agreement import AriaAgreementService
from app.services.agreement_activation import AgreementActivationService

logger = logging.getLogger(__name__)

router = APIRouter()


# ARIA Chat Models
class AriaChatMessage(BaseModel):
    message: str


class AriaChatResponse(BaseModel):
    response: str
    conversation_id: str
    message_count: int
    is_finalized: bool


class AriaDocumentUploadResponse(BaseModel):
    response: str
    conversation_id: str
    message_count: int
    is_finalized: bool
    document: dict

# Note: Case-specific agreement endpoints (create, get by case_id) are in cases.py router



class AgreementDetailedResponse(AgreementResponse):
    """Agreement response with sections included (flat structure)."""
    sections: List[AgreementSectionResponse]
    completion_percentage: float


@router.get("/family-file/{family_file_id}", response_model=List[AgreementDetailedResponse])
async def get_agreements_by_family_file(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all agreements for a family file.

    Args:
        family_file_id: ID of the family file

    Returns:
        List of all agreements for the family file with sections
    """
    agreement_service = AgreementService(db)
    agreements = await agreement_service.get_family_file_agreements(family_file_id, current_user)

    response = []
    for agreement in agreements:
        # Calculate completion in-memory (sections are eager loaded)
        completion = 0.0
        if agreement.sections:
            completed_count = sum(1 for s in agreement.sections if s.is_completed)
            completion = (completed_count / len(agreement.sections)) * 100
        
        # Create response object
        agreement_dict = AgreementResponse(
            id=agreement.id,
            case_id=agreement.case_id,
            family_file_id=agreement.family_file_id,
            title=agreement.title,
            summary=agreement.summary,
            version=agreement.version,
            agreement_type=agreement.agreement_type,
            agreement_version=agreement.agreement_version or "v2_standard",
            status=agreement.status,
            petitioner_approved=agreement.petitioner_approved,
            respondent_approved=agreement.respondent_approved,
            effective_date=agreement.effective_date,
            pdf_url=agreement.pdf_url,
            created_at=agreement.created_at,
            updated_at=agreement.updated_at
        ).model_dump()
        
        # Add sections and completion
        agreement_dict["sections"] = [
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
        ]
        agreement_dict["completion_percentage"] = completion
        
        response.append(agreement_dict)

    return response


@router.get("/{agreement_id}/versions", response_model=List[AgreementVersionResponse])
async def get_agreement_versions(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get version history for an agreement.

    Args:
        agreement_id: ID of the agreement

    Returns:
        List of agreement versions
    """
    agreement_service = AgreementService(db)
    return await agreement_service.get_versions(agreement_id, current_user)


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

    # Build family_file info if available (using only valid attributes)
    family_file_data = None
    if hasattr(agreement, 'family_file') and agreement.family_file:
        ff = agreement.family_file
        family_file_data = {
            "id": str(ff.id),
            "title": getattr(ff, 'title', 'Family'),
            "parent_a_id": str(ff.parent_a_id) if ff.parent_a_id else None,
            "parent_b_id": str(ff.parent_b_id) if ff.parent_b_id else None,
        }

    return {
        "agreement": AgreementResponse(
            id=agreement.id,
            case_id=agreement.case_id,
            family_file_id=agreement.family_file_id,
            title=agreement.title,
            summary=agreement.summary,  # Include the summary field
            version=agreement.version,
            agreement_type=agreement.agreement_type,  # FIX: Add required field
            agreement_version=agreement.agreement_version or "v2_standard",
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
        "completion_percentage": completion,
        "family_file": family_file_data
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
    request: Request,
    approval_data: ApprovalRequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve an agreement.

    Requires both parents to approve before becoming active.
    Captures IP address and user-agent for digital signature verification.

    Args:
        agreement_id: ID of the agreement
        request: FastAPI request object for metadata capture
        approval_data: Approval notes and disclaimer acceptance

    Returns:
        Updated agreement status
    """
    # Validate disclaimer acceptance
    if not approval_data.disclaimer_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the legal disclaimer to approve this agreement"
        )

    # Capture request metadata for digital signature verification
    ip_address = request.headers.get("x-forwarded-for", request.client.host if request.client else "Unknown")
    user_agent = request.headers.get("user-agent", "Unknown")

    agreement_service = AgreementService(db)
    agreement = await agreement_service.approve_agreement(
        agreement_id,
        current_user,
        approval_data.notes,
        ip_address=ip_address,
        user_agent=user_agent
    )

    return {
        "id": agreement.id,
        "status": agreement.status,
        "petitioner_approved": agreement.petitioner_approved,
        "respondent_approved": agreement.respondent_approved,
        "effective_date": agreement.effective_date,
        "message": "Agreement fully approved! You can now activate it to make it the active agreement." if agreement.status == "approved" else "Approval recorded. Waiting for other parent."
    }


@router.get("/{agreement_id}/activation-preview")
async def preview_activation(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Preview what will be created when agreement is activated.

    Returns a preview of:
    - Custody exchanges that will be created
    - Expense split ratio that will be locked
    - Default exchange location

    Args:
        agreement_id: ID of the agreement to preview

    Returns:
        Preview of activation effects
    """
    agreement_service = AgreementService(db)
    activation_service = AgreementActivationService(db)

    agreement = await agreement_service.get_agreement(agreement_id, current_user)

    return await activation_service.preview_activation(agreement)


@router.post("/{agreement_id}/activate")
async def activate_agreement(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Activate an approved agreement.

    This will:
    1. Change status to 'active' and deactivate other active agreements
    2. Create recurring custody exchanges from parenting schedule
    3. Lock expense split ratio on family file (for ClearFund)
    4. Set default exchange location

    Args:
        agreement_id: ID of the agreement to activate

    Returns:
        Updated agreement status and activation results
    """
    agreement_service = AgreementService(db)
    activation_service = AgreementActivationService(db)

    # First, activate the agreement (status change)
    agreement = await agreement_service.activate_agreement(agreement_id, current_user)

    # Then, process activation side effects (create exchanges, set split ratio, etc.)
    activation_result = await activation_service.activate_agreement(
        agreement=agreement,
        activated_by=str(current_user.id)
    )

    return {
        "id": agreement.id,
        "status": agreement.status,
        "effective_date": agreement.effective_date,
        "message": "Agreement activated successfully!",
        "activation_details": {
            "exchanges_created": activation_result.exchanges_created,
            "split_ratio_set": activation_result.split_ratio_set,
            "exchange_location_set": activation_result.exchange_location_set,
            "schedule_events_created": activation_result.schedule_events_created,
            "holiday_events_created": activation_result.holiday_events_created,
            "activity_events_created": activation_result.activity_events_created,
            "communication_prefs_set": activation_result.communication_prefs_set,
            "recurring_obligations_created": activation_result.recurring_obligations_created,
            "obligation_instances_created": activation_result.obligation_instances_created,
            "errors": activation_result.errors if activation_result.errors else None
        }
    }


@router.get("/{agreement_id}/activation-summary")
async def get_activation_summary(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a summary of what was auto-created when the agreement was activated.

    Returns all agreement-derived items (exchanges, schedule events, obligations)
    with their current status.
    """
    from app.models.schedule import ScheduleEvent
    from app.models.custody_exchange import CustodyExchange
    from app.models.clearfund import Obligation
    from sqlalchemy import select, and_

    agreement_service = AgreementService(db)
    agreement = await agreement_service.get_agreement(agreement_id, current_user)

    items = []

    # Get agreement-derived schedule events
    events_result = await db.execute(
        select(ScheduleEvent).where(
            and_(
                ScheduleEvent.agreement_id == agreement_id,
                ScheduleEvent.is_agreement_derived == True
            )
        )
    )
    events = events_result.scalars().all()

    exchange_events = 0
    holiday_events = 0
    activity_events = 0

    for event in events:
        event_type_label = "event"
        if event.is_exchange:
            event_type_label = "exchange"
            exchange_events += 1
        elif event.event_type == "holiday":
            event_type_label = "holiday"
            holiday_events += 1
        else:
            event_type_label = "activity"
            activity_events += 1

        items.append({
            "type": event_type_label,
            "title": event.title,
            "description": event.description,
            "status": event.status,
            "start_time": event.start_time.isoformat() if event.start_time else None,
            "category": event.event_category,
        })

    # Get agreement-derived custody exchanges
    exchanges_result = await db.execute(
        select(CustodyExchange).where(
            CustodyExchange.agreement_id == agreement_id
        )
    )
    exchanges = exchanges_result.scalars().all()

    for exchange in exchanges:
        items.append({
            "type": "custody_exchange",
            "title": exchange.title,
            "description": f"{exchange.recurrence_pattern} exchange",
            "status": exchange.status,
            "start_time": exchange.scheduled_time.isoformat() if exchange.scheduled_time else None,
            "category": "exchange",
        })

    # Get agreement-derived obligations
    obligations_result = await db.execute(
        select(Obligation).where(
            Obligation.agreement_id == agreement_id
        )
    )
    obligations = obligations_result.scalars().all()

    templates = 0
    instances = 0
    for obligation in obligations:
        if obligation.status == "template":
            templates += 1
            items.append({
                "type": "obligation_template",
                "title": obligation.title,
                "description": obligation.description,
                "status": obligation.status,
                "amount": float(obligation.total_amount) if obligation.total_amount else None,
                "category": obligation.purpose_category,
            })
        else:
            instances += 1

    return {
        "agreement_id": agreement_id,
        "agreement_status": agreement.status,
        "activated_at": agreement.effective_date,
        "summary": {
            "custody_exchanges": len(exchanges),
            "schedule_events": exchange_events,
            "holiday_events": holiday_events,
            "activity_events": activity_events,
            "obligation_templates": templates,
            "obligation_instances": instances,
            "communication_prefs_set": agreement.family_file_id is not None,
        },
        "items": items,
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


@router.get("/{agreement_id}/compliance")
async def get_agreement_compliance(
    agreement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get compliance/adherence metrics for an active agreement.

    Filters exchange and financial compliance to only items derived
    from this specific agreement.
    """
    from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
    from app.models.clearfund import Obligation
    from sqlalchemy import select, and_, func

    agreement_service = AgreementService(db)
    agreement = await agreement_service.get_agreement(agreement_id, current_user)

    # --- Exchange Compliance ---
    exchanges_result = await db.execute(
        select(CustodyExchange).where(
            CustodyExchange.agreement_id == agreement_id
        )
    )
    exchanges = exchanges_result.scalars().all()
    exchange_ids = [str(e.id) for e in exchanges]

    total_instances = 0
    completed_instances = 0
    missed_instances = 0
    on_time_count = 0

    if exchange_ids:
        instances_result = await db.execute(
            select(CustodyExchangeInstance).where(
                CustodyExchangeInstance.exchange_id.in_(exchange_ids)
            )
        )
        instances = instances_result.scalars().all()
        total_instances = len(instances)

        for inst in instances:
            if inst.status == "completed":
                completed_instances += 1
                # Check if on-time (both parents checked in within geofence)
                if inst.from_parent_checked_in and inst.to_parent_checked_in:
                    on_time_count += 1
            elif inst.status == "missed":
                missed_instances += 1

    exchange_completion_rate = (completed_instances / total_instances * 100) if total_instances > 0 else 0
    on_time_rate = (on_time_count / completed_instances * 100) if completed_instances > 0 else 0

    # --- Financial Compliance ---
    obligations_result = await db.execute(
        select(Obligation).where(
            and_(
                Obligation.agreement_id == agreement_id,
                Obligation.status != "template"
            )
        )
    )
    obligations = obligations_result.scalars().all()

    total_obligations = len(obligations)
    funded_obligations = sum(1 for o in obligations if o.status in ("funded", "verified", "completed"))
    financial_completion_rate = (funded_obligations / total_obligations * 100) if total_obligations > 0 else 0

    # --- Overall Score (weighted: exchange 50%, financial 50%) ---
    overall_score = 0
    if total_instances > 0 or total_obligations > 0:
        exchange_weight = 0.5 if total_instances > 0 else 0
        financial_weight = 0.5 if total_obligations > 0 else 0
        total_weight = exchange_weight + financial_weight
        if total_weight > 0:
            overall_score = (
                (exchange_completion_rate * exchange_weight + financial_completion_rate * financial_weight)
                / total_weight
            )

    # Determine status label
    if overall_score >= 90:
        status_label = "excellent"
    elif overall_score >= 75:
        status_label = "good"
    elif overall_score >= 50:
        status_label = "needs_improvement"
    else:
        status_label = "concerning"

    return {
        "agreement_id": agreement_id,
        "overall_score": round(overall_score, 1),
        "status": status_label,
        "exchange_compliance": {
            "total_exchanges": total_instances,
            "completed": completed_instances,
            "missed": missed_instances,
            "completion_rate": round(exchange_completion_rate, 1),
            "on_time_rate": round(on_time_rate, 1),
        },
        "financial_compliance": {
            "total_obligations": total_obligations,
            "funded": funded_obligations,
            "completion_rate": round(financial_completion_rate, 1),
        },
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
    try:
        agreement_service = AgreementService(db)
        agreement = await agreement_service.get_agreement(agreement_id, current_user)

        if not agreement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agreement {agreement_id} not found"
            )

        # Generate PDF
        logger.info(f"Generating PDF for agreement {agreement_id}")
        pdf_bytes = await agreement_service.generate_pdf(agreement)

        if not pdf_bytes:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="PDF generation returned empty result"
            )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="agreement_{agreement_id}.pdf"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF generation failed for agreement {agreement_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF"
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


@router.post("/{agreement_id}/aria/upload", response_model=AriaDocumentUploadResponse)
async def upload_aria_document(
    agreement_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a document (PDF or DOCX) for ARIA to analyze.

    ARIA will extract text from the document, use it as a starting point
    for the custody agreement conversation, identify covered topics, and
    ask about anything missing or unclear.

    Args:
        agreement_id: ID of the agreement being built
        file: PDF or DOCX file upload

    Returns:
        ARIA's analysis of the document and conversation state
    """
    from app.services.document_text_extractor import extract_text
    from app.services.storage import (
        SupabaseStorageService,
        StorageBucket,
        build_aria_document_path,
    )
    from sqlalchemy import select
    from app.models.agreement import Agreement

    # Validate file type
    allowed_types = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    allowed_extensions = {".pdf", ".docx"}

    filename = file.filename or "document"
    file_ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if file.content_type not in allowed_types and file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only PDF (.pdf) and Word (.docx) files are supported.",
        )

    # Read file content
    file_content = await file.read()

    # Validate file size (20MB max for agreement docs)
    max_size = 20 * 1024 * 1024
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 20MB.",
        )

    # Get agreement to find family_file_id
    agreement_result = await db.execute(
        select(Agreement).where(Agreement.id == agreement_id)
    )
    agreement = agreement_result.scalar_one_or_none()
    if not agreement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Agreement not found"
        )

    family_file_id = agreement.family_file_id or agreement.case_id

    # Upload to Supabase Storage
    storage_service = SupabaseStorageService()
    storage_path = build_aria_document_path(family_file_id, agreement_id, filename)

    try:
        storage_url = await storage_service.upload_file(
            bucket=StorageBucket.DOCUMENTS,
            path=storage_path,
            file_content=file_content,
            content_type=file.content_type or "application/pdf",
        )
    except Exception as e:
        logger.error(f"Failed to upload file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file",
        )

    # Extract text from document
    try:
        extracted_text, extraction_metadata = extract_text(
            file_content, file.content_type or "application/pdf", filename
        )
    except ValueError as e:
        # Image-only PDF or unsupported type
        logger.error(f"Failed to extract text from document: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Failed to extract text from document"
        )
    except Exception as e:
        logger.error(f"Failed to read document: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to read document",
        )

    # Build attachment info
    attachment_info = {
        "filename": filename,
        "file_type": file.content_type or "application/pdf",
        "file_size": len(file_content),
        "storage_url": storage_url,
        "text_length": extraction_metadata.get("text_length", len(extracted_text)),
        **extraction_metadata,
    }

    # Send to ARIA for analysis
    aria_service = AriaAgreementService(db)
    result = await aria_service.send_document_message(
        agreement_id, current_user, extracted_text, attachment_info
    )

    return AriaDocumentUploadResponse(**result)


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
    in clear, accessible language. Uses v2 format (7 sections) for
    v2 agreements, v1 format (18 sections) for v1 agreements.

    Returns:
        Generated summary
    """
    # Get agreement to check version
    agreement_service = AgreementService(db)
    agreement = await agreement_service.get_agreement(agreement_id, current_user)

    aria_service = AriaAgreementService(db)

    # Use v2 method for v2 agreements
    version = getattr(agreement, 'agreement_version', 'v1')
    if version in ('v2_standard', 'v2_lite'):
        return await aria_service.generate_summary_v2(agreement_id, current_user)
    else:
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
    Uses v2 format (7 sections) for v2 agreements, v1 format (18 sections) for v1.

    Returns:
        Extracted structured data mapped to agreement sections with human-readable preview
    """
    # Get agreement to check version
    agreement_service = AgreementService(db)
    agreement = await agreement_service.get_agreement(agreement_id, current_user)

    aria_service = AriaAgreementService(db)

    # Use v2 method for v2 agreements
    version = getattr(agreement, 'agreement_version', 'v1')
    if version in ('v2_standard', 'v2_lite'):
        result = await aria_service.extract_structured_data_v2(agreement_id, current_user)
        # Add human-readable preview using v2 method
        result['preview'] = aria_service.generate_extraction_preview_v2(result['extracted_data'], version)
    else:
        result = await aria_service.extract_structured_data(agreement_id, current_user)
        # Add human-readable preview using v1 method
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
    Uses v2 format (7 sections) for v2 agreements, v1 format (18 sections) for v1.

    Returns:
        Updated agreement with all sections populated
    """
    # Get agreement to check version
    agreement_service = AgreementService(db)
    agreement = await agreement_service.get_agreement(agreement_id, current_user)

    aria_service = AriaAgreementService(db)

    # Use v2 method for v2 agreements
    version = getattr(agreement, 'agreement_version', 'v1')
    if version in ('v2_standard', 'v2_lite'):
        await aria_service.finalize_agreement_v2(agreement_id, current_user)
    else:
        await aria_service.finalize_agreement(agreement_id, current_user)

    # Return updated agreement with sections
    return await agreement_service.get_agreement(agreement_id, current_user)


class QuickSummaryResponse(BaseModel):
    """Response model for quick agreement summary."""
    summary: str
    key_points: List[str]
    shared_expenses_table: Optional[Dict[str, Any]] = None
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

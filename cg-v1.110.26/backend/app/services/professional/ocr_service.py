"""
OCR Document Processing Service.

Manages the court order OCR pipeline:
upload → detect form type → extract → review → approve → create agreement

California forms only at launch (FL-341, FL-311, FL-312, FL-150, FL-342).
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import (
    OCRDocument,
    OCRExtractionStatus,
    CaseAssignment,
    ProfessionalProfile,
    ProfessionalAccessLog,
)
from app.models.family_file import FamilyFile
from app.models.agreement import Agreement


# California court form types supported at launch
SUPPORTED_FORM_TYPES = {
    "FL-341": "Child Custody and Visitation (Parenting Time) Order Attachment",
    "FL-311": "Child Custody and Visitation Application Attachment",
    "FL-312": "Request for Child Custody Evaluation",
    "FL-150": "Income and Expense Declaration",
    "FL-342": "Child Support Information and Order Attachment",
}

# Minimum confidence threshold for auto-approval (fields below this get flagged)
CONFIDENCE_THRESHOLD = 0.85

# Field templates for each California court form – used by the OCR worker
# to know which regions / labels to extract from each form type.
CA_FORM_FIELD_MAPS: dict[str, list[dict]] = {
    "FL-341": [
        {"path": "custody_type", "label": "Type of Custody", "type": "select",
         "options": ["joint_legal", "sole_legal_mother", "sole_legal_father",
                     "joint_physical", "sole_physical_mother", "sole_physical_father"]},
        {"path": "visitation_schedule", "label": "Visitation Schedule", "type": "text"},
        {"path": "holidays", "label": "Holiday Schedule", "type": "text"},
        {"path": "transportation", "label": "Transportation Arrangements", "type": "text"},
        {"path": "supervised_visitation", "label": "Supervised Visitation Required", "type": "boolean"},
        {"path": "supervised_provider", "label": "Supervised Visitation Provider", "type": "text"},
        {"path": "move_away_restrictions", "label": "Move-Away Restrictions", "type": "text"},
        {"path": "other_orders", "label": "Other Orders", "type": "text"},
    ],
    "FL-311": [
        {"path": "petitioner_name", "label": "Petitioner", "type": "text"},
        {"path": "respondent_name", "label": "Respondent", "type": "text"},
        {"path": "case_number", "label": "Case Number", "type": "text"},
        {"path": "custody_requested", "label": "Custody Requested", "type": "select",
         "options": ["joint_legal", "sole_legal", "joint_physical", "sole_physical"]},
        {"path": "visitation_requested", "label": "Visitation Requested", "type": "text"},
        {"path": "reasons", "label": "Reasons for Request", "type": "text"},
        {"path": "children", "label": "Children", "type": "array"},
    ],
    "FL-312": [
        {"path": "evaluation_type", "label": "Type of Evaluation", "type": "select",
         "options": ["custody", "visitation", "both"]},
        {"path": "evaluator_name", "label": "Evaluator Name", "type": "text"},
        {"path": "issues", "label": "Issues for Evaluation", "type": "text"},
        {"path": "domestic_violence_alleged", "label": "Domestic Violence Alleged", "type": "boolean"},
        {"path": "substance_abuse_alleged", "label": "Substance Abuse Alleged", "type": "boolean"},
        {"path": "child_preferences", "label": "Child Has Preferences", "type": "boolean"},
    ],
    "FL-150": [
        {"path": "employment.employer", "label": "Employer", "type": "text"},
        {"path": "employment.occupation", "label": "Occupation", "type": "text"},
        {"path": "income.gross_monthly", "label": "Gross Monthly Income", "type": "currency"},
        {"path": "income.net_monthly", "label": "Net Monthly Income", "type": "currency"},
        {"path": "income.other_sources", "label": "Other Income Sources", "type": "currency"},
        {"path": "expenses.rent_mortgage", "label": "Rent/Mortgage", "type": "currency"},
        {"path": "expenses.food", "label": "Food & Household", "type": "currency"},
        {"path": "expenses.utilities", "label": "Utilities", "type": "currency"},
        {"path": "expenses.insurance", "label": "Insurance", "type": "currency"},
        {"path": "expenses.childcare", "label": "Childcare", "type": "currency"},
        {"path": "expenses.education", "label": "Education", "type": "currency"},
        {"path": "expenses.transportation", "label": "Transportation", "type": "currency"},
        {"path": "assets.real_property", "label": "Real Property Value", "type": "currency"},
        {"path": "assets.vehicles", "label": "Vehicles Value", "type": "currency"},
        {"path": "assets.savings", "label": "Savings/Investments", "type": "currency"},
        {"path": "debts.total", "label": "Total Debts", "type": "currency"},
    ],
    "FL-342": [
        {"path": "guideline_amount", "label": "Guideline Child Support", "type": "currency"},
        {"path": "ordered_amount", "label": "Ordered Amount", "type": "currency"},
        {"path": "payor", "label": "Payor", "type": "select", "options": ["mother", "father"]},
        {"path": "payee", "label": "Payee", "type": "select", "options": ["mother", "father"]},
        {"path": "health_insurance_provider", "label": "Health Insurance Provider", "type": "text"},
        {"path": "health_insurance_responsible", "label": "Responsible for Health Insurance",
         "type": "select", "options": ["mother", "father", "both"]},
        {"path": "childcare_costs", "label": "Childcare Costs", "type": "currency"},
        {"path": "childcare_responsible", "label": "Childcare Cost Responsibility",
         "type": "select", "options": ["mother", "father", "split"]},
        {"path": "income_mother", "label": "Mother's Income", "type": "currency"},
        {"path": "income_father", "label": "Father's Income", "type": "currency"},
        {"path": "timeshare_mother", "label": "Mother's Timeshare %", "type": "number"},
        {"path": "timeshare_father", "label": "Father's Timeshare %", "type": "number"},
    ],
}


class OCRDocumentService:
    """Service for managing the OCR document processing pipeline."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # Upload & Detection
    # =========================================================================

    async def upload_document(
        self,
        *,
        professional_id: str,
        family_file_id: str,
        case_assignment_id: Optional[str],
        file_url: str,
        original_filename: str,
        file_size_bytes: Optional[int] = None,
        mime_type: str = "application/pdf",
    ) -> OCRDocument:
        """
        Upload a court order document for OCR processing.

        Creates an OCRDocument record in PENDING status.
        The actual OCR processing is triggered separately (async worker or
        by calling process_document).
        """
        doc = OCRDocument(
            id=str(uuid4()),
            professional_id=professional_id,  # uploaded_by_id
            family_file_id=family_file_id,
            case_assignment_id=case_assignment_id,
            file_url=file_url,
            original_filename=original_filename,
            file_size_bytes=file_size_bytes,
            mime_type=mime_type,
            extraction_status=OCRExtractionStatus.PENDING.value,
        )
        # Fix: the column is uploaded_by_id, not professional_id
        doc.uploaded_by_id = professional_id

        self.db.add(doc)
        await self.db.flush()

        # Log the upload action
        await self._log_action(
            professional_id=professional_id,
            family_file_id=family_file_id,
            action="upload_ocr_document",
            resource_type="ocr_document",
            resource_id=doc.id,
            details={"filename": original_filename, "form_type": "pending_detection"},
        )

        return doc

    # =========================================================================
    # Processing
    # =========================================================================

    async def process_document(
        self,
        document_id: str,
    ) -> OCRDocument:
        """
        Trigger OCR processing for a document.

        In production this would:
        1. Send to PaddleOCR engine
        2. Detect form type from header/layout
        3. Extract structured data based on form template
        4. Compute per-field confidence scores
        5. Flag low-confidence fields for review

        For now, this sets up the pipeline status tracking.
        The actual OCR integration will be added when PaddleOCR is configured.
        """
        doc = await self._get_document(document_id)

        if doc.extraction_status != OCRExtractionStatus.PENDING.value:
            raise ValueError(
                f"Document is in '{doc.extraction_status}' status, expected 'pending'"
            )

        doc.extraction_status = OCRExtractionStatus.PROCESSING.value
        doc.processing_started_at = datetime.utcnow()

        await self.db.flush()
        return doc

    async def complete_processing(
        self,
        document_id: str,
        *,
        detected_form_type: Optional[str],
        detection_confidence: Optional[float],
        extracted_data: dict,
        confidence_scores: dict,
    ) -> OCRDocument:
        """
        Mark document processing as complete and move to REVIEW status.

        Called by the OCR worker after extraction is finished.
        Automatically flags low-confidence fields for professional review.
        """
        doc = await self._get_document(document_id)

        if doc.extraction_status != OCRExtractionStatus.PROCESSING.value:
            raise ValueError(
                f"Document is in '{doc.extraction_status}' status, expected 'processing'"
            )

        # Identify low-confidence fields
        low_confidence = [
            field for field, score in confidence_scores.items()
            if score < CONFIDENCE_THRESHOLD
        ]

        doc.detected_form_type = detected_form_type
        doc.detection_confidence = detection_confidence
        doc.extracted_data = extracted_data
        doc.confidence_scores = confidence_scores
        doc.low_confidence_fields = low_confidence if low_confidence else None
        doc.extraction_status = OCRExtractionStatus.REVIEW.value
        doc.processing_completed_at = datetime.utcnow()

        await self.db.flush()
        return doc

    async def mark_processing_failed(
        self,
        document_id: str,
        error: str,
    ) -> OCRDocument:
        """Mark document processing as failed."""
        doc = await self._get_document(document_id)

        doc.extraction_status = OCRExtractionStatus.FAILED.value
        doc.processing_completed_at = datetime.utcnow()
        doc.processing_error = error

        await self.db.flush()
        return doc

    # =========================================================================
    # Review & Approval
    # =========================================================================

    async def get_extraction_review(
        self,
        document_id: str,
    ) -> dict:
        """
        Get the extraction data formatted for professional review.

        Returns:
        - extracted_data: all extracted fields
        - confidence_scores: per-field confidence
        - low_confidence_fields: fields needing review
        - form_type: detected California form type
        - professional_corrections: any corrections already made
        """
        doc = await self._get_document(document_id)

        if doc.extraction_status not in (
            OCRExtractionStatus.REVIEW.value,
            OCRExtractionStatus.APPROVED.value,
        ):
            raise ValueError(
                f"Document is in '{doc.extraction_status}' status, "
                "must be 'review' or 'approved' to view extraction"
            )

        return {
            "document_id": doc.id,
            "form_type": doc.detected_form_type,
            "form_type_description": SUPPORTED_FORM_TYPES.get(
                doc.detected_form_type or "", "Unknown form"
            ),
            "detection_confidence": doc.detection_confidence,
            "extraction_status": doc.extraction_status,
            "extracted_data": doc.extracted_data or {},
            "confidence_scores": doc.confidence_scores or {},
            "low_confidence_fields": doc.low_confidence_fields or [],
            "professional_corrections": doc.professional_corrections or {},
            "processing_completed_at": (
                doc.processing_completed_at.isoformat()
                if doc.processing_completed_at else None
            ),
        }

    async def submit_corrections(
        self,
        document_id: str,
        corrections: dict,
        professional_id: str,
    ) -> OCRDocument:
        """
        Save professional corrections to extracted data.

        Corrections format:
        {
            "field_name": {
                "original": "extracted_value",
                "corrected": "professional_corrected_value"
            }
        }
        """
        doc = await self._get_document(document_id)

        if doc.extraction_status != OCRExtractionStatus.REVIEW.value:
            raise ValueError(
                f"Document is in '{doc.extraction_status}' status, expected 'review'"
            )

        # Merge with any existing corrections
        existing = doc.professional_corrections or {}
        existing.update(corrections)
        doc.professional_corrections = existing

        # Also apply corrections to the extracted_data for the final version
        if doc.extracted_data:
            for field, correction in corrections.items():
                doc.extracted_data[field] = correction.get("corrected", correction)

        await self.db.flush()

        await self._log_action(
            professional_id=professional_id,
            family_file_id=doc.family_file_id,
            action="submit_ocr_corrections",
            resource_type="ocr_document",
            resource_id=doc.id,
            details={"corrected_fields": list(corrections.keys())},
        )

        return doc

    async def approve_extraction(
        self,
        document_id: str,
        professional_id: str,
    ) -> OCRDocument:
        """
        Approve the OCR extraction and create a new agreement.

        Per spec:
        - OCR creates NEW agreements (doesn't update existing)
        - System locks populated fields from parent editing (→ FieldLock)
        """
        doc = await self._get_document(document_id)

        if doc.extraction_status != OCRExtractionStatus.REVIEW.value:
            raise ValueError(
                f"Document is in '{doc.extraction_status}' status, expected 'review'"
            )

        doc.extraction_status = OCRExtractionStatus.APPROVED.value
        doc.approved_at = datetime.utcnow()
        doc.approved_by_id = professional_id

        # Note: Agreement creation and FieldLock creation will be handled
        # by the calling endpoint, which orchestrates:
        # 1. approve_extraction() → sets status
        # 2. Create Agreement from extracted_data
        # 3. field_lock_service.create_locks_from_ocr() → locks fields

        await self.db.flush()

        await self._log_action(
            professional_id=professional_id,
            family_file_id=doc.family_file_id,
            action="approve_ocr_extraction",
            resource_type="ocr_document",
            resource_id=doc.id,
            details={
                "form_type": doc.detected_form_type,
                "corrected_fields": list((doc.professional_corrections or {}).keys()),
            },
        )

        return doc

    async def reject_extraction(
        self,
        document_id: str,
        professional_id: str,
        reason: str,
    ) -> OCRDocument:
        """Reject the OCR extraction with a reason."""
        doc = await self._get_document(document_id)

        if doc.extraction_status != OCRExtractionStatus.REVIEW.value:
            raise ValueError(
                f"Document is in '{doc.extraction_status}' status, expected 'review'"
            )

        doc.extraction_status = OCRExtractionStatus.REJECTED.value
        doc.rejected_at = datetime.utcnow()
        doc.rejection_reason = reason

        await self.db.flush()

        await self._log_action(
            professional_id=professional_id,
            family_file_id=doc.family_file_id,
            action="reject_ocr_extraction",
            resource_type="ocr_document",
            resource_id=doc.id,
            details={"reason": reason},
        )

        return doc

    # =========================================================================
    # Queries
    # =========================================================================

    async def get_document(self, document_id: str) -> Optional[OCRDocument]:
        """Get an OCR document by ID."""
        result = await self.db.execute(
            select(OCRDocument).where(OCRDocument.id == document_id)
        )
        return result.scalar_one_or_none()

    async def list_documents_for_case(
        self,
        family_file_id: str,
        status_filter: Optional[str] = None,
    ) -> list[OCRDocument]:
        """List all OCR documents for a specific case."""
        query = select(OCRDocument).where(
            OCRDocument.family_file_id == family_file_id
        )
        if status_filter:
            query = query.where(OCRDocument.extraction_status == status_filter)

        query = query.order_by(OCRDocument.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_documents_for_professional(
        self,
        professional_id: str,
        status_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[OCRDocument]:
        """List all OCR documents uploaded by a professional."""
        query = select(OCRDocument).where(
            OCRDocument.uploaded_by_id == professional_id
        )
        if status_filter:
            query = query.where(OCRDocument.extraction_status == status_filter)

        query = query.order_by(OCRDocument.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    # =========================================================================
    # Internal helpers
    # =========================================================================

    async def _get_document(self, document_id: str) -> OCRDocument:
        """Get document or raise ValueError."""
        doc = await self.get_document(document_id)
        if not doc:
            raise ValueError(f"OCR document {document_id} not found")
        return doc

    async def _log_action(
        self,
        professional_id: str,
        family_file_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        details: Optional[dict] = None,
    ) -> None:
        """Log a professional access action."""
        log = ProfessionalAccessLog(
            id=str(uuid4()),
            professional_id=professional_id,
            family_file_id=family_file_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            logged_at=datetime.utcnow(),
        )
        self.db.add(log)

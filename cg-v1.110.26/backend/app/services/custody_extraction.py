"""
Custody Order Extraction Service.

Uses AI (OpenAI GPT-4o) to extract structured data from custody agreement PDFs.
Matches CA FL-311 and similar court forms.
"""

import hashlib
import json
from datetime import datetime, date
from typing import Optional, Tuple
from uuid import uuid4
import base64
import io

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import openai
import fitz  # PyMuPDF for PDF to image conversion

from app.core.config import settings
from app.models.custody_order import (
    CustodyOrder,
    CustodyOrderChild,
    VisitationSchedule,
    SupervisedVisitation,
    ExchangeRules,
    HolidaySchedule,
    AgreementUpload,
)
from app.schemas.custody_order import CustodyOrderExtraction


# =============================================================================
# Extraction Prompt
# =============================================================================

EXTRACTION_SYSTEM_PROMPT = """You are a legal document extraction specialist for CommonGround, a co-parenting platform.

Your task is to extract structured data from custody agreement PDFs (like California FL-311 forms).

IMPORTANT RULES:
1. Extract ONLY what is explicitly stated in the document
2. Do NOT infer or assume information not present
3. If a field is not filled in or unclear, use null
4. Maintain exact names, dates, and addresses as written
5. For checkboxes, only mark true if clearly checked/filled
6. Note any fields that need human review in fields_needing_review

EXTRACTION SCHEMA:
You must return a JSON object matching this structure:

{
  "form_type": "FL-311",
  "form_state": "CA",
  "case_number": "string or null",
  "petitioner_name": "string or null",
  "respondent_name": "string or null",
  "other_party_name": "string or null",

  "children": [
    {
      "name": "Child's Full Name",
      "birth_date": "YYYY-MM-DD or null",
      "age": "number or null"
    }
  ],

  "physical_custody": "petitioner | respondent | joint | other",
  "legal_custody": "petitioner | respondent | joint | other",
  "visitation_type": "reasonable | scheduled | supervised | none",

  "visitation_schedules": [
    {
      "parent": "petitioner | respondent | other",
      "schedule_type": "weekend | weekday | virtual | other",
      "weekends": [
        {
          "weekend_number": "1st | 2nd | 3rd | 4th | 5th | alternate",
          "start_day": "Friday",
          "end_day": "Sunday",
          "start_time": "6:00 PM or null",
          "end_time": "6:00 PM or null",
          "start_at_school": false,
          "start_after_school": false,
          "end_at_school": false
        }
      ],
      "weekdays": [
        {
          "days": ["Monday", "Wednesday"],
          "start_time": "3:00 PM",
          "end_time": "8:00 PM",
          "start_after_school": true
        }
      ],
      "virtual": {
        "enabled": false,
        "schedule": "string or null",
        "platform": "string or null"
      },
      "fifth_weekend_rule": "alternate | odd_months | even_months | null",
      "effective_date": "YYYY-MM-DD or null",
      "other_notes": "string or null"
    }
  ],

  "has_abuse_allegations": false,
  "abuse_alleged_against": "petitioner | respondent | other | null",
  "has_substance_abuse_allegations": false,
  "substance_abuse_alleged_against": "petitioner | respondent | other | null",
  "abuse_details": "string or null",

  "supervised_visitation": {
    "required": false,
    "supervised_parent": "petitioner | respondent | other | null",
    "reason": "string or null",
    "supervisor_name": "string or null",
    "supervisor_phone": "string or null",
    "supervisor_type": "professional | nonprofessional | null",
    "petitioner_cost_percent": "number or null",
    "respondent_cost_percent": "number or null",
    "location_type": "in_person | virtual | other | null",
    "location_address": "string or null",
    "frequency": "once_weekly | twice_weekly | other | null",
    "hours_per_visit": "number or null"
  },

  "exchange_rules": {
    "require_licensed_driver": true,
    "require_insured_driver": true,
    "require_registered_vehicle": true,
    "require_child_restraints": true,
    "transport_to_provider": "string or null",
    "transport_from_provider": "string or null",
    "exchange_start_address": "string or null",
    "exchange_end_address": "string or null",
    "curbside_exchange": false,
    "other_rules": "string or null"
  },

  "travel_restrictions": {
    "state_restriction": false,
    "county_restrictions": ["string"] or null,
    "other_restrictions": "string or null",
    "requires_written_permission": false
  },

  "abduction_risk": false,
  "abduction_prevention_notes": "string or null",

  "mediation_required": false,
  "mediation_details": "string or null",

  "holiday_schedule": [
    {
      "holiday_name": "Christmas",
      "holiday_type": "federal | religious | school_break | birthday",
      "assigned_to": "petitioner | respondent | alternate | split",
      "odd_years_to": "petitioner | respondent | null",
      "even_years_to": "petitioner | respondent | null",
      "start_description": "Christmas Eve at 6pm",
      "end_description": "Christmas Day at 6pm",
      "duration_days": "number or null",
      "notes": "string or null"
    }
  ],

  "other_provisions": "string or null",

  "extraction_confidence": 0.85,
  "extraction_notes": "Notes about extraction quality",
  "fields_needing_review": ["field1", "field2"]
}

Return ONLY the JSON object, no other text."""


# =============================================================================
# Extraction Service
# =============================================================================

class CustodyExtractionService:
    """
    Service for extracting custody order data from PDFs.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    def _pdf_to_images(self, pdf_content: bytes, max_pages: int = 10) -> list[str]:
        """
        Convert PDF pages to base64-encoded PNG images for OpenAI Vision.

        Args:
            pdf_content: Raw PDF bytes
            max_pages: Maximum pages to process (default 10)

        Returns:
            List of base64-encoded PNG images
        """
        images = []
        pdf_doc = fitz.open(stream=pdf_content, filetype="pdf")

        for page_num in range(min(len(pdf_doc), max_pages)):
            page = pdf_doc[page_num]
            # Render at 2x resolution for better OCR
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_bytes = pix.tobytes("png")
            img_base64 = base64.standard_b64encode(img_bytes).decode("utf-8")
            images.append(img_base64)

        pdf_doc.close()
        return images

    async def create_upload(
        self,
        case_id: str,
        uploaded_by: str,
        uploaded_by_type: str,
        filename: str,
        file_url: str,
        file_size: int,
        file_hash: str,
        page_count: Optional[int] = None,
        document_type: str = "custody_order",
        form_type: Optional[str] = None,
        state: Optional[str] = None,
    ) -> AgreementUpload:
        """Create an agreement upload record."""
        upload = AgreementUpload(
            id=str(uuid4()),
            case_id=case_id,
            uploaded_by=uploaded_by,
            uploaded_by_type=uploaded_by_type,
            original_filename=filename,
            file_url=file_url,
            file_size_bytes=file_size,
            file_hash=file_hash,
            page_count=page_count,
            document_type=document_type,
            form_type=form_type,
            state=state,
            extraction_status="pending",
        )
        self.db.add(upload)
        await self.db.commit()
        await self.db.refresh(upload)
        return upload

    async def extract_from_pdf(
        self,
        upload_id: str,
        pdf_content: bytes,
    ) -> Tuple[CustodyOrder, float]:
        """
        Extract custody order data from PDF content using Claude.

        Returns the created CustodyOrder and confidence score.
        """
        # Get the upload record
        result = await self.db.execute(
            select(AgreementUpload).where(AgreementUpload.id == upload_id)
        )
        upload = result.scalar_one_or_none()
        if not upload:
            raise ValueError(f"Upload {upload_id} not found")

        # Update status
        upload.extraction_status = "processing"
        upload.extraction_started_at = datetime.utcnow()
        await self.db.commit()

        try:
            # Convert PDF pages to images for OpenAI Vision
            page_images = self._pdf_to_images(pdf_content)

            # Build message content with all page images
            content = []
            for i, img_base64 in enumerate(page_images):
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{img_base64}",
                        "detail": "high"  # Use high detail for better OCR
                    }
                })

            content.append({
                "type": "text",
                "text": "Extract all custody order information from this document into the specified JSON format. Be thorough and accurate. This is a multi-page document - analyze all pages provided."
            })

            # Call OpenAI GPT-4o with Vision
            response = self.client.chat.completions.create(
                model="gpt-4o",
                max_tokens=8000,
                messages=[
                    {
                        "role": "system",
                        "content": EXTRACTION_SYSTEM_PROMPT
                    },
                    {
                        "role": "user",
                        "content": content
                    }
                ],
            )

            # Parse the response
            response_text = response.choices[0].message.content

            # Try to extract JSON from the response
            try:
                # Handle case where response might have markdown code blocks
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    response_text = response_text[json_start:json_end].strip()
                elif "```" in response_text:
                    json_start = response_text.find("```") + 3
                    json_end = response_text.find("```", json_start)
                    response_text = response_text[json_start:json_end].strip()

                extracted_data = json.loads(response_text)
            except json.JSONDecodeError as e:
                upload.extraction_status = "failed"
                upload.extraction_error = f"Failed to parse extraction response: {str(e)}"
                await self.db.commit()
                raise ValueError(f"Failed to parse extraction: {e}")

            # Validate against schema
            extraction = CustodyOrderExtraction(**extracted_data)

            # Create custody order from extraction
            custody_order = await self._create_custody_order_from_extraction(
                upload.case_id, extraction, upload.id
            )

            # Update upload with results
            upload.extraction_status = "completed"
            upload.extraction_completed_at = datetime.utcnow()
            upload.custody_order_id = custody_order.id
            upload.extraction_confidence = extraction.extraction_confidence
            upload.raw_extracted_json = extracted_data
            upload.requires_review = len(extraction.fields_needing_review) > 0

            await self.db.commit()

            return custody_order, extraction.extraction_confidence

        except Exception as e:
            upload.extraction_status = "failed"
            upload.extraction_error = str(e)
            await self.db.commit()
            raise

    async def _create_custody_order_from_extraction(
        self,
        case_id: str,
        extraction: CustodyOrderExtraction,
        upload_id: str,
    ) -> CustodyOrder:
        """Create database records from extracted data."""

        # Get upload for source info
        result = await self.db.execute(
            select(AgreementUpload).where(AgreementUpload.id == upload_id)
        )
        upload = result.scalar_one()

        # Create main custody order
        custody_order = CustodyOrder(
            id=str(uuid4()),
            case_id=case_id,
            form_type=extraction.form_type,
            form_state=extraction.form_state,
            court_case_number=extraction.case_number,
            physical_custody=extraction.physical_custody,
            legal_custody=extraction.legal_custody,
            visitation_type=extraction.visitation_type,
            has_abuse_allegations=extraction.has_abuse_allegations,
            abuse_alleged_against=extraction.abuse_alleged_against,
            has_substance_abuse_allegations=extraction.has_substance_abuse_allegations,
            substance_abuse_alleged_against=extraction.substance_abuse_alleged_against,
            abuse_allegation_details=extraction.abuse_details,
            abduction_risk=extraction.abduction_risk,
            abduction_prevention_orders=extraction.abduction_prevention_notes,
            mediation_required=extraction.mediation_required,
            mediation_location=extraction.mediation_details,
            other_provisions=extraction.other_provisions,
            source_pdf_url=upload.file_url,
            source_pdf_hash=upload.file_hash,
            extracted_at=datetime.utcnow(),
            extraction_confidence=extraction.extraction_confidence,
            extraction_notes=extraction.extraction_notes,
            requires_review=len(extraction.fields_needing_review) > 0,
            raw_extracted_data=extraction.model_dump(mode="json"),  # JSON-serializable output
        )

        # Travel restrictions
        if extraction.travel_restrictions:
            custody_order.travel_restriction_state = extraction.travel_restrictions.state_restriction
            custody_order.travel_restriction_counties = extraction.travel_restrictions.county_restrictions
            custody_order.travel_restriction_other = extraction.travel_restrictions.other_restrictions
            custody_order.requires_written_permission = extraction.travel_restrictions.requires_written_permission

        self.db.add(custody_order)

        # Add children
        for child_data in extraction.children:
            child = CustodyOrderChild(
                id=str(uuid4()),
                custody_order_id=custody_order.id,
                child_name=child_data.name,
                birth_date=child_data.birth_date,
                age_at_filing=child_data.age,
            )
            self.db.add(child)

        # Add visitation schedules
        for schedule_data in extraction.visitation_schedules:
            # Handle weekend schedules
            if schedule_data.weekends:
                for weekend in schedule_data.weekends:
                    schedule = VisitationSchedule(
                        id=str(uuid4()),
                        custody_order_id=custody_order.id,
                        parent_type=schedule_data.parent,
                        schedule_type="weekend",
                        weekend_number=weekend.weekend_number,
                        start_day=weekend.start_day,
                        end_day=weekend.end_day,
                        start_at_school=weekend.start_at_school,
                        start_after_school=weekend.start_after_school,
                        end_at_school=weekend.end_at_school,
                        fifth_weekend_rule=schedule_data.fifth_weekend_rule,
                        notes=schedule_data.other_notes,
                    )
                    # Parse times
                    if weekend.start_time:
                        schedule.start_time = self._parse_time(weekend.start_time)
                    if weekend.end_time:
                        schedule.end_time = self._parse_time(weekend.end_time)
                    self.db.add(schedule)

            # Handle weekday schedules
            if schedule_data.weekdays:
                for weekday in schedule_data.weekdays:
                    schedule = VisitationSchedule(
                        id=str(uuid4()),
                        custody_order_id=custody_order.id,
                        parent_type=schedule_data.parent,
                        schedule_type="weekday",
                        start_day=", ".join(weekday.days),
                        start_after_school=weekday.start_after_school,
                        notes=schedule_data.other_notes,
                    )
                    if weekday.start_time:
                        schedule.start_time = self._parse_time(weekday.start_time)
                    if weekday.end_time:
                        schedule.end_time = self._parse_time(weekday.end_time)
                    self.db.add(schedule)

            # Handle virtual visitation
            if schedule_data.virtual and schedule_data.virtual.enabled:
                schedule = VisitationSchedule(
                    id=str(uuid4()),
                    custody_order_id=custody_order.id,
                    parent_type=schedule_data.parent,
                    schedule_type="virtual",
                    is_virtual=True,
                    virtual_platform=schedule_data.virtual.platform,
                    virtual_schedule_notes=schedule_data.virtual.schedule,
                )
                self.db.add(schedule)

        # Add supervised visitation if present
        if extraction.supervised_visitation and extraction.supervised_visitation.required:
            sv = extraction.supervised_visitation
            supervised = SupervisedVisitation(
                id=str(uuid4()),
                custody_order_id=custody_order.id,
                supervised_parent=sv.supervised_parent or "respondent",
                supervision_reason=sv.reason,
                supervisor_name=sv.supervisor_name,
                supervisor_phone=sv.supervisor_phone,
                supervisor_type=sv.supervisor_type or "professional",
                petitioner_cost_percent=sv.petitioner_cost_percent,
                respondent_cost_percent=sv.respondent_cost_percent,
                location_type=sv.location_type or "in_person",
                location_address=sv.location_address,
                frequency=sv.frequency,
                hours_per_visit=sv.hours_per_visit,
            )
            self.db.add(supervised)

        # Add exchange rules if present
        if extraction.exchange_rules:
            er = extraction.exchange_rules
            exchange = ExchangeRules(
                id=str(uuid4()),
                custody_order_id=custody_order.id,
                require_licensed_driver=er.require_licensed_driver,
                require_insured_driver=er.require_insured_driver,
                require_registered_vehicle=er.require_registered_vehicle,
                require_child_restraints=er.require_child_restraints,
                transport_to_provider=er.transport_to_provider,
                transport_from_provider=er.transport_from_provider,
                exchange_start_address=er.exchange_start_address,
                exchange_end_address=er.exchange_end_address,
                curbside_exchange=er.curbside_exchange,
                exchange_protocol="curbside" if er.curbside_exchange else "doorstep",
                other_rules=er.other_rules,
            )
            self.db.add(exchange)

        # Add holiday schedule
        for holiday_data in extraction.holiday_schedule:
            holiday = HolidaySchedule(
                id=str(uuid4()),
                custody_order_id=custody_order.id,
                holiday_name=holiday_data.holiday_name,
                holiday_type=holiday_data.holiday_type,
                assigned_to=holiday_data.assigned_to,
                odd_years_to=holiday_data.odd_years_to,
                even_years_to=holiday_data.even_years_to,
                start_day=holiday_data.start_description,
                end_day=holiday_data.end_description,
                duration_days=holiday_data.duration_days,
                notes=holiday_data.notes,
            )
            self.db.add(holiday)

        await self.db.commit()
        await self.db.refresh(custody_order)
        return custody_order

    def _parse_time(self, time_str: str):
        """Parse time string to time object."""
        if not time_str:
            return None

        time_str = time_str.strip().upper()

        # Common formats
        formats = [
            "%I:%M %p",    # 6:00 PM
            "%I:%M%p",     # 6:00PM
            "%I %p",       # 6 PM
            "%H:%M",       # 18:00
        ]

        for fmt in formats:
            try:
                from datetime import datetime as dt
                parsed = dt.strptime(time_str, fmt)
                return parsed.time()
            except ValueError:
                continue

        return None

    async def get_upload(self, upload_id: str) -> Optional[AgreementUpload]:
        """Get an upload by ID."""
        result = await self.db.execute(
            select(AgreementUpload).where(AgreementUpload.id == upload_id)
        )
        return result.scalar_one_or_none()

    async def get_uploads_for_case(self, case_id: str) -> list[AgreementUpload]:
        """Get all uploads for a case."""
        result = await self.db.execute(
            select(AgreementUpload)
            .where(AgreementUpload.case_id == case_id)
            .order_by(AgreementUpload.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_custody_order(self, order_id: str) -> Optional[CustodyOrder]:
        """Get a custody order by ID."""
        result = await self.db.execute(
            select(CustodyOrder).where(CustodyOrder.id == order_id)
        )
        return result.scalar_one_or_none()

    async def get_custody_orders_for_case(self, case_id: str) -> list[CustodyOrder]:
        """Get all custody orders for a case."""
        result = await self.db.execute(
            select(CustodyOrder)
            .where(CustodyOrder.case_id == case_id)
            .order_by(CustodyOrder.created_at.desc())
        )
        return list(result.scalars().all())

    async def mark_reviewed(
        self,
        order_id: str,
        reviewed_by: str,
        review_notes: Optional[str] = None,
    ) -> CustodyOrder:
        """Mark a custody order as reviewed."""
        order = await self.get_custody_order(order_id)
        if not order:
            raise ValueError(f"Custody order {order_id} not found")

        order.requires_review = False
        order.reviewed_at = datetime.utcnow()
        order.reviewed_by = reviewed_by

        # Also update the upload
        if order.source_pdf_hash:
            result = await self.db.execute(
                select(AgreementUpload).where(
                    AgreementUpload.custody_order_id == order_id
                )
            )
            upload = result.scalar_one_or_none()
            if upload:
                upload.requires_review = False
                upload.reviewed_at = datetime.utcnow()
                upload.reviewed_by = reviewed_by
                upload.review_notes = review_notes

        await self.db.commit()
        await self.db.refresh(order)
        return order


def compute_file_hash(content: bytes) -> str:
    """Compute SHA-256 hash of file content."""
    return hashlib.sha256(content).hexdigest()

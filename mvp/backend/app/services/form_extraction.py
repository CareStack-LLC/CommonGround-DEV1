"""
Form Extraction Service - Extract structured data for California court forms.

Maps conversational intake responses to specific form fields for:
- FL-300 (Request for Order)
- FL-311 (Child Custody and Visitation Application)
- FL-320 (Responsive Declaration)
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
import json

import anthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.intake import IntakeSession, IntakeExtraction
from app.core.config import settings


# =============================================================================
# Form Field Schemas
# =============================================================================

FL_311_SCHEMA = {
    "description": "Child Custody and Visitation Application",
    "sections": {
        "children": {
            "description": "Information about each child",
            "fields": [
                {"name": "full_name", "type": "string", "required": True},
                {"name": "date_of_birth", "type": "date", "required": True},
                {"name": "current_residence", "type": "string", "description": "Which parent child primarily lives with"},
                {"name": "school_name", "type": "string"},
                {"name": "grade", "type": "string"},
                {"name": "special_needs", "type": "string"}
            ]
        },
        "legal_custody": {
            "description": "Decision-making authority",
            "fields": [
                {"name": "request_type", "type": "enum", "options": ["sole", "joint"], "required": True},
                {"name": "to_parent", "type": "enum", "options": ["mother", "father", "both"]},
                {"name": "reason", "type": "text"}
            ]
        },
        "physical_custody": {
            "description": "Where children live",
            "fields": [
                {"name": "request_type", "type": "enum", "options": ["sole", "joint", "primary"], "required": True},
                {"name": "primary_parent", "type": "enum", "options": ["mother", "father"]},
                {"name": "reason", "type": "text"}
            ]
        },
        "visitation_schedule": {
            "description": "Parenting time schedule",
            "fields": [
                {"name": "weekday_arrangement", "type": "text"},
                {"name": "weekend_arrangement", "type": "text"},
                {"name": "school_year_schedule", "type": "text"},
                {"name": "summer_schedule", "type": "text"}
            ]
        },
        "holiday_schedule": {
            "description": "Holiday and special occasion schedule",
            "fields": [
                {"name": "thanksgiving", "type": "text"},
                {"name": "christmas_eve", "type": "text"},
                {"name": "christmas_day", "type": "text"},
                {"name": "new_years", "type": "text"},
                {"name": "spring_break", "type": "text"},
                {"name": "mothers_day", "type": "text"},
                {"name": "fathers_day", "type": "text"},
                {"name": "child_birthdays", "type": "text"},
                {"name": "other_holidays", "type": "text"}
            ]
        },
        "exchange_details": {
            "description": "Custody exchange logistics",
            "fields": [
                {"name": "exchange_location", "type": "string"},
                {"name": "exchange_location_type", "type": "enum", "options": ["parent_home", "school", "neutral_location", "police_station", "other"]},
                {"name": "pickup_time", "type": "string"},
                {"name": "dropoff_time", "type": "string"},
                {"name": "transportation_responsibility", "type": "text"},
                {"name": "additional_notes", "type": "text"}
            ]
        },
        "communication": {
            "description": "Parent-to-parent communication",
            "fields": [
                {"name": "preferred_method", "type": "enum", "options": ["app", "text", "email", "phone", "other"]},
                {"name": "child_contact_schedule", "type": "text", "description": "When non-custodial parent can call/video children"},
                {"name": "emergency_contact_protocol", "type": "text"}
            ]
        },
        "special_provisions": {
            "description": "Additional provisions",
            "fields": [
                {"name": "right_of_first_refusal", "type": "boolean"},
                {"name": "right_of_first_refusal_hours", "type": "integer"},
                {"name": "travel_restrictions", "type": "text"},
                {"name": "travel_notice_days", "type": "integer"},
                {"name": "relocation_restrictions", "type": "text"},
                {"name": "other_provisions", "type": "text"}
            ]
        },
        "safety_concerns": {
            "description": "Safety-related requests",
            "fields": [
                {"name": "has_concerns", "type": "boolean"},
                {"name": "concerns_description", "type": "text"},
                {"name": "supervised_visitation_requested", "type": "boolean"},
                {"name": "supervision_details", "type": "text"}
            ]
        }
    }
}

FL_300_SCHEMA = {
    "description": "Request for Order (RFO)",
    "sections": {
        "relief_requested": {
            "description": "What orders are being requested",
            "fields": [
                {"name": "child_custody", "type": "boolean"},
                {"name": "visitation", "type": "boolean"},
                {"name": "child_support", "type": "boolean"},
                {"name": "spousal_support", "type": "boolean"},
                {"name": "attorney_fees", "type": "boolean"},
                {"name": "property_control", "type": "boolean"},
                {"name": "other", "type": "text"}
            ]
        },
        "facts_in_support": {
            "description": "Statement of facts supporting the request",
            "fields": [
                {"name": "factual_statement", "type": "text", "required": True},
                {"name": "change_in_circumstances", "type": "text"}
            ]
        },
        "current_orders": {
            "description": "Information about existing orders",
            "fields": [
                {"name": "has_existing_orders", "type": "boolean"},
                {"name": "existing_order_date", "type": "date"},
                {"name": "existing_order_description", "type": "text"}
            ]
        }
    }
}

FL_320_SCHEMA = {
    "description": "Responsive Declaration to Request for Order",
    "sections": {
        "response_to_requests": {
            "description": "Response to each request in the RFO",
            "fields": [
                {"name": "agrees_with_custody_request", "type": "boolean"},
                {"name": "custody_response", "type": "text"},
                {"name": "agrees_with_visitation_request", "type": "boolean"},
                {"name": "visitation_response", "type": "text"},
                {"name": "agrees_with_support_request", "type": "boolean"},
                {"name": "support_response", "type": "text"}
            ]
        },
        "counter_requests": {
            "description": "Counter-requests from respondent",
            "fields": [
                {"name": "has_counter_requests", "type": "boolean"},
                {"name": "counter_custody_request", "type": "text"},
                {"name": "counter_visitation_request", "type": "text"},
                {"name": "counter_support_request", "type": "text"}
            ]
        },
        "facts_in_response": {
            "description": "Respondent's factual statement",
            "fields": [
                {"name": "factual_response", "type": "text", "required": True},
                {"name": "disputed_facts", "type": "text"}
            ]
        }
    }
}


FORM_SCHEMAS = {
    "FL-300": FL_300_SCHEMA,
    "FL-311": FL_311_SCHEMA,
    "FL-320": FL_320_SCHEMA,
}


class FormExtractionService:
    """Service for extracting structured form data from intake conversations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _get_extraction_prompt(self, form_type: str) -> str:
        """Generate extraction prompt for specific form type."""
        schema = FORM_SCHEMAS.get(form_type)
        if not schema:
            raise ValueError(f"Unknown form type: {form_type}")

        schema_json = json.dumps(schema, indent=2)

        return f"""You are extracting information from an intake conversation for California form {form_type}: {schema['description']}.

EXTRACTION SCHEMA:
{schema_json}

INSTRUCTIONS:
1. Read the entire conversation carefully
2. Extract information that maps to each field in the schema
3. Use exact quotes where helpful
4. If information is not mentioned, use null
5. For enum fields, choose the closest matching option
6. For boolean fields, infer from context
7. Be conservative - only extract what was clearly stated
8. Format dates as YYYY-MM-DD

Return a JSON object with the extracted data following the schema structure.
Only return valid JSON, no additional text."""

    async def extract_for_form(
        self,
        session: IntakeSession,
        target_form: str
    ) -> Dict[str, Any]:
        """
        Extract structured data for a specific form from the intake conversation.
        """
        if target_form not in FORM_SCHEMAS:
            raise ValueError(f"Unsupported form type: {target_form}")

        # Prepare conversation text
        conv_text = "\n\n".join([
            f"{'ARIA' if m['role'] == 'assistant' else 'PARENT'}: {m['content']}"
            for m in session.messages
        ])

        extraction_prompt = self._get_extraction_prompt(target_form)

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                messages=[{
                    "role": "user",
                    "content": f"{extraction_prompt}\n\n---\n\nCONVERSATION:\n{conv_text}\n\n---\n\nExtract the form data as JSON:"
                }]
            )

            raw_text = response.content[0].text

            # Parse JSON from response
            # Handle potential markdown code blocks
            if "```json" in raw_text:
                raw_text = raw_text.split("```json")[1].split("```")[0]
            elif "```" in raw_text:
                raw_text = raw_text.split("```")[1].split("```")[0]

            extracted_data = json.loads(raw_text.strip())

            # Validate and identify missing required fields
            missing_fields = self._validate_extraction(extracted_data, target_form)

            # Calculate confidence score
            confidence = self._calculate_confidence(extracted_data, target_form)

            # Check for existing extraction
            existing_result = await self.db.execute(
                select(IntakeExtraction).where(
                    IntakeExtraction.session_id == session.id,
                    IntakeExtraction.target_form == target_form
                ).order_by(IntakeExtraction.extraction_version.desc())
            )
            existing = existing_result.scalar_one_or_none()

            version = 1 if not existing else existing.extraction_version + 1

            # Create extraction record
            extraction = IntakeExtraction(
                session_id=session.id,
                target_form=target_form,
                extraction_version=version,
                raw_extraction=extracted_data,
                validated_fields=extracted_data,  # Could add validation step
                confidence_score=confidence,
                missing_fields=missing_fields if missing_fields else None,
                ai_provider="claude",
                model_used="claude-sonnet-4-20250514",
                tokens_used=response.usage.output_tokens if hasattr(response, 'usage') else None
            )
            self.db.add(extraction)

            # Update session extracted data
            if not session.extracted_data:
                session.extracted_data = {}
            session.extracted_data[target_form] = extracted_data

            await self.db.commit()
            await self.db.refresh(extraction)

            return {
                "form_type": target_form,
                "extracted_data": extracted_data,
                "confidence_score": confidence,
                "missing_fields": missing_fields,
                "version": version
            }

        except json.JSONDecodeError as e:
            # Store error for debugging
            extraction = IntakeExtraction(
                session_id=session.id,
                target_form=target_form,
                extraction_version=1,
                extraction_errors=[f"JSON parse error: {str(e)}"],
                ai_provider="claude"
            )
            self.db.add(extraction)
            await self.db.commit()

            return {
                "form_type": target_form,
                "error": "Failed to parse extraction",
                "details": str(e)
            }

        except Exception as e:
            print(f"Extraction error: {e}")
            return {
                "form_type": target_form,
                "error": "Extraction failed",
                "details": str(e)
            }

    def _validate_extraction(
        self,
        extracted_data: Dict[str, Any],
        form_type: str
    ) -> List[str]:
        """Identify missing required fields."""
        missing = []
        schema = FORM_SCHEMAS.get(form_type, {})

        for section_name, section_data in schema.get("sections", {}).items():
            for field in section_data.get("fields", []):
                if field.get("required"):
                    field_name = field["name"]
                    section_in_data = extracted_data.get(section_name, {})

                    if isinstance(section_in_data, dict):
                        if not section_in_data.get(field_name):
                            missing.append(f"{section_name}.{field_name}")
                    elif isinstance(section_in_data, list):
                        # For array sections like children
                        for i, item in enumerate(section_in_data):
                            if not item.get(field_name):
                                missing.append(f"{section_name}[{i}].{field_name}")

        return missing

    def _calculate_confidence(
        self,
        extracted_data: Dict[str, Any],
        form_type: str
    ) -> float:
        """Calculate confidence score based on data completeness."""
        schema = FORM_SCHEMAS.get(form_type, {})

        total_fields = 0
        filled_fields = 0

        for section_name, section_data in schema.get("sections", {}).items():
            section_in_data = extracted_data.get(section_name, {})

            for field in section_data.get("fields", []):
                total_fields += 1

                if isinstance(section_in_data, dict):
                    if section_in_data.get(field["name"]):
                        filled_fields += 1
                elif isinstance(section_in_data, list) and section_in_data:
                    if section_in_data[0].get(field["name"]):
                        filled_fields += 1

        if total_fields == 0:
            return 0.0

        return round(filled_fields / total_fields, 2)

    def get_form_schema(self, form_type: str) -> Optional[Dict[str, Any]]:
        """Get the schema for a form type."""
        return FORM_SCHEMAS.get(form_type)

    def list_supported_forms(self) -> List[Dict[str, str]]:
        """List all supported form types."""
        return [
            {"form_type": ft, "description": schema["description"]}
            for ft, schema in FORM_SCHEMAS.items()
        ]

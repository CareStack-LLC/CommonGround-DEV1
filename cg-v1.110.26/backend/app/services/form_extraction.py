"""
Form Extraction Service - Extract structured data for California court forms.

Maps conversational intake responses to specific form fields for:
- FL-300 (Request for Order)
- FL-311 (Child Custody and Visitation Application)
- FL-312 (Request for Child Abduction Prevention Orders)
- FL-320 (Responsive Declaration)
- FL-341 (Children's Holiday Schedule Attachment)
- FL-342 (Child Support Information and Order Attachment)
- FL-150 (Income and Expense Declaration)
- DV-100 (Request for Domestic Violence Restraining Order)
- DV-110 (Temporary Restraining Order)
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
import json

from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.intake import IntakeSession, IntakeExtraction
from app.core.config import settings


# =============================================================================
# Form Field Schemas
# =============================================================================

FORM_SCHEMAS: Dict[str, Any] = {
    "FL-300": {
        "description": "Request for Order (custody / support modification)",
        "sections": {
            "case_information": {
                "fields": [
                    {"name": "petitioner_name", "type": "string", "required": True},
                    {"name": "respondent_name", "type": "string", "required": True},
                    {"name": "case_number", "type": "string", "required": False},
                    {"name": "court_name", "type": "string", "required": False},
                ]
            },
            "children": {
                "fields": [
                    {"name": "name", "type": "string", "required": True},
                    {"name": "date_of_birth", "type": "date", "required": True},
                    {"name": "age", "type": "integer", "required": False},
                ]
            },
            "current_orders": {
                "fields": [
                    {"name": "current_custody_arrangement", "type": "string", "required": False},
                    {"name": "existing_order_date", "type": "date", "required": False},
                    {"name": "existing_order_description", "type": "string", "required": False},
                ]
            },
            "requested_orders": {
                "fields": [
                    {"name": "requested_custody_type", "type": "enum", "options": ["sole", "joint", "primary"], "required": True},
                    {"name": "requested_physical_custody", "type": "string", "required": False},
                    {"name": "requested_legal_custody", "type": "string", "required": False},
                    {"name": "requested_visitation_schedule", "type": "string", "required": False},
                    {"name": "changed_circumstances", "type": "string", "required": True},
                    {"name": "best_interest_justification", "type": "string", "required": True},
                ]
            },
            "child_support": {
                "fields": [
                    {"name": "support_requested", "type": "boolean", "required": False},
                    {"name": "requested_amount", "type": "number", "required": False},
                ]
            },
        }
    },
    "FL-311": {
        "description": "Child Custody and Visitation Application Attachment",
        "sections": {
            "petitioner": {
                "fields": [
                    {"name": "name", "type": "string", "required": True},
                    {"name": "address", "type": "string", "required": False},
                    {"name": "phone", "type": "string", "required": False},
                ]
            },
            "respondent": {
                "fields": [
                    {"name": "name", "type": "string", "required": True},
                    {"name": "address", "type": "string", "required": False},
                    {"name": "phone", "type": "string", "required": False},
                ]
            },
            "children": {
                "fields": [
                    {"name": "name", "type": "string", "required": True},
                    {"name": "date_of_birth", "type": "date", "required": True},
                    {"name": "current_residence", "type": "string", "required": False},
                    {"name": "school", "type": "string", "required": False},
                    {"name": "special_needs", "type": "string", "required": False},
                ]
            },
            "custody_request": {
                "fields": [
                    {"name": "legal_custody", "type": "enum", "options": ["sole_petitioner", "sole_respondent", "joint"], "required": True},
                    {"name": "physical_custody", "type": "enum", "options": ["sole_petitioner", "sole_respondent", "joint"], "required": True},
                    {"name": "schedule_description", "type": "string", "required": False},
                ]
            },
            "visitation": {
                "fields": [
                    {"name": "weekday_schedule", "type": "string", "required": False},
                    {"name": "weekend_schedule", "type": "string", "required": False},
                    {"name": "holiday_schedule", "type": "string", "required": False},
                    {"name": "summer_schedule", "type": "string", "required": False},
                    {"name": "exchange_location", "type": "string", "required": False},
                    {"name": "supervised_visitation", "type": "boolean", "required": False},
                ]
            },
        }
    },
    "FL-312": {
        "description": "Request for Child Abduction Prevention Orders",
        "sections": {
            "parties": {
                "fields": [
                    {"name": "petitioner_name", "type": "string", "required": True},
                    {"name": "respondent_name", "type": "string", "required": True},
                ]
            },
            "children": {
                "fields": [
                    {"name": "name", "type": "string", "required": True},
                    {"name": "date_of_birth", "type": "date", "required": True},
                ]
            },
            "abduction_risk": {
                "fields": [
                    {"name": "risk_description", "type": "string", "required": True},
                    {"name": "prior_abduction", "type": "boolean", "required": False},
                    {"name": "threatened_abduction", "type": "boolean", "required": False},
                    {"name": "foreign_ties", "type": "string", "required": False},
                ]
            },
            "requested_orders": {
                "fields": [
                    {"name": "passport_surrender", "type": "boolean", "required": False},
                    {"name": "travel_restrictions", "type": "string", "required": False},
                    {"name": "bond_requirement", "type": "boolean", "required": False},
                ]
            },
        }
    },
    "FL-341": {
        "description": "Children's Holiday Schedule Attachment",
        "sections": {
            "parties": {
                "fields": [
                    {"name": "parent_a_name", "type": "string", "required": True},
                    {"name": "parent_b_name", "type": "string", "required": True},
                ]
            },
            "holidays": {
                "fields": [
                    {"name": "thanksgiving_arrangement", "type": "string", "required": False},
                    {"name": "christmas_eve_arrangement", "type": "string", "required": False},
                    {"name": "christmas_day_arrangement", "type": "string", "required": False},
                    {"name": "new_years_eve_arrangement", "type": "string", "required": False},
                    {"name": "new_years_day_arrangement", "type": "string", "required": False},
                    {"name": "mothers_day_arrangement", "type": "string", "required": False},
                    {"name": "fathers_day_arrangement", "type": "string", "required": False},
                    {"name": "spring_break_arrangement", "type": "string", "required": False},
                    {"name": "winter_break_arrangement", "type": "string", "required": False},
                    {"name": "child_birthday_arrangement", "type": "string", "required": False},
                    {"name": "parent_birthday_arrangement", "type": "string", "required": False},
                    {"name": "alternating_years", "type": "boolean", "required": False},
                ]
            },
        }
    },
    "FL-342": {
        "description": "Child Support Information and Order Attachment",
        "sections": {
            "parties": {
                "fields": [
                    {"name": "obligor_name", "type": "string", "required": True},
                    {"name": "obligee_name", "type": "string", "required": True},
                ]
            },
            "children": {
                "fields": [
                    {"name": "name", "type": "string", "required": True},
                    {"name": "date_of_birth", "type": "date", "required": True},
                ]
            },
            "income": {
                "fields": [
                    {"name": "obligor_gross_monthly_income", "type": "number", "required": True},
                    {"name": "obligee_gross_monthly_income", "type": "number", "required": False},
                    {"name": "other_income_sources", "type": "string", "required": False},
                ]
            },
            "timeshare": {
                "fields": [
                    {"name": "obligor_timeshare_percentage", "type": "number", "required": True},
                ]
            },
            "deductions": {
                "fields": [
                    {"name": "health_insurance_cost", "type": "number", "required": False},
                    {"name": "childcare_cost", "type": "number", "required": False},
                    {"name": "union_dues", "type": "number", "required": False},
                    {"name": "mandatory_retirement", "type": "number", "required": False},
                ]
            },
            "support_order": {
                "fields": [
                    {"name": "monthly_support_amount", "type": "number", "required": False},
                    {"name": "current_order_amount", "type": "number", "required": False},
                    {"name": "arrears_amount", "type": "number", "required": False},
                ]
            },
        }
    },
    "FL-150": {
        "description": "Income and Expense Declaration",
        "sections": {
            "personal": {
                "fields": [
                    {"name": "full_name", "type": "string", "required": True},
                    {"name": "address", "type": "string", "required": False},
                    {"name": "employer", "type": "string", "required": False},
                    {"name": "occupation", "type": "string", "required": False},
                ]
            },
            "income": {
                "fields": [
                    {"name": "gross_monthly_salary", "type": "number", "required": True},
                    {"name": "overtime_monthly", "type": "number", "required": False},
                    {"name": "bonuses_monthly", "type": "number", "required": False},
                    {"name": "self_employment_income_monthly", "type": "number", "required": False},
                    {"name": "rental_income_monthly", "type": "number", "required": False},
                    {"name": "other_income_monthly", "type": "number", "required": False},
                    {"name": "total_gross_monthly", "type": "number", "required": False},
                ]
            },
            "expenses": {
                "fields": [
                    {"name": "rent_or_mortgage", "type": "number", "required": False},
                    {"name": "food_monthly", "type": "number", "required": False},
                    {"name": "utilities_monthly", "type": "number", "required": False},
                    {"name": "transportation_monthly", "type": "number", "required": False},
                    {"name": "health_insurance_premium", "type": "number", "required": False},
                    {"name": "childcare_monthly", "type": "number", "required": False},
                    {"name": "child_education_monthly", "type": "number", "required": False},
                    {"name": "child_support_paid_monthly", "type": "number", "required": False},
                ]
            },
        }
    },
    "DV-100": {
        "description": "Request for Domestic Violence Restraining Order",
        "sections": {
            "protected_person": {
                "fields": [
                    {"name": "name", "type": "string", "required": True},
                    {"name": "address_confidential", "type": "boolean", "required": False},
                    {"name": "phone", "type": "string", "required": False},
                ]
            },
            "restrained_person": {
                "fields": [
                    {"name": "name", "type": "string", "required": True},
                    {"name": "address", "type": "string", "required": False},
                    {"name": "relationship_to_protected", "type": "string", "required": True},
                    {"name": "description", "type": "string", "required": False},
                ]
            },
            "abuse_description": {
                "fields": [
                    {"name": "most_recent_incident_date", "type": "date", "required": True},
                    {"name": "abuse_description", "type": "string", "required": True},
                    {"name": "abuse_types", "type": "array", "required": False},
                    {"name": "children_present", "type": "boolean", "required": False},
                    {"name": "children_harmed", "type": "boolean", "required": False},
                    {"name": "weapons_involved", "type": "boolean", "required": False},
                    {"name": "prior_incidents", "type": "string", "required": False},
                    {"name": "police_reports_filed", "type": "boolean", "required": False},
                ]
            },
            "orders_requested": {
                "fields": [
                    {"name": "personal_conduct_order", "type": "boolean", "required": False},
                    {"name": "stay_away_order", "type": "boolean", "required": False},
                    {"name": "stay_away_distance", "type": "integer", "required": False},
                    {"name": "move_out_order", "type": "boolean", "required": False},
                    {"name": "child_custody_order", "type": "boolean", "required": False},
                    {"name": "child_support_order", "type": "boolean", "required": False},
                ]
            },
        }
    },
    "DV-110": {
        "description": "Temporary Restraining Order (Domestic Violence)",
        "sections": {
            "protected_person": {
                "fields": [
                    {"name": "name", "type": "string", "required": True},
                ]
            },
            "restrained_person": {
                "fields": [
                    {"name": "name", "type": "string", "required": True},
                ]
            },
            "temporary_orders": {
                "fields": [
                    {"name": "personal_conduct_granted", "type": "boolean", "required": False},
                    {"name": "stay_away_granted", "type": "boolean", "required": False},
                    {"name": "stay_away_distance_granted", "type": "integer", "required": False},
                    {"name": "hearing_date", "type": "date", "required": False},
                ]
            },
        }
    },
}


# =============================================================================
# Service Implementation
# =============================================================================

class FormExtractionService:
    """Service for extracting structured form data from intake conversations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

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

Return a JSON object with the extracted data following the schema structure."""

    async def extract_for_form(
        self,
        session: IntakeSession,
        target_form: str
    ) -> Dict[str, Any]:
        """
        Extract structured data for a specific form from the intake conversation.
        Skips gracefully if the form type is not in the schema.
        """
        if target_form not in FORM_SCHEMAS:
            # Gracefully skip unknown forms instead of raising
            return {
                "form_type": target_form,
                "skipped": True,
                "reason": f"Form type '{target_form}' is not in the extraction schema"
            }

        if not session.messages or len(session.messages) < 2:
            return {
                "form_type": target_form,
                "skipped": True,
                "reason": "No conversation to extract from"
            }

        # Prepare conversation text
        conv_text = "\n\n".join([
            f"{'ARIA' if m['role'] == 'assistant' else 'PARENT'}: {m['content']}"
            for m in session.messages
            if m.get("role") in ("assistant", "user")
        ])

        extraction_prompt = self._get_extraction_prompt(target_form)

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": extraction_prompt},
                    {"role": "user", "content": f"CONVERSATION:\n{conv_text}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.0
            )

            raw_text = response.choices[0].message.content
            extracted_data = json.loads(raw_text)

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
                validated_fields=extracted_data,
                confidence_score=confidence,
                missing_fields=missing_fields if missing_fields else None,
                ai_provider="openai",
                model_used="gpt-4o",
                tokens_used=response.usage.total_tokens if hasattr(response, "usage") else None
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
            extraction = IntakeExtraction(
                session_id=session.id,
                target_form=target_form,
                extraction_version=1,
                extraction_errors=[f"JSON parse error: {str(e)}"],
                ai_provider="openai"
            )
            self.db.add(extraction)
            await self.db.commit()

            return {
                "form_type": target_form,
                "error": "Failed to parse extraction",
                "details": str(e)
            }

        except Exception as e:
            print(f"Extraction error for {target_form}: {e}")
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

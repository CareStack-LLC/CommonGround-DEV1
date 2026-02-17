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
from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.intake import IntakeSession, IntakeExtraction
from app.core.config import settings


# =============================================================================
# Form Field Schemas (Keep existing schemas)
# =============================================================================
# ... (Schema definitions remain unchanged, skipping for brevity in replacement)

# Direct replacement of service class implementation
class FormExtractionService:
    """Service for extracting structured form data from intake conversations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        # Keep Anthropic for legacy support if needed, but primary is OpenAI
        # self.anthropic = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _get_extraction_prompt(self, form_type: str) -> str:
        """Generate extraction prompt for specific form type."""
        # Method remains same
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
                tokens_used=response.usage.total_tokens if hasattr(response, 'usage') else None
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

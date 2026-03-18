"""
Court Form PDF Filler Service.

Fills official California Judicial Council court form PDFs (FL-300, FL-311,
FL-320, FL-340) with structured form data from CourtFormSubmission records.

Uses pypdf to fill AcroForm fields in the official PDF templates.
"""

import io
import logging
from pathlib import Path
from typing import Dict, Optional

from pypdf import PdfReader, PdfWriter

logger = logging.getLogger(__name__)

# Path to court form PDF templates
# __file__ = backend/app/services/court_form_pdf_filler.py
# parent.parent.parent = backend/  -> .parent = cg-v1.110.26/
TEMPLATE_DIR = Path(__file__).parent.parent.parent.parent / "docs" / "pdf-court-forms"

# Template file mapping
FORM_TEMPLATES = {
    "fl300": TEMPLATE_DIR / "fl300.pdf",
    "fl311": TEMPLATE_DIR / "fl311-CA-childcustody form.pdf",
    "fl320": TEMPLATE_DIR / "fl320.pdf",
    "fl340": TEMPLATE_DIR / "fl340.pdf",
    "fl341": TEMPLATE_DIR / "fl341.pdf",
    "fl342": TEMPLATE_DIR / "fl342.pdf",
}


class CourtFormPDFFiller:
    """Fills California court form PDFs with structured data."""

    def fill_form(self, form_type: str, form_data: dict) -> bytes:
        """
        Fill a court form PDF template with the provided data.

        Args:
            form_type: Form type (fl300, fl311, fl320, fl340, fl341, fl342)
            form_data: Dictionary of form field values

        Returns:
            Filled PDF as bytes

        Raises:
            ValueError: If form type is not supported or template not found
        """
        form_type_lower = form_type.lower().replace("-", "")
        template_path = FORM_TEMPLATES.get(form_type_lower)

        if not template_path or not template_path.exists():
            raise ValueError(f"Court form template not found for: {form_type}")

        # Map form_data to PDF field names
        field_mapping = self._get_field_mapping(form_type_lower, form_data)

        # Fill the PDF
        reader = PdfReader(str(template_path))
        writer = PdfWriter()
        writer.append(reader)

        # Update form fields
        if field_mapping:
            for page_num in range(len(writer.pages)):
                writer.update_page_form_field_values(
                    writer.pages[page_num],
                    field_mapping,
                    auto_regenerate=False,
                )

        # Ensure field values are visible in all PDF viewers
        from pypdf.generic import BooleanObject
        if "/AcroForm" in writer._root_object:
            writer._root_object["/AcroForm"].update({
                "/NeedAppearances": BooleanObject(True)
            })

        # Write to bytes
        output = io.BytesIO()
        writer.write(output)
        output.seek(0)
        return output.read()

    def _get_field_mapping(self, form_type: str, data: dict) -> Dict[str, str]:
        """
        Map form_data keys to actual PDF field names.

        Each form type has its own field naming convention from the
        California Judicial Council PDF templates.
        """
        if form_type == "fl300":
            return self._map_fl300(data)
        elif form_type == "fl311":
            return self._map_fl311(data)
        elif form_type == "fl320":
            return self._map_fl320(data)
        elif form_type == "fl340":
            return self._map_fl340(data)
        return {}

    def _map_fl300(self, data: dict) -> Dict[str, str]:
        """Map FL-300 form data to PDF field names."""
        m = {}
        prefix = "FL-300[0].Page1[0]"

        # Attorney/Party info
        atty = f"{prefix}.AttyInfo[0]"
        m[f"{atty}.AttyName_ft[0]"] = data.get("party_name", "")
        m[f"{atty}.AttyFirm_ft[0]"] = data.get("firm_name", "")
        m[f"{atty}.AttyStreet_ft[0]"] = data.get("street_address", "")
        m[f"{atty}.AttyCity_ft[0]"] = data.get("city", "")
        m[f"{atty}.AttyState_ft[0]"] = data.get("state", "CA")
        m[f"{atty}.AttyZip_ft[0]"] = data.get("zip_code", "")
        m[f"{atty}.Phone_ft[0]"] = data.get("telephone", "")
        m[f"{atty}.Fax_ft[0]"] = data.get("fax", "")
        m[f"{atty}.Email_ft[0]"] = data.get("email", "")
        m[f"{atty}.AttyFor_ft[0]"] = data.get("attorney_for", "")
        m[f"{atty}.BarNo_ft[0]"] = data.get("state_bar_number", "")

        # Court info
        court = f"{prefix}.CourtInfo[0]"
        m[f"{court}.CrtCounty_ft[0]"] = data.get("court_county", "")
        m[f"{court}.Street_ft[0]"] = data.get("court_street_address", "")
        m[f"{court}.MailingAdd_ft[0]"] = data.get("court_mailing_address", "")
        m[f"{court}.CityZip_ft[0]"] = data.get("court_city_zip", "")
        m[f"{court}.Branch_ft[0]"] = data.get("court_branch_name", "")

        # Case info
        case = f"{prefix}.CaseInfo[0]"
        m[f"{case}.CaseNo_ft[0]"] = data.get("case_number", "")

        # Party names (caption)
        caption = f"{prefix}.Caption[0]"
        m[f"{caption}.Petitioner_ft[0]"] = data.get("petitioner_name", "")
        m[f"{caption}.Respondent_ft[0]"] = data.get("respondent_name", "")

        return {k: v for k, v in m.items() if v}

    def _map_fl311(self, data: dict) -> Dict[str, str]:
        """Map FL-311 form data to PDF field names."""
        m = {}
        prefix = "FL-311[0].Page1[0]"

        # Party names
        parties = f"{prefix}.PxCaption_sf[0].PartySub[0].Parties[0]"
        m[f"{parties}.Petitioner_ft[0]"] = data.get("petitioner_name", "")
        m[f"{parties}.Respondent_ft[0]"] = data.get("respondent_name", "")

        # Case number
        case_num = f"{prefix}.PxCaption_sf[0].CaseSub[0].CaseNumber[0]"
        m[f"{case_num}.CaseNumber_ft[0]"] = data.get("case_number", "")

        # Children info
        children = data.get("children", [])
        for i, child in enumerate(children[:4]):  # FL-311 supports up to 4 children
            child_prefix = f"FL-311[0].Page1[0].List1[0].Child{i+1}[0]"
            m[f"{child_prefix}.Name_ft[0]"] = child.get("name", "")
            m[f"{child_prefix}.Age_ft[0]"] = str(child.get("age", ""))
            m[f"{child_prefix}.DOB_ft[0]"] = child.get("date_of_birth", "")

        return {k: v for k, v in m.items() if v}

    def _map_fl320(self, data: dict) -> Dict[str, str]:
        """Map FL-320 form data to PDF field names."""
        m = {}
        prefix = "FL-320[0].Page1[0].P1Caption_sf[0]"

        # Attorney/Party info
        atty = f"{prefix}.AttyInfo[0]"
        m[f"{atty}.AttyName_ft[0]"] = data.get("party_name", "")
        m[f"{atty}.AttyFirm_ft[0]"] = data.get("firm_name", "")
        m[f"{atty}.AttyStreet_ft[0]"] = data.get("street_address", "")
        m[f"{atty}.AttyCity_ft[0]"] = data.get("city", "")
        m[f"{atty}.AttyState_ft[0]"] = data.get("state", "CA")
        m[f"{atty}.AttyZip_ft[0]"] = data.get("zip_code", "")
        m[f"{atty}.Phone_ft[0]"] = data.get("telephone", "")
        m[f"{atty}.Fax_ft[0]"] = data.get("fax", "")
        m[f"{atty}.Email_ft[0]"] = data.get("email", "")
        m[f"{atty}.AttyFor_ft[0]"] = data.get("attorney_for", "")
        m[f"{atty}.BarNo_ft[0]"] = data.get("state_bar_number", "")

        # Court info
        court = f"{prefix}.CourtInfo[0]"
        m[f"{court}.CrtCounty_ft[0]"] = data.get("court_county", "")
        m[f"{court}.Street_ft[0]"] = data.get("court_street_address", "")
        m[f"{court}.CityZip_ft[0]"] = data.get("court_city_zip", "")

        # Case number
        case_num = f"{prefix}.CaptionSub[0].CaseNumber[0]"
        m[f"{case_num}.CaseNumber_ft[0]"] = data.get("case_number", "")

        return {k: v for k, v in m.items() if v}

    def _map_fl340(self, data: dict) -> Dict[str, str]:
        """Map FL-340 form data to PDF field names."""
        m = {}

        # Attorney/Party info
        atty = "FL-340[0].Page1[0].Subform[0].AttyPartyInfo[0]"
        m[f"{atty}.AttyName_ft[0]"] = data.get("party_name", "")
        m[f"{atty}.AttyFirm_ft[0]"] = data.get("firm_name", "")
        m[f"{atty}.AttyStreet_ft[0]"] = data.get("street_address", "")
        m[f"{atty}.AttyCity_ft[0]"] = data.get("city", "")
        m[f"{atty}.AttyState_ft[0]"] = data.get("state", "CA")
        m[f"{atty}.AttyZip_ft[0]"] = data.get("zip_code", "")
        m[f"{atty}.Phone_ft[0]"] = data.get("telephone", "")
        m[f"{atty}.Fax_ft[0]"] = data.get("fax", "")
        m[f"{atty}.Email_ft[0]"] = data.get("email", "")
        m[f"{atty}.AttyFor_ft[0]"] = data.get("attorney_for", "")
        m[f"{atty}.BarNo_ft[0]"] = data.get("state_bar_number", "")

        return {k: v for k, v in m.items() if v}


# Singleton instance
court_form_pdf_filler = CourtFormPDFFiller()

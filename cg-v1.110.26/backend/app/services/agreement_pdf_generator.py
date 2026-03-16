"""
Agreement PDF Generator — Court-Ready SharedCare Agreement Documents.

Generates professionally branded, court-ready PDF documents for
SharedCare Agreements with digital signature verification sections.

Uses Jinja2 templates + WeasyPrint for HTML-to-PDF conversion,
matching the branding and quality of all other CommonGround reports.
"""

import hashlib
import io
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

logger = logging.getLogger(__name__)

# Template directory (same as other reports)
TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "reports"


class AgreementPDFGenerator:
    """Generates court-ready branded PDF documents for SharedCare Agreements."""

    def __init__(self):
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=select_autoescape(["html", "xml"]),
        )

    @staticmethod
    def _get_parent_name(parent) -> str:
        """Get a parent's display name, handling both User and UserProfile objects."""
        if not parent:
            return "Not available"
        if hasattr(parent, 'full_name'):
            return parent.full_name or "Unknown"
        first = getattr(parent, 'first_name', '') or ''
        last = getattr(parent, 'last_name', '') or ''
        name = f"{first} {last}".strip()
        return name or "Unknown"

    def generate(
        self,
        agreement,
        parent_a=None,
        parent_b=None,
        sections=None,
        format_structured_data=None,
    ) -> bytes:
        """
        Generate a court-ready PDF for a SharedCare Agreement.

        Uses Jinja2 HTML template + WeasyPrint for beautiful branded output
        matching all other CommonGround reports.

        Args:
            agreement: Agreement model instance
            parent_a: User model for parent A (petitioner), or None
            parent_b: User model for parent B (respondent), or None
            sections: List of AgreementSection models
            format_structured_data: Callable to format structured data for PDF

        Returns:
            PDF bytes
        """
        # Pre-process sections: format structured data for display
        processed_sections = []
        for section in (sections or []):
            processed = {
                'section_number': section.section_number,
                'section_title': section.section_title,
                'content': section.content or '',
                'structured_data': section.structured_data,
            }

            # If content is empty but structured_data exists, format it
            if (not processed['content'] or not processed['content'].strip()) and section.structured_data:
                if format_structured_data:
                    processed['content'] = format_structured_data(section.structured_data)
                # Otherwise let the template handle structured_data directly

            processed_sections.append(processed)

        # Build template context
        context = {
            'agreement': agreement,
            'sections': processed_sections,
            'parent_a_name': self._get_parent_name(parent_a),
            'parent_a_email': getattr(parent_a, 'email', None) if parent_a else None,
            'parent_a_phone': getattr(parent_a, 'phone', None) if parent_a else None,
            'parent_b_name': self._get_parent_name(parent_b),
            'parent_b_email': getattr(parent_b, 'email', None) if parent_b else None,
            'parent_b_phone': getattr(parent_b, 'phone', None) if parent_b else None,
            'petitioner_ip': getattr(agreement, 'petitioner_approval_ip', None),
            'petitioner_ua': getattr(agreement, 'petitioner_approval_user_agent', None),
            'respondent_ip': getattr(agreement, 'respondent_approval_ip', None),
            'respondent_ua': getattr(agreement, 'respondent_approval_user_agent', None),
            'generated_at': datetime.utcnow(),
        }

        # Render HTML
        template = self.jinja_env.get_template('reports/agreement_document.html')
        html_content = template.render(**context)

        # Convert to PDF via WeasyPrint
        html = HTML(string=html_content, base_url=str(TEMPLATE_DIR))
        pdf_buffer = io.BytesIO()
        html.write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        pdf_bytes = pdf_buffer.read()

        logger.info(f"Generated agreement PDF: {len(pdf_bytes)} bytes")
        return pdf_bytes

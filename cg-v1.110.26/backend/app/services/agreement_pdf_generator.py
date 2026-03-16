"""
Agreement PDF Generator — Court-Ready SharedCare Agreement Documents.

Generates professionally branded, court-ready PDF documents for
SharedCare Agreements with digital signature verification sections.

Uses ReportLab for reliable server-side PDF generation.
"""

import io
from datetime import datetime
from typing import Optional, List, Any, Dict

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.graphics.shapes import Drawing, Circle, String as RLString, Rect
from reportlab.graphics import renderPDF


# ─── Brand Colors ──────────────────────────────────────────────────────
CG_SAGE = colors.HexColor('#3DAA8A')
CG_SAGE_LIGHT = colors.HexColor('#E8F5F0')
CG_SLATE = colors.HexColor('#2D6A8F')
CG_AMBER = colors.HexColor('#F5A623')
SLATE_900 = colors.HexColor('#0f172a')
SLATE_700 = colors.HexColor('#334155')
SLATE_500 = colors.HexColor('#64748b')
SLATE_400 = colors.HexColor('#94a3b8')
SLATE_200 = colors.HexColor('#e2e8f0')
SLATE_100 = colors.HexColor('#f1f5f9')
WHITE = colors.white

# ─── Page Dimensions ──────────────────────────────────────────────────
PAGE_WIDTH, PAGE_HEIGHT = letter
LEFT_MARGIN = 0.75 * inch
RIGHT_MARGIN = 0.75 * inch
TOP_MARGIN = 1.0 * inch  # Extra space for header
BOTTOM_MARGIN = 0.85 * inch  # Extra space for footer
CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN

# Production domain for legal page links
PRODUCTION_DOMAIN = "https://www.find-commonground.com"


class AgreementPDFGenerator:
    """Generates court-ready branded PDF documents for SharedCare Agreements."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        self._agreement_title = ""
        self._agreement_number = ""
        self._page_count = 0

    # ─── Custom Styles ─────────────────────────────────────────────────

    def _setup_custom_styles(self):
        """Define branded paragraph styles."""

        self.styles.add(ParagraphStyle(
            name='BrandWordmark',
            parent=self.styles['Normal'],
            fontSize=11,
            fontName='Helvetica-Bold',
            textColor=CG_SAGE,
            spaceAfter=4,
            alignment=TA_LEFT,
            leading=14,
        ))

        self.styles.add(ParagraphStyle(
            name='DocTitle',
            parent=self.styles['Heading1'],
            fontSize=22,
            fontName='Helvetica-Bold',
            textColor=SLATE_900,
            alignment=TA_CENTER,
            spaceAfter=8,
            spaceBefore=12,
            leading=28,
        ))

        self.styles.add(ParagraphStyle(
            name='DocSubtitle',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=SLATE_500,
            alignment=TA_CENTER,
            spaceAfter=20,
        ))

        self.styles.add(ParagraphStyle(
            name='SectionHead',
            parent=self.styles['Heading2'],
            fontSize=14,
            fontName='Helvetica-Bold',
            textColor=CG_SAGE,
            spaceBefore=24,
            spaceAfter=10,
            leading=18,
            borderPadding=(0, 0, 4, 0),
        ))

        self.styles.add(ParagraphStyle(
            name='SectionBody',
            parent=self.styles['Normal'],
            fontSize=11,
            fontName='Helvetica',
            textColor=SLATE_700,
            alignment=TA_JUSTIFY,
            spaceAfter=10,
            leading=16,
        ))

        self.styles.add(ParagraphStyle(
            name='MetaLabel',
            parent=self.styles['Normal'],
            fontSize=9,
            fontName='Helvetica',
            textColor=SLATE_500,
        ))

        self.styles.add(ParagraphStyle(
            name='MetaValue',
            parent=self.styles['Normal'],
            fontSize=11,
            fontName='Helvetica-Bold',
            textColor=SLATE_900,
        ))

        self.styles.add(ParagraphStyle(
            name='PartyName',
            parent=self.styles['Normal'],
            fontSize=13,
            fontName='Helvetica-Bold',
            textColor=SLATE_900,
            spaceAfter=4,
        ))

        self.styles.add(ParagraphStyle(
            name='PartyDetail',
            parent=self.styles['Normal'],
            fontSize=10,
            fontName='Helvetica',
            textColor=SLATE_700,
            spaceAfter=2,
            leading=14,
        ))

        self.styles.add(ParagraphStyle(
            name='SignatureHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            fontName='Helvetica-Bold',
            textColor=SLATE_900,
            alignment=TA_CENTER,
            spaceAfter=20,
            spaceBefore=10,
        ))

        self.styles.add(ParagraphStyle(
            name='SignatureLabel',
            parent=self.styles['Normal'],
            fontSize=9,
            fontName='Helvetica',
            textColor=SLATE_500,
            spaceAfter=2,
        ))

        self.styles.add(ParagraphStyle(
            name='SignatureValue',
            parent=self.styles['Normal'],
            fontSize=10,
            fontName='Helvetica-Bold',
            textColor=SLATE_900,
            spaceAfter=6,
        ))

        self.styles.add(ParagraphStyle(
            name='LegalDisclaimer',
            parent=self.styles['Normal'],
            fontSize=8,
            fontName='Helvetica',
            textColor=SLATE_400,
            alignment=TA_CENTER,
            leading=11,
            spaceAfter=4,
        ))

        self.styles.add(ParagraphStyle(
            name='HashValue',
            parent=self.styles['Normal'],
            fontSize=8,
            fontName='Courier',
            textColor=SLATE_500,
            alignment=TA_CENTER,
            spaceAfter=8,
        ))

        self.styles.add(ParagraphStyle(
            name='VerificationStatement',
            parent=self.styles['Normal'],
            fontSize=9,
            fontName='Helvetica',
            textColor=SLATE_700,
            alignment=TA_CENTER,
            leading=13,
            spaceAfter=16,
        ))

    # ─── Header / Footer Callbacks ─────────────────────────────────────

    def _draw_header(self, canvas, doc):
        """Draw header on every page."""
        canvas.saveState()

        # Sage line at top
        canvas.setStrokeColor(CG_SAGE)
        canvas.setLineWidth(2)
        canvas.line(LEFT_MARGIN, PAGE_HEIGHT - 0.55 * inch,
                    PAGE_WIDTH - RIGHT_MARGIN, PAGE_HEIGHT - 0.55 * inch)

        # Left: agreement title (truncated)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(SLATE_500)
        title_text = self._agreement_title[:50]
        if self._agreement_number:
            title_text += f"  |  {self._agreement_number}"
        canvas.drawString(LEFT_MARGIN, PAGE_HEIGHT - 0.48 * inch, title_text)

        # Right: CONFIDENTIAL
        canvas.setFont('Helvetica-Bold', 8)
        canvas.setFillColor(CG_SAGE)
        canvas.drawRightString(PAGE_WIDTH - RIGHT_MARGIN,
                               PAGE_HEIGHT - 0.48 * inch, "CONFIDENTIAL")

        canvas.restoreState()

    def _draw_footer(self, canvas, doc):
        """Draw footer on every page."""
        canvas.saveState()

        y = 0.5 * inch

        # Sage line
        canvas.setStrokeColor(SLATE_200)
        canvas.setLineWidth(0.5)
        canvas.line(LEFT_MARGIN, y + 8, PAGE_WIDTH - RIGHT_MARGIN, y + 8)

        # Left: CommonGround
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(CG_SAGE)
        canvas.drawString(LEFT_MARGIN, y - 4, "CommonGround")

        # Center: Page X of Y
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(SLATE_500)
        page_text = f"Page {doc.page}"
        canvas.drawCentredString(PAGE_WIDTH / 2, y - 4, page_text)

        # Right: Date
        canvas.setFillColor(SLATE_500)
        canvas.drawRightString(PAGE_WIDTH - RIGHT_MARGIN, y - 4,
                               datetime.utcnow().strftime('%B %d, %Y'))

        canvas.restoreState()

    def _on_page(self, canvas, doc):
        """Combined header + footer callback."""
        self._draw_header(canvas, doc)
        self._draw_footer(canvas, doc)

    def _on_first_page(self, canvas, doc):
        """First page — skip header (cover has its own), draw footer."""
        self._draw_footer(canvas, doc)

    # ─── Logo Drawing ──────────────────────────────────────────────────

    def _build_logo_drawing(self) -> Drawing:
        """Create a programmatic CG logo — green circle with 'CG' text."""
        d = Drawing(50, 50)
        d.add(Circle(25, 25, 22, fillColor=CG_SAGE, strokeColor=None))
        d.add(RLString(
            25, 18,
            "CG",
            fontSize=18,
            fontName='Helvetica-Bold',
            fillColor=WHITE,
            textAnchor='middle',
        ))
        return d

    # ─── Main Generate Method ──────────────────────────────────────────

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

        Args:
            agreement: Agreement model instance
            parent_a: User model for parent A (petitioner), or None
            parent_b: User model for parent B (respondent), or None
            sections: List of AgreementSection models
            format_structured_data: Callable to format structured data for PDF

        Returns:
            PDF bytes
        """
        self._agreement_title = agreement.title or "SharedCare Agreement"
        self._agreement_number = agreement.agreement_number or ""

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=LEFT_MARGIN,
            rightMargin=RIGHT_MARGIN,
            topMargin=TOP_MARGIN,
            bottomMargin=BOTTOM_MARGIN,
            title=self._agreement_title,
            author="CommonGround",
        )

        story = []

        # 1. Cover / Header
        story.extend(self._build_cover(agreement))

        # 2. Parties
        story.extend(self._build_parties_section(agreement, parent_a, parent_b))

        # 3. Agreement Sections
        story.extend(self._build_agreement_body(
            sections or [], format_structured_data
        ))

        # 4. Digital Signature Verification
        story.append(PageBreak())
        story.extend(self._build_signature_verification(agreement, parent_a, parent_b))

        # 5. Legal Disclaimer
        story.extend(self._build_legal_disclaimer())

        # Build PDF with page callbacks
        doc.build(
            story,
            onFirstPage=self._on_first_page,
            onLaterPages=self._on_page,
        )

        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    # ─── Section Builders ──────────────────────────────────────────────

    def _build_cover(self, agreement) -> list:
        """Build cover / header area on page 1."""
        elements = []

        # Logo
        logo = self._build_logo_drawing()
        elements.append(logo)
        elements.append(Spacer(1, 6))

        # Wordmark
        elements.append(Paragraph("COMMONGROUND", self.styles['BrandWordmark']))

        # Sage divider
        elements.append(HRFlowable(
            width="100%", thickness=2, color=CG_SAGE,
            spaceBefore=8, spaceAfter=16
        ))

        # Title
        elements.append(Paragraph(
            agreement.title or "SHAREDCARE AGREEMENT",
            self.styles['DocTitle']
        ))

        # Subtitle with agreement number
        subtitle_parts = []
        if agreement.agreement_number:
            subtitle_parts.append(agreement.agreement_number)
        if agreement.status:
            subtitle_parts.append(f"Status: {agreement.status.upper()}")
        if subtitle_parts:
            elements.append(Paragraph(
                " &nbsp;&nbsp;|&nbsp;&nbsp; ".join(subtitle_parts),
                self.styles['DocSubtitle']
            ))

        elements.append(Spacer(1, 12))

        # Metadata table
        meta_rows = []
        if agreement.agreement_number:
            meta_rows.append(["Agreement Number", agreement.agreement_number])
        meta_rows.append(["Version", str(agreement.version)])
        meta_rows.append(["Status", agreement.status.replace('_', ' ').title()])
        if agreement.created_at:
            meta_rows.append(["Created", agreement.created_at.strftime('%B %d, %Y')])
        if agreement.effective_date:
            meta_rows.append(["Effective Date", agreement.effective_date.strftime('%B %d, %Y')])
        if agreement.expiration_date:
            meta_rows.append(["Expiration Date", agreement.expiration_date.strftime('%B %d, %Y')])
        if agreement.court_ordered:
            meta_rows.append(["Court Order #", agreement.court_order_number or "N/A"])
            if agreement.court_order_date:
                meta_rows.append(["Court Order Date", agreement.court_order_date.strftime('%B %d, %Y')])

        if meta_rows:
            # Format as 2-column table
            formatted_rows = []
            for label, value in meta_rows:
                formatted_rows.append([
                    Paragraph(f"<b>{label}</b>", self.styles['MetaLabel']),
                    Paragraph(value, self.styles['MetaValue']),
                ])

            meta_table = Table(
                formatted_rows,
                colWidths=[2.0 * inch, 4.0 * inch],
                hAlign='LEFT',
            )
            meta_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (0, -1), 0),
                ('LINEBELOW', (0, 0), (-1, -2), 0.5, SLATE_200),
            ]))
            elements.append(meta_table)

        elements.append(Spacer(1, 20))
        return elements

    def _build_parties_section(self, agreement, parent_a, parent_b) -> list:
        """Build the parties (parents) information section."""
        elements = []

        elements.append(Paragraph("PARTIES TO THIS AGREEMENT", self.styles['SectionHead']))
        elements.append(HRFlowable(
            width="100%", thickness=1, color=CG_SAGE,
            spaceBefore=0, spaceAfter=12
        ))

        # Build party columns
        col_a = self._build_party_column(parent_a, "Petitioner (Parent A)")
        col_b = self._build_party_column(parent_b, "Respondent (Parent B)")

        party_table = Table(
            [[col_a, col_b]],
            colWidths=[CONTENT_WIDTH / 2 - 6, CONTENT_WIDTH / 2 - 6],
            hAlign='LEFT',
        )
        party_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, -1), SLATE_100),
            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
            ('BOX', (0, 0), (-1, -1), 0.5, SLATE_200),
            ('LINEBEFORE', (1, 0), (1, 0), 0.5, SLATE_200),
        ]))
        elements.append(party_table)
        elements.append(Spacer(1, 16))

        return elements

    def _build_party_column(self, parent, role_label: str):
        """Build a single party info block for the parties table."""
        parts = []
        parts.append(Paragraph(
            f'<font color="#{CG_SAGE.hexval()[2:]}">{role_label}</font>',
            self.styles['MetaLabel']
        ))

        if parent:
            parts.append(Paragraph(parent.full_name, self.styles['PartyName']))
            parts.append(Paragraph(f"Email: {parent.email}", self.styles['PartyDetail']))
            if parent.phone:
                parts.append(Paragraph(f"Phone: {parent.phone}", self.styles['PartyDetail']))
        else:
            parts.append(Paragraph("<i>Parent information not available</i>", self.styles['PartyDetail']))

        # Stack vertically in a single cell
        inner_table = Table([[p] for p in parts], colWidths=[CONTENT_WIDTH / 2 - 22])
        inner_table.setStyle(TableStyle([
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        return inner_table

    def _build_agreement_body(self, sections, format_structured_data=None) -> list:
        """Build the main agreement content sections."""
        elements = []

        if not sections:
            elements.append(Paragraph(
                "<i>No agreement sections have been completed yet.</i>",
                self.styles['SectionBody']
            ))
            return elements

        for section in sections:
            # Section header with number
            header_text = f"{section.section_number}. {section.section_title}"
            elements.append(Paragraph(header_text, self.styles['SectionHead']))
            elements.append(HRFlowable(
                width="100%", thickness=0.5, color=CG_SAGE,
                spaceBefore=0, spaceAfter=8
            ))

            # Content — handle v1 (content) and v2 (structured_data)
            content = section.content
            if not content or content.strip() == '':
                if section.structured_data and format_structured_data:
                    content = format_structured_data(section.structured_data)
                elif section.structured_data:
                    content = self._fallback_format_structured_data(section.structured_data)
                else:
                    content = "<i>No content provided for this section.</i>"

            # Clean content for reportlab (handle HTML-like tags)
            elements.append(Paragraph(content, self.styles['SectionBody']))
            elements.append(Spacer(1, 8))

        return elements

    def _fallback_format_structured_data(self, data: dict) -> str:
        """Simple fallback formatter for structured data."""
        if not data:
            return "<i>No content provided</i>"
        lines = []
        for key, value in data.items():
            if value is None or value == '':
                continue
            label = key.replace('_', ' ').title()
            if isinstance(value, bool):
                display = 'Yes' if value else 'No'
            else:
                display = str(value)
            lines.append(f"<b>{label}:</b> {display}")
        return '<br/>'.join(lines) if lines else "<i>No content provided</i>"

    def _build_signature_verification(self, agreement, parent_a, parent_b) -> list:
        """Build the digital signature verification section."""
        elements = []

        elements.append(Paragraph(
            "DIGITAL SIGNATURE VERIFICATION",
            self.styles['SignatureHeader']
        ))

        elements.append(Paragraph(
            "This document was digitally agreed to by both parties through the CommonGround platform. "
            "The information below verifies the identity and consent of each signatory.",
            self.styles['VerificationStatement']
        ))

        elements.append(Spacer(1, 8))

        # Petitioner signature block
        elements.extend(self._build_signature_block(
            role="Petitioner (Parent A)",
            parent=parent_a,
            approved=agreement.petitioner_approved,
            approved_at=agreement.petitioner_approved_at,
            ip_address=getattr(agreement, 'petitioner_approval_ip', None),
            user_agent=getattr(agreement, 'petitioner_approval_user_agent', None),
        ))

        elements.append(Spacer(1, 16))

        # Respondent signature block
        elements.extend(self._build_signature_block(
            role="Respondent (Parent B)",
            parent=parent_b,
            approved=agreement.respondent_approved,
            approved_at=agreement.respondent_approved_at,
            ip_address=getattr(agreement, 'respondent_approval_ip', None),
            user_agent=getattr(agreement, 'respondent_approval_user_agent', None),
        ))

        elements.append(Spacer(1, 24))

        # Document hash
        if agreement.pdf_hash:
            elements.append(Paragraph(
                "DOCUMENT INTEGRITY HASH (SHA-256)",
                self.styles['SignatureLabel']
            ))
            elements.append(Paragraph(
                agreement.pdf_hash,
                self.styles['HashValue']
            ))
            elements.append(Spacer(1, 8))
            elements.append(Paragraph(
                "This hash uniquely identifies the agreement content at the time of submission. "
                "Any modification to the agreement will produce a different hash value.",
                self.styles['VerificationStatement']
            ))

        return elements

    def _build_signature_block(
        self, role: str, parent, approved: bool,
        approved_at: Optional[datetime],
        ip_address: Optional[str],
        user_agent: Optional[str],
    ) -> list:
        """Build a single parent's signature verification block."""
        elements = []

        # Outer box
        rows = []

        # Role header
        rows.append([
            Paragraph(f'<b>{role}</b>', self.styles['MetaValue']),
            '',
        ])

        # Name
        name = parent.full_name if parent else "Not available"
        rows.append([
            Paragraph("Full Name", self.styles['SignatureLabel']),
            Paragraph(name, self.styles['SignatureValue']),
        ])

        # Email
        email = parent.email if parent else "Not available"
        rows.append([
            Paragraph("Email", self.styles['SignatureLabel']),
            Paragraph(email, self.styles['SignatureValue']),
        ])

        # Approval status
        if approved and approved_at:
            status_text = f'<font color="#{CG_SAGE.hexval()[2:]}">APPROVED</font>'
            date_text = approved_at.strftime('%B %d, %Y at %I:%M %p UTC')
        elif approved:
            status_text = f'<font color="#{CG_SAGE.hexval()[2:]}">APPROVED</font>'
            date_text = "Date not recorded"
        else:
            status_text = '<font color="#94a3b8">PENDING</font>'
            date_text = "Awaiting approval"

        rows.append([
            Paragraph("Status", self.styles['SignatureLabel']),
            Paragraph(status_text, self.styles['SignatureValue']),
        ])
        rows.append([
            Paragraph("Approval Date/Time", self.styles['SignatureLabel']),
            Paragraph(date_text, self.styles['SignatureValue']),
        ])

        # IP Address
        if ip_address:
            rows.append([
                Paragraph("IP Address", self.styles['SignatureLabel']),
                Paragraph(ip_address, self.styles['SignatureValue']),
            ])

        # User Agent (truncated for readability)
        if user_agent and user_agent != "Unknown":
            ua_display = user_agent[:100] + ("..." if len(user_agent) > 100 else "")
            rows.append([
                Paragraph("Device Info", self.styles['SignatureLabel']),
                Paragraph(
                    f'<font size="8">{ua_display}</font>',
                    self.styles['SignatureValue']
                ),
            ])

        sig_table = Table(
            rows,
            colWidths=[1.5 * inch, CONTENT_WIDTH - 1.5 * inch - 16],
            hAlign='LEFT',
        )
        sig_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('SPAN', (0, 0), (1, 0)),  # Role header spans both columns
            ('BACKGROUND', (0, 0), (-1, 0), SLATE_100),
            ('LINEBELOW', (0, 0), (-1, 0), 1, CG_SAGE),
            ('LINEBELOW', (0, 1), (-1, -2), 0.5, SLATE_200),
            ('BOX', (0, 0), (-1, -1), 0.5, SLATE_200),
        ]))
        elements.append(sig_table)

        return elements

    def _build_legal_disclaimer(self) -> list:
        """Build the legal disclaimer section at the end."""
        elements = []

        elements.append(Spacer(1, 24))
        elements.append(HRFlowable(
            width="60%", thickness=0.5, color=SLATE_200,
            spaceBefore=0, spaceAfter=16
        ))

        elements.append(Paragraph(
            "LEGAL DISCLAIMER",
            ParagraphStyle(
                'DisclaimerTitle',
                parent=self.styles['Normal'],
                fontSize=9,
                fontName='Helvetica-Bold',
                textColor=SLATE_500,
                alignment=TA_CENTER,
                spaceAfter=8,
            )
        ))

        elements.append(Paragraph(
            "This SharedCare Agreement was created using the CommonGround co-parenting platform. "
            "This document is not a court order and does not constitute legal advice. "
            "Both parties voluntarily agreed to its terms through the CommonGround digital approval process. "
            "This agreement may be submitted to a court of competent jurisdiction for incorporation into a court order. "
            "CommonGround recommends that each party consult with their own legal counsel before relying on this agreement.",
            self.styles['LegalDisclaimer']
        ))

        elements.append(Spacer(1, 8))

        elements.append(Paragraph(
            f'Terms of Service: {PRODUCTION_DOMAIN}/legal/terms',
            self.styles['LegalDisclaimer']
        ))
        elements.append(Paragraph(
            f'Privacy Policy: {PRODUCTION_DOMAIN}/legal/privacy',
            self.styles['LegalDisclaimer']
        ))

        elements.append(Spacer(1, 12))

        elements.append(Paragraph(
            f'{PRODUCTION_DOMAIN}',
            ParagraphStyle(
                'BrandFooter',
                parent=self.styles['Normal'],
                fontSize=9,
                fontName='Helvetica-Bold',
                textColor=CG_SAGE,
                alignment=TA_CENTER,
            )
        ))

        return elements

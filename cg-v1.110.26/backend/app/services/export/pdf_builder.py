"""
ExportPDFBuilder for generating court-ready PDF documents.

Uses ReportLab to create professional multi-page PDFs with:
- Cover page with case info and disclaimers
- Table of contents with page numbers
- Section content with tables and charts
- Verification page with hashes
- Consistent headers/footers with watermark
"""

import io
import base64
from io import BytesIO
import hashlib
from datetime import datetime
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, Image, KeepTogether
)
from reportlab.pdfgen import canvas
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt

from app.services.export.generators.base import SectionContent


class ExportPDFBuilder:
    """
    Builds PDF export documents for CaseExport packages.

    Usage:
        builder = ExportPDFBuilder(
            case_name="Smith v. Smith",
            export_number="EXP-20251231-0001",
            generated_by="John Smith",
            package_type="court"
        )
        pdf_bytes = builder.build(sections)
    """

    # Colors
    HEADER_COLOR = colors.HexColor("#1e40af")  # Blue-800
    SUBHEADER_COLOR = colors.HexColor("#3b82f6")  # Blue-500
    ACCENT_COLOR = colors.HexColor("#10b981")  # Green-500
    TEXT_COLOR = colors.HexColor("#374151")  # Gray-700
    MUTED_COLOR = colors.HexColor("#6b7280")  # Gray-500
    BORDER_COLOR = colors.HexColor("#e5e7eb")  # Gray-200

    def __init__(
        self,
        case_name: str,
        export_number: str,
        generated_by: str,
        package_type: str,
        date_start: str,
        date_end: str,
        claim_type: Optional[str] = None,
        claim_description: Optional[str] = None,
        watermark_text: Optional[str] = None,
    ):
        self.case_name = case_name
        self.export_number = export_number
        self.generated_by = generated_by
        self.package_type = package_type
        self.date_start = date_start
        self.date_end = date_end
        self.claim_type = claim_type
        self.claim_description = claim_description
        self.watermark_text = watermark_text or f"CommonGround Export: {export_number}"

        self._styles = self._create_styles()
        self._page_count = 0
        self._toc_entries = []

    def _create_styles(self):
        """Create custom paragraph styles."""
        styles = getSampleStyleSheet()

        styles.add(ParagraphStyle(
            name='CGTitle',
            parent=styles['Title'],
            fontSize=24,
            textColor=self.HEADER_COLOR,
            spaceAfter=20,
        ))

        styles.add(ParagraphStyle(
            name='CGHeading1',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=self.HEADER_COLOR,
            spaceBefore=20,
            spaceAfter=12,
        ))

        styles.add(ParagraphStyle(
            name='CGHeading2',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=self.SUBHEADER_COLOR,
            spaceBefore=15,
            spaceAfter=8,
        ))

        styles.add(ParagraphStyle(
            name='CGBody',
            parent=styles['Normal'],
            fontSize=11,
            textColor=self.TEXT_COLOR,
            spaceAfter=8,
        ))

        styles.add(ParagraphStyle(
            name='CGSmall',
            parent=styles['Normal'],
            fontSize=9,
            textColor=self.MUTED_COLOR,
        ))

        styles.add(ParagraphStyle(
            name='CGDisclaimer',
            parent=styles['Normal'],
            fontSize=10,
            textColor=self.MUTED_COLOR,
            spaceBefore=10,
            spaceAfter=10,
            borderWidth=1,
            borderColor=self.BORDER_COLOR,
            borderPadding=10,
        ))

        return styles

    def build(self, sections: list[SectionContent]) -> bytes:
        """
        Build the complete PDF document.

        Args:
            sections: List of generated section contents

        Returns:
            PDF bytes
        """
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=1 * inch,
            bottomMargin=0.75 * inch,
        )

        # Build story (content)
        story = []

        # Cover page
        story.extend(self._build_cover_page())
        story.append(PageBreak())

        # Table of contents placeholder
        toc_index = len(story)
        story.extend(self._build_toc_placeholder(sections))
        story.append(PageBreak())

        # Section content
        for section in sections:
            section_content = self._build_section(section)
            story.extend(section_content)
            story.append(PageBreak())

        # Verification page
        story.extend(self._build_verification_page(sections))

        # Build document with custom canvas
        doc.build(
            story,
            onFirstPage=self._add_header_footer,
            onLaterPages=self._add_header_footer,
        )

        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    def _build_cover_page(self) -> list:
        """Build the cover page content."""
        story = []

        # Logo/Title
        story.append(Spacer(1, 1 * inch))
        story.append(Paragraph("CommonGround", self._styles['CGTitle']))
        story.append(Paragraph("Case Export Package", self._styles['CGHeading2']))
        story.append(Spacer(1, 0.5 * inch))

        # Package type badge
        package_label = "COURT FILING PACKAGE" if self.package_type == "court" else "INVESTIGATION PACKAGE"
        story.append(Paragraph(f"<b>{package_label}</b>", self._styles['CGHeading1']))
        story.append(Spacer(1, 0.3 * inch))

        # Case info table
        case_data = [
            ["Case Name:", self.case_name],
            ["Export Number:", self.export_number],
            ["Generated By:", self.generated_by],
            ["Date Range:", f"{self.date_start} to {self.date_end}"],
            ["Generated:", datetime.utcnow().strftime("%B %d, %Y at %I:%M %p UTC")],
        ]

        if self.claim_type:
            case_data.append(["Claim Type:", self.claim_type.replace("_", " ").title()])

        case_table = Table(case_data, colWidths=[2 * inch, 4 * inch])
        case_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.TEXT_COLOR),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(case_table)
        story.append(Spacer(1, 0.5 * inch))

        # Claim description if present
        if self.claim_description:
            story.append(Paragraph("Claim Description:", self._styles['CGHeading2']))
            story.append(Paragraph(self.claim_description, self._styles['CGBody']))
            story.append(Spacer(1, 0.3 * inch))

        # Disclaimer
        disclaimer = """
        <b>IMPORTANT NOTICE:</b><br/><br/>
        This document was generated by CommonGround, a co-parenting management platform.
        The information contained herein represents data recorded within the CommonGround system
        during the specified date range.<br/><br/>
        <b>This document does not:</b>
        <br/>• Determine fault or assign blame to either party
        <br/>• Constitute legal advice or a legal finding
        <br/>• Replace professional evaluation or court proceedings
        <br/><br/>
        <b>This document does:</b>
        <br/>• Present objective data as recorded in the system
        <br/>• Include cryptographic verification for authenticity
        <br/>• Provide a neutral summary for professional review
        <br/><br/>
        All data is presented as-is from system records. PII may be redacted per export settings.
        Verify authenticity at <b>verify.commonground.family</b> using the export number.
        """
        story.append(Paragraph(disclaimer, self._styles['CGDisclaimer']))

        return story

    def _build_toc_placeholder(self, sections: list[SectionContent]) -> list:
        """Build table of contents."""
        story = []

        story.append(Paragraph("Table of Contents", self._styles['CGHeading1']))
        story.append(Spacer(1, 0.2 * inch))

        toc_data = [["Section", "Page"]]
        toc_data.append(["Cover Page", "1"])
        toc_data.append(["Table of Contents", "2"])

        page = 3
        for section in sections:
            toc_data.append([section.section_title, str(page)])
            page += 1  # Approximate - each section gets at least one page

        toc_data.append(["Verification & Integrity", str(page)])

        toc_table = Table(toc_data, colWidths=[5 * inch, 1 * inch])
        toc_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.TEXT_COLOR),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW', (0, 0), (-1, 0), 1, self.BORDER_COLOR),
        ]))
        story.append(toc_table)

        return story

    def _build_section(self, section: SectionContent) -> list:
        """Build a section's content."""
        story = []

        # Section header
        story.append(Paragraph(
            f"Section {section.section_order}: {section.section_title}",
            self._styles['CGHeading1']
        ))
        story.append(Spacer(1, 0.1 * inch))

        # Section metadata
        meta_text = f"Evidence Count: {section.evidence_count} | "
        meta_text += f"Data Sources: {', '.join(section.data_sources)}"
        if section.generation_time_ms:
            meta_text += f" | Generated in {section.generation_time_ms}ms"
        story.append(Paragraph(meta_text, self._styles['CGSmall']))
        story.append(Spacer(1, 0.2 * inch))

        # Section content based on type
        content_elements = self._render_section_content(section)
        story.extend(content_elements)

        return story

    def _render_section_content(self, section: SectionContent) -> list:
        """Render section content based on its type."""
        story = []
        data = section.content_data

        if "error" in data:
            story.append(Paragraph(f"Error: {data['error']}", self._styles['CGBody']))
            return story

        # Route to section-specific renderer
        renderers = {
            "agreement_overview": self._render_agreement_overview,
            "compliance_summary": self._render_compliance_summary,
            "parenting_time": self._render_parenting_time,
            "financial_compliance": self._render_financial_compliance,
            "communication_compliance": self._render_communication_compliance,
            "intervention_log": self._render_intervention_log,
            "parent_impact": self._render_parent_impact,
            "chain_of_custody": self._render_chain_of_custody,
            "exchange_gps_verification": self._render_exchange_gps_verification,
        }

        renderer = renderers.get(section.section_type)
        if renderer:
            story.extend(renderer(data))
        else:
            # Fallback to generic rendering
            story.extend(self._render_dict(data, level=0))

        return story

    def _render_agreement_overview(self, data: dict) -> list:
        """Render Agreement Overview section."""
        story = []

        # Case Information
        if data.get("case_info"):
            info = data["case_info"]
            story.append(Paragraph("Case Information", self._styles['CGHeading2']))
            case_table = Table([
                ["Case Name:", info.get("case_name", "N/A")],
                ["State:", info.get("state", "N/A")],
                ["Status:", info.get("status", "N/A").title()],
            ], colWidths=[2 * inch, 4 * inch])
            case_table.setStyle(self._basic_table_style())
            story.append(case_table)
            story.append(Spacer(1, 0.2 * inch))

        # Petitioner & Respondent (Named Parties)
        if data.get("petitioner") or data.get("respondent"):
            story.append(Paragraph("Parties", self._styles['CGHeading2']))
            if data.get("petitioner"):
                p = data["petitioner"]
                story.append(Paragraph(f"<b>Petitioner:</b> {p.get('name', 'N/A')}", self._styles['CGBody']))
            if data.get("respondent"):
                r = data["respondent"]
                story.append(Paragraph(f"<b>Respondent:</b> {r.get('name', 'N/A')}", self._styles['CGBody']))
            story.append(Spacer(1, 0.2 * inch))

        # Children
        if data.get("children"):
            story.append(Paragraph("Children", self._styles['CGHeading2']))
            for child in data["children"]:
                name = child.get("name", "Name Redacted")
                age = child.get("age", "")
                age_str = f" (Age {age})" if age else ""
                story.append(Paragraph(f"• {name}{age_str}", self._styles['CGBody']))
            story.append(Spacer(1, 0.2 * inch))

        # Custody Summary - Donut Chart
        if data.get("custody_summary"):
            cs = data["custody_summary"]
            story.append(Paragraph("Custody Time Summary", self._styles['CGHeading2']))
            
            pet_name = data.get("petitioner", {}).get("name", "Petitioner")
            res_name = data.get("respondent", {}).get("name", "Respondent")
            pet_pct = cs.get("petitioner_pct", 0)
            res_pct = cs.get("respondent_pct", 0)
            expected_split = data.get("agreement", {}).get("key_terms", {}).get("custody_split", "N/A")
            
            # Generate donut chart
            chart_img = self._create_custody_donut_chart(
                pet_name, res_name, pet_pct, res_pct, expected_split
            )
            if chart_img:
                story.append(Image(chart_img, width=3.5*inch, height=2.5*inch))
            
            # Add stats underneath
            story.append(Paragraph(
                f"<b>Actual:</b> {pet_name}: {pet_pct}% ({cs.get('petitioner_days', 0)} days) | "
                f"{res_name}: {res_pct}% ({cs.get('respondent_days', 0)} days)",
                self._styles['CGBody']
            ))
            story.append(Paragraph(
                f"<b>Expected (per Agreement):</b> {expected_split}",
                self._styles['CGBody']
            ))
            story.append(Spacer(1, 0.2 * inch))

        # Agreement Status
        if data.get("agreement"):
            story.append(Paragraph("Agreement Details", self._styles['CGHeading2']))
            agmt = data["agreement"]
            
            # Title & Status
            title = agmt.get("title", "Agreement")
            status = agmt.get("status", "Unknown").replace("_", " ").title()
            story.append(Paragraph(f"<b>{title}</b>", self._styles['CGBody']))
            story.append(Paragraph(f"<b>Status:</b> {status}", self._styles['CGBody']))

            # Summary (if available)
            if agmt.get("summary"):
                story.append(Spacer(1, 0.1 * inch))
                story.append(Paragraph("<b>Summary:</b>", self._styles['CGBody']))
                story.append(Paragraph(f"<i>{agmt['summary']}</i>", self._styles['CGBody']))
                story.append(Spacer(1, 0.1 * inch))

            # Key Terms (Custody Split, Child Support, Cost Split)
            key_terms = agmt.get("key_terms", {})
            if key_terms:
                terms_list = []
                if key_terms.get("custody_split"):
                    terms_list.append(f"<b>Custody Split:</b> {key_terms['custody_split']}")
                if key_terms.get("child_support"):
                    terms_list.append(f"<b>Child Support:</b> {key_terms['child_support']}")
                if key_terms.get("cost_split"):
                    terms_list.append(f"<b>Expense Split:</b> {key_terms['cost_split']}")
                
                if terms_list:
                    story.append(Paragraph("<b>Key Terms:</b>", self._styles['CGBody']))
                    for term in terms_list:
                        story.append(Paragraph(f"• {term}", self._styles['CGBody']))
                    story.append(Spacer(1, 0.1 * inch))

            # Dates Table
            date_data = []
            if agmt.get("effective_date"):
                date_data.append(["Date Active:", agmt['effective_date']])
            if agmt.get("petitioner_approved_at"):
                date_data.append(["Petitioner Approved:", agmt['petitioner_approved_at']])
            if agmt.get("respondent_approved_at"):
                date_data.append(["Respondent Approved:", agmt['respondent_approved_at']])
            
            if date_data:
                # Add Spacer before dates
                story.append(Spacer(1, 0.1 * inch))
                t = Table(date_data, colWidths=[2.5*inch, 3*inch])
                t.setStyle(self._basic_table_style())
                story.append(t)

        return story

    def _render_compliance_summary(self, data: dict) -> list:
        """Render Compliance Summary section - the 'power page'."""
        story = []

        # Report period and Agreement
        if data.get("report_period"):
            period = data["report_period"]
            story.append(Paragraph(
                f"<b>Report Period:</b> {period.get('start', '')} to {period.get('end', '')}",
                self._styles['CGBody']
            ))
        
        if data.get("agreement_summary"):
            story.append(Paragraph(
                f"<b>Agreement:</b> {data['agreement_summary']}",
                self._styles['CGBody']
            ))
        story.append(Spacer(1, 0.2 * inch))

        # Summary statement
        if data.get("summary"):
            story.append(Paragraph(f"<i>{data['summary']}</i>", self._styles['CGBody']))
            story.append(Spacer(1, 0.2 * inch))

        # Side-by-side parent comparison
        parents = data.get("parents", [])
        if len(parents) >= 2:
            story.append(Paragraph("Parent Comparison", self._styles['CGHeading2']))

            # Build comparison table
            p1, p2 = parents[0], parents[1]
            
            # Helper to get color-coded score as Paragraph
            def score_para(val):
                if val >= 80:
                    color = "#10b981"  # Green
                elif val >= 60:
                    color = "#f59e0b"  # Amber
                else:
                    color = "#ef4444"  # Red
                return Paragraph(f'<font color="{color}"><b>{val:.1f}%</b></font>', self._styles['CGBody'])
            
            # Helper for plain text cell
            def text_para(text):
                return Paragraph(str(text), self._styles['CGBody'])
            
            p1_name = p1.get("name", p1.get("parent_type", "Parent A").title())
            p2_name = p2.get("name", p2.get("parent_type", "Parent B").title())
            
            comparison_data = [
                [text_para("<b>Metric</b>"), text_para(f"<b>{p1_name}</b>"), text_para(f"<b>{p2_name}</b>")],
                [text_para("<b>Overall Compliance Score</b>"),
                 score_para(p1.get('overall_compliance_score', 0)),
                 score_para(p2.get('overall_compliance_score', 0))],
            ]
            
            # Score Breakdown
            story.append(Spacer(1, 0.1 * inch))

            # Exchange metrics
            if p1.get("exchange_metrics") and p2.get("exchange_metrics"):
                e1, e2 = p1["exchange_metrics"], p2["exchange_metrics"]
                comparison_data.append([
                    text_para("  └ Exchange On-Time (25%)"),
                    score_para(e1.get('on_time_rate', 0)),
                    score_para(e2.get('on_time_rate', 0))
                ])

            # Communication metrics
            if p1.get("communication_metrics") and p2.get("communication_metrics"):
                c1, c2 = p1["communication_metrics"], p2["communication_metrics"]
                # Communication score = 100 - intervention_rate
                comm_score1 = 100 - c1.get('intervention_rate', 0)
                comm_score2 = 100 - c2.get('intervention_rate', 0)
                comparison_data.append([
                    text_para("  └ Communication (25%)"),
                    score_para(comm_score1),
                    score_para(comm_score2)
                ])
                
            # Custody Tracking
            if p1.get("custody_tracking_metrics") and p2.get("custody_tracking_metrics"):
                ct1, ct2 = p1["custody_tracking_metrics"], p2["custody_tracking_metrics"]
                comparison_data.append([
                    text_para("  └ Custody Tracking (20%)"),
                    score_para(ct1.get('compliance_rate', 100)),
                    score_para(ct2.get('compliance_rate', 100))
                ])
            
            # Child Support
            if p1.get("financial_metrics") and p2.get("financial_metrics"):
                f1, f2 = p1["financial_metrics"], p2["financial_metrics"]
                cs1 = f1.get("child_support", {}).get("compliance_rate")
                cs2 = f2.get("child_support", {}).get("compliance_rate")
                
                # Show N/A for parent who doesn't pay child support (receiver)
                cs1_display = score_para(cs1) if cs1 is not None else text_para("<i>N/A (Receiver)</i>")
                cs2_display = score_para(cs2) if cs2 is not None else text_para("<i>N/A (Receiver)</i>")
                
                comparison_data.append([
                    text_para("  └ Child Support (15%)"),
                    cs1_display,
                    cs2_display
                ])
                
                # Expenses
                exp1 = f1.get("expenses", {}).get("compliance_rate", 100)
                exp2 = f2.get("expenses", {}).get("compliance_rate", 100)
                comparison_data.append([
                    text_para("  └ Expense Compliance (15%)"),
                    score_para(exp1),
                    score_para(exp2)
                ])
            
            # Separator row
            comparison_data.append([text_para(""), text_para(""), text_para("")])
                
            # Communication Toxic Category
            if p1.get("communication_metrics") and p2.get("communication_metrics"):
                c1, c2 = p1["communication_metrics"], p2["communication_metrics"]
                comparison_data.append([
                    text_para("ARIA Interventions"),
                    text_para(str(c1.get('aria_interventions', 0))),
                    text_para(str(c2.get('aria_interventions', 0)))
                ])
                comparison_data.append([
                    text_para("Top Toxic Category"),
                    text_para(c1.get('top_toxic_category', 'None').title()),
                    text_para(c2.get('top_toxic_category', 'None').title())
                ])
                
            # Total Exchanges then Missed Exchanges (at the bottom)
            if p1.get("exchange_metrics") and p2.get("exchange_metrics"):
                e1, e2 = p1["exchange_metrics"], p2["exchange_metrics"]
                comparison_data.append([
                    text_para("Total Exchanges"),
                    text_para(str(e1.get('total', 0))),
                    text_para(str(e2.get('total', 0)))
                ])
                comparison_data.append([
                    text_para("Missed Exchanges"),
                    text_para(str(e1.get('missed', 0))),
                    text_para(str(e2.get('missed', 0)))
                ])
                
                # Last Exchange - show most recent exchange with status
                le1 = e1.get('last_exchange')
                le2 = e2.get('last_exchange')
                le1_text = f"{le1['date']} ({le1['status'].title()})" if le1 else "None"
                le2_text = f"{le2['date']} ({le2['status'].title()})" if le2 else "None"
                comparison_data.append([
                    text_para("Last Exchange"),
                    text_para(le1_text),
                    text_para(le2_text)
                ])

            comp_table = Table(comparison_data, colWidths=[2.5 * inch, 1.75 * inch, 1.75 * inch])
            comp_table.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                # Highlight overall score row
                ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#f0f9ff")),
            ]))
            story.append(comp_table)
            story.append(Spacer(1, 0.2 * inch))

            # NOTE: Missed Exchange Evidence has been moved to Section 3 (Parenting Time Report)

        return story

    def _render_parenting_time(self, data: dict) -> list:
        """Render Parenting Time Report section."""
        story = []

        # Report period
        if data.get("report_period"):
            period = data["report_period"]
            story.append(Paragraph(
                f"<b>Report Period:</b> {period.get('start', '')} to {period.get('end', '')}",
                self._styles['CGBody']
            ))
            story.append(Spacer(1, 0.15 * inch))

        # ==============================================
        # CUSTODY DAY TRACKING
        # ==============================================
        if data.get("custody_tracking") and data["custody_tracking"].get("parents"):
            story.append(Paragraph("Custody Day Tracking", self._styles['CGHeading2']))
            ct = data["custody_tracking"]
            
            # Summary table
            tracking_data = [["Parent", "Days with Child", "Percentage"]]
            for parent in ct["parents"]:
                tracking_data.append([
                    parent.get("name", "Unknown"),
                    str(parent.get("days", 0)),
                    f"{parent.get('percentage', 0):.1f}%"
                ])
            tracking_data.append([
                "<b>Total Days Tracked</b>",
                f"<b>{ct.get('total_days_tracked', 0)}</b>",
                ""
            ])
            
            tracking_table = Table(tracking_data, colWidths=[2.5 * inch, 1.5 * inch, 1.5 * inch])
            tracking_table.setStyle(self._header_table_style())
            story.append(tracking_table)
            story.append(Spacer(1, 0.15 * inch))
            
            # Monthly breakdown (if available)
            if ct.get("by_month"):
                story.append(Paragraph("<i>Monthly Breakdown</i>", self._styles['CGHeading2']))
                month_rows = [["Month"] + [p.get("name", "?") for p in ct["parents"]]]
                for month_data in ct["by_month"][-6:]:  # Last 6 months
                    row = [month_data.get("month", "")]
                    parent_days = {p["name"]: p["days"] for p in month_data.get("parents", [])}
                    for parent in ct["parents"]:
                        row.append(str(parent_days.get(parent.get("name", ""), 0)))
                    month_rows.append(row)
                
                col_count = len(ct["parents"]) + 1
                col_widths = [2 * inch] + [1.5 * inch] * len(ct["parents"])
                month_table = Table(month_rows, colWidths=col_widths)
                month_table.setStyle(self._header_table_style())
                story.append(month_table)
                story.append(Spacer(1, 0.2 * inch))

        # Summary statistics
        if data.get("summary"):
            story.append(Paragraph("Exchange Summary", self._styles['CGHeading2']))
            summ = data["summary"]
            summary_data = [
                ["Total Exchanges", str(summ.get("total_exchanges", 0))],
                ["Completed", str(summ.get("completed", 0))],
                ["Cancelled", str(summ.get("cancelled", 0))],
                ["Missed", str(summ.get("missed", 0))],
            ]
            summary_table = Table(summary_data, colWidths=[3 * inch, 2 * inch])
            summary_table.setStyle(self._basic_table_style())
            story.append(summary_table)
            story.append(Spacer(1, 0.2 * inch))

        # Timeliness analysis
        if data.get("timeliness_analysis"):
            story.append(Paragraph("Timeliness Analysis", self._styles['CGHeading2']))
            ta = data["timeliness_analysis"]
            time_data = [
                ["Total Check-ins", str(ta.get("total_checkins", 0))],
                ["On-Time", f"{ta.get('on_time_count', 0)} ({ta.get('on_time_percentage', 0):.1f}%)"],
                ["Average Delay (when late)", f"{ta.get('average_delay_minutes', 0):.1f} minutes"],
                ["Grace Period Used", str(ta.get("grace_period_used_count", 0))],
            ]
            time_table = Table(time_data, colWidths=[3 * inch, 2 * inch])
            time_table.setStyle(self._basic_table_style())
            story.append(time_table)
            story.append(Spacer(1, 0.2 * inch))

        # Patterns
        if data.get("patterns") and data["patterns"].get("overall_trend"):
            trend = data["patterns"]["overall_trend"]
            trend_color = "#10b981" if trend in ["excellent", "good"] else "#f59e0b" if trend == "needs_attention" else "#ef4444"
            story.append(Paragraph(f"<b>Overall Trend:</b> <font color='{trend_color}'>{trend.replace('_', ' ').title()}</font>", self._styles['CGBody']))
            story.append(Spacer(1, 0.2 * inch))

        # ==============================================
        # MISSED EXCHANGE EVIDENCE (moved from Section 2)
        # ==============================================
        if data.get("missed_exchange_details"):
            missed_list = data["missed_exchange_details"]
            if missed_list:
                story.append(Paragraph("Missed Exchange Evidence", self._styles['CGHeading2']))
                story.append(Spacer(1, 0.1 * inch))
                
                # Sort by date (newest first)
                missed_list.sort(key=lambda x: str(x.get('date', '')) + str(x.get('time', '')), reverse=True)
                
                for item in missed_list:
                    # Header: Date | Time | Responsible
                    header_text = f"<b>{item.get('date')} at {item.get('time')}</b> - Responsible: {item.get('responsible')}"
                    story.append(Paragraph(header_text, self._styles['CGBody']))
                    
                    # Location
                    loc_text = f"Location: {item.get('location_name')}"
                    story.append(Paragraph(loc_text, self._styles['CGBody']))
                    story.append(Spacer(1, 0.1 * inch))
                    
                    # Map Image
                    if item.get("map_image_b64"):
                        try:
                            img_data = base64.b64decode(item["map_image_b64"])
                            img = Image(BytesIO(img_data), width=4*inch, height=2*inch)
                            story.append(img)
                        except Exception:
                            pass  # Skip map image errors
                    
                    # Link
                    if item.get("verify_link"):
                        link = f'<a href="{item["verify_link"]}" color="blue">Verify Location on Map</a>'
                        story.append(Paragraph(link, self._styles['CGBody']))
                    
                    story.append(Spacer(1, 0.3 * inch))

        return story

    def _render_financial_compliance(self, data: dict) -> list:
        """Render Financial Compliance section."""
        story = []

        # Child Support Compliance (New)
        if data.get("child_support_compliance"):
            cs = data["child_support_compliance"]
            if cs.get("status") == "active":
                story.append(Paragraph("Child Support Compliance", self._styles['CGHeading2']))
                
                # Compliance Score Card
                score = cs.get("compliance_score", 0)
                score_color = "#10b981" if score >= 90 else "#f59e0b" if score >= 75 else "#ef4444"
                
                story.append(Paragraph(
                    f"<b>Adherence Score:</b> <font color='{score_color}'>{score}%</font>", 
                    self._styles['CGBody']
                ))
                
                cs_data = [
                    ["Terms", f"${cs.get('required_monthly', 0):,.2f}/month"],
                    ["Expected Total", f"${cs.get('expected_total', 0):,.2f} ({cs.get('months_covered', 0)} months)"],
                    ["Actual Paid", f"${cs.get('actual_total', 0):,.2f}"],
                    ["Shortfall", f"${cs.get('shortfall', 0):,.2f}" if cs.get('shortfall', 0) > 0 else "None"],
                ]
                cs_table = Table(cs_data, colWidths=[2 * inch, 3.5 * inch])
                cs_table.setStyle(self._basic_table_style())
                story.append(cs_table)
                story.append(Spacer(1, 0.2 * inch))

        # Expense Split Compliance (New)
        if data.get("expense_compliance"):
            ec = data["expense_compliance"]
            if ec.get("status") == "active":
                story.append(Paragraph("Expense Split Compliance", self._styles['CGHeading2']))
                
                # Score
                score = ec.get("compliance_score", 0)
                score_color = "#10b981" if score >= 90 else "#f59e0b" if score >= 75 else "#ef4444"
                
                story.append(Paragraph(
                    f"<b>Split Adherence:</b> <font color='{score_color}'>{score}%</font> follow agreed {ec.get('agreed_split')} split", 
                    self._styles['CGBody']
                ))
                
                # Deviating Items Table
                deviations = ec.get("deviating_items", [])
                if deviations:
                    story.append(Spacer(1, 0.1 * inch))
                    story.append(Paragraph("<b>Non-Standard Splits (Flagged):</b>", self._styles['CGBody']))
                    
                    dev_header = [["Expense", "Amount", "Requested Split"]]
                    dev_rows = dev_header + [
                        [
                            d.get("title", "Unknown"), 
                            f"${d.get('amount', 0):,.2f}", 
                            f"{d.get('requested_split')}/{100-d.get('requested_split')}"
                        ]
                        for d in deviations[:5] # Limit to 5
                    ]
                    
                    dev_table = Table(dev_rows, colWidths=[3 * inch, 1.5 * inch, 1 * inch])
                    dev_table.setStyle(self._header_table_style())
                    story.append(dev_table)
                else:
                     story.append(Paragraph("<i>All expenses followed the agreed split.</i>", self._styles['CGBody']))
                
                story.append(Spacer(1, 0.2 * inch))

        # Payment summary
        if data.get("payment_summary"):
            story.append(Paragraph("Payment Activity", self._styles['CGHeading2']))
            ps = data["payment_summary"]
            pay_data = [
                ["Total Transactions", str(ps.get("total_transactions", 0))],
                ["Completed Payments", f"{ps.get('completed_count', 0)} (${ps.get('completed_amount', 0):,.2f})"],
                ["Pending Payments", f"{ps.get('pending_count', 0)} (${ps.get('pending_amount', 0):,.2f})"],
            ]
            pay_table = Table(pay_data, colWidths=[3 * inch, 2.5 * inch])
            pay_table.setStyle(self._basic_table_style())
            story.append(pay_table)
            story.append(Spacer(1, 0.2 * inch))

        # Expense summary
        if data.get("expense_summary"):
            story.append(Paragraph("Expense Requests", self._styles['CGHeading2']))
            es = data["expense_summary"]
            exp_data = [
                ["Total Requests", str(es.get("total_requests", 0))],
                ["Approved", f"{es.get('approved_count', 0)} (${es.get('approved_amount', 0):,.2f})"],
                ["Rejected", f"{es.get('rejected_count', 0)} (${es.get('rejected_amount', 0):,.2f})"],
                ["Pending", f"{es.get('pending_count', 0)} (${es.get('pending_amount', 0):,.2f})"],
            ]
            exp_table = Table(exp_data, colWidths=[3 * inch, 2.5 * inch])
            exp_table.setStyle(self._basic_table_style())
            story.append(exp_table)

        # No financial data message
        if not data.get("payment_summary") and not data.get("expense_summary"):
            story.append(Paragraph("No financial transactions recorded during this period.", self._styles['CGBody']))

        return story

    def _render_communication_compliance(self, data: dict) -> list:
        """Render Communication Compliance section."""
        story = []

        # Overall statistics
        if data.get("overall_stats"):
            story.append(Paragraph("Communication Overview", self._styles['CGHeading2']))
            stats = data["overall_stats"]
            stats_data = [
                ["Total Messages", str(stats.get("total_messages", 0))],
                ["ARIA Interventions", str(stats.get("total_interventions", 0))],
                ["Intervention Rate", f"{stats.get('intervention_rate', 0):.1f}%"],
                ["Suggestions Accepted", str(stats.get("suggestions_accepted", 0))],
                ["Acceptance Rate", f"{stats.get('acceptance_rate', 0):.1f}%"],
                ["Communication Health Score", f"{stats.get('communication_health_score', 0):.1f}/100"],
            ]
            stats_table = Table(stats_data, colWidths=[3 * inch, 2 * inch])
            stats_table.setStyle(self._basic_table_style())
            story.append(stats_table)
            story.append(Spacer(1, 0.2 * inch))

        # Per-participant breakdown
        if data.get("participant_analysis"):
            story.append(Paragraph("By Participant", self._styles['CGHeading2']))
            part_data = [["Parent", "Messages", "Interventions", "Rate", "Acceptance"]]
            for p in data["participant_analysis"]:
                part_data.append([
                    p.get("parent_type", "Parent").title(),
                    str(p.get("messages_sent", 0)),
                    str(p.get("interventions", 0)),
                    f"{p.get('intervention_rate', 0):.1f}%",
                    f"{p.get('acceptance_rate', 0):.1f}%",
                ])
            part_table = Table(part_data, colWidths=[1.5 * inch, 1 * inch, 1.2 * inch, 1 * inch, 1.3 * inch])
            part_table.setStyle(self._header_table_style())
            story.append(part_table)
            story.append(Spacer(1, 0.2 * inch))

        # Response times
        if data.get("response_times") and data["response_times"].get("average_response_hours") is not None:
            story.append(Paragraph("Response Times", self._styles['CGHeading2']))
            rt = data["response_times"]
            story.append(Paragraph(f"<b>Average Response Time:</b> {rt['average_response_hours']:.1f} hours", self._styles['CGBody']))
            story.append(Paragraph(f"<b>Longest Wait:</b> {rt.get('max_response_hours', 0):.1f} hours", self._styles['CGBody']))

        return story

    def _render_intervention_log(self, data: dict) -> list:
        """Render Intervention Log section."""
        story = []

        story.append(Paragraph(
            f"<i>{data.get('note', 'Message content is redacted for privacy.')}</i>",
            self._styles['CGSmall']
        ))
        story.append(Spacer(1, 0.1 * inch))

        # Summary counts
        story.append(Paragraph(
            f"<b>Total Interventions:</b> {data.get('total_interventions', 0)}",
            self._styles['CGBody']
        ))
        story.append(Spacer(1, 0.2 * inch))

        # By outcome
        if data.get("by_outcome"):
            story.append(Paragraph("Intervention Outcomes", self._styles['CGHeading2']))
            outcomes = data["by_outcome"]
            outcome_data = [
                ["Accepted (used ARIA suggestion)", str(outcomes.get("accepted", 0))],
                ["Modified (edited then sent)", str(outcomes.get("modified", 0))],
                ["Rejected (rewrote message)", str(outcomes.get("rejected", 0))],
                ["Sent Anyway (ignored warning)", str(outcomes.get("sent_anyway", 0))],
            ]
            outcome_table = Table(outcome_data, colWidths=[4 * inch, 1.5 * inch])
            outcome_table.setStyle(self._basic_table_style())
            story.append(outcome_table)
            story.append(Spacer(1, 0.2 * inch))

        # By category
        if data.get("by_category") and data["by_category"]:
            story.append(Paragraph("Issues Detected by Category", self._styles['CGHeading2']))
            cat_data = [[cat.replace("_", " ").title(), str(count)]
                       for cat, count in sorted(data["by_category"].items(), key=lambda x: -x[1])]
            if cat_data:
                cat_table = Table(cat_data, colWidths=[4 * inch, 1.5 * inch])
                cat_table.setStyle(self._basic_table_style())
                story.append(cat_table)
                story.append(Spacer(1, 0.2 * inch))

        # Repeat patterns
        if data.get("repeat_patterns"):
            rp = data["repeat_patterns"]
            if rp.get("escalation_detected"):
                story.append(Paragraph(
                    "<b>⚠ Escalation Pattern Detected:</b> Toxicity scores have increased over time.",
                    self._styles['CGBody']
                ))

        return story

    def _render_parent_impact(self, data: dict) -> list:
        """Render Parent Impact Summary section."""
        story = []

        # Methodology note
        if data.get("methodology_note"):
            story.append(Paragraph(f"<i>{data['methodology_note']}</i>", self._styles['CGSmall']))
            story.append(Spacer(1, 0.2 * inch))

        # Case health
        if data.get("case_health"):
            ch = data["case_health"]
            status_colors = {
                "healthy": "#10b981",
                "stable": "#3b82f6",
                "needs_attention": "#f59e0b",
                "concerning": "#ef4444",
            }
            status = ch.get("status", "unknown")
            story.append(Paragraph("Overall Case Health", self._styles['CGHeading2']))
            story.append(Paragraph(
                f"<b>Score:</b> {ch.get('score', 0):.1f}/100 — <b>Status:</b> {status.replace('_', ' ').title()}",
                self._styles['CGBody']
            ))
            story.append(Paragraph(ch.get("summary", ""), self._styles['CGBody']))
            story.append(Spacer(1, 0.2 * inch))

        # Individual parent impacts
        if data.get("parent_impacts"):
            for impact in data["parent_impacts"]:
                parent_type = impact.get("parent_type", "Parent").title()
                story.append(Paragraph(f"{parent_type} Summary", self._styles['CGHeading2']))

                # Scores table
                scores_data = [
                    ["Overall Impact Score", f"{impact.get('overall_impact_score', 0):.1f}/100"],
                    ["Cooperation Score", f"{impact.get('cooperation_score', 0):.1f}/100"],
                ]
                if impact.get("communication_quality"):
                    cq = impact["communication_quality"]
                    scores_data.append(["Communication Quality", f"{cq.get('score', 0):.1f}/100"])
                if impact.get("schedule_compliance"):
                    sc = impact["schedule_compliance"]
                    scores_data.append(["Schedule Compliance", f"{sc.get('score', 0):.1f}/100"])

                scores_table = Table(scores_data, colWidths=[3 * inch, 2 * inch])
                scores_table.setStyle(self._basic_table_style())
                story.append(scores_table)

                # Strengths
                if impact.get("strengths"):
                    story.append(Paragraph("<b>Strengths:</b>", self._styles['CGBody']))
                    for s in impact["strengths"]:
                        story.append(Paragraph(f"  • {s}", self._styles['CGBody']))

                # Areas for improvement
                if impact.get("areas_for_improvement"):
                    story.append(Paragraph("<b>Areas for Improvement:</b>", self._styles['CGBody']))
                    for a in impact["areas_for_improvement"]:
                        story.append(Paragraph(f"  • {a}", self._styles['CGBody']))

                story.append(Spacer(1, 0.2 * inch))

        # Recommendations
        if data.get("recommendations"):
            story.append(Paragraph("Recommendations", self._styles['CGHeading2']))
            for rec in data["recommendations"]:
                story.append(Paragraph(f"• {rec}", self._styles['CGBody']))

        return story

    def _render_chain_of_custody(self, data: dict) -> list:
        """Render Chain of Custody section."""
        story = []

        # Chain verification
        if data.get("chain_verification"):
            cv = data["chain_verification"]
            story.append(Paragraph("Data Integrity Verification", self._styles['CGHeading2']))

            if cv.get("is_valid"):
                story.append(Paragraph(
                    "✓ <b>INTEGRITY VERIFIED</b> — All data chain links are intact.",
                    self._styles['CGBody']
                ))
            else:
                story.append(Paragraph(
                    f"⚠ <b>INTEGRITY WARNING</b> — {cv.get('breaks_found', 0)} chain breaks detected.",
                    self._styles['CGBody']
                ))

            story.append(Paragraph(f"Events Verified: {cv.get('events_verified', 0)}", self._styles['CGBody']))
            story.append(Spacer(1, 0.2 * inch))

        # Chain hash
        if data.get("chain_hash"):
            story.append(Paragraph("Cryptographic Verification", self._styles['CGHeading2']))
            story.append(Paragraph(f"<b>Chain Hash (SHA-256):</b>", self._styles['CGBody']))
            story.append(Paragraph(f"<font face='Courier'>{data['chain_hash']}</font>", self._styles['CGSmall']))
            story.append(Spacer(1, 0.2 * inch))

        # Audit summary
        if data.get("audit_summary"):
            audit = data["audit_summary"]
            story.append(Paragraph("Audit Trail Summary", self._styles['CGHeading2']))
            audit_data = [
                ["Total Audit Entries", str(audit.get("total_entries", 0))],
                ["Unique Users", str(audit.get("unique_users_accessed", 0))],
            ]
            audit_table = Table(audit_data, colWidths=[3 * inch, 2 * inch])
            audit_table.setStyle(self._basic_table_style())
            story.append(audit_table)
            story.append(Spacer(1, 0.2 * inch))

        # Chain statistics
        if data.get("chain_statistics"):
            cs = data["chain_statistics"]
            story.append(Paragraph("Event Statistics", self._styles['CGHeading2']))
            story.append(Paragraph(f"<b>Total Events:</b> {cs.get('total_events', 0)}", self._styles['CGBody']))

            if cs.get("first_event"):
                fe = cs["first_event"]
                story.append(Paragraph(f"<b>First Event:</b> {fe.get('timestamp', '')} — {fe.get('type', '')}", self._styles['CGBody']))
            if cs.get("last_event"):
                le = cs["last_event"]
                story.append(Paragraph(f"<b>Last Event:</b> {le.get('timestamp', '')} — {le.get('type', '')}", self._styles['CGBody']))

        # Integrity statement
        if data.get("integrity_statement"):
            story.append(Spacer(1, 0.2 * inch))
            story.append(Paragraph(data["integrity_statement"], self._styles['CGDisclaimer']))

        return story

    def _basic_table_style(self) -> TableStyle:
        """Return a basic table style for key-value tables."""
        return TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.TEXT_COLOR),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
        ])

    def _header_table_style(self) -> TableStyle:
        """Return a table style with header row."""
        return TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e40af")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), self.TEXT_COLOR),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ])
    
    def _render_exchange_gps_verification(self, data: dict) -> list:
        """Render Exchange GPS Verification section."""
        story = []

        # 1. Summary
        if "summary" in data:
            story.append(Paragraph("Summary", self._styles['CGHeading2']))
            summary = data["summary"]
            summary_data = [
                ["Total Exchanges:", str(summary.get("total_exchanges", 0))],
                ["GPS Verified:", f"{summary.get('gps_verified_count', 0)} ({summary.get('gps_verified_rate', 0)}%)"],
            ]
            
            # Add dates if available
            if "report_period" in summary:
                s = summary["report_period"].get("start", "")
                e = summary["report_period"].get("end", "")
                summary_data.insert(0, ["Report Period:", f"{s} to {e}"])

            table = Table(summary_data, colWidths=[2 * inch, 4 * inch])
            table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (-1, -1), self.TEXT_COLOR),
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(table)
            story.append(Spacer(1, 0.2 * inch))

        # 2. Compliance Metrics
        if "compliance_metrics" in data:
            story.append(Paragraph("Compliance Metrics", self._styles['CGHeading2']))
            metrics = data["compliance_metrics"].get("overall", {})
            
            metric_data = [
                ["Metric", "Value"],
                ["Geofence Compliance", f"{metrics.get('geofence_compliance_rate', 0)}%"],
                ["On-Time Rate", f"{metrics.get('on_time_rate', 0)}%"],
                ["Completed", str(metrics.get("completed_count", 0))],
                ["Missed", str(metrics.get("missed_count", 0))],
            ]
            
            t = Table(metric_data, colWidths=[3 * inch, 3 * inch])
            t.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
                ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(t)
            story.append(Spacer(1, 0.2 * inch))

        # 3. Exchange Log
        if "exchange_log" in data and data["exchange_log"]:
            story.append(Paragraph("Exchange Evidence Log", self._styles['CGHeading2']))
            
            headers = ["Date", "Time", "Title", "Location", "Status"]
            table_data = [headers]
            
            for entry in data["exchange_log"][:40]: # Limit rows
                row = [
                    entry.get("date", "")[:12],
                    entry.get("scheduled_time", ""),
                    entry.get("title", "")[:20],
                    entry.get("location", "")[:30],
                    entry.get("status", "")
                ]
                table_data.append(row)
                
            # Fixed widths to prevent overlap: Total 7.5 inches available (8.5 - 1 margins)
            # Actually margins are 0.75 left/right -> 7.0 inches usable
            col_widths = [1.2 * inch, 1.0 * inch, 1.8 * inch, 2.0 * inch, 1.0 * inch]
            
            t = Table(table_data, colWidths=col_widths)
            t.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8), # Smaller font for logs
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
                ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(t)
            story.append(Spacer(1, 0.3 * inch))

        # 4. Evidence Maps
        if "evidence_maps" in data and data["evidence_maps"]:
            story.append(Paragraph("Evidence Maps (Sample)", self._styles['CGHeading2']))
            
            headers = ["Date", "Time", "Map Link"]
            map_data = [headers]
            
            for m in data["evidence_maps"][:10]:
                 # formatting link as text for now, or clickable if reportlab supports it easily
                 # We'll just show the text "View Map" if we can make it a link, otherwise just the URL truncated
                 url = m.get("map_url", "")
                 row = [
                     m.get("date", ""),
                     m.get("time", ""),
                     Paragraph(f'<a href="{url}" color="blue">View Map Evidence</a>', self._styles['CGBody']) if url else "N/A"
                 ]
                 map_data.append(row)
            
            t = Table(map_data, colWidths=[1.5 * inch, 1.5 * inch, 4.0 * inch])
            t.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(t)

        return story

    def _create_custody_donut_chart(
        self,
        pet_name: str,
        res_name: str,
        pet_pct: float,
        res_pct: float,
        expected_split: str
    ) -> BytesIO:
        """Create a donut chart showing custody time distribution."""
        try:
            fig, ax = plt.subplots(figsize=(5, 3.5))
            
            # Data
            sizes = [pet_pct, res_pct]
            labels = [f'{pet_name}\n{pet_pct}%', f'{res_name}\n{res_pct}%']
            colors_list = ['#3b82f6', '#f97316']  # Blue for petitioner, Orange for respondent
            explode = (0.02, 0.02)  # Slight separation
            
            # Create donut
            wedges, texts, autotexts = ax.pie(
                sizes,
                labels=labels,
                colors=colors_list,
                explode=explode,
                autopct='',
                startangle=90,
                wedgeprops=dict(width=0.5, edgecolor='white')
            )
            
            # Center text with expected split
            ax.text(0, 0, f'Expected\n{expected_split}', ha='center', va='center', 
                    fontsize=12, fontweight='bold', color='#374151')
            
            # Title
            ax.set_title('Custody Time Distribution', fontsize=14, fontweight='bold', pad=20)
            
            # Equal aspect ratio
            ax.axis('equal')
            
            # Save to BytesIO
            img_buffer = BytesIO()
            plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight', 
                        facecolor='white', edgecolor='none')
            plt.close(fig)
            img_buffer.seek(0)
            
            return img_buffer
        except Exception as e:
            print(f"Error creating donut chart: {e}")
            return None

    def _render_dict(self, data: dict, level: int = 0) -> list:
        """Recursively render a dictionary as formatted content."""
        story = []

        for key, value in data.items():
            if key.startswith("_"):  # Skip private keys
                continue

            # Format key as label
            label = key.replace("_", " ").title()

            if isinstance(value, dict):
                # Nested dictionary
                if level < 2:
                    story.append(Paragraph(f"<b>{label}:</b>", self._styles['CGHeading2']))
                    story.extend(self._render_dict(value, level + 1))
                else:
                    # Render as key-value table
                    story.append(Paragraph(f"<b>{label}:</b>", self._styles['CGBody']))
                    story.append(self._render_kv_table(value))

            elif isinstance(value, list):
                story.append(Paragraph(f"<b>{label}:</b>", self._styles['CGHeading2']))
                if value and isinstance(value[0], dict):
                    # List of dicts - render as table
                    story.append(self._render_list_table(value))
                else:
                    # Simple list
                    items = [
                        ListItem(Paragraph(str(item), self._styles['CGBody']))
                        for item in value[:20]  # Limit to 20 items
                    ]
                    if items:
                        story.append(ListFlowable(items, bulletType='bullet'))
                    if len(value) > 20:
                        story.append(Paragraph(
                            f"... and {len(value) - 20} more items",
                            self._styles['CGSmall']
                        ))

            elif isinstance(value, bool):
                story.append(Paragraph(
                    f"<b>{label}:</b> {'Yes' if value else 'No'}",
                    self._styles['CGBody']
                ))

            elif value is not None:
                story.append(Paragraph(
                    f"<b>{label}:</b> {value}",
                    self._styles['CGBody']
                ))

        return story

    def _render_kv_table(self, data: dict) -> Table:
        """Render a dictionary as a key-value table."""
        table_data = [[k.replace("_", " ").title(), str(v)] for k, v in data.items() if v is not None]

        if not table_data:
            return Spacer(1, 0.1 * inch)

        table = Table(table_data, colWidths=[2.5 * inch, 3.5 * inch])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.TEXT_COLOR),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
        ]))
        return table

    def _render_list_table(self, items: list[dict]) -> Table:
        """Render a list of dicts as a table."""
        if not items:
            return Spacer(1, 0.1 * inch)

        # Get all keys from first item
        keys = list(items[0].keys())[:6]  # Limit columns
        headers = [k.replace("_", " ").title() for k in keys]

        table_data = [headers]
        for item in items[:30]:  # Limit rows
            row = [str(item.get(k, ""))[:50] for k in keys]  # Truncate long values
            table_data.append(row)

        col_width = 6 * inch / len(keys)
        table = Table(table_data, colWidths=[col_width] * len(keys))
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.TEXT_COLOR),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
        ]))
        return table

    def _build_verification_page(self, sections: list[SectionContent]) -> list:
        """Build the verification and integrity page."""
        story = []

        story.append(Paragraph("Verification & Integrity", self._styles['CGHeading1']))
        story.append(Spacer(1, 0.2 * inch))

        # Calculate content hash
        content_str = str([s.content_data for s in sections])
        content_hash = hashlib.sha256(content_str.encode()).hexdigest()

        # Verification info
        verify_data = [
            ["Export Number:", self.export_number],
            ["Content Hash (SHA-256):", content_hash[:32] + "..."],
            ["Generated:", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")],
            ["Total Sections:", str(len(sections))],
            ["Total Evidence Items:", str(sum(s.evidence_count for s in sections))],
            ["Verification URL:", f"verify.commonground.family/{self.export_number}"],
        ]

        verify_table = Table(verify_data, colWidths=[2.5 * inch, 4 * inch])
        verify_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.TEXT_COLOR),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
        ]))
        story.append(verify_table)
        story.append(Spacer(1, 0.3 * inch))

        # Section hashes
        story.append(Paragraph("Section Verification", self._styles['CGHeading2']))
        section_data = [["Section", "Evidence", "Hash (truncated)"]]
        for section in sections:
            section_hash = hashlib.sha256(
                str(section.content_data).encode()
            ).hexdigest()[:16]
            section_data.append([
                section.section_title,
                str(section.evidence_count),
                section_hash + "...",
            ])

        section_table = Table(section_data, colWidths=[3 * inch, 1 * inch, 2.5 * inch])
        section_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.TEXT_COLOR),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_COLOR),
        ]))
        story.append(section_table)
        story.append(Spacer(1, 0.3 * inch))

        # Statement of neutrality
        statement = """
        <b>STATEMENT OF NEUTRALITY</b><br/><br/>
        CommonGround is a neutral technology platform that records interactions between
        co-parents. This export package presents data exactly as recorded in the system,
        without interpretation, modification, or bias.<br/><br/>
        This document is intended for use by courts, attorneys, mediators, and other
        professionals in family law proceedings. It should be reviewed in conjunction
        with other evidence and professional evaluation.<br/><br/>
        The cryptographic hashes above can be used to verify that this document has not
        been altered since generation. Any modification to the content would result in
        different hash values.
        """
        story.append(Paragraph(statement, self._styles['CGDisclaimer']))

        return story

    def _add_header_footer(self, canvas: canvas.Canvas, doc):
        """Add header and footer to each page."""
        canvas.saveState()

        # Header
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(self.MUTED_COLOR)
        canvas.drawString(
            doc.leftMargin,
            doc.height + doc.topMargin - 0.3 * inch,
            f"CommonGround Case Export: {self.export_number}"
        )
        canvas.drawRightString(
            doc.width + doc.leftMargin,
            doc.height + doc.topMargin - 0.3 * inch,
            self.case_name
        )

        # Header line
        canvas.setStrokeColor(self.BORDER_COLOR)
        canvas.line(
            doc.leftMargin,
            doc.height + doc.topMargin - 0.4 * inch,
            doc.width + doc.leftMargin,
            doc.height + doc.topMargin - 0.4 * inch
        )

        # Footer
        canvas.drawString(
            doc.leftMargin,
            0.5 * inch,
            f"Generated: {datetime.utcnow().strftime('%Y-%m-%d')}"
        )

        # Page number
        page_num = canvas.getPageNumber()
        canvas.drawCentredString(
            doc.width / 2 + doc.leftMargin,
            0.5 * inch,
            f"Page {page_num}"
        )

        # Watermark (diagonal, light)
        if self.watermark_text:
            canvas.setFont("Helvetica", 50)
            canvas.setFillColor(colors.Color(0.9, 0.9, 0.9, alpha=0.3))
            canvas.saveState()
            canvas.translate(doc.width / 2 + doc.leftMargin, doc.height / 2)
            canvas.rotate(45)
            canvas.drawCentredString(0, 0, "COMMONGROUND")
            canvas.restoreState()

        canvas.restoreState()


def calculate_content_hash(pdf_bytes: bytes) -> str:
    """Calculate SHA-256 hash of PDF content."""
    return hashlib.sha256(pdf_bytes).hexdigest()

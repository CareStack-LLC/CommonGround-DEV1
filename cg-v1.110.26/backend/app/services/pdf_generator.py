
"""
PDF Generator Service for Professional Reports.

Uses ReportLab to generate high-quality, tamper-proof PDF reports
for court and legal use.
"""

import io
import json
import hashlib
from datetime import datetime
from app.core.config import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from app.utils.sentry_helpers import capture_error

class PDFGenerator:
    """Generates professional PDF reports."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Define custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            leading=30,
            textColor=colors.HexColor('#1e293b'), # Slate 800
            alignment=TA_CENTER,
            spaceAfter=30
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#0f172a'), # Slate 900
            spaceBefore=20,
            spaceAfter=15,
            borderPadding=5,
            borderWidth=0,
            borderColor=colors.HexColor('#e2e8f0'),
        ))

        self.styles.add(ParagraphStyle(
            name='MetricLabel',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#64748b'), # Slate 500
        ))

        self.styles.add(ParagraphStyle(
            name='MetricValue',
            parent=self.styles['Normal'],
            fontSize=14,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#0f172a'), # Slate 900
        ))

        self.styles.add(ParagraphStyle(
            name='Disclaimer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#94a3b8'), # Slate 400
            alignment=TA_CENTER,
        ))

    def generate_compliance_report(self, report, data: dict) -> bytes:
        """
        Generate a Compliance Report PDF.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
            title=f"Compliance Report - {report.family_file_id}"
        )

        story = []

        # --- Header ---
        story.append(Paragraph("COMMONGROUND™ PRO", self.styles['Heading3']))
        story.append(Spacer(1, 0.5 * inch))
        
        story.append(Paragraph(report.title or "Compliance Report", self.styles['ReportTitle']))

        # Deterministic data hash — reproducible from GET /reports/{id}/data so a
        # court can independently recompute and verify this exact report.
        data_hash = hashlib.sha256(
            json.dumps(data, sort_keys=True, default=str).encode()
        ).hexdigest()
        verify_url = f"{settings.FRONTEND_URL}/verify/report/{report.verification_number}"

        # Meta Info Table.
        # Legacy data shape has top-level "period"; the specialized report
        # modules (full_compliance, firm_analytics, ...) put the range under
        # metadata.date_range — accept both (direct data['period'] access used
        # to KeyError for every specialized type).
        period = (
            data.get("period")
            or data.get("metadata", {}).get("date_range")
            or {}
        )
        meta_data = [
            ["Case ID:", report.family_file_id],
            ["Generated:", datetime.utcnow().strftime('%B %d, %Y')],
            ["Period:", f"{period.get('start') or 'Start'} - {period.get('end') or 'Present'}"],
            ["Verification #:", report.verification_number or "—"],
            ["Verify at:", verify_url],
        ]
        
        meta_table = Table(meta_data, colWidths=[1.5*inch, 4*inch])
        meta_table.setStyle(TableStyle([
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0,0), (0,-1), colors.HexColor('#64748b')),
            ('TEXTCOLOR', (1,0), (1,-1), colors.HexColor('#0f172a')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 0.5 * inch))

        # Specialized report modules return structured dicts without the legacy
        # aria_stats/exchange_compliance keys — render those generically so
        # every report type produces a complete PDF instead of empty sections.
        if "aria_stats" not in data:
            self._render_generic_sections(story, data)
            self._append_certification(story, report, data_hash, verify_url)
            doc.build(story)
            return buffer.getvalue()

        # --- ARIA Safety Shield Section ---
        aria = data.get("aria_stats", {})
        story.append(Paragraph("ARIA™ Safety Shield Analysis", self.styles['SectionHeader']))
        
        # ARIA Metrics Grid
        aria_metrics = [
            [
                self._create_metric("Total Flags", aria.get('total_flags', 0)),
                self._create_metric("Resolution Rate", f"{aria.get('resolution_rate', 0):.1f}%"),
                self._create_metric("Severe/High", f"{aria.get('severity_counts', {}).get('severe', 0) + aria.get('severity_counts', {}).get('high', 0)}"),
            ]
        ]
        
        aria_table = Table(aria_metrics, colWidths=[2.3*inch, 2.3*inch, 2.3*inch])
        aria_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(aria_table)
        story.append(Spacer(1, 0.2 * inch))

        # Top Categories
        if aria.get('top_categories'):
            categories = ", ".join(aria['top_categories'].keys())
            story.append(Paragraph(f"<b>Primary Concerns:</b> {categories}", self.styles['Normal']))
        
        story.append(Spacer(1, 0.4 * inch))

        # --- Exchange Compliance Section ---
        exc = data.get("exchange_compliance", {})
        story.append(Paragraph("Custody Exchange Compliance", self.styles['SectionHeader']))
        
        exc_metrics = [
            [
                self._create_metric("Total Scheduled", exc.get('total_exchanges', 0)),
                self._create_metric("On-Time Rate", f"{exc.get('on_time_rate', 0):.1f}%"),
                self._create_metric("GPS Verified", f"{exc.get('gps_verified_rate', 0):.1f}%"),
            ]
        ]
        
        exc_table = Table(exc_metrics, colWidths=[2.3*inch, 2.3*inch, 2.3*inch])
        exc_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(exc_table)
        story.append(Spacer(1, 0.2 * inch))
        
        story.append(Paragraph(
            f"Of {exc.get('total_exchanges', 0)} scheduled exchanges, {exc.get('completed', 0)} were completed successfully and {exc.get('missed', 0)} were missed/cancelled.",
            self.styles['Normal']
        ))
        
        story.append(Spacer(1, 0.4 * inch))

        # --- Communication Metrics ---
        comm = data.get("communication_metrics", {})
        story.append(Paragraph("Communication Analysis", self.styles['SectionHeader']))
        
        comm_metrics = [
            [
                self._create_metric("Total Messages", comm.get('total_messages', 0)),
                self._create_metric("Avg Response", f"{comm.get('avg_response_time_hours', 0):.1f} hrs"),
                self._create_metric("Sentiment Score", f"{comm.get('sentiment_score', 0)}/100"),
            ]
        ]
        
        comm_table = Table(comm_metrics, colWidths=[2.3*inch, 2.3*inch, 2.3*inch])
        comm_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(comm_table)
        
        story.append(Spacer(1, 0.8 * inch))

        self._append_certification(story, report, data_hash, verify_url)

        doc.build(story)
        return buffer.getvalue()

    def _append_certification(self, story, report, data_hash: str, verify_url: str):
        """Signature line + integrity/verification block + footer."""
        # --- Signature ---
        if report.signature_line:
            story.append(Paragraph("_" * 40, self.styles['Normal']))
            story.append(Paragraph(f"Prepared by: {report.signature_line}", self.styles['Normal']))
            story.append(Spacer(1, 1 * inch))

        # --- Integrity / Certification block ---
        story.append(Spacer(1, 0.3 * inch))
        story.append(Paragraph(
            "INTEGRITY &amp; VERIFICATION",
            self.styles['SectionHeader']
        ))
        story.append(Paragraph(
            "This report was generated by CommonGround from immutable, timestamped "
            "case records. Its integrity can be independently verified: recompute "
            "the SHA-256 of the report data and compare to the value below, or look "
            "up the verification number on the public verification page.",
            self.styles['Normal']
        ))
        story.append(Spacer(1, 0.1 * inch))
        story.append(Paragraph(f"<b>Verification #:</b> {report.verification_number or '—'}", self.styles['Disclaimer']))
        story.append(Paragraph(f"<b>Data SHA-256:</b> {data_hash}", self.styles['Disclaimer']))
        story.append(Paragraph(f"<b>Verify at:</b> {verify_url}", self.styles['Disclaimer']))

        # --- Footer / Disclaimer ---
        story.append(Spacer(1, 0.2 * inch))
        story.append(Paragraph("Generated by CommonGround™ Professional Portal", self.styles['Disclaimer']))

    # ------------------------------------------------------------------
    # Generic rendering for specialized report-module data
    # ------------------------------------------------------------------

    _SKIP_KEYS = {"report_type", "metadata"}

    def _humanize(self, key) -> str:
        return str(key).replace("_", " ").title()

    def _render_generic_sections(self, story, data: dict):
        """
        Render an arbitrary report-data dict as titled sections.

        Rules: top-level dict values become label/value tables; lists of dicts
        become tables (keys of the first item as columns, capped at 6); lists
        of scalars become bullets; scalars are gathered into one summary table.
        """
        scalars = []
        for key, value in data.items():
            if key in self._SKIP_KEYS:
                continue
            if isinstance(value, dict):
                story.append(Paragraph(self._humanize(key), self.styles['SectionHeader']))
                rows = []
                for k, v in value.items():
                    if isinstance(v, dict):
                        v = ", ".join(f"{self._humanize(sk)}: {sv}" for sk, sv in v.items())
                    elif isinstance(v, list):
                        v = ", ".join(str(item) for item in v[:10])
                    rows.append([self._humanize(k), self._fmt(v)])
                if rows:
                    t = Table(rows, colWidths=[2.4 * inch, 4.1 * inch])
                    t.setStyle(TableStyle([
                        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                    ]))
                    story.append(t)
                story.append(Spacer(1, 0.3 * inch))
            elif isinstance(value, list):
                story.append(Paragraph(self._humanize(key), self.styles['SectionHeader']))
                if value and isinstance(value[0], dict):
                    cols = list(value[0].keys())[:6]
                    header = [self._humanize(c) for c in cols]
                    rows = [header]
                    for item in value[:40]:
                        rows.append([self._fmt(item.get(c)) for c in cols])
                    width = 6.5 / max(1, len(cols))
                    t = Table(rows, colWidths=[width * inch] * len(cols), repeatRows=1)
                    t.setStyle(TableStyle([
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
                        ('FONTSIZE', (0, 0), (-1, -1), 8),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#e2e8f0')),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ]))
                    story.append(t)
                else:
                    for item in value[:40]:
                        story.append(Paragraph(f"• {self._fmt(item)}", self.styles['Normal']))
                story.append(Spacer(1, 0.3 * inch))
            else:
                scalars.append([self._humanize(key), self._fmt(value)])

        if scalars:
            story.append(Paragraph("Summary", self.styles['SectionHeader']))
            t = Table(scalars, colWidths=[2.4 * inch, 4.1 * inch])
            t.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(t)
            story.append(Spacer(1, 0.3 * inch))

    @staticmethod
    def _fmt(value) -> str:
        if value is None:
            return "—"
        if isinstance(value, float):
            return f"{value:.1f}"
        if isinstance(value, dict):
            return ", ".join(f"{k}: {v}" for k, v in list(value.items())[:6])
        s = str(value)
        return s if len(s) <= 300 else s[:297] + "..."

    def _create_metric(self, label, value):
        """Helper to create a metric cell content."""
        return [
            Paragraph(label, self.styles['MetricLabel']),
            Paragraph(str(value), self.styles['MetricValue'])
        ]

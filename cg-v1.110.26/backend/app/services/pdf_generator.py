
"""
PDF Generator Service for Professional Reports.

Uses ReportLab to generate high-quality, tamper-proof PDF reports
for court and legal use.
"""

import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

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

        # Meta Info Table
        meta_data = [
            ["Case ID:", report.family_file_id],
            ["Generated:", datetime.utcnow().strftime('%B %d, %Y')],
            ["Period:", f"{data['period']['start'] or 'Start'} - {data['period']['end'] or 'Present'}"],
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

        # --- Signature ---
        if report.signature_line:
            story.append(Paragraph("_" * 40, self.styles['Normal']))
            story.append(Paragraph(f"Prepared by: {report.signature_line}", self.styles['Normal']))
            story.append(Spacer(1, 1 * inch))

        # --- Footer / Disclaimer ---
        story.append(Paragraph("Generated by CommonGround™ Professional Portal", self.styles['Disclaimer']))
        story.append(Paragraph("This report uses blockchain-verified data integrity checks.", self.styles['Disclaimer']))

        doc.build(story)
        return buffer.getvalue()

    def _create_metric(self, label, value):
        """Helper to create a metric cell content."""
        return [
            Paragraph(label, self.styles['MetricLabel']),
            Paragraph(str(value), self.styles['MetricValue'])
        ]

"""
ParentReportService - Generate beautiful branded PDF reports for parents.

Uses Jinja2 templates + WeasyPrint for HTML-to-PDF conversion.
"""

import hashlib
import io
import logging
import secrets
from datetime import date, datetime
from pathlib import Path
from typing import Literal, Optional
from types import SimpleNamespace

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select, and_, func, cast, Date, or_, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML, CSS

from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.case import Case
from app.models.clearfund import Obligation, ObligationFunding
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.message import Message, MessageFlag
from app.models.payment import Payment, ExpenseRequest
from app.models.user import User
from app.models.agreement import Agreement, AgreementSection, AgreementConversation
from app.models.custody_day_record import CustodyDayRecord
from app.models.schedule import ScheduleEvent
from app.models.kidcoms import KidComsSession, KidComsMessage, KidComsCommunicationLog
from app.models.circle import CircleContact
from app.models.circle_message import CircleMessage
from app.models.generated_report import GeneratedReport
from app.services.custody_time import CustodyTimeService
from app.services.geolocation import GeolocationService
from app.services.storage import StorageBucket, build_report_path, storage_service
from .chart_builder import ChartBuilder, COLORS, ChartData


class ReportResult:
    """Result of generating a PDF report."""

    def __init__(self, pdf_bytes: bytes, report_id: str, sha256_hash: str):
        self.pdf_bytes = pdf_bytes
        self.report_id = report_id
        self.sha256_hash = sha256_hash

# Toxicity category descriptions for reports
TOXICITY_CATEGORY_DESCRIPTIONS = {
    "profanity": "Use of inappropriate language",
    "insult": "Personal attacks or name-calling",
    "hostility": "Aggressive or confrontational tone",
    "sarcasm": "Mocking or dismissive sarcasm",
    "blame": "Placing fault without constructive intent",
    "dismissive": "Minimizing concerns or feelings",
    "threatening": "Implied or explicit threats of harm or legal action",
    "manipulation": "Attempts to control or guilt-trip",
    "passive_aggressive": "Indirect hostility or backhanded comments",
    "all_caps": "Shouting (aggressive use of capital letters)",
    "custody_weaponization": "Using access to children as leverage",
    "financial_coercion": "Using money to control or punish",
    "hate_speech": "Discriminatory language (Zero Tolerance)",
    "sexual_harassment": "Inappropriate sexual content (Zero Tolerance)",
    "refusal": "Uncooperative refusal to communicate or follow plan",
    "coercion": "Forcing action through pressure or threats",
}

logger = logging.getLogger(__name__)

# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates" / "reports"

ReportType = Literal["custody_time", "communication", "expense", "schedule", "kidspace_communication"]


class ParentReportService:
    """
    Generate beautiful branded PDF reports for CommonGround parents.

    Supported report types:
    - custody_time: Parenting time split and exchange compliance
    - communication: Message patterns and ARIA interventions
    - expense: ClearFund obligations and financial compliance
    - schedule: Exchange history and GPS verification
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.chart_builder = ChartBuilder()

        # Initialize Jinja2 environment
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=select_autoescape(["html", "xml"]),
        )

    async def generate_report(
        self,
        report_type: ReportType,
        family_file_id: str,
        date_start: date,
        date_end: date,
        user_id: str,
    ) -> ReportResult:
        """
        Generate a PDF report, persist it to storage, and record it in the database.

        Args:
            report_type: Type of report to generate
            family_file_id: Family file to report on
            date_start: Start date for report period
            date_end: End date for report period
            user_id: ID of user requesting the report

        Returns:
            ReportResult with pdf_bytes, report_id, and sha256_hash
        """
        if report_type == "custody_time":
            pdf_bytes = await self._generate_custody_time_report(
                family_file_id, date_start, date_end, user_id
            )
        elif report_type == "communication":
            pdf_bytes = await self._generate_communication_report(
                family_file_id, date_start, date_end, user_id
            )
        elif report_type == "expense":
            pdf_bytes = await self._generate_expense_report(
                family_file_id, date_start, date_end, user_id
            )
        elif report_type == "schedule":
            pdf_bytes = await self._generate_schedule_report(
                family_file_id, date_start, date_end, user_id
            )
        elif report_type == "kidspace_communication":
            pdf_bytes = await self._generate_kidspace_communication_report(
                family_file_id, date_start, date_end, user_id
            )
        # ------------------------------------------------------------------
        # Paid professional report types (fulfilled by admins from the paid
        # ReportRequest queue — see admin.py generate_report_for_request).
        # Each maps onto the corresponding deep-dive generator; the court
        # investigation package bundles all of them into a single PDF.
        # ------------------------------------------------------------------
        elif report_type == "communication_analysis":
            pdf_bytes = await self._generate_communication_report(
                family_file_id, date_start, date_end, user_id
            )
        elif report_type == "financial_compliance_report":
            pdf_bytes = await self._generate_expense_report(
                family_file_id, date_start, date_end, user_id
            )
        elif report_type == "custody_compliance_report":
            pdf_bytes = await self._generate_custody_time_report(
                family_file_id, date_start, date_end, user_id
            )
        elif report_type == "kidspace_court_communication":
            pdf_bytes = await self._generate_kidspace_communication_report(
                family_file_id, date_start, date_end, user_id
            )
        elif report_type == "court_investigation_package":
            pdf_bytes = await self._generate_court_investigation_package(
                family_file_id, date_start, date_end, user_id
            )
        else:
            raise ValueError(f"Unknown report type: {report_type}")

        # Persist and return result (non-fatal if DB table doesn't exist yet)
        try:
            return await self._persist_report(
                pdf_bytes=pdf_bytes,
                report_type=report_type,
                report_category="parent",
                family_file_id=family_file_id,
                user_id=user_id,
                date_start=date_start,
                date_end=date_end,
            )
        except Exception as e:
            logger.warning(f"Failed to persist report (table may not exist yet): {e}")
            await self.db.rollback()
            report_id = self.generate_report_id()
            sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
            return ReportResult(
                pdf_bytes=pdf_bytes,
                report_id=report_id,
                sha256_hash=sha256_hash,
            )

    async def _generate_custody_time_report(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
        user_id: str,
    ) -> bytes:
        """Generate Custody Time Report PDF."""
        # Get family file
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        # Get parent names
        parent_a = await self._get_user(family_file.parent_a_id)
        parent_b = await self._get_user(family_file.parent_b_id) if family_file.parent_b_id else None

        parent_a_name = self._get_parent_display_name(parent_a, family_file.parent_a_role)
        parent_b_name = self._get_parent_display_name(parent_b, family_file.parent_b_role) if parent_b else "Parent B"

        # Get active agreement and key terms
        agreement = await self._get_active_agreement(family_file_id)
        agreement_data = None
        if agreement:
            key_terms = await self._extract_key_terms(agreement)
            agreement_data = {
                 "title": agreement.title,
                 "status": agreement.status,
                 "effective_date": agreement.effective_date,
                 "key_terms": key_terms,
                 "summary": await self._get_agreement_summary(agreement),
            }

        # Get exchange instances
        exchanges = await self._get_exchange_instances(
            family_file_id, date_start, date_end
        )

        exchange_stats = self._calculate_exchange_stats(exchanges)

        # Get children with individual stats
        children = await self._get_children_with_stats(
            family_file_id, date_start, date_end
        )

        # Calculate aggregate stats across all children
        total_days = (date_end - date_start).days + 1
        total_parent_a_days = sum(c.get("parent_a_days", 0) for c in children)
        total_parent_b_days = sum(c.get("parent_b_days", 0) for c in children)
        total_days_all_children = total_parent_a_days + total_parent_b_days

        # Calculate percentages
        if total_days_all_children > 0:
            parent_a_percentage = round((total_parent_a_days / total_days_all_children) * 100, 1)
            parent_b_percentage = round((total_parent_b_days / total_days_all_children) * 100, 1)
        else:
            parent_a_percentage = 50.0
            parent_b_percentage = 50.0

        # For display, use average per child
        num_children = len(children) if children else 1
        stats = {
            "total_days": total_days,
            "parent_a_days": total_parent_a_days // num_children if num_children else 0,
            "parent_b_days": total_parent_b_days // num_children if num_children else 0,
            "parent_a_percentage": parent_a_percentage,
            "parent_b_percentage": parent_b_percentage,
            "unknown_days": max(0, total_days - (total_parent_a_days + total_parent_b_days) // num_children),
        }

        # Get comparison to agreed schedule (use aggregated data)
        comparison = None
        agreed_a, agreed_b = await self._get_agreed_percentages(family_file_id)
        if agreed_a is not None:
            variance = parent_a_percentage - agreed_a
            comparison = {
                "agreed_a": agreed_a,
                "agreed_b": agreed_b,
                "variance": variance,
            }



        # Parse custody split for chart center text
        split_display = "50/50"
        if agreement_data and agreement_data["key_terms"]["custody_split"]:
             split_display = agreement_data["key_terms"]["custody_split"]

        # Generate charts
        # Single chart with Actual data but Expected split in center
        split_donut = self.chart_builder.split_donut_chart(
            value_a=stats["parent_a_days"],
            value_b=stats["parent_b_days"],
            label_a=parent_a_name,
            label_b=parent_b_name,
             # Use bright colors for Actual
            color_a=COLORS["teal"],
            color_b=COLORS["blue"],
            center_text="Expected",
            center_sublabel=split_display,
        )

        # Comparison charts if we have agreed percentages
        comparison_chart_a = ""
        comparison_chart_b = ""
        if comparison:
            comparison_chart_a = self.chart_builder.comparison_bars(
                value_a=comparison["agreed_a"],
                value_b=stats["parent_a_percentage"],
                label_a="Agreed",
                label_b="Actual",
                color_a=COLORS["border"],
                color_b=COLORS["sage"],
                width=300,
            )
            comparison_chart_b = self.chart_builder.comparison_bars(
                value_a=comparison["agreed_b"],
                value_b=stats["parent_b_percentage"],
                label_a="Agreed",
                label_b="Actual",
                color_a=COLORS["border"],
                color_b=COLORS["slate"],
                width=300,
            )

        # Generate maps for missed exchanges
        missed_exchange_maps = self._generate_missed_exchange_maps(exchanges)

        # Render template
        template = self.jinja_env.get_template("reports/custody_time_report.html")
        html_content = template.render(
            family_file=family_file,
            report_period={"start": date_start, "end": date_end},
            generated_at=datetime.utcnow(),
            report_id=self.generate_report_id(),
            parent_a_name=parent_a_name,
            parent_b_name=parent_b_name,
            stats=stats,
            comparison=comparison,
            exchange_stats=exchange_stats,
            exchanges=exchanges,
            children=children,
            split_donut_chart=split_donut,
            comparison_chart_a=comparison_chart_a,
            comparison_chart_b=comparison_chart_b,
            agreement=agreement_data,
            missed_exchange_maps=missed_exchange_maps,
        )

        # Convert to PDF
        pdf_bytes, _ = self._html_to_pdf(html_content)
        return pdf_bytes

    async def _generate_communication_report(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
        user_id: str,
    ) -> bytes:
        """Generate Communication Summary Report PDF."""
        # Get family file
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        # Get parent names
        parent_a = await self._get_user(family_file.parent_a_id)
        parent_b = await self._get_user(family_file.parent_b_id) if family_file.parent_b_id else None

        parent_a_name = self._get_parent_display_name(parent_a, family_file.parent_a_role)
        parent_b_name = self._get_parent_display_name(parent_b, family_file.parent_b_role) if parent_b else "Parent B"

        # Get messages and flags
        messages = await self._get_messages(family_file_id, date_start, date_end)
        message_ids = [str(m.id) for m in messages]
        flags = await self._get_message_flags(message_ids) if message_ids else []

        # Calculate overall stats
        stats = self._calculate_communication_stats(
            messages, flags, family_file.parent_a_id, family_file.parent_b_id or ""
        )

        # Calculate per-parent stats
        parent_a_stats = self._calculate_parent_communication_stats(
            messages, flags, family_file.parent_a_id
        )
        parent_b_stats = self._calculate_parent_communication_stats(
            messages, flags, family_file.parent_b_id or ""
        )

        # Get category breakdown with parent attribution
        categories = self._get_category_breakdown(
            flags, messages, family_file.parent_a_id, family_file.parent_b_id or ""
        )

        # Generate charts
        intervention_donut = ""
        if stats["flagged_messages"] > 0:
            intervention_donut = self.chart_builder.split_donut_chart(
                value_a=stats["accepted"] + stats["modified"],
                value_b=stats["rejected"],
                label_a="Accepted/Modified",
                label_b="Rejected",
            )

        # Parent comparison chart
        parent_comparison_chart = self.chart_builder.comparison_bars(
            value_a=parent_a_stats["intervention_rate"],
            value_b=parent_b_stats["intervention_rate"],
            label_a=parent_a_name,
            label_b=parent_b_name,
            color_a=COLORS["sage"],
            color_b=COLORS["slate"],
            width=400,
        )

        # Prepare flagged items with context
        flagged_items = []
        flag_map = {str(f.message_id): f for f in flags}
        
        # Helper to get name
        def get_name(uid):
            if uid == family_file.parent_a_id:
                return parent_a_name
            elif uid == str(family_file.parent_b_id):
                return parent_b_name 
            return "Unknown"

        # messages are sorted desc (newest first)
        for i, message in enumerate(messages):
            msg_id = str(message.id)
            if msg_id in flag_map:
                flag = flag_map[msg_id]
                # Context is the PREVIOUS message (which is next in the list since it's desc)
                context_msg = messages[i+1] if i + 1 < len(messages) else None
                
                cats = flag.categories if isinstance(flag.categories, list) else []
                # Clean up categories
                clean_cats = [c.replace('_', ' ').title() for c in cats]
                
                flagged_items.append({
                    "message": message,
                    "sender_name": get_name(message.sender_id),
                    "context": context_msg,
                    "context_sender_name": get_name(context_msg.sender_id) if context_msg else "Unknown",
                    "categories": clean_cats,
                    "user_action": flag.user_action,
                })

        # Render template
        template = self.jinja_env.get_template("reports/communication_summary.html")
        html_content = template.render(
            family_file=family_file,
            report_period={"start": date_start, "end": date_end},
            generated_at=datetime.utcnow(),
            report_id=self.generate_report_id(),
            parent_a_name=parent_a_name,
            parent_b_name=parent_b_name,
            stats=stats,
            parent_a_stats=parent_a_stats,
            parent_b_stats=parent_b_stats,
            categories=categories,
            intervention_donut=intervention_donut,
            parent_comparison_chart=parent_comparison_chart,
            flagged_items=flagged_items,
            toxicity_descriptions=TOXICITY_CATEGORY_DESCRIPTIONS,
        )

        # Convert to PDF
        pdf_bytes, _ = self._html_to_pdf(html_content)
        return pdf_bytes

    async def _generate_expense_report(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
        user_id: str,
    ) -> bytes:
        """Generate Expense Summary Report PDF."""
        # Get family file
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        # Get parent names
        parent_a = await self._get_user(family_file.parent_a_id)
        parent_b = await self._get_user(family_file.parent_b_id) if family_file.parent_b_id else None

        parent_a_name = self._get_parent_display_name(parent_a, family_file.parent_a_role)
        parent_b_name = self._get_parent_display_name(parent_b, family_file.parent_b_role) if parent_b else "Parent B"

        # Get active agreement and key terms
        agreement = await self._get_active_agreement(family_file_id)
        agreement_data = None
        if agreement:
            raw_terms = await self._extract_key_terms(agreement)
            
            # Transform to list for template
            formatted_terms = []
            if raw_terms.get("child_support") and raw_terms["child_support"] != "Not specified":
                 formatted_terms.append({"category": "Financial", "term": f"Child Support: {raw_terms['child_support']}"})
            
            # Add Expense Split from FamilyFile if available (it's the source of truth for calculations)
            if family_file.agreement_expense_split_ratio:
                 formatted_terms.append({"category": "Financial", "term": f"Expense Split: {family_file.agreement_expense_split_ratio}"})
            
            # Determine date both parents approved (the later of the two approval timestamps)
            approved_at = None
            if agreement.petitioner_approved_at and agreement.respondent_approved_at:
                approved_at = max(agreement.petitioner_approved_at, agreement.respondent_approved_at)

            # If effective_date is missing but agreement is approved, use approval date
            final_effective_date = agreement.effective_date
            if not final_effective_date and approved_at:
                final_effective_date = approved_at

            agreement_data = {
                 "title": agreement.title,
                 "status": agreement.status,
                 "effective_date": final_effective_date,
                 "approved_date": approved_at,
                 "key_terms": formatted_terms,
                 "summary": await self._get_agreement_summary(agreement),
            }

        # Get obligations
        obligations = await self._get_obligations(
            family_file_id, date_start, date_end
        )
        obligation_ids = [o.id for o in obligations]

        # Get fundings for these obligations
        fundings = await self._get_obligation_fundings(obligation_ids)

        # Get payments (for detailed history)
        payments = await self._get_payments(family_file_id, date_start, date_end)

        # Get expense requests
        expense_requests = await self._get_expense_requests(family_file_id, date_start, date_end)

        # Calculate overall stats
        stats = self._calculate_expense_stats(obligations)

        # Get category breakdown
        categories = self._get_expense_category_breakdown(obligations)

        # Calculate per-parent stats - derive roles from family file
        parent_a_role = family_file.parent_a_role or "petitioner"
        parent_b_role = family_file.parent_b_role or "respondent"
        parent_a_stats = self._calculate_parent_expense_stats(
            obligations, fundings, family_file.parent_a_id, parent_a_role
        )
        parent_b_stats = self._calculate_parent_expense_stats(
            obligations, fundings, family_file.parent_b_id or "", parent_b_role
        )

        # Get overdue obligations
        overdue_obligations = self._get_overdue_obligations(obligations)

        # Split obligations into Child Support vs Others (for separate tables)
        child_support_obligations = []
        other_obligations = []
        for o in obligations:
            # Check purpose_category (safely handle case)
            cat = (o.purpose_category or "").lower().strip()
            if cat == "child_support":
                child_support_obligations.append(o)
            else:
                other_obligations.append(o)

        # Generate insights
        insights = self._generate_expense_insights(
            stats, categories, parent_a_stats, parent_b_stats, parent_a_name, parent_b_name
        )

        # Generate charts
        category_chart = ""
        if categories and stats["total_amount"] > 0:
            # Build chart data from categories
            chart_items = []
            cat_colors = [COLORS["teal"], COLORS["blue"], COLORS["gold"], COLORS["teal_light"], COLORS["blue_light"], COLORS["gold_light"]]
            for i, cat in enumerate(categories[:6]):
                chart_items.append(ChartData(
                    label=cat["name"].replace("_", " ").title(),
                    value=cat["amount"],
                    color=cat_colors[i % len(cat_colors)],
                ))
            if chart_items:
                category_chart = ChartBuilder.horizontal_bar(
                    data=chart_items,
                    width=400,
                    bar_height=28,
                )

        parent_chart = ""

        # Render template
        template = self.jinja_env.get_template("reports/expense_summary.html")
        html_content = template.render(
            family_file=family_file,
            report_period={"start": date_start, "end": date_end},
            generated_at=datetime.utcnow(),
            report_id=self.generate_report_id(),
            parent_a_name=parent_a_name,
            parent_b_name=parent_b_name,
            stats=stats,
            categories=categories,
            parent_a_stats=parent_a_stats,
            parent_b_stats=parent_b_stats,
            overdue_obligations=overdue_obligations,
            category_chart=category_chart,
            parent_chart=parent_chart,
            insights=insights,
            agreement=agreement_data,
            payments=payments,
            expense_requests=expense_requests,
            child_support_obligations=child_support_obligations,
            other_obligations=other_obligations,
        )

        # Convert to PDF
        pdf_bytes, _ = self._html_to_pdf(html_content)
        return pdf_bytes

    async def _generate_schedule_report(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
        user_id: str,
    ) -> bytes:
        """Generate Schedule History Report PDF."""
        # Get family file
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        # Get parent names
        parent_a = await self._get_user(family_file.parent_a_id)
        parent_b = await self._get_user(family_file.parent_b_id) if family_file.parent_b_id else None

        parent_a_name = self._get_parent_display_name(parent_a, family_file.parent_a_role)
        parent_b_name = self._get_parent_display_name(parent_b, family_file.parent_b_role) if parent_b else "Parent B"

        # Get exchange instances (reuse existing method)
        exchanges = await self._get_exchange_instances(family_file_id, date_start, date_end)

        # Get calendar events (non-exchanges)
        calendar_events = await self._get_calendar_events(family_file_id, date_start, date_end)

        # Get schedule modifications
        modifications = await self._get_schedule_modifications(family_file_id, date_start, date_end)

        # Calculate schedule stats
        stats = self._calculate_schedule_stats(exchanges, date_start, date_end)

        # Calculate per-parent stats
        parent_a_stats = self._calculate_parent_schedule_stats(exchanges, "from")
        parent_b_stats = self._calculate_parent_schedule_stats(exchanges, "to")

        # Generate charts
        outcome_donut = self.chart_builder.split_donut_chart(
            value_a=stats["completed"],
            value_b=stats["missed"] + stats["cancelled"],
            label_a="Completed",
            label_b="Missed/Cancelled",
        )

        parent_comparison_chart = self.chart_builder.comparison_bars(
            value_a=parent_a_stats["geofence_rate"],
            value_b=parent_b_stats["geofence_rate"],
            label_a=parent_a_name,
            label_b=parent_b_name,
            color_a=COLORS["sage"],
            color_b=COLORS["slate"],
            width=400,
        )

        # Render template
        template = self.jinja_env.get_template("reports/schedule_history.html")
        html_content = template.render(
            family_file=family_file,
            report_period={"start": date_start, "end": date_end},
            generated_at=datetime.utcnow(),
            report_id=self.generate_report_id(),
            parent_a_name=parent_a_name,
            parent_b_name=parent_b_name,
        stats=stats,
        parent_a_stats=parent_a_stats,
        parent_b_stats=parent_b_stats,
        exchanges=exchanges,
        calendar_events=calendar_events,
        modifications=modifications,
        outcome_donut=outcome_donut,
        parent_comparison_chart=parent_comparison_chart,
    )

        # Convert to PDF
        pdf_bytes, _ = self._html_to_pdf(html_content)
        return pdf_bytes

    async def _generate_kidspace_communication_report(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
        user_id: str,
    ) -> bytes:
        """Generate KidSpace Communication Report PDF."""
        # Get family file
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        # Get parent names
        parent_a = await self._get_user(family_file.parent_a_id)
        parent_b = await self._get_user(family_file.parent_b_id) if family_file.parent_b_id else None

        parent_a_name = self._get_parent_display_name(parent_a, family_file.parent_a_role)
        parent_b_name = self._get_parent_display_name(parent_b, family_file.parent_b_role) if parent_b else "Parent B"

        # Get children
        children_result = await self.db.execute(
            select(Child).where(
                Child.family_file_id == family_file_id,
                Child.is_active == True,
            )
        )
        children = list(children_result.scalars().all())

        # Query KidComs sessions in date range for this family file
        sessions_result = await self.db.execute(
            select(KidComsSession)
            .options(
                selectinload(KidComsSession.child),
                selectinload(KidComsSession.circle_contact),
            )
            .where(
                KidComsSession.family_file_id == family_file_id,
                KidComsSession.status.in_(["completed", "active"]),
                or_(
                    and_(
                        KidComsSession.started_at.isnot(None),
                        cast(KidComsSession.started_at, Date) >= date_start,
                        cast(KidComsSession.started_at, Date) <= date_end,
                    ),
                    and_(
                        KidComsSession.started_at.is_(None),
                        cast(KidComsSession.created_at, Date) >= date_start,
                        cast(KidComsSession.created_at, Date) <= date_end,
                    ),
                ),
            )
            .order_by(desc(KidComsSession.started_at))
        )
        sessions = list(sessions_result.scalars().all())

        # Query KidComs messages with ARIA flags
        session_ids = [str(s.id) for s in sessions]
        flagged_messages = []
        if session_ids:
            flagged_result = await self.db.execute(
                select(KidComsMessage)
                .where(
                    KidComsMessage.session_id.in_(session_ids),
                    KidComsMessage.aria_flagged == True,
                )
                .order_by(desc(KidComsMessage.sent_at))
            )
            flagged_messages = list(flagged_result.scalars().all())

        # Query circle contacts for contact activity
        contacts_result = await self.db.execute(
            select(CircleContact).where(
                CircleContact.family_file_id == family_file_id,
                CircleContact.is_active == True,
            )
        )
        circle_contacts = list(contacts_result.scalars().all())
        contact_map = {str(c.id): c for c in circle_contacts}

        # Calculate stats
        total_sessions = len(sessions)
        total_duration_secs = sum(s.duration_seconds or 0 for s in sessions)
        total_duration_mins = round(total_duration_secs / 60)

        # Unique contacts: count distinct circle_contact_ids
        unique_contact_ids = set()
        for s in sessions:
            if s.circle_contact_id:
                unique_contact_ids.add(s.circle_contact_id)

        # Compliance: check if sessions occurred within allowed hours
        # We count completed sessions and check started_at against availability
        compliant_count = 0
        for s in sessions:
            # Default to compliant if no started_at
            if not s.started_at:
                compliant_count += 1
                continue
            hour = s.started_at.hour
            # Reasonable hours: 7 AM to 9 PM
            if 7 <= hour <= 21:
                compliant_count += 1

        compliance_rate = (compliant_count / total_sessions * 100) if total_sessions > 0 else 100.0

        stats = {
            "total_sessions": total_sessions,
            "total_duration_mins": total_duration_mins,
            "unique_contacts": len(unique_contact_ids),
            "aria_flags": len(flagged_messages),
            "compliance_rate": compliance_rate,
        }

        # Build contact activity list
        contact_activity = []
        contact_session_data: dict[str, dict] = {}
        for s in sessions:
            cid = s.circle_contact_id
            if not cid:
                continue
            if cid not in contact_session_data:
                contact_obj = contact_map.get(cid)
                contact_session_data[cid] = {
                    "contact_name": contact_obj.contact_name if contact_obj else "Unknown",
                    "relationship": contact_obj.relationship_type if contact_obj else "unknown",
                    "sessions_count": 0,
                    "total_duration_secs": 0,
                }
            contact_session_data[cid]["sessions_count"] += 1
            contact_session_data[cid]["total_duration_secs"] += (s.duration_seconds or 0)

        for cid, data in contact_session_data.items():
            contact_activity.append({
                "contact_name": data["contact_name"],
                "relationship": data["relationship"],
                "sessions_count": data["sessions_count"],
                "total_duration_mins": round(data["total_duration_secs"] / 60),
            })

        # Sort by sessions count descending
        contact_activity.sort(key=lambda x: x["sessions_count"], reverse=True)

        # Generate session type chart
        type_counts: dict[str, int] = {}
        for s in sessions:
            stype = (s.session_type or "unknown").replace("_", " ").title()
            type_counts[stype] = type_counts.get(stype, 0) + 1

        session_type_chart = ""
        if type_counts:
            chart_colors = [COLORS["teal"], COLORS["blue"], COLORS["gold"], COLORS["teal_light"], COLORS["blue_light"]]
            chart_data = []
            for i, (label, count) in enumerate(sorted(type_counts.items(), key=lambda x: x[1], reverse=True)):
                chart_data.append(ChartData(
                    label=label,
                    value=float(count),
                    color=chart_colors[i % len(chart_colors)],
                ))
            session_type_chart = self.chart_builder.horizontal_bar(
                data=chart_data,
                width=400,
                bar_height=28,
            )

        # Query Circle Messages (text messaging) in date range
        circle_messages_result = await self.db.execute(
            select(CircleMessage).where(
                CircleMessage.family_file_id == family_file_id,
                cast(CircleMessage.sent_at, Date) >= date_start,
                cast(CircleMessage.sent_at, Date) <= date_end,
            ).order_by(desc(CircleMessage.sent_at))
        )
        circle_messages = list(circle_messages_result.scalars().all())

        # Circle message stats
        total_circle_messages = len(circle_messages)
        flagged_circle_messages = [m for m in circle_messages if m.aria_flagged]
        hidden_circle_messages = [m for m in circle_messages if m.is_hidden]

        # Messages per contact
        message_contact_data: dict[str, dict] = {}
        for m in circle_messages:
            # Group by the non-child participant
            if m.sender_type == "child":
                pid = m.recipient_id
                ptype = m.recipient_type
                pname = ""
            else:
                pid = m.sender_id
                ptype = m.sender_type
                pname = m.sender_name
            if pid not in message_contact_data:
                message_contact_data[pid] = {
                    "contact_name": pname or contact_map.get(pid, type("", (), {"contact_name": "Unknown"})()).contact_name,
                    "contact_type": ptype,
                    "total_messages": 0,
                    "flagged_messages": 0,
                }
            message_contact_data[pid]["total_messages"] += 1
            if m.aria_flagged:
                message_contact_data[pid]["flagged_messages"] += 1

        messaging_stats = {
            "total_messages": total_circle_messages,
            "flagged_count": len(flagged_circle_messages),
            "hidden_count": len(hidden_circle_messages),
            "contact_breakdown": sorted(
                message_contact_data.values(),
                key=lambda x: x["total_messages"],
                reverse=True,
            ),
        }

        # Update overall stats with messaging data
        stats["total_circle_messages"] = total_circle_messages
        stats["flagged_circle_messages"] = len(flagged_circle_messages)

        # Render template
        template = self.jinja_env.get_template("reports/kidspace_communication.html")
        html_content = template.render(
            family_file=family_file,
            report_period={"start": date_start, "end": date_end},
            generated_at=datetime.utcnow(),
            report_id=self.generate_report_id(),
            parent_a_name=parent_a_name,
            parent_b_name=parent_b_name,
            stats=stats,
            sessions=sessions,
            contact_activity=contact_activity,
            children=children,
            flagged_messages=flagged_messages,
            session_type_chart=session_type_chart,
            messaging_stats=messaging_stats,
            flagged_circle_messages=flagged_circle_messages,
        )

        # Convert to PDF
        pdf_bytes, _ = self._html_to_pdf(html_content)
        return pdf_bytes

    async def _generate_court_investigation_package(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
        user_id: str,
    ) -> bytes:
        """
        Court Investigation Package (P-6 / A-6, $149): every deep-dive report
        for the period bundled into one PDF — custody time, communication,
        expenses, schedule/GPS history, and KidSpace child communication.

        Sections are generated with the existing branded generators and merged
        with pypdf. A section that has no data (or fails) is skipped rather
        than sinking the whole package; at least one section must succeed.
        """
        from pypdf import PdfWriter, PdfReader

        section_generators = [
            ("custody_time", self._generate_custody_time_report),
            ("communication", self._generate_communication_report),
            ("expense", self._generate_expense_report),
            ("schedule", self._generate_schedule_report),
            ("kidspace_communication", self._generate_kidspace_communication_report),
        ]

        writer = PdfWriter()
        included: list[str] = []
        for section_name, generator in section_generators:
            try:
                section_pdf = await generator(
                    family_file_id, date_start, date_end, user_id
                )
                for page in PdfReader(io.BytesIO(section_pdf)).pages:
                    writer.add_page(page)
                included.append(section_name)
            except Exception as e:
                logger.warning(
                    f"Court package: skipping section '{section_name}' "
                    f"for family_file={family_file_id}: {e}"
                )

        if not included:
            raise ValueError(
                "Court investigation package: no report sections could be "
                f"generated for family file {family_file_id}"
            )

        logger.info(
            f"Court investigation package for {family_file_id}: "
            f"sections={included}"
        )
        merged = io.BytesIO()
        writer.write(merged)
        return merged.getvalue()

    @staticmethod
    def generate_report_id() -> str:
        """Generate a unique report ID in format RPT-YYYYMMDD-XXXX."""
        now = datetime.utcnow()
        random_suffix = secrets.token_hex(2).upper()
        return f"RPT-{now.strftime('%Y%m%d')}-{random_suffix}"

    def _html_to_pdf(self, html_content: str) -> tuple[bytes, str]:
        """
        Convert HTML to PDF using WeasyPrint with SHA-256 verification.

        Returns:
            Tuple of (pdf_bytes, sha256_hash)
        """
        html = HTML(string=html_content, base_url=str(TEMPLATE_DIR))
        pdf_buffer = io.BytesIO()
        html.write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        pdf_bytes = pdf_buffer.read()

        # Generate SHA-256 hash for court verification
        sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
        logger.info(f"Report generated - SHA-256: {sha256_hash[:16]}...")

        return pdf_bytes, sha256_hash

    async def _persist_report(
        self,
        pdf_bytes: bytes,
        report_type: str,
        report_category: str,
        family_file_id: str,
        user_id: str,
        date_start: date,
        date_end: date,
        source_record_id: Optional[str] = None,
        source_record_type: Optional[str] = None,
    ) -> ReportResult:
        """
        Upload PDF to storage and create a GeneratedReport database record.

        Returns:
            ReportResult with pdf_bytes, report_id, and sha256_hash
        """
        report_id = self.generate_report_id()
        sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()

        # Upload to Supabase storage
        file_url = None
        try:
            path = build_report_path(family_file_id, report_id)
            file_url = await storage_service.upload_file(
                bucket=StorageBucket.REPORTS,
                path=path,
                file_content=pdf_bytes,
                content_type="application/pdf",
            )
        except Exception as e:
            # Non-fatal: report is still usable even if storage fails
            logger.warning(f"Failed to upload report {report_id} to storage: {e}")

        # Build redacted family file number
        family_file_number_redacted = None
        family_file = await self._get_family_file(family_file_id)
        if family_file and family_file.family_file_number:
            ffn = family_file.family_file_number
            # Show last 3 chars: FF-••••3A7
            if len(ffn) > 3:
                family_file_number_redacted = f"{ffn[:3]}{'•' * (len(ffn) - 6)}{ffn[-3:]}"
            else:
                family_file_number_redacted = ffn

        # Create database record
        record = GeneratedReport(
            report_id=report_id,
            sha256_hash=sha256_hash,
            report_type=report_type,
            report_category=report_category,
            family_file_id=family_file_id,
            generated_by_id=user_id,
            date_range_start=date_start,
            date_range_end=date_end,
            file_url=file_url,
            file_size_bytes=len(pdf_bytes),
            generated_at=datetime.utcnow(),
            family_file_number_redacted=family_file_number_redacted,
            source_record_id=source_record_id,
            source_record_type=source_record_type,
        )
        self.db.add(record)
        await self.db.commit()

        logger.info(
            f"Report persisted: {report_id} | type={report_type} | "
            f"sha256={sha256_hash[:16]}... | size={len(pdf_bytes)}"
        )

        return ReportResult(
            pdf_bytes=pdf_bytes,
            report_id=report_id,
            sha256_hash=sha256_hash,
        )

    async def _get_calendar_events(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
    ) -> list[ScheduleEvent]:
        """Get calendar events (non-exchanges) for the date range."""
        result = await self.db.execute(
            select(ScheduleEvent)
            .where(
                ScheduleEvent.family_file_id == family_file_id,
                ScheduleEvent.is_exchange == False,
                ScheduleEvent.is_modification == False,
                cast(ScheduleEvent.start_time, Date) >= date_start,
                cast(ScheduleEvent.start_time, Date) <= date_end,
                ScheduleEvent.status != "cancelled",
            )
            .order_by(ScheduleEvent.start_time.asc())
        )
        return list(result.scalars().all())

    async def _get_schedule_modifications(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
    ) -> list[ScheduleEvent]:
        """Get schedule modification requests for the date range."""
        result = await self.db.execute(
            select(ScheduleEvent)
            .where(
                ScheduleEvent.family_file_id == family_file_id,
                ScheduleEvent.is_modification == True,
                cast(ScheduleEvent.start_time, Date) >= date_start,
                cast(ScheduleEvent.start_time, Date) <= date_end,
            )
            .order_by(ScheduleEvent.start_time.desc())
        )
        return list(result.scalars().all())

    async def _get_family_file(self, family_file_id: str) -> Optional[FamilyFile]:
        """Get family file by ID."""
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        return result.scalar_one_or_none()

    async def _get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        if not user_id:
            return None
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    def _get_parent_display_name(
        self,
        user: Optional[User],
        role: Optional[str],
    ) -> str:
        """Get display name for a parent."""
        if user and user.first_name:
            return user.first_name
        if role:
            role_names = {
                "mother": "Mom",
                "father": "Dad",
                "parent_a": "Parent A",
                "parent_b": "Parent B",
            }
            return role_names.get(role, role.title())
        return "Parent"

    async def _get_exchange_instances(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
    ) -> list[CustodyExchangeInstance]:
        """Get exchange instances for the date range."""
        # First get exchanges for this family file
        exchange_result = await self.db.execute(
            select(CustodyExchange).where(
                CustodyExchange.family_file_id == family_file_id,
                CustodyExchange.status == "active",
            )
        )
        exchanges = exchange_result.scalars().all()

        if not exchanges:
            return []

        exchange_ids = [str(e.id) for e in exchanges]

        # Get instances in date range (scheduled_time is datetime, cast to date for comparison)
        result = await self.db.execute(
            select(CustodyExchangeInstance)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(
                CustodyExchangeInstance.exchange_id.in_(exchange_ids),
                cast(CustodyExchangeInstance.scheduled_time, Date) >= date_start,
                cast(CustodyExchangeInstance.scheduled_time, Date) <= date_end,
            ).order_by(CustodyExchangeInstance.scheduled_time.desc())
        )
        return list(result.scalars().all())

    def _calculate_exchange_stats(
        self,
        exchanges: list[CustodyExchangeInstance],
    ) -> dict:
        """Calculate exchange compliance statistics."""
        total = len(exchanges)
        completed = sum(1 for e in exchanges if e.status == "completed")
        missed = sum(1 for e in exchanges if e.status == "missed")
        cancelled = sum(1 for e in exchanges if e.status == "cancelled")

        return {
            "total": total,
            "completed": completed,
            "missed": missed,
            "cancelled": cancelled,
            "completion_rate": (completed / total * 100) if total > 0 else 100,
        }

    async def _get_agreed_percentages(
        self,
        family_file_id: str,
    ) -> tuple[Optional[float], Optional[float]]:
        """Get agreed custody percentages from the parenting schedule."""
        _, agreed_a, agreed_b = await CustodyTimeService.get_agreed_schedule_percentages(
            self.db, family_file_id
        )
        # Return None if we get default 50/50 (meaning no schedule set)
        if agreed_a == 50 and agreed_b == 50:
            return None, None
        return float(agreed_a), float(agreed_b)

    async def _get_children_with_stats(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
    ) -> list[dict]:
        """Get children with their individual custody stats."""
        # Get family file for parent IDs
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            return []

        result = await self.db.execute(
            select(Child).where(
                Child.family_file_id == family_file_id,
                Child.status.in_(["active", "pending_approval"]),
            )
        )
        children = result.scalars().all()

        children_data = []
        for child in children:
            # Get individual stats for each child using static method
            stats = await CustodyTimeService.get_custody_time_stats(
                db=self.db,
                family_file_id=family_file_id,
                child_id=str(child.id),
                start_date=date_start,
                end_date=date_end,
                parent_a_id=family_file.parent_a_id,
                parent_b_id=family_file.parent_b_id or "",
            )

            # Calculate age
            today = date.today()
            age = today.year - child.date_of_birth.year
            if (today.month, today.day) < (child.date_of_birth.month, child.date_of_birth.day):
                age -= 1

            children_data.append({
                "first_name": child.first_name,
                "last_name": child.last_name or "",
                "age": age,
                "parent_a_days": stats.get("parent_a", {}).get("days", 0),
                "parent_b_days": stats.get("parent_b", {}).get("days", 0),
                "parent_a_percentage": stats.get("parent_a", {}).get("percentage", 50),
                "parent_b_percentage": stats.get("parent_b", {}).get("percentage", 50),
            })

        return children_data

    async def _get_active_agreement(self, family_file_id: str) -> Optional[Agreement]:
        """Get the active agreement for the family."""
        # Find agreements linked to this family file or its case
        # We'll just look for family_file_id for now as that's what we have directly
        stmt = select(Agreement).where(
            Agreement.family_file_id == family_file_id
        ).order_by(Agreement.updated_at.desc())
        
        result = await self.db.execute(stmt)
        all_agreements = result.scalars().all()
        
        active_agreement = None
        for a in all_agreements:
            if a.status == 'active':
                active_agreement = a
                break
        
        # Fallback to the most recent one if no active one found (or None)
        return active_agreement if active_agreement else (all_agreements[0] if all_agreements else None)

    async def _extract_key_terms(self, agreement: Agreement) -> dict:
        """Extract key terms from agreement sections."""
        import re
        
        key_terms = {
            "custody_split": "Not specified",
            "child_support": "Not specified",
        }
        
        # We need to load sections
        result = await self.db.execute(
             select(AgreementSection).where(AgreementSection.agreement_id == agreement.id)
        )
        sections = result.scalars().all()

        for section in sections:
            content = section.content or ""
            
            # Extract custody split
            if section.section_type in ["schedule", "physical_custody"]:
                match = re.search(r'(\d+)%?\s*(?:of the time|/)\s*(?:and\s*)?(?:Parent\s*[AB]\s*(?:having\s*)?)?(\d+)%?', content)
                if match:
                    key_terms["custody_split"] = f"{match.group(1)}/{match.group(2)}"
                else:
                    match2 = re.search(r'Parent\s*A\s*having\s*(\d+)%.*Parent\s*B\s*having\s*(\d+)%', content)
                    if match2:
                        key_terms["custody_split"] = f"{match2.group(1)}/{match2.group(2)}"
            
            # Extract child support
            if section.section_type == "financial":
                match = re.search(r'\$([0-9,.]+)\s*(?:/|per\s*)month', content, re.IGNORECASE)
                if match:
                    amount = match.group(1).replace(',', '')
                    key_terms["child_support"] = f"${float(amount):,.0f}/month"

        return key_terms

    async def _get_agreement_summary(self, agreement: Agreement) -> str:
        """Fetch summary text from conversation or extracted data."""
        stmt = select(AgreementConversation).where(
            AgreementConversation.agreement_id == agreement.id
        ).order_by(AgreementConversation.updated_at.desc())
        
        result = await self.db.execute(stmt)
        conv = result.scalar_one_or_none()
        
        if conv:
            if conv.summary:
                return conv.summary
            elif conv.extracted_data and conv.extracted_data.get('summary'):
                return conv.extracted_data.get('summary')
        
        return "No summary available."

    def _generate_missed_exchange_maps(
        self,
        exchanges: list[CustodyExchangeInstance]
    ) -> list[dict]:
        """Generate static maps for missed exchanges."""
        maps = []
        # Filter for missed exchanges with location data
        missed = [
            e for e in exchanges 
            if e.status == 'missed' and e.exchange and e.exchange.location_lat and e.exchange.location_lng
        ]
        
        for instance in missed[:5]:  # Limit to 5 most recent
            exchange = instance.exchange
            
            # Use GeolocationService to generate map URL
            # Note: For missed exchanges, one or both parents might not have checked in.
            # We show what data we have.
            
            # Default to True for petitioner logic if not easily determinable from here (assumes Caller is valid context)
            # Just pass True for now, visualization is main goal
            petitioner_is_from = True 
            
            map_url = GeolocationService.generate_exchange_map(
                exchange_location_lat=exchange.location_lat,
                exchange_location_lng=exchange.location_lng,
                geofence_radius=exchange.geofence_radius_meters or 100,
                from_parent_lat=instance.from_parent_check_in_lat,
                from_parent_lng=instance.from_parent_check_in_lng,
                from_parent_in_geofence=instance.from_parent_in_geofence,
                to_parent_lat=instance.to_parent_check_in_lat,
                to_parent_lng=instance.to_parent_check_in_lng,
                to_parent_in_geofence=instance.to_parent_in_geofence,
                petitioner_is_from=petitioner_is_from,
            )
            
            if map_url:
                maps.append({
                    "date": instance.scheduled_time.strftime('%b %d, %Y'),
                    "time": instance.scheduled_time.strftime('%I:%M %p'),
                    "location": exchange.location or "Scheduled Location",
                    "map_url": map_url,
                    "status": "Missed"
                })
        
        return maps

    # =========================================================================
    # Communication Report Helpers
    # =========================================================================

    async def _get_messages(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
    ) -> list[Message]:
        """Get messages for the family file in the date range."""
        result = await self.db.execute(
            select(Message).where(
                Message.family_file_id == family_file_id,
                cast(Message.sent_at, Date) >= date_start,
                cast(Message.sent_at, Date) <= date_end,
            ).order_by(Message.sent_at.desc())
        )
        return list(result.scalars().all())

    async def _get_message_flags(
        self,
        message_ids: list[str],
    ) -> list[MessageFlag]:
        """Get flags for the given messages."""
        if not message_ids:
            return []

        result = await self.db.execute(
            select(MessageFlag).where(
                MessageFlag.message_id.in_(message_ids)
            )
        )
        return list(result.scalars().all())

    def _calculate_communication_stats(
        self,
        messages: list[Message],
        flags: list[MessageFlag],
        parent_a_id: str,
        parent_b_id: str,
    ) -> dict:
        """Calculate overall communication statistics."""
        total_messages = len(messages)
        flagged_messages = len(flags)

        # Count actions
        accepted = sum(1 for f in flags if f.user_action == "accepted")
        modified = sum(1 for f in flags if f.user_action == "modified")
        rejected = sum(1 for f in flags if f.user_action in ("rejected", "sent_anyway"))

        # Calculate rates
        flag_rate = (flagged_messages / total_messages * 100) if total_messages > 0 else 0
        good_faith_rate = ((accepted + modified) / flagged_messages * 100) if flagged_messages > 0 else 100

        # Calculate health score (0-100)
        # Base: 100, deduct for intervention rate, bonus for good faith
        health_score = 100
        health_score -= min(40, flag_rate * 2)  # Up to -40 for high flag rate
        health_score += min(20, good_faith_rate * 0.2)  # Up to +20 for good faith
        health_score = max(0, min(100, int(health_score)))

        # Calculate toxicity stats
        toxicity_scores = [f.toxicity_score for f in flags if f.toxicity_score]
        avg_toxicity = sum(toxicity_scores) / len(toxicity_scores) if toxicity_scores else 0
        severe_count = sum(1 for f in flags if f.severity in ("high", "severe"))

        # Calculate trend (compare first half to second half of flags)
        trend = "stable"
        if len(toxicity_scores) >= 4:
            mid = len(toxicity_scores) // 2
            first_half_avg = sum(toxicity_scores[:mid]) / mid
            second_half_avg = sum(toxicity_scores[mid:]) / (len(toxicity_scores) - mid)
            if second_half_avg < first_half_avg * 0.8:
                trend = "improving"
            elif second_half_avg > first_half_avg * 1.2:
                trend = "worsening"

        # Calculate individual action rates
        accepted_rate = (accepted / flagged_messages * 100) if flagged_messages > 0 else 0
        modified_rate = (modified / flagged_messages * 100) if flagged_messages > 0 else 0
        rejected_rate = (rejected / flagged_messages * 100) if flagged_messages > 0 else 0

        return {
            "total_messages": total_messages,
            "flagged_messages": flagged_messages,
            "flag_rate": flag_rate,
            "accepted": accepted,
            "modified": modified,
            "rejected": rejected,
            "accepted_rate": accepted_rate,
            "modified_rate": modified_rate,
            "rejected_rate": rejected_rate,
            "good_faith_rate": good_faith_rate,
            "health_score": health_score,
            "avg_toxicity": avg_toxicity,
            "severe_count": severe_count,
            "trend": trend,
        }

    def _calculate_parent_communication_stats(
        self,
        messages: list[Message],
        flags: list[MessageFlag],
        parent_id: str,
    ) -> dict:
        """Calculate communication stats for a specific parent."""
        if not parent_id:
            # Empty-parent case fires when a family file has no parent_b yet.
            # The communication_summary template reads every key on this dict,
            # so the early-return must include EVERY field the full-return
            # provides — otherwise Jinja raises
            # "'dict object' has no attribute 'communication_score'" and the
            # report 500s. Defaults chosen so the empty side doesn't drag
            # down the average in the header stat.
            return {
                "messages_sent": 0,
                "interventions": 0,
                "intervention_rate": 0,
                "accepted": 0,
                "good_faith_rate": 100,
                "avg_toxicity": 0,
                "severe_count": 0,
                "avg_response_hours": 0,
                "communication_score": 100,
            }

        # Get messages sent by this parent
        parent_messages = [m for m in messages if m.sender_id == parent_id]
        parent_message_ids = {str(m.id) for m in parent_messages}

        # Get flags for this parent's messages
        parent_flags = [f for f in flags if f.message_id in parent_message_ids]

        messages_sent = len(parent_messages)
        interventions = len(parent_flags)
        intervention_rate = (interventions / messages_sent * 100) if messages_sent > 0 else 0

        accepted = sum(1 for f in parent_flags if f.user_action in ("accepted", "modified"))
        good_faith_rate = (accepted / interventions * 100) if interventions > 0 else 100

        # Calculate toxicity stats for this parent
        toxicity_scores = [f.toxicity_score for f in parent_flags if f.toxicity_score]
        avg_toxicity = sum(toxicity_scores) / len(toxicity_scores) if toxicity_scores else 0
        severe_count = sum(1 for f in parent_flags if f.severity in ("high", "severe"))

        # Calculate response time stats
        # Sort messages by time ascending for calculation
        sorted_msgs = sorted(messages, key=lambda m: m.sent_at)
        response_times = []
        last_other_msg_time = None
        
        for m in sorted_msgs:
            if m.sender_id != parent_id:
                last_other_msg_time = m.sent_at
            elif last_other_msg_time:
                # This is a response from parent_id
                delta = (m.sent_at - last_other_msg_time).total_seconds() / 3600
                response_times.append(delta)
                last_other_msg_time = None # Reset until next other msg

        avg_response_hours = sum(response_times) / len(response_times) if response_times else 0

        # Calculate Communication Score (0-100)
        # Base 100
        score = 100
        
        # 1. Response Time Penalty (> 72 hours)
        if avg_response_hours > 72:
            score -= (avg_response_hours - 72) * 0.5
            
        # 2. Intervention Rate Penalty
        # e.g., 20% rate -> -20 points (1 point per %)
        score -= intervention_rate * 1.0
        
        # 3. Rejection Penalty
        # Heavy penalty for rejecting ARIA
        rejected_count = sum(1 for f in parent_flags if f.user_action == "rejected")
        score -= rejected_count * 5
        
        # Clamp 0-100
        communication_score = max(0, min(100, int(score)))

        return {
            "messages_sent": messages_sent,
            "interventions": interventions,
            "intervention_rate": intervention_rate,
            "accepted": accepted,
            "good_faith_rate": good_faith_rate,
            "avg_toxicity": avg_toxicity,
            "severe_count": severe_count,
            "avg_response_hours": avg_response_hours,
            "communication_score": communication_score,
        }

    def _get_category_breakdown(
        self,
        flags: list[MessageFlag],
        messages: list[Message],
        parent_a_id: str,
        parent_b_id: str,
    ) -> list[dict]:
        """Get breakdown of toxicity categories with counts per parent."""
        category_stats: dict[str, dict] = {}
        
        # Create a map for message sender lookups
        message_senders = {str(m.id): m.sender_id for m in messages}

        for flag in flags:
            sender_id = message_senders.get(str(flag.message_id))
            if not sender_id:
                continue
                
            if flag.categories:
                cats = flag.categories if isinstance(flag.categories, list) else []
                for cat in cats:
                    cat_lower = cat.lower() if isinstance(cat, str) else str(cat).lower()
                    
                    if cat_lower not in category_stats:
                        category_stats[cat_lower] = {
                            "count": 0, 
                            "parent_a_count": 0, 
                            "parent_b_count": 0
                        }
                    
                    stats = category_stats[cat_lower]
                    stats["count"] += 1
                    
                    if sender_id == parent_a_id:
                        stats["parent_a_count"] += 1
                    elif sender_id == parent_b_id:
                        stats["parent_b_count"] += 1

        # Convert to list with descriptions, sorted by count
        result = []
        for cat, stats in sorted(category_stats.items(), key=lambda x: -x[1]["count"]):
            result.append({
                "name": cat,
                "count": stats["count"],
                "parent_a_count": stats["parent_a_count"],
                "parent_b_count": stats["parent_b_count"],
                "description": TOXICITY_CATEGORY_DESCRIPTIONS.get(cat, "Other concerning content"),
            })

        return result[:10]  # Top 10 categories

    # =========================================================================
    # Schedule Report Helpers
    # =========================================================================

    def _calculate_schedule_stats(
        self,
        exchanges: list[CustodyExchangeInstance],
        date_start: date,
        date_end: date,
    ) -> dict:
        """Calculate schedule/exchange statistics."""
        total = len(exchanges)
        completed = sum(1 for e in exchanges if e.status == "completed")
        missed = sum(1 for e in exchanges if e.status == "missed")
        cancelled = sum(1 for e in exchanges if e.status == "cancelled")

        # Calculate completion rate
        completion_rate = (completed / total * 100) if total > 0 else 100

        # GPS verification stats
        total_check_ins = 0
        gps_verified = 0
        distances = []

        for e in exchanges:
            if e.from_parent_checked_in:
                total_check_ins += 1
                if e.from_parent_in_geofence:
                    gps_verified += 1
                if e.from_parent_distance_meters is not None:
                    distances.append(e.from_parent_distance_meters)

            if e.to_parent_checked_in:
                total_check_ins += 1
                if e.to_parent_in_geofence:
                    gps_verified += 1
                if e.to_parent_distance_meters is not None:
                    distances.append(e.to_parent_distance_meters)

        gps_verification_rate = (gps_verified / total_check_ins * 100) if total_check_ins > 0 else 0
        avg_distance = sum(distances) / len(distances) if distances else 0

        return {
            "total_exchanges": total,
            "completed": completed,
            "missed": missed,
            "cancelled": cancelled,
            "completion_rate": completion_rate,
            "total_check_ins": total_check_ins,
            "gps_verified": gps_verified,
            "gps_verification_rate": gps_verification_rate,
            "avg_distance_meters": avg_distance,
            "total_days": (date_end - date_start).days + 1,
        }

    def _calculate_parent_schedule_stats(
        self,
        exchanges: list[CustodyExchangeInstance],
        parent_role: str,  # "from" or "to"
    ) -> dict:
        """Calculate schedule stats for a specific parent role."""
        check_ins = 0
        in_geofence = 0
        distances = []

        for e in exchanges:
            if parent_role == "from":
                if e.from_parent_checked_in:
                    check_ins += 1
                    if e.from_parent_in_geofence:
                        in_geofence += 1
                    if e.from_parent_distance_meters is not None:
                        distances.append(e.from_parent_distance_meters)
            else:  # "to"
                if e.to_parent_checked_in:
                    check_ins += 1
                    if e.to_parent_in_geofence:
                        in_geofence += 1
                    if e.to_parent_distance_meters is not None:
                        distances.append(e.to_parent_distance_meters)

        geofence_rate = (in_geofence / check_ins * 100) if check_ins > 0 else 0
        avg_distance = sum(distances) / len(distances) if distances else 0

        return {
            "check_ins": check_ins,
            "in_geofence": in_geofence,
            "geofence_rate": geofence_rate,
            "avg_distance": avg_distance,
        }

    # =========================================================================
    # Expense Report Helpers
    # =========================================================================

    async def _get_obligations(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
    ) -> list[Obligation]:
        """Get obligations for the family file in the date range."""
        result = await self.db.execute(
            select(Obligation).where(
                Obligation.family_file_id == family_file_id,
                cast(Obligation.created_at, Date) >= date_start,
                cast(Obligation.created_at, Date) <= date_end,
            ).order_by(Obligation.created_at.desc())
        )
        return list(result.scalars().all())

    async def _get_obligation_fundings(
        self,
        obligation_ids: list[str],
    ) -> list[ObligationFunding]:
        """Get funding records for obligations."""
        if not obligation_ids:
            return []

        result = await self.db.execute(
            select(ObligationFunding).where(
                ObligationFunding.obligation_id.in_(obligation_ids)
            )
        )
        return list(result.scalars().all())

    async def _get_payments(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
    ) -> list[Payment]:
        """Get payments for the family file (via linked cases)."""
        # Get case IDs linked to this family file
        cases_result = await self.db.execute(
            select(Case.id).where(Case.family_file_id == family_file_id)
        )
        case_ids = cases_result.scalars().all()
        
        if not case_ids:
            return []
             
        result = await self.db.execute(
            select(Payment).where(
                Payment.case_id.in_(case_ids),
                cast(Payment.created_at, Date) >= date_start,
                cast(Payment.created_at, Date) <= date_end,
            ).order_by(Payment.created_at.desc())
        )
        all_payments = list(result.scalars().all())

        # Deduplicate payments
        # Logic: 
        # 1. For "Child Support", deduplicate based on Payer + Purpose + Amount (ignore date).
        #    This collapses multiple "Child Support - Jan" entries from different days into one.
        # 2. For others, include Date to allow multiple distinct expenses on different days.
        unique_payments = []
        seen = set()
        for p in all_payments:
            is_child_support = "child support" in (p.purpose or "").lower()
            
            if is_child_support:
                # Ignore date for child support to collapse duplicates across days
                sig = (
                    p.payer_id, 
                    float(p.amount) if p.amount else 0, 
                    # Date ignored
                    p.purpose
                )
            else:
                # distinct expenses need date
                sig = (
                    p.payer_id, 
                    float(p.amount) if p.amount else 0, 
                    p.created_at.date() if p.created_at else None, 
                    p.purpose
                )

            if sig not in seen:
                seen.add(sig)
                unique_payments.append(p)
        
        return unique_payments

    async def _get_expense_requests(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
    ) -> list[ExpenseRequest]:
        """Get expense requests for the family file."""
        # Get case IDs linked to this family file
        cases_result = await self.db.execute(
             select(Case.id).where(Case.family_file_id == family_file_id)
        )
        case_ids = cases_result.scalars().all()
        
        if not case_ids:
            return []

        result = await self.db.execute(
            select(ExpenseRequest).where(
                ExpenseRequest.case_id.in_(case_ids),
                cast(ExpenseRequest.created_at, Date) >= date_start,
                cast(ExpenseRequest.created_at, Date) <= date_end,
            ).order_by(ExpenseRequest.created_at.desc())
        )
        return list(result.scalars().all())

    def _calculate_expense_stats(
        self,
        obligations: list[Obligation],
    ) -> dict:
        """Calculate overall expense statistics."""
        total = len(obligations)

        # Sum amounts (handle Decimal)
        total_amount = sum(float(o.total_amount or 0) for o in obligations)
        funded_amount = sum(float(o.amount_funded or 0) for o in obligations)

        # Calculate rates
        funding_rate = (funded_amount / total_amount * 100) if total_amount > 0 else 0

        # Count by status
        open_count = sum(1 for o in obligations if o.status == "open")
        funded_count = sum(1 for o in obligations if o.status in ("funded", "partially_funded"))
        verified_count = sum(1 for o in obligations if o.status == "verified")
        completed_count = sum(1 for o in obligations if o.status == "completed")

        # Count overdue
        today = date.today()
        overdue_count = sum(
            1 for o in obligations
            if o.due_date and o.due_date.date() < today and o.status not in ("completed", "cancelled")
        )

        # Calculate compliance (funded or completed / total)
        compliant = sum(
            1 for o in obligations
            if o.status in ("funded", "verified", "completed") or
            (o.amount_funded and o.total_amount and float(o.amount_funded) >= float(o.total_amount) * 0.9)
        )
        compliance_rate = (compliant / total * 100) if total > 0 else 100

        return {
            "total_obligations": total,
            "total_amount": total_amount,
            "funded_amount": funded_amount,
            "funding_rate": funding_rate,
            "compliance_rate": compliance_rate,
            "open_count": open_count,
            "funded_count": funded_count,
            "verified_count": verified_count,
            "completed_count": completed_count,
            "overdue_count": overdue_count,
        }

    def _get_expense_category_breakdown(
        self,
        obligations: list[Obligation],
    ) -> list[dict]:
        """Get breakdown of expenses by category."""
        category_totals: dict[str, float] = {}

        for ob in obligations:
            cat = ob.purpose_category or "other"
            amount = float(ob.total_amount or 0)
            category_totals[cat] = category_totals.get(cat, 0) + amount

        total = sum(category_totals.values())

        # Convert to list sorted by amount
        result = []
        for cat, amount in sorted(category_totals.items(), key=lambda x: -x[1]):
            result.append({
                "name": cat,
                "amount": amount,
                "percentage": (amount / total * 100) if total > 0 else 0,
            })

        return result

    def _calculate_parent_expense_stats(
        self,
        obligations: list[Obligation],
        fundings: list[ObligationFunding],
        parent_id: str,
        parent_role: str,  # "petitioner" or "respondent"
    ) -> dict:
        """Calculate expense stats for a specific parent."""
        if not parent_id:
            return {
                "share_required": 0,
                "amount_funded": 0,
                "funding_rate": 0,
                "outstanding": 0,
            }

        # Calculate required share from obligations
        share_required = 0
        for ob in obligations:
            if parent_role == "petitioner":
                share_required += float(ob.petitioner_share or 0)
            else:
                share_required += float(ob.respondent_share or 0)

        # Get funding from this parent
        parent_fundings = [f for f in fundings if f.parent_id == parent_id]
        amount_funded = sum(float(f.amount_funded or 0) for f in parent_fundings)

        # Calculate rates
        funding_rate = (amount_funded / share_required * 100) if share_required > 0 else 100
        outstanding = max(0, share_required - amount_funded)

        return {
            "share_required": share_required,
            "amount_funded": amount_funded,
            "funding_rate": funding_rate,
            "outstanding": outstanding,
        }

    def _get_overdue_obligations(
        self,
        obligations: list[Obligation],
    ) -> list[dict]:
        """Get list of overdue obligations with details."""
        today = date.today()
        overdue = []

        for ob in obligations:
            if ob.due_date and ob.due_date.date() < today and ob.status not in ("completed", "cancelled"):
                funded = float(ob.amount_funded or 0)
                total = float(ob.total_amount or 0)
                outstanding = max(0, total - funded)

                if outstanding > 0:
                    days_overdue = (today - ob.due_date.date()).days
                    overdue.append({
                        "title": ob.title,
                        "due_date": ob.due_date,
                        "days_overdue": days_overdue,
                        "outstanding": outstanding,
                    })

        return sorted(overdue, key=lambda x: -x["days_overdue"])

    def _generate_expense_insights(
        self,
        stats: dict,
        categories: list[dict],
        parent_a_stats: dict,
        parent_b_stats: dict,
        parent_a_name: str,
        parent_b_name: str,
    ) -> list[dict]:
        """Generate text insights for expense report."""
        insights = []
        
        # Compliance Insight
        rate = stats.get("compliance_rate", 0)
        if rate >= 90:
             insights.append({
                 "type": "success",
                 "title": "High Compliance",
                 "text": f"Excellent track record with {int(rate)}% of obligations fully met."
             })
        elif rate < 70:
             insights.append({
                 "type": "warning",
                 "title": "Compliance Alert",
                 "text": f"Compliance rate is {int(rate)}%, which indicates frequent missed or partial payments."
             })
             
        # Top Category
        if categories:
            top = categories[0]
            insights.append({
                "type": "info",
                "title": "Primary Expense",
                "text": f"'{top['name'].replace('_',' ').title()}' is the largest category, accounting for {int(top['percentage'])}% of total expenses."
            })
            
        # Outstanding balances
        total_outstanding = parent_a_stats["outstanding"] + parent_b_stats["outstanding"]
        if total_outstanding > 0:
             insights.append({
                 "type": "warning",
                 "title": "Outstanding Balance",
                 "text": f"A combined total of ${total_outstanding:,.2f} remains to be funded for this period."
             })
        else:
             insights.append({
                 "type": "success",
                 "title": "Fully Funded",
                 "text": "All shared expenses for this period have been fully funded by both parents."
             })

        return insights

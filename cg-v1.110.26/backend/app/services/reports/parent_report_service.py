"""
ParentReportService - Generate beautiful branded PDF reports for parents.

Uses Jinja2 templates + WeasyPrint for HTML-to-PDF conversion.
"""

import io
import logging
from datetime import date, datetime
from pathlib import Path
from typing import Literal, Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select, and_, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML, CSS

from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.clearfund import Obligation, ObligationFunding
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.message import Message, MessageFlag
from app.models.user import User
from app.services.custody_time import CustodyTimeService
from .chart_builder import ChartBuilder, COLORS

# Toxicity category descriptions for reports
TOXICITY_CATEGORY_DESCRIPTIONS = {
    "profanity": "Use of inappropriate language",
    "insult": "Personal attacks or name-calling",
    "hostility": "Aggressive or confrontational tone",
    "sarcasm": "Mocking or dismissive sarcasm",
    "blame": "Placing fault without constructive intent",
    "dismissive": "Minimizing concerns or feelings",
    "threatening": "Implied or explicit threats",
    "manipulation": "Attempts to control or guilt-trip",
    "passive_aggressive": "Indirect hostility or backhanded comments",
    "all_caps": "Shouting (all capital letters)",
    "custody_weaponization": "Using children as leverage",
    "financial_coercion": "Using money as control",
    "hate_speech": "Discriminatory language",
    "sexual_harassment": "Inappropriate sexual content",
    "controlling": "Attempts to dictate or control",
}

logger = logging.getLogger(__name__)

# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates" / "reports"

ReportType = Literal["custody_time", "communication", "expense", "schedule"]


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
    ) -> bytes:
        """
        Generate a PDF report.

        Args:
            report_type: Type of report to generate
            family_file_id: Family file to report on
            date_start: Start date for report period
            date_end: End date for report period
            user_id: ID of user requesting the report

        Returns:
            PDF file as bytes
        """
        if report_type == "custody_time":
            return await self._generate_custody_time_report(
                family_file_id, date_start, date_end, user_id
            )
        elif report_type == "communication":
            return await self._generate_communication_report(
                family_file_id, date_start, date_end, user_id
            )
        elif report_type == "expense":
            return await self._generate_expense_report(
                family_file_id, date_start, date_end, user_id
            )
        elif report_type == "schedule":
            return await self._generate_schedule_report(
                family_file_id, date_start, date_end, user_id
            )
        else:
            raise ValueError(f"Unknown report type: {report_type}")

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

        # Generate charts
        split_donut = self.chart_builder.split_donut_chart(
            value_a=stats["parent_a_days"],
            value_b=stats["parent_b_days"],
            label_a=parent_a_name,
            label_b=parent_b_name,
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

        # Render template
        template = self.jinja_env.get_template("reports/custody_time_report.html")
        html_content = template.render(
            family_file=family_file,
            report_period={"start": date_start, "end": date_end},
            generated_at=datetime.utcnow(),
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
        )

        # Convert to PDF
        return self._html_to_pdf(html_content)

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

        # Get category breakdown
        categories = self._get_category_breakdown(flags)

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

        # Render template
        template = self.jinja_env.get_template("reports/communication_summary.html")
        html_content = template.render(
            family_file=family_file,
            report_period={"start": date_start, "end": date_end},
            generated_at=datetime.utcnow(),
            parent_a_name=parent_a_name,
            parent_b_name=parent_b_name,
            stats=stats,
            parent_a_stats=parent_a_stats,
            parent_b_stats=parent_b_stats,
            categories=categories,
            intervention_donut=intervention_donut,
            parent_comparison_chart=parent_comparison_chart,
        )

        # Convert to PDF
        return self._html_to_pdf(html_content)

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

        # Get obligations
        obligations = await self._get_obligations(family_file_id, date_start, date_end)

        # Get funding records
        obligation_ids = [str(o.id) for o in obligations]
        fundings = await self._get_obligation_fundings(obligation_ids) if obligation_ids else []

        # Calculate stats
        stats = self._calculate_expense_stats(obligations)

        # Get category breakdown
        categories = self._get_expense_category_breakdown(obligations)

        # Calculate per-parent stats
        parent_a_stats = self._calculate_parent_expense_stats(
            obligations, fundings, family_file.parent_a_id, "petitioner"
        )
        parent_b_stats = self._calculate_parent_expense_stats(
            obligations, fundings, family_file.parent_b_id or "", "respondent"
        )

        # Get overdue obligations
        overdue_obligations = self._get_overdue_obligations(obligations)

        # Generate charts
        category_chart = ""
        if categories and stats["total_amount"] > 0:
            # Create a simple horizontal bar for top categories
            chart_data = [
                {"label": cat["name"].replace("_", " ").title(), "value": cat["percentage"]}
                for cat in categories[:5]
            ]
            category_chart = self.chart_builder.horizontal_bar(chart_data, width=300)

        parent_chart = self.chart_builder.comparison_bars(
            value_a=parent_a_stats["funding_rate"],
            value_b=parent_b_stats["funding_rate"],
            label_a=parent_a_name,
            label_b=parent_b_name,
            color_a=COLORS["sage"],
            color_b=COLORS["slate"],
            width=400,
        )

        # Render template
        template = self.jinja_env.get_template("reports/expense_summary.html")
        html_content = template.render(
            family_file=family_file,
            report_period={"start": date_start, "end": date_end},
            generated_at=datetime.utcnow(),
            parent_a_name=parent_a_name,
            parent_b_name=parent_b_name,
            stats=stats,
            categories=categories,
            parent_a_stats=parent_a_stats,
            parent_b_stats=parent_b_stats,
            obligations=obligations,
            overdue_obligations=overdue_obligations,
            category_chart=category_chart,
            parent_chart=parent_chart,
        )

        # Convert to PDF
        return self._html_to_pdf(html_content)

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
            parent_a_name=parent_a_name,
            parent_b_name=parent_b_name,
            stats=stats,
            parent_a_stats=parent_a_stats,
            parent_b_stats=parent_b_stats,
            exchanges=exchanges,
            outcome_donut=outcome_donut,
            parent_comparison_chart=parent_comparison_chart,
        )

        # Convert to PDF
        return self._html_to_pdf(html_content)

    def _html_to_pdf(self, html_content: str) -> bytes:
        """Convert HTML to PDF using WeasyPrint."""
        html = HTML(string=html_content, base_url=str(TEMPLATE_DIR))
        pdf_buffer = io.BytesIO()
        html.write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        return pdf_buffer.read()

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
            select(CustodyExchangeInstance).where(
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
                Child.status == "active",
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
            return {
                "messages_sent": 0,
                "interventions": 0,
                "intervention_rate": 0,
                "accepted": 0,
                "good_faith_rate": 0,
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

        return {
            "messages_sent": messages_sent,
            "interventions": interventions,
            "intervention_rate": intervention_rate,
            "accepted": accepted,
            "good_faith_rate": good_faith_rate,
        }

    def _get_category_breakdown(
        self,
        flags: list[MessageFlag],
    ) -> list[dict]:
        """Get breakdown of toxicity categories with counts."""
        category_counts: dict[str, int] = {}

        for flag in flags:
            if flag.categories:
                # categories is stored as JSON list
                cats = flag.categories if isinstance(flag.categories, list) else []
                for cat in cats:
                    cat_lower = cat.lower() if isinstance(cat, str) else str(cat).lower()
                    category_counts[cat_lower] = category_counts.get(cat_lower, 0) + 1

        # Convert to list with descriptions, sorted by count
        result = []
        for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
            result.append({
                "name": cat,
                "count": count,
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

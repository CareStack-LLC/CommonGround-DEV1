"""
MonthlyReportService - Generate comprehensive monthly PDF reports for parents.

Aggregates all 4 report types (custody time, communication, expense, schedule)
into one unified monthly report with an executive summary and compliance score.

Uses Jinja2 templates + WeasyPrint for HTML-to-PDF conversion.
"""

import calendar
import io
import logging
from datetime import date, datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.ext.asyncio import AsyncSession

from .parent_report_service import ParentReportService, TEMPLATE_DIR

logger = logging.getLogger(__name__)


class MonthlyReportService:
    """
    Generate comprehensive monthly PDF reports aggregating all report types.

    Combines custody time, communication, expense, and schedule data
    into a single branded PDF with an executive summary and overall
    compliance score.
    """

    # Weights for overall compliance score calculation
    COMPLIANCE_WEIGHTS = {
        "exchange": 0.35,       # Exchange completion rate
        "communication": 0.25,  # Communication health score
        "financial": 0.25,      # Financial compliance rate
        "schedule_gps": 0.15,   # GPS verification rate
    }

    def __init__(self, db: AsyncSession):
        self.db = db
        self.parent_service = ParentReportService(db)
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=select_autoescape(["html", "xml"]),
        )

    async def generate_monthly_report(
        self,
        family_file_id: str,
        month: int,
        year: int,
    ) -> tuple[bytes, dict]:
        """
        Generate a comprehensive monthly PDF report.

        Args:
            family_file_id: Family file to report on
            month: Month number (1-12)
            year: Year (e.g. 2026)

        Returns:
            Tuple of (PDF bytes, summary dict with key metrics for email)
        """
        # Calculate date range for the month
        _, last_day = calendar.monthrange(year, month)
        date_start = date(year, month, 1)
        date_end = date(year, month, last_day)
        month_name = calendar.month_name[month]

        # Get family file and parent info
        family_file = await self.parent_service._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        parent_a = await self.parent_service._get_user(family_file.parent_a_id)
        parent_b = await self.parent_service._get_user(
            family_file.parent_b_id
        ) if family_file.parent_b_id else None

        parent_a_name = self.parent_service._get_parent_display_name(
            parent_a, family_file.parent_a_role
        )
        parent_b_name = self.parent_service._get_parent_display_name(
            parent_b, family_file.parent_b_role
        ) if parent_b else "Parent B"

        # Get children
        children = await self.parent_service._get_children_with_stats(
            family_file_id, date_start, date_end
        )

        # -----------------------------------------------------------------
        # 1. Custody Time Data
        # -----------------------------------------------------------------
        total_days = (date_end - date_start).days + 1
        total_parent_a_days = sum(c.get("parent_a_days", 0) for c in children)
        total_parent_b_days = sum(c.get("parent_b_days", 0) for c in children)
        total_days_all = total_parent_a_days + total_parent_b_days
        num_children = len(children) if children else 1

        if total_days_all > 0:
            parent_a_pct = round(
                (total_parent_a_days / total_days_all) * 100, 1
            )
            parent_b_pct = round(
                (total_parent_b_days / total_days_all) * 100, 1
            )
        else:
            parent_a_pct = 50.0
            parent_b_pct = 50.0

        custody_stats = {
            "total_days": total_days,
            "parent_a_days": total_parent_a_days // num_children,
            "parent_b_days": total_parent_b_days // num_children,
            "parent_a_percentage": parent_a_pct,
            "parent_b_percentage": parent_b_pct,
        }

        # Exchange compliance
        exchanges = await self.parent_service._get_exchange_instances(
            family_file_id, date_start, date_end
        )
        exchange_stats = self.parent_service._calculate_exchange_stats(exchanges)

        # -----------------------------------------------------------------
        # 2. Communication Data
        # -----------------------------------------------------------------
        messages = await self.parent_service._get_messages(
            family_file_id, date_start, date_end
        )
        message_ids = [str(m.id) for m in messages]
        flags = (
            await self.parent_service._get_message_flags(message_ids)
            if message_ids
            else []
        )
        comm_stats = self.parent_service._calculate_communication_stats(
            messages,
            flags,
            family_file.parent_a_id,
            family_file.parent_b_id or "",
        )
        parent_a_comm = self.parent_service._calculate_parent_communication_stats(
            messages, flags, family_file.parent_a_id
        )
        parent_b_comm = self.parent_service._calculate_parent_communication_stats(
            messages, flags, family_file.parent_b_id or ""
        )

        # -----------------------------------------------------------------
        # 3. Expense Data
        # -----------------------------------------------------------------
        obligations = await self.parent_service._get_obligations(
            family_file_id, date_start, date_end
        )
        expense_stats = self.parent_service._calculate_expense_stats(obligations)

        # -----------------------------------------------------------------
        # 3b. Circle/KidSpace Communication Data
        # -----------------------------------------------------------------
        circle_stats = {"total_sessions": 0, "total_messages": 0, "flagged_messages": 0}
        try:
            from app.models.kidcoms import KidComsSession
            from app.models.circle_message import CircleMessage
            from sqlalchemy import func, and_

            # Count circle call sessions
            session_count = await self.parent_service.db.execute(
                select(func.count(KidComsSession.id)).where(
                    and_(
                        KidComsSession.family_file_id == family_file_id,
                        KidComsSession.created_at >= date_start,
                        KidComsSession.created_at <= date_end,
                    )
                )
            )
            circle_stats["total_sessions"] = session_count.scalar() or 0

            # Count circle messages
            msg_count = await self.parent_service.db.execute(
                select(func.count(CircleMessage.id)).where(
                    and_(
                        CircleMessage.family_file_id == family_file_id,
                        CircleMessage.created_at >= date_start,
                        CircleMessage.created_at <= date_end,
                    )
                )
            )
            circle_stats["total_messages"] = msg_count.scalar() or 0

            # Count flagged circle messages
            flagged_count = await self.parent_service.db.execute(
                select(func.count(CircleMessage.id)).where(
                    and_(
                        CircleMessage.family_file_id == family_file_id,
                        CircleMessage.created_at >= date_start,
                        CircleMessage.created_at <= date_end,
                        CircleMessage.aria_flagged == True,
                    )
                )
            )
            circle_stats["flagged_messages"] = flagged_count.scalar() or 0
        except Exception as e:
            logger.warning(f"Failed to gather circle stats for monthly report: {e}")

        # -----------------------------------------------------------------
        # 4. Schedule Data
        # -----------------------------------------------------------------
        schedule_stats = self.parent_service._calculate_schedule_stats(
            exchanges, date_start, date_end
        )

        # -----------------------------------------------------------------
        # 5. Overall Compliance Score
        # -----------------------------------------------------------------
        overall_compliance = self._calculate_overall_compliance(
            exchange_completion_rate=exchange_stats["completion_rate"],
            communication_health=comm_stats["health_score"],
            financial_compliance=expense_stats["compliance_rate"],
            gps_verification_rate=schedule_stats["gps_verification_rate"],
        )

        # Determine trend text
        trend_text = self._get_trend_text(overall_compliance)

        # Highlights
        highlights = self._build_highlights(
            exchange_stats, comm_stats, expense_stats, schedule_stats
        )

        # -----------------------------------------------------------------
        # Render Template
        # -----------------------------------------------------------------
        template = self.jinja_env.get_template(
            "reports/monthly_parent_report.html"
        )
        html_content = template.render(
            family_file=family_file,
            report_period={"start": date_start, "end": date_end},
            generated_at=datetime.utcnow(),
            report_id=ParentReportService.generate_report_id(),
            month_name=month_name,
            year=year,
            parent_a_name=parent_a_name,
            parent_b_name=parent_b_name,
            children=children,
            # Custody
            custody_stats=custody_stats,
            exchange_stats=exchange_stats,
            # Communication
            comm_stats=comm_stats,
            parent_a_comm=parent_a_comm,
            parent_b_comm=parent_b_comm,
            # Expense
            expense_stats=expense_stats,
            # Schedule
            schedule_stats=schedule_stats,
            # Circle/KidSpace
            circle_stats=circle_stats,
            # Overall
            overall_compliance=overall_compliance,
            highlights=highlights,
            trend_text=trend_text,
        )

        # Convert to PDF
        pdf_bytes, _ = self.parent_service._html_to_pdf(html_content)

        # Persist to storage and database for /verify endpoint
        try:
            report_result = await self.parent_service._persist_report(
                pdf_bytes=pdf_bytes,
                report_type="monthly",
                report_category="monthly_comprehensive",
                family_file_id=str(family_file.id),
                user_id=str(family_file.parent_a_id or "system"),
                date_start=date(year, month, 1),
                date_end=date(year, month, calendar.monthrange(year, month)[1]),
            )
            pdf_bytes = report_result.pdf_bytes
        except Exception as e:
            logger.warning(f"Monthly report persistence failed (non-blocking): {e}")

        # Build summary dict for email notifications
        summary = {
            "month_name": month_name,
            "year": year,
            "family_file_name": family_file.title,
            "compliance_rate": overall_compliance,
            "total_exchanges": exchange_stats["total"],
            "on_time_count": exchange_stats["completed"],
            "completed_exchanges": exchange_stats["completed"],
            "missed_exchanges": exchange_stats["missed"],
            "gps_verified_count": schedule_stats["gps_verified"],
            "message_count": comm_stats["total_messages"],
        }

        return pdf_bytes, summary

    def _calculate_overall_compliance(
        self,
        exchange_completion_rate: float,
        communication_health: float,
        financial_compliance: float,
        gps_verification_rate: float,
    ) -> float:
        """
        Calculate weighted overall compliance score (0-100).

        Weights:
        - Exchange completion: 35%
        - Communication health: 25%
        - Financial compliance: 25%
        - GPS verification: 15%
        """
        score = (
            exchange_completion_rate * self.COMPLIANCE_WEIGHTS["exchange"]
            + communication_health * self.COMPLIANCE_WEIGHTS["communication"]
            + financial_compliance * self.COMPLIANCE_WEIGHTS["financial"]
            + gps_verification_rate * self.COMPLIANCE_WEIGHTS["schedule_gps"]
        )
        return round(max(0, min(100, score)), 1)

    @staticmethod
    def _get_trend_text(compliance_score: float) -> str:
        """Get a brief trend/status note based on overall compliance."""
        if compliance_score >= 90:
            return (
                "Excellent compliance across all areas. Both parents are "
                "demonstrating strong co-parenting cooperation this month."
            )
        elif compliance_score >= 75:
            return (
                "Good overall compliance with some room for improvement. "
                "Review the individual sections below for specific areas "
                "to focus on."
            )
        elif compliance_score >= 60:
            return (
                "Moderate compliance this month. Several areas need attention "
                "to ensure the co-parenting plan is followed consistently."
            )
        else:
            return (
                "Compliance needs significant improvement. Please review each "
                "section carefully and consider reaching out to your mediator "
                "or legal professional for guidance."
            )

    @staticmethod
    def _build_highlights(
        exchange_stats: dict,
        comm_stats: dict,
        expense_stats: dict,
        schedule_stats: dict,
    ) -> list[str]:
        """Build a list of key highlights for the executive summary."""
        highlights = []

        # Exchange highlights
        if exchange_stats["completion_rate"] >= 95:
            highlights.append("Near-perfect exchange completion rate")
        elif exchange_stats["missed"] > 0:
            highlights.append(
                f"{exchange_stats['missed']} exchange(s) missed this month"
            )

        # Communication highlights
        if comm_stats["health_score"] >= 85:
            highlights.append("Healthy communication patterns maintained")
        elif comm_stats["flagged_messages"] > 0:
            highlights.append(
                f"{comm_stats['flagged_messages']} message(s) required "
                f"ARIA intervention"
            )

        # Financial highlights
        if expense_stats["compliance_rate"] >= 95:
            highlights.append("All financial obligations met on time")
        elif expense_stats["overdue_count"] > 0:
            highlights.append(
                f"{expense_stats['overdue_count']} overdue obligation(s)"
            )

        # GPS highlights
        if schedule_stats["gps_verification_rate"] >= 90:
            highlights.append("Strong GPS verification compliance")
        elif schedule_stats["total_check_ins"] > 0:
            highlights.append(
                f"{schedule_stats['gps_verified']}/{schedule_stats['total_check_ins']} "
                f"check-ins GPS verified"
            )

        # Ensure at least one highlight
        if not highlights:
            highlights.append("Report data collected for the month")

        return highlights

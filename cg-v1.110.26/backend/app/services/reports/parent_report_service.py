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
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML, CSS

from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.user import User
from app.services.custody_time import CustodyTimeService
from .chart_builder import ChartBuilder, COLORS

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
        # TODO: Implement communication report
        raise NotImplementedError("Communication report coming soon")

    async def _generate_expense_report(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
        user_id: str,
    ) -> bytes:
        """Generate Expense Summary Report PDF."""
        # TODO: Implement expense report
        raise NotImplementedError("Expense report coming soon")

    async def _generate_schedule_report(
        self,
        family_file_id: str,
        date_start: date,
        date_end: date,
        user_id: str,
    ) -> bytes:
        """Generate Schedule History Report PDF."""
        # TODO: Implement schedule report
        raise NotImplementedError("Schedule report coming soon")

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

        # Get instances in date range
        result = await self.db.execute(
            select(CustodyExchangeInstance).where(
                CustodyExchangeInstance.exchange_id.in_(exchange_ids),
                CustodyExchangeInstance.scheduled_date >= date_start,
                CustodyExchangeInstance.scheduled_date <= date_end,
            ).order_by(CustodyExchangeInstance.scheduled_date.desc())
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

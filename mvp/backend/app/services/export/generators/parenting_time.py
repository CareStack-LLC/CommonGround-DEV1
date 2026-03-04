"""
Parenting Time section generator.

Section 3: Exchange records, patterns, and timeliness analysis.
"""

from datetime import datetime, timedelta
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.models.schedule import ScheduleEvent, ExchangeCheckIn
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.user import User
from app.services.export.generators.base import (
    BaseSectionGenerator,
    GeneratorContext,
    SectionContent,
)


class ParentingTimeGenerator(BaseSectionGenerator):
    """Generates the Parenting Time Report section."""

    section_type = "parenting_time"
    section_title = "Parenting Time Report"
    section_order = 3

    async def generate(self, context: GeneratorContext) -> SectionContent:
        """Generate parenting time analysis."""
        db = context.db
        start = datetime.combine(context.date_start, datetime.min.time())
        end = datetime.combine(context.date_end, datetime.max.time())

        # Get custody exchange instances
        instances_result = await db.execute(
            select(CustodyExchangeInstance)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(
                and_(
                    CustodyExchangeInstance.scheduled_time >= start,
                    CustodyExchangeInstance.scheduled_time <= end,
                )
            )
            .join(CustodyExchange, CustodyExchangeInstance.exchange_id == CustodyExchange.id)
            .where(CustodyExchange.case_id == context.case_id)
            .order_by(CustodyExchangeInstance.scheduled_time)
        )
        instances = list(instances_result.scalars().all())

        # Get check-ins
        checkins_result = await db.execute(
            select(ExchangeCheckIn)
            .where(
                and_(
                    ExchangeCheckIn.checked_in_at >= start,
                    ExchangeCheckIn.checked_in_at <= end
                )
            )
            .order_by(ExchangeCheckIn.checked_in_at)
        )
        checkins = list(checkins_result.scalars().all())

        # Analyze patterns
        exchange_log = await self._build_exchange_log(instances, context)
        timeliness_analysis = self._analyze_timeliness(checkins)
        patterns = self._identify_patterns(instances, checkins)

        content_data = {
            "summary": {
                "total_exchanges": len(instances),
                "completed": len([i for i in instances if i.status == "completed"]),
                "cancelled": len([i for i in instances if i.status == "cancelled"]),
                "missed": len([i for i in instances if i.status == "missed"]),
            },
            "exchange_log": exchange_log,
            "timeliness_analysis": timeliness_analysis,
            "patterns": patterns,
            "report_period": {
                "start": self._format_date(context.date_start),
                "end": self._format_date(context.date_end),
            },
        }

        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data=content_data,
            evidence_count=len(instances) + len(checkins),
            data_sources=["custody_exchange_instances", "exchange_check_ins"],
        )

    async def _build_exchange_log(
        self,
        instances: list[CustodyExchangeInstance],
        context: GeneratorContext
    ) -> list[dict]:
        """Build detailed exchange log."""
        log = []
        for instance in instances[:50]:  # Limit to 50 most recent
            exchange = instance.exchange
            log_entry = {
                "date": self._format_date(instance.scheduled_time.date()),
                "scheduled_time": instance.scheduled_time.strftime("%I:%M %p"),
                "actual_time": (
                    instance.completed_at.strftime("%I:%M %p")
                    if instance.completed_at else None
                ),
                "status": instance.status,
                "location": await self._redact(
                    exchange.location if exchange else "Unknown",
                    context
                ),
                "notes": await self._redact(
                    instance.notes or "",
                    context
                ) if instance.notes else None,
            }
            log.append(log_entry)

        return log

    def _analyze_timeliness(self, checkins: list[ExchangeCheckIn]) -> dict:
        """Analyze check-in timeliness patterns."""
        if not checkins:
            return {
                "total_checkins": 0,
                "on_time_count": 0,
                "on_time_percentage": 0,
                "average_delay_minutes": 0,
                "grace_period_used_count": 0,
            }

        on_time = [c for c in checkins if c.is_on_time]
        grace_used = [c for c in checkins if c.is_within_grace and not c.is_on_time]

        # Calculate average delay for late check-ins
        delays = []
        for checkin in checkins:
            if checkin.scheduled_time and checkin.checked_in_at:
                if checkin.checked_in_at > checkin.scheduled_time:
                    delay = (checkin.checked_in_at - checkin.scheduled_time).total_seconds() / 60
                    delays.append(delay)

        avg_delay = sum(delays) / len(delays) if delays else 0

        return {
            "total_checkins": len(checkins),
            "on_time_count": len(on_time),
            "on_time_percentage": self._calculate_percentage(len(on_time), len(checkins)),
            "average_delay_minutes": round(avg_delay, 1),
            "grace_period_used_count": len(grace_used),
        }

    def _identify_patterns(
        self,
        instances: list[CustodyExchangeInstance],
        checkins: list[ExchangeCheckIn]
    ) -> dict:
        """Identify notable patterns in parenting time."""
        patterns = {
            "day_of_week_issues": [],
            "time_of_day_issues": [],
            "location_issues": [],
            "overall_trend": "stable",
        }

        if not instances:
            return patterns

        # Analyze day-of-week patterns
        day_issues = {}
        for instance in instances:
            if instance.status in ["cancelled", "missed"]:
                day = instance.scheduled_time.strftime("%A")
                day_issues[day] = day_issues.get(day, 0) + 1

        patterns["day_of_week_issues"] = [
            {"day": day, "issue_count": count}
            for day, count in day_issues.items()
            if count >= 2
        ]

        # Analyze trend over time
        total = len(instances)
        completed = len([i for i in instances if i.status == "completed"])
        completion_rate = self._calculate_percentage(completed, total)

        if completion_rate >= 90:
            patterns["overall_trend"] = "excellent"
        elif completion_rate >= 75:
            patterns["overall_trend"] = "good"
        elif completion_rate >= 50:
            patterns["overall_trend"] = "needs_attention"
        else:
            patterns["overall_trend"] = "concerning"

        return patterns

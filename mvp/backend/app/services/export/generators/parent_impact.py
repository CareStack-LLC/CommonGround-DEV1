"""
Parent Impact Summary section generator.

Section 7: 90-day rolling analysis of parent behavior impact.
"""

from datetime import datetime, timedelta
from sqlalchemy import select, func, and_

from app.models.message import Message, MessageFlag
from app.models.schedule import ExchangeCheckIn
from app.models.case import CaseParticipant
from app.models.user import User
from app.services.export.generators.base import (
    BaseSectionGenerator,
    GeneratorContext,
    SectionContent,
)


class ParentImpactGenerator(BaseSectionGenerator):
    """Generates the Parent Impact Summary section."""

    section_type = "parent_impact"
    section_title = "Parent Impact Summary"
    section_order = 7

    async def generate(self, context: GeneratorContext) -> SectionContent:
        """Generate parent impact analysis."""
        db = context.db
        start = datetime.combine(context.date_start, datetime.min.time())
        end = datetime.combine(context.date_end, datetime.max.time())

        # Get participants
        participants_result = await db.execute(
            select(CaseParticipant, User)
            .join(User, CaseParticipant.user_id == User.id)
            .where(CaseParticipant.case_id == context.case_id)
            .where(CaseParticipant.is_active == True)
        )
        participants = list(participants_result.all())

        # Analyze each parent's impact
        parent_impacts = []
        for participant, user in participants:
            impact = await self._analyze_parent_impact(
                db, context, participant, user, start, end
            )
            parent_impacts.append(impact)

        # Calculate overall case health
        case_health = self._calculate_case_health(parent_impacts)

        # Generate recommendations
        recommendations = self._generate_recommendations(parent_impacts)

        # Trend analysis over report period
        trend_data = await self._analyze_trends(db, context, start, end)

        content_data = {
            "parent_impacts": parent_impacts,
            "case_health": case_health,
            "recommendations": recommendations,
            "trend_analysis": trend_data,
            "report_period": {
                "start": self._format_date(context.date_start),
                "end": self._format_date(context.date_end),
            },
            "methodology_note": (
                "Impact scores are calculated using a weighted average of "
                "communication quality, schedule compliance, and cooperation metrics."
            ),
        }

        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data=content_data,
            evidence_count=len(parent_impacts),
            data_sources=["messages", "message_flags", "exchange_check_ins"],
        )

    async def _analyze_parent_impact(
        self,
        db,
        context: GeneratorContext,
        participant: CaseParticipant,
        user: User,
        start: datetime,
        end: datetime
    ) -> dict:
        """Analyze individual parent's impact."""
        user_id = user.id

        # Communication metrics
        comm_metrics = await self._get_communication_metrics(
            db, context, user_id, start, end
        )

        # Schedule metrics
        schedule_metrics = await self._get_schedule_metrics(
            db, user_id, start, end
        )

        # Cooperation score
        cooperation_score = self._calculate_cooperation_score(
            comm_metrics, schedule_metrics
        )

        # Impact score (weighted composite)
        impact_score = (
            comm_metrics["quality_score"] * 0.4 +
            schedule_metrics["compliance_score"] * 0.3 +
            cooperation_score * 0.3
        )

        return {
            "parent_type": participant.parent_type,
            "name": await self._redact(
                f"{user.first_name} {user.last_name}",
                context
            ),
            "communication_quality": {
                "score": comm_metrics["quality_score"],
                "total_messages": comm_metrics["total"],
                "interventions": comm_metrics["interventions"],
                "good_faith_rate": comm_metrics["good_faith_rate"],
            },
            "schedule_compliance": {
                "score": schedule_metrics["compliance_score"],
                "total_exchanges": schedule_metrics["total"],
                "on_time": schedule_metrics["on_time"],
            },
            "cooperation_score": round(cooperation_score, 1),
            "overall_impact_score": round(impact_score, 1),
            "strengths": self._identify_strengths(comm_metrics, schedule_metrics),
            "areas_for_improvement": self._identify_improvements(
                comm_metrics, schedule_metrics
            ),
        }

    async def _get_communication_metrics(
        self,
        db,
        context: GeneratorContext,
        user_id: str,
        start: datetime,
        end: datetime
    ) -> dict:
        """Get communication metrics for a user."""
        # Total messages
        total_result = await db.execute(
            select(func.count(Message.id))
            .where(
                and_(
                    Message.case_id == context.case_id,
                    Message.sender_id == user_id,
                    Message.sent_at >= start,
                    Message.sent_at <= end
                )
            )
        )
        total = total_result.scalar() or 0

        # Interventions
        interventions_result = await db.execute(
            select(func.count(MessageFlag.id))
            .join(Message, MessageFlag.message_id == Message.id)
            .where(
                and_(
                    Message.case_id == context.case_id,
                    Message.sender_id == user_id,
                    MessageFlag.created_at >= start,
                    MessageFlag.created_at <= end
                )
            )
        )
        interventions = interventions_result.scalar() or 0

        # Suggestions accepted
        accepted_result = await db.execute(
            select(func.count(MessageFlag.id))
            .join(Message, MessageFlag.message_id == Message.id)
            .where(
                and_(
                    Message.case_id == context.case_id,
                    Message.sender_id == user_id,
                    MessageFlag.created_at >= start,
                    MessageFlag.created_at <= end,
                    MessageFlag.user_action == "accepted"
                )
            )
        )
        accepted = accepted_result.scalar() or 0

        # Calculate quality score
        intervention_rate = interventions / total if total > 0 else 0
        good_faith_rate = accepted / interventions if interventions > 0 else 1.0
        quality_score = 100 * (1 - intervention_rate) * (0.5 + 0.5 * good_faith_rate)

        return {
            "total": total,
            "interventions": interventions,
            "accepted": accepted,
            "good_faith_rate": round(good_faith_rate * 100, 1),
            "quality_score": round(quality_score, 1),
        }

    async def _get_schedule_metrics(
        self,
        db,
        user_id: str,
        start: datetime,
        end: datetime
    ) -> dict:
        """Get schedule compliance metrics for a user."""
        # Total check-ins
        total_result = await db.execute(
            select(func.count(ExchangeCheckIn.id))
            .where(
                and_(
                    ExchangeCheckIn.user_id == user_id,
                    ExchangeCheckIn.checked_in_at >= start,
                    ExchangeCheckIn.checked_in_at <= end
                )
            )
        )
        total = total_result.scalar() or 0

        # On-time check-ins
        on_time_result = await db.execute(
            select(func.count(ExchangeCheckIn.id))
            .where(
                and_(
                    ExchangeCheckIn.user_id == user_id,
                    ExchangeCheckIn.checked_in_at >= start,
                    ExchangeCheckIn.checked_in_at <= end,
                    ExchangeCheckIn.is_on_time == True
                )
            )
        )
        on_time = on_time_result.scalar() or 0

        compliance_score = (on_time / total * 100) if total > 0 else 100

        return {
            "total": total,
            "on_time": on_time,
            "compliance_score": round(compliance_score, 1),
        }

    def _calculate_cooperation_score(
        self,
        comm_metrics: dict,
        schedule_metrics: dict
    ) -> float:
        """Calculate cooperation score based on behavior patterns."""
        # Start with base score
        score = 70.0

        # Bonus for high good faith rate
        if comm_metrics["good_faith_rate"] >= 80:
            score += 15

        # Bonus for high schedule compliance
        if schedule_metrics["compliance_score"] >= 90:
            score += 15

        # Penalty for high intervention rate
        if comm_metrics["total"] > 0:
            intervention_rate = comm_metrics["interventions"] / comm_metrics["total"]
            if intervention_rate > 0.2:
                score -= 20
            elif intervention_rate > 0.1:
                score -= 10

        return max(0, min(100, score))

    def _identify_strengths(
        self,
        comm_metrics: dict,
        schedule_metrics: dict
    ) -> list[str]:
        """Identify parent's strengths."""
        strengths = []

        if comm_metrics["good_faith_rate"] >= 80:
            strengths.append("Responsive to communication suggestions")

        if schedule_metrics["compliance_score"] >= 90:
            strengths.append("Consistently punctual for exchanges")

        if comm_metrics["interventions"] == 0 and comm_metrics["total"] > 10:
            strengths.append("Maintains respectful communication")

        if not strengths:
            strengths.append("Active participant in co-parenting platform")

        return strengths

    def _identify_improvements(
        self,
        comm_metrics: dict,
        schedule_metrics: dict
    ) -> list[str]:
        """Identify areas for improvement."""
        improvements = []

        if comm_metrics["good_faith_rate"] < 50:
            improvements.append("Consider accepting more ARIA suggestions")

        if schedule_metrics["compliance_score"] < 80:
            improvements.append("Improve punctuality for exchanges")

        if comm_metrics["total"] > 0:
            intervention_rate = comm_metrics["interventions"] / comm_metrics["total"]
            if intervention_rate > 0.15:
                improvements.append("Focus on constructive communication")

        return improvements

    def _calculate_case_health(self, parent_impacts: list[dict]) -> dict:
        """Calculate overall case health from parent impacts."""
        if not parent_impacts:
            return {
                "score": 0,
                "status": "unknown",
                "summary": "Insufficient data for analysis",
            }

        avg_score = sum(p["overall_impact_score"] for p in parent_impacts) / len(parent_impacts)

        if avg_score >= 80:
            status = "healthy"
            summary = "Co-parenting relationship shows strong cooperation patterns."
        elif avg_score >= 60:
            status = "stable"
            summary = "Co-parenting relationship is functional with some areas for improvement."
        elif avg_score >= 40:
            status = "needs_attention"
            summary = "Co-parenting relationship shows stress indicators that should be addressed."
        else:
            status = "concerning"
            summary = "Co-parenting relationship requires intervention and support."

        return {
            "score": round(avg_score, 1),
            "status": status,
            "summary": summary,
        }

    def _generate_recommendations(self, parent_impacts: list[dict]) -> list[str]:
        """Generate recommendations based on analysis."""
        recommendations = []

        for impact in parent_impacts:
            if impact["communication_quality"]["score"] < 60:
                recommendations.append(
                    f"Recommend communication coaching for {impact['parent_type']}"
                )

            if impact["schedule_compliance"]["score"] < 70:
                recommendations.append(
                    f"Suggest schedule reminder tools for {impact['parent_type']}"
                )

        if not recommendations:
            recommendations.append(
                "Continue current positive co-parenting practices"
            )

        return recommendations

    async def _analyze_trends(
        self,
        db,
        context: GeneratorContext,
        start: datetime,
        end: datetime
    ) -> dict:
        """Analyze trends over the report period."""
        # Divide period into weeks and analyze each
        period_days = (end - start).days
        if period_days <= 7:
            return {"note": "Period too short for trend analysis"}

        weeks = min(4, period_days // 7)
        week_data = []

        for i in range(weeks):
            week_start = start + timedelta(days=i * 7)
            week_end = week_start + timedelta(days=7)

            # Get intervention count for this week
            interventions_result = await db.execute(
                select(func.count(MessageFlag.id))
                .join(Message, MessageFlag.message_id == Message.id)
                .where(
                    and_(
                        Message.case_id == context.case_id,
                        MessageFlag.created_at >= week_start,
                        MessageFlag.created_at <= week_end
                    )
                )
            )
            interventions = interventions_result.scalar() or 0

            week_data.append({
                "week": i + 1,
                "start": self._format_date(week_start.date()),
                "interventions": interventions,
            })

        # Determine trend direction
        if len(week_data) >= 2:
            first_half_avg = sum(w["interventions"] for w in week_data[:len(week_data)//2]) / (len(week_data)//2)
            second_half_avg = sum(w["interventions"] for w in week_data[len(week_data)//2:]) / (len(week_data) - len(week_data)//2)

            if second_half_avg < first_half_avg * 0.7:
                trend = "improving"
            elif second_half_avg > first_half_avg * 1.3:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "stable"

        return {
            "weekly_data": week_data,
            "trend": trend,
        }

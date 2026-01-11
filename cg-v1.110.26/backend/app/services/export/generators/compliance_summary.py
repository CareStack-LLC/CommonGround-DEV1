"""
Compliance Summary section generator.

Section 2: Side-by-side parent comparison ("power page").
"""

from datetime import datetime
from sqlalchemy import select, func, and_

from app.models.case import CaseParticipant
from app.models.user import User
from app.models.schedule import ExchangeCheckIn
from app.models.message import Message, MessageFlag
from app.models.payment import Payment
from app.services.export.generators.base import (
    BaseSectionGenerator,
    GeneratorContext,
    SectionContent,
)


class ComplianceSummaryGenerator(BaseSectionGenerator):
    """Generates the Compliance Summary section."""

    section_type = "compliance_summary"
    section_title = "Compliance Summary"
    section_order = 2

    async def generate(self, context: GeneratorContext) -> SectionContent:
        """Generate compliance summary comparing both parents."""
        db = context.db

        # Get participants
        participants_result = await db.execute(
            select(CaseParticipant, User)
            .join(User, CaseParticipant.user_id == User.id)
            .where(CaseParticipant.case_id == context.case_id)
            .where(CaseParticipant.is_active == True)
        )
        participants = list(participants_result.all())

        if len(participants) < 2:
            return self._empty_content("Requires two active participants")

        # Build metrics for each parent
        parent_metrics = []
        for participant, user in participants:
            metrics = await self._calculate_parent_metrics(
                db, context, participant, user
            )
            parent_metrics.append(metrics)

        # Calculate comparison data
        comparison = self._build_comparison(parent_metrics)

        content_data = {
            "parents": parent_metrics,
            "comparison": comparison,
            "report_period": {
                "start": self._format_date(context.date_start),
                "end": self._format_date(context.date_end),
            },
            "summary": self._generate_summary(parent_metrics),
        }

        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data=content_data,
            evidence_count=sum(m.get("total_interactions", 0) for m in parent_metrics),
            data_sources=["exchange_check_ins", "messages", "message_flags", "payments"],
        )

    async def _calculate_parent_metrics(
        self,
        db,
        context: GeneratorContext,
        participant: CaseParticipant,
        user: User
    ) -> dict:
        """Calculate compliance metrics for a parent."""
        user_id = participant.user_id
        start = datetime.combine(context.date_start, datetime.min.time())
        end = datetime.combine(context.date_end, datetime.max.time())

        # On-time exchange count
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
        on_time_count = on_time_result.scalar() or 0

        total_exchanges_result = await db.execute(
            select(func.count(ExchangeCheckIn.id))
            .where(
                and_(
                    ExchangeCheckIn.user_id == user_id,
                    ExchangeCheckIn.checked_in_at >= start,
                    ExchangeCheckIn.checked_in_at <= end
                )
            )
        )
        total_exchanges = total_exchanges_result.scalar() or 0

        # Message metrics
        messages_sent_result = await db.execute(
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
        messages_sent = messages_sent_result.scalar() or 0

        # ARIA intervention metrics
        flags_result = await db.execute(
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
        interventions = flags_result.scalar() or 0

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
        suggestions_accepted = accepted_result.scalar() or 0

        # Payment metrics
        payments_made_result = await db.execute(
            select(func.count(Payment.id))
            .where(
                and_(
                    Payment.case_id == context.case_id,
                    Payment.payer_id == user_id,
                    Payment.status == "completed",
                    Payment.completed_at >= start,
                    Payment.completed_at <= end
                )
            )
        )
        payments_made = payments_made_result.scalar() or 0

        # Calculate compliance scores
        exchange_rate = self._calculate_percentage(on_time_count, total_exchanges)
        intervention_rate = self._calculate_percentage(interventions, messages_sent)
        good_faith_rate = self._calculate_percentage(
            suggestions_accepted, interventions
        ) if interventions > 0 else 100.0

        # Overall compliance score (weighted average)
        overall_score = (
            (exchange_rate * 0.4) +
            ((100 - intervention_rate) * 0.3) +
            (good_faith_rate * 0.3)
        )

        return {
            "user_id": user_id,
            "parent_type": participant.parent_type,
            "role": participant.role,
            "name": await self._redact(
                f"{user.first_name} {user.last_name}",
                context
            ),
            "exchange_metrics": {
                "total": total_exchanges,
                "on_time": on_time_count,
                "on_time_rate": exchange_rate,
            },
            "communication_metrics": {
                "messages_sent": messages_sent,
                "aria_interventions": interventions,
                "intervention_rate": intervention_rate,
                "suggestions_accepted": suggestions_accepted,
                "good_faith_rate": good_faith_rate,
            },
            "financial_metrics": {
                "payments_made": payments_made,
            },
            "overall_compliance_score": round(overall_score, 1),
            "total_interactions": total_exchanges + messages_sent,
        }

    def _build_comparison(self, parent_metrics: list[dict]) -> dict:
        """Build side-by-side comparison data."""
        if len(parent_metrics) < 2:
            return {}

        p1, p2 = parent_metrics[0], parent_metrics[1]

        return {
            "exchange_comparison": {
                "parent_a": p1["exchange_metrics"]["on_time_rate"],
                "parent_b": p2["exchange_metrics"]["on_time_rate"],
                "difference": abs(
                    p1["exchange_metrics"]["on_time_rate"] -
                    p2["exchange_metrics"]["on_time_rate"]
                ),
            },
            "communication_comparison": {
                "parent_a_interventions": p1["communication_metrics"]["aria_interventions"],
                "parent_b_interventions": p2["communication_metrics"]["aria_interventions"],
            },
            "overall_comparison": {
                "parent_a": p1["overall_compliance_score"],
                "parent_b": p2["overall_compliance_score"],
                "difference": abs(
                    p1["overall_compliance_score"] -
                    p2["overall_compliance_score"]
                ),
            },
        }

    def _generate_summary(self, parent_metrics: list[dict]) -> str:
        """Generate a neutral summary statement."""
        if len(parent_metrics) < 2:
            return "Insufficient data for comparison."

        p1, p2 = parent_metrics[0], parent_metrics[1]
        avg_compliance = (
            p1["overall_compliance_score"] +
            p2["overall_compliance_score"]
        ) / 2

        if avg_compliance >= 90:
            return "Both parents demonstrate high compliance with agreement terms."
        elif avg_compliance >= 70:
            return "Parents show moderate compliance overall. See detailed sections for areas of concern."
        else:
            return "Compliance metrics indicate areas requiring attention. Review detailed sections."

    def _empty_content(self, reason: str) -> SectionContent:
        """Return empty content when data is missing."""
        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data={"error": reason},
            evidence_count=0,
            data_sources=[],
        )

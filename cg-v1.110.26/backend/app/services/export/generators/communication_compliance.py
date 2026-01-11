"""
Communication Compliance section generator.

Section 5: Message statistics, ARIA patterns, communication health.
"""

from datetime import datetime, timedelta
from sqlalchemy import select, func, and_

from app.models.message import Message, MessageFlag
from app.models.case import CaseParticipant
from app.models.user import User
from app.services.export.generators.base import (
    BaseSectionGenerator,
    GeneratorContext,
    SectionContent,
)


class CommunicationComplianceGenerator(BaseSectionGenerator):
    """Generates the Communication Compliance section."""

    section_type = "communication_compliance"
    section_title = "Communication Compliance"
    section_order = 5

    async def generate(self, context: GeneratorContext) -> SectionContent:
        """Generate communication compliance analysis."""
        db = context.db
        start = datetime.combine(context.date_start, datetime.min.time())
        end = datetime.combine(context.date_end, datetime.max.time())

        # Get all messages in period
        messages_result = await db.execute(
            select(Message)
            .where(
                and_(
                    Message.case_id == context.case_id,
                    Message.sent_at >= start,
                    Message.sent_at <= end
                )
            )
            .order_by(Message.sent_at)
        )
        messages = list(messages_result.scalars().all())

        # Get ARIA interventions
        flags_result = await db.execute(
            select(MessageFlag)
            .join(Message, MessageFlag.message_id == Message.id)
            .where(
                and_(
                    Message.case_id == context.case_id,
                    MessageFlag.created_at >= start,
                    MessageFlag.created_at <= end
                )
            )
        )
        flags = list(flags_result.scalars().all())

        # Analyze by participant
        participant_analysis = await self._analyze_by_participant(
            db, context, messages, flags
        )

        # Overall statistics
        overall_stats = self._calculate_overall_stats(messages, flags)

        # Communication patterns
        patterns = self._identify_patterns(messages, flags)

        # Response time analysis
        response_times = self._analyze_response_times(messages)

        content_data = {
            "overall_stats": overall_stats,
            "participant_analysis": participant_analysis,
            "patterns": patterns,
            "response_times": response_times,
            "aria_summary": self._summarize_aria_activity(flags),
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
            evidence_count=len(messages) + len(flags),
            data_sources=["messages", "message_flags"],
        )

    def _calculate_overall_stats(
        self,
        messages: list[Message],
        flags: list[MessageFlag]
    ) -> dict:
        """Calculate overall communication statistics."""
        # All MessageFlag records are toxicity detections
        toxicity_flags = flags
        accepted_suggestions = [f for f in flags if f.user_action == "accepted"]

        # Calculate average toxicity score
        scores = [f.toxicity_score for f in toxicity_flags if f.toxicity_score]
        avg_toxicity = sum(scores) / len(scores) if scores else 0

        return {
            "total_messages": len(messages),
            "total_interventions": len(toxicity_flags),
            "intervention_rate": self._calculate_percentage(
                len(toxicity_flags), len(messages)
            ),
            "suggestions_accepted": len(accepted_suggestions),
            "acceptance_rate": self._calculate_percentage(
                len(accepted_suggestions), len(toxicity_flags)
            ),
            "average_toxicity_score": round(avg_toxicity, 3),
            "communication_health_score": self._calculate_health_score(
                len(messages), len(toxicity_flags), len(accepted_suggestions)
            ),
        }

    def _calculate_health_score(
        self,
        total_messages: int,
        interventions: int,
        accepted: int
    ) -> float:
        """Calculate overall communication health score (0-100)."""
        if total_messages == 0:
            return 100.0

        # Base score starts at 100
        score = 100.0

        # Deduct for intervention rate (up to 40 points)
        intervention_rate = interventions / total_messages
        score -= intervention_rate * 40

        # Bonus for accepting suggestions (up to 20 points back)
        if interventions > 0:
            acceptance_rate = accepted / interventions
            score += acceptance_rate * 20

        return max(0, min(100, round(score, 1)))

    async def _analyze_by_participant(
        self,
        db,
        context: GeneratorContext,
        messages: list[Message],
        flags: list[MessageFlag]
    ) -> list[dict]:
        """Analyze communication by participant."""
        # Get participants
        participants_result = await db.execute(
            select(CaseParticipant, User)
            .join(User, CaseParticipant.user_id == User.id)
            .where(CaseParticipant.case_id == context.case_id)
            .where(CaseParticipant.is_active == True)
        )
        participants = list(participants_result.all())

        analysis = []
        for participant, user in participants:
            user_messages = [m for m in messages if m.sender_id == user.id]
            user_flags = [
                f for f in flags
                for m in messages
                if f.message_id == m.id and m.sender_id == user.id
            ]
            # All MessageFlag records are toxicity detections
            toxicity_flags = user_flags
            accepted = [f for f in user_flags if f.user_action == "accepted"]

            analysis.append({
                "parent_type": participant.parent_type,
                "name": await self._redact(
                    f"{user.first_name} {user.last_name}",
                    context
                ),
                "messages_sent": len(user_messages),
                "interventions": len(toxicity_flags),
                "intervention_rate": self._calculate_percentage(
                    len(toxicity_flags), len(user_messages)
                ),
                "suggestions_accepted": len(accepted),
                "acceptance_rate": self._calculate_percentage(
                    len(accepted), len(toxicity_flags)
                ),
            })

        return analysis

    def _identify_patterns(
        self,
        messages: list[Message],
        flags: list[MessageFlag]
    ) -> dict:
        """Identify communication patterns."""
        patterns = {
            "peak_hours": [],
            "toxicity_categories": {},
            "improvement_trend": "stable",
        }

        if not messages:
            return patterns

        # Peak communication hours
        hour_counts = {}
        for message in messages:
            hour = message.sent_at.hour
            hour_counts[hour] = hour_counts.get(hour, 0) + 1

        sorted_hours = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)
        patterns["peak_hours"] = [
            {"hour": h, "count": c} for h, c in sorted_hours[:3]
        ]

        # Toxicity categories (categories is a list of detected issues)
        for flag in flags:
            if flag.categories:
                for category in flag.categories:
                    if category not in patterns["toxicity_categories"]:
                        patterns["toxicity_categories"][category] = 0
                    patterns["toxicity_categories"][category] += 1

        # Trend analysis (compare first half vs second half)
        if len(messages) > 10:
            mid = len(messages) // 2
            first_half_flags = len([
                f for f in flags
                for m in messages[:mid]
                if f.message_id == m.id
            ])
            second_half_flags = len([
                f for f in flags
                for m in messages[mid:]
                if f.message_id == m.id
            ])

            if second_half_flags < first_half_flags * 0.7:
                patterns["improvement_trend"] = "improving"
            elif second_half_flags > first_half_flags * 1.3:
                patterns["improvement_trend"] = "declining"

        return patterns

    def _analyze_response_times(self, messages: list[Message]) -> dict:
        """Analyze message response times."""
        if len(messages) < 2:
            return {
                "average_response_hours": None,
                "max_response_hours": None,
                "messages_unanswered_24h": 0,
            }

        # Group messages by sender to find response patterns
        response_times = []
        messages_sorted = sorted(messages, key=lambda m: m.sent_at)

        for i in range(1, len(messages_sorted)):
            prev = messages_sorted[i - 1]
            curr = messages_sorted[i]

            # If different sender, it's a response
            if prev.sender_id != curr.sender_id:
                delta = (curr.sent_at - prev.sent_at).total_seconds() / 3600
                response_times.append(delta)

        if not response_times:
            return {
                "average_response_hours": None,
                "max_response_hours": None,
                "messages_unanswered_24h": 0,
            }

        return {
            "average_response_hours": round(sum(response_times) / len(response_times), 1),
            "max_response_hours": round(max(response_times), 1),
            "messages_unanswered_24h": len([r for r in response_times if r > 24]),
        }

    def _summarize_aria_activity(self, flags: list[MessageFlag]) -> dict:
        """Summarize ARIA intervention activity."""
        actions = {
            "accepted": 0,
            "modified": 0,
            "rejected": 0,
            "sent_anyway": 0,
        }

        for flag in flags:
            if flag.user_action in actions:
                actions[flag.user_action] += 1

        return {
            "total_interventions": len(flags),
            "user_actions": actions,
            "good_faith_score": self._calculate_percentage(
                actions["accepted"] + actions["modified"],
                len(flags)
            ),
        }

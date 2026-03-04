"""
Intervention Log section generator.

Section 6: ARIA interventions (redacted message content).
"""

from datetime import datetime
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.models.message import Message, MessageFlag
from app.models.user import User
from app.services.export.generators.base import (
    BaseSectionGenerator,
    GeneratorContext,
    SectionContent,
)


class InterventionLogGenerator(BaseSectionGenerator):
    """Generates the Intervention Log section."""

    section_type = "intervention_log"
    section_title = "Intervention Log"
    section_order = 6

    async def generate(self, context: GeneratorContext) -> SectionContent:
        """Generate intervention log."""
        db = context.db
        start = datetime.combine(context.date_start, datetime.min.time())
        end = datetime.combine(context.date_end, datetime.max.time())

        # Get all flags with toxicity detection
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
            .options(selectinload(MessageFlag.message))
            .order_by(MessageFlag.created_at.desc())
        )
        flags = list(flags_result.scalars().all())

        # Build intervention entries
        interventions = await self._build_intervention_entries(flags, context)

        # Categorize by outcome
        by_outcome = self._categorize_by_outcome(flags)

        # Categorize by toxicity type
        by_category = self._categorize_by_toxicity(flags)

        # Identify repeat patterns
        repeat_patterns = self._identify_repeat_patterns(flags)

        content_data = {
            "total_interventions": len(flags),
            "intervention_log": interventions,
            "by_outcome": by_outcome,
            "by_category": by_category,
            "repeat_patterns": repeat_patterns,
            "report_period": {
                "start": self._format_date(context.date_start),
                "end": self._format_date(context.date_end),
            },
            "note": "Message content is redacted for privacy. Only intervention metadata is shown.",
        }

        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data=content_data,
            evidence_count=len(flags),
            data_sources=["message_flags"],
        )

    async def _build_intervention_entries(
        self,
        flags: list[MessageFlag],
        context: GeneratorContext
    ) -> list[dict]:
        """Build intervention log entries."""
        db = context.db
        entries = []

        # Get user info for sender lookups
        user_cache = {}

        for flag in flags[:100]:  # Limit to 100 entries
            message = flag.message

            # Get sender info from cache or database
            if message.sender_id not in user_cache:
                user_result = await db.execute(
                    select(User).where(User.id == message.sender_id)
                )
                user = user_result.scalar_one_or_none()
                user_cache[message.sender_id] = user

            sender = user_cache.get(message.sender_id)

            # Build categories list (flag.categories is already a list)
            categories = flag.categories if flag.categories else []

            entry = {
                "timestamp": self._format_datetime(flag.created_at),
                "sender_role": "Parent",  # Generic for privacy
                "toxicity_score": round(flag.toxicity_score or 0, 2),
                "categories": categories,
                "user_action": flag.user_action or "no_action",
                "suggestion_provided": flag.suggested_content is not None,
            }

            # Add redacted content indicator
            if context.message_content_redacted:
                entry["content_status"] = "fully_redacted"
            else:
                entry["content_status"] = "pii_redacted"

            entries.append(entry)

        return entries

    def _categorize_by_outcome(self, flags: list[MessageFlag]) -> dict:
        """Categorize interventions by outcome."""
        outcomes = {
            "accepted": 0,
            "modified": 0,
            "rejected": 0,
            "sent_anyway": 0,
            "no_action": 0,
        }

        for flag in flags:
            action = flag.user_action or "no_action"
            if action in outcomes:
                outcomes[action] += 1

        return outcomes

    def _categorize_by_toxicity(self, flags: list[MessageFlag]) -> dict:
        """Categorize interventions by toxicity type."""
        categories = {}

        for flag in flags:
            # flag.categories is a list of detected issues
            if flag.categories:
                for cat in flag.categories:
                    if cat not in categories:
                        categories[cat] = 0
                    categories[cat] += 1

        return categories

    def _identify_repeat_patterns(self, flags: list[MessageFlag]) -> dict:
        """Identify repeat intervention patterns."""
        patterns = {
            "high_frequency_days": [],
            "common_categories": [],
            "escalation_detected": False,
        }

        if not flags:
            return patterns

        # Count interventions by day
        day_counts = {}
        for flag in flags:
            day = flag.created_at.date()
            day_counts[day] = day_counts.get(day, 0) + 1

        # Find high frequency days (3+ interventions)
        patterns["high_frequency_days"] = [
            {"date": self._format_date(day), "count": count}
            for day, count in sorted(day_counts.items(), key=lambda x: x[1], reverse=True)
            if count >= 3
        ][:5]  # Top 5

        # Find most common categories
        category_counts = self._categorize_by_toxicity(flags)
        sorted_cats = sorted(
            category_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )
        patterns["common_categories"] = [
            {"category": cat, "count": count}
            for cat, count in sorted_cats[:5]
        ]

        # Check for escalation (increasing trend in last 30 days)
        if len(flags) >= 10:
            mid = len(flags) // 2
            first_half = flags[mid:]  # Earlier flags (reversed order)
            second_half = flags[:mid]  # Later flags

            first_avg = sum(f.toxicity_score or 0 for f in first_half) / len(first_half)
            second_avg = sum(f.toxicity_score or 0 for f in second_half) / len(second_half)

            if second_avg > first_avg * 1.3:  # 30% increase
                patterns["escalation_detected"] = True

        return patterns

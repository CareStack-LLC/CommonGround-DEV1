"""
Risk Assessment Report (A-5).

Child safety and conflict exposure indicators with a 0-100 risk score:
ARIA severity distribution, zero-tolerance category hits, communication
trend (first half vs second half of the period), and exchange stability.
"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.child import Child
from app.models.custody_exchange import CustodyExchangeInstance
from app.models.family_file import FamilyFile
from app.models.message import Message, MessageFlag
from app.models.user import User

# Categories that carry outsized weight in the risk score
HIGH_RISK_CATEGORIES = (
    "hate_speech",
    "sexual_harassment",
    "threatening",
    "threats",
    "custody_weaponization",
)


class RiskAssessmentReport:
    """Per-case child-safety risk assessment."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_data(
        self,
        family_file_id: str,
        professional_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> dict:
        family_file = (
            await self.db.execute(
                select(FamilyFile).where(FamilyFile.id == family_file_id)
            )
        ).scalar_one_or_none()
        if not family_file:
            raise ValueError(f"Family file {family_file_id} not found")

        parent_a = await self.db.get(User, family_file.parent_a_id)
        parent_b = (
            await self.db.get(User, family_file.parent_b_id)
            if family_file.parent_b_id
            else None
        )

        messages = list(
            (
                await self.db.execute(
                    select(Message).where(
                        Message.family_file_id == family_file_id,
                        Message.sent_at >= start_date,
                        Message.sent_at <= end_date,
                    )
                )
            ).scalars().all()
        )
        message_ids = [str(m.id) for m in messages]
        flags: list[MessageFlag] = []
        if message_ids:
            flags = list(
                (
                    await self.db.execute(
                        select(MessageFlag).where(
                            MessageFlag.message_id.in_(message_ids)
                        )
                    )
                ).scalars().all()
            )

        severity_counts = {"low": 0, "medium": 0, "high": 0, "severe": 0}
        category_hits: dict[str, int] = {}
        for f in flags:
            if f.severity in severity_counts:
                severity_counts[f.severity] += 1
            for cat in f.categories or []:
                if cat in HIGH_RISK_CATEGORIES:
                    category_hits[cat] = category_hits.get(cat, 0) + 1

        # Trend: average toxicity, first half vs second half of the window
        scores = [f.toxicity_score for f in flags if f.toxicity_score is not None]
        if len(scores) >= 4:
            mid = len(scores) // 2
            first, second = scores[:mid], scores[mid:]
            first_avg = sum(first) / len(first)
            second_avg = sum(second) / len(second)
            if second_avg < first_avg * 0.8:
                trend = "improving"
            elif second_avg > first_avg * 1.2:
                trend = "worsening"
            else:
                trend = "stable"
        else:
            trend = "insufficient_data"

        exchanges = list(
            (
                await self.db.execute(
                    select(CustodyExchangeInstance).where(
                        CustodyExchangeInstance.exchange.has(
                            family_file_id=family_file_id
                        ),
                        CustodyExchangeInstance.scheduled_time >= start_date,
                        CustodyExchangeInstance.scheduled_time <= end_date,
                    )
                )
            ).scalars().all()
        )
        missed = sum(1 for e in exchanges if e.status == "missed")
        missed_rate = (missed / len(exchanges) * 100) if exchanges else 0.0

        children = list(
            (
                await self.db.execute(
                    select(Child).where(
                        Child.family_file_id == family_file_id,
                        Child.is_active == True,  # noqa: E712
                    )
                )
            ).scalars().all()
        )

        # Composite risk score, capped at 100
        risk_score = min(
            100,
            int(
                severity_counts["severe"] * 15
                + severity_counts["high"] * 8
                + severity_counts["medium"] * 3
                + sum(category_hits.values()) * 20
                + missed_rate * 0.3
                + (10 if trend == "worsening" else 0)
            ),
        )
        if risk_score >= 70:
            risk_level, risk_note = (
                "high",
                "Immediate intervention recommended; escalate to court/mediator.",
            )
        elif risk_score >= 40:
            risk_level, risk_note = (
                "medium",
                "Monitor closely; consider mediation intervention.",
            )
        else:
            risk_level, risk_note = (
                "low",
                "Normal conflict levels; continue standard monitoring.",
            )

        recommendations = []
        if category_hits:
            recommendations.append(
                "Zero-tolerance content detected "
                f"({', '.join(sorted(category_hits))}); review flagged messages "
                "immediately and consider protective action."
            )
        if severity_counts["severe"] >= 3:
            recommendations.append(
                "Multiple severe toxicity incidents; recommend professional "
                "mediator involvement."
            )
        if missed_rate > 20:
            recommendations.append(
                f"Missed-exchange rate of {missed_rate:.0f}% indicates custody "
                "instability; review exchange logistics or supervision."
            )
        if trend == "worsening":
            recommendations.append(
                "Communication toxicity is trending worse across the period."
            )
        if not recommendations:
            recommendations.append(
                "No elevated risk indicators in this period; continue ARIA "
                "monitoring."
            )

        return {
            "report_type": "risk_assessment",
            "metadata": {
                "family_file_id": family_file_id,
                "family_file_number": family_file.family_file_number,
                "parents": {
                    "parent_a": (
                        f"{parent_a.first_name} {parent_a.last_name}"
                        if parent_a
                        else "Parent A"
                    ),
                    "parent_b": (
                        f"{parent_b.first_name} {parent_b.last_name}"
                        if parent_b
                        else "Parent B"
                    ),
                },
                "children_count": len(children),
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                },
                "generated_at": datetime.utcnow().isoformat(),
            },
            "risk_assessment": {
                "overall_score": risk_score,
                "risk_level": risk_level,
                "assessment": risk_note,
                "communication_trend": trend,
            },
            "severity_distribution": severity_counts,
            "zero_tolerance_hits": category_hits or {"none_detected": 0},
            "exchange_stability": {
                "scheduled": len(exchanges),
                "missed": missed,
                "missed_rate_pct": round(missed_rate, 1),
            },
            "message_volume": {
                "total_messages": len(messages),
                "flagged_messages": len(flags),
            },
            "recommendations": recommendations,
        }

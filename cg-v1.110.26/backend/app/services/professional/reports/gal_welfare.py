"""
GAL Child Welfare View Report (A-8).

Child-centered welfare indicators for Guardian ad Litem filings: exposure
to toxic communication, custody stability, per-parent communication
capacity, and child-support compliance.

IMPORTANT: requires dual-parent consent. The generate endpoint enforces
consent (professional.py — requires_dual_consent check on CaseAssignment)
before a report row can be created; this module assumes that check passed.
"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.child import Child
from app.models.clearfund import Obligation
from app.models.custody_exchange import CustodyExchangeInstance
from app.models.family_file import FamilyFile
from app.models.message import Message, MessageFlag
from app.models.user import User

SEVERE_CATEGORIES = (
    "hate_speech",
    "sexual_harassment",
    "threatening",
    "threats",
)
# Obligation statuses that mean the money actually arrived
SATISFIED_OBLIGATION_STATUSES = ("funded", "completed", "closed", "verified")


class GALWelfareReport:
    """Child-welfare assessment for Guardian ad Litem use."""

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

        severe_incidents = sum(
            1
            for f in flags
            if f.severity in ("severe", "high")
            and f.categories
            and any(c in SEVERE_CATEGORIES for c in f.categories)
        )

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

        safety_score = 100.0
        safety_score -= min(40.0, severe_incidents * 10)
        safety_score -= min(20.0, missed_rate * 0.2)
        if messages:
            safety_score -= min(20.0, len(flags) / len(messages) * 50)
        safety_score = max(0, int(safety_score))
        safety_level = (
            "safe"
            if safety_score >= 75
            else "moderate_concern"
            if safety_score >= 50
            else "high_concern"
        )

        # Per-parent communication capacity
        flag_by_message = {f.message_id: f for f in flags}

        def parent_stats(parent_id: str | None) -> dict:
            if not parent_id:
                return {"messages": 0, "flagged": 0, "intervention_rate_pct": 0.0}
            sent = [m for m in messages if str(m.sender_id) == str(parent_id)]
            flagged = sum(1 for m in sent if str(m.id) in flag_by_message)
            rate = (flagged / len(sent) * 100) if sent else 0.0
            return {
                "messages": len(sent),
                "flagged": flagged,
                "intervention_rate_pct": round(rate, 1),
            }

        a_stats = parent_stats(family_file.parent_a_id)
        b_stats = parent_stats(family_file.parent_b_id)

        # Child support compliance
        support_obligations = list(
            (
                await self.db.execute(
                    select(Obligation).where(
                        Obligation.family_file_id == family_file_id,
                        Obligation.purpose_category == "child_support",
                    )
                )
            ).scalars().all()
        )
        satisfied = sum(
            1
            for o in support_obligations
            if o.status in SATISFIED_OBLIGATION_STATUSES
        )
        support_compliance = (
            satisfied / len(support_obligations) * 100
            if support_obligations
            else 100.0
        )

        key_findings = []
        if severe_incidents:
            key_findings.append(
                f"{severe_incidents} severe communication incident(s) "
                "(threats/hate speech/harassment) during the period."
            )
        if missed_rate > 20:
            key_findings.append(
                f"Custody instability: {missed_rate:.0f}% of scheduled "
                "exchanges were missed."
            )
        for label, stats in (("Parent A", a_stats), ("Parent B", b_stats)):
            if stats["intervention_rate_pct"] > 25 and stats["messages"] >= 4:
                key_findings.append(
                    f"{label}'s messages required ARIA intervention "
                    f"{stats['intervention_rate_pct']:.0f}% of the time."
                )
        if support_compliance < 80 and support_obligations:
            key_findings.append(
                f"Child-support compliance is {support_compliance:.0f}%."
            )
        if not key_findings:
            key_findings.append(
                "No elevated welfare concerns detected during the period."
            )

        recommendations = []
        if safety_level == "high_concern":
            recommendations.append(
                "Recommend custody evaluation and consideration of protective "
                "measures."
            )
        if severe_incidents:
            recommendations.append(
                "Review the flagged messages directly (available via the "
                "communication analysis report) before the next hearing."
            )
        if missed_rate > 20:
            recommendations.append(
                "Recommend structured exchange logistics (fixed neutral "
                "location, supervised if needed)."
            )
        recommendations.append("Continue ARIA monitoring for this case.")

        today = datetime.utcnow().date()
        return {
            "report_type": "gal_welfare",
            "metadata": {
                "family_file_id": family_file_id,
                "family_file_number": family_file.family_file_number,
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                },
                "children_count": len(children),
                "generated_at": datetime.utcnow().isoformat(),
                "requires_dual_consent": True,
            },
            "children": [
                {
                    "name": f"{c.first_name} {c.last_name}",
                    "age": (
                        (today - c.date_of_birth).days // 365
                        if c.date_of_birth
                        else None
                    ),
                    "school": c.school_name or "—",
                }
                for c in children
            ],
            "child_safety_assessment": {
                "score": safety_score,
                "level": safety_level,
                "severe_incidents": severe_incidents,
                "total_messages": len(messages),
                "flagged_messages": len(flags),
                "missed_exchanges": missed,
                "scheduled_exchanges": len(exchanges),
            },
            "parental_communication_capacity": {
                "parent_a": {
                    "name": (
                        f"{parent_a.first_name} {parent_a.last_name}"
                        if parent_a
                        else "Parent A"
                    ),
                    **a_stats,
                },
                "parent_b": {
                    "name": (
                        f"{parent_b.first_name} {parent_b.last_name}"
                        if parent_b
                        else "Parent B"
                    ),
                    **b_stats,
                },
            },
            "child_support_compliance": {
                "obligations": len(support_obligations),
                "satisfied": satisfied,
                "compliance_rate_pct": round(support_compliance, 1),
            },
            "key_findings": key_findings,
            "recommendations": recommendations,
        }

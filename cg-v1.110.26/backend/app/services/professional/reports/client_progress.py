"""
Client Progress Summary Report (A-7).

Attorney-branded one-pager for client communication: case health score,
30-day activity summary, and plain-language action items.
"""

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.child import Child
from app.models.custody_exchange import CustodyExchangeInstance
from app.models.family_file import FamilyFile
from app.models.message import Message, MessageFlag
from app.models.user import User


class ClientProgressReport:
    """One-page client-facing progress summary."""

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

        window_start = datetime.utcnow() - timedelta(days=30)

        messages = list(
            (
                await self.db.execute(
                    select(Message).where(
                        Message.family_file_id == family_file_id,
                        Message.sent_at >= window_start,
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

        exchanges = list(
            (
                await self.db.execute(
                    select(CustodyExchangeInstance).where(
                        CustodyExchangeInstance.exchange.has(
                            family_file_id=family_file_id
                        ),
                        CustodyExchangeInstance.scheduled_time >= window_start,
                        CustodyExchangeInstance.scheduled_time <= datetime.utcnow(),
                    )
                )
            ).scalars().all()
        )
        completed = sum(1 for e in exchanges if e.status == "completed")
        missed = sum(1 for e in exchanges if e.status == "missed")

        # Client-facing health score
        health = 100.0
        if messages:
            health -= min(40.0, len(flags) / len(messages) * 100)
        if exchanges:
            health -= min(30.0, missed / len(exchanges) * 100)
        health_score = max(0, int(health))
        if health_score >= 80:
            health_status = "Excellent"
        elif health_score >= 60:
            health_status = "Good"
        elif health_score >= 40:
            health_status = "Fair"
        else:
            health_status = "Needs Attention"

        action_items = []
        if flags:
            action_items.append(
                "Review messages ARIA flagged this month and keep communication "
                "focused on the children."
            )
        if missed:
            action_items.append(
                f"Follow up on {missed} missed custody exchange"
                f"{'s' if missed != 1 else ''}."
            )
        if health_score < 60:
            action_items.append(
                "Consider a mediation session with your co-parent."
            )
        if not action_items:
            action_items.append(
                "Keep doing what you're doing — no immediate action required."
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
        today = datetime.utcnow().date()

        return {
            "report_type": "client_progress",
            "metadata": {
                "family_file_id": family_file_id,
                "case": family_file.title,
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                },
                "window": "Last 30 days",
                "generated_at": datetime.utcnow().isoformat(),
            },
            "case_health": {
                "score": health_score,
                "status": health_status,
            },
            "last_30_days": {
                "messages_exchanged": len(messages),
                "aria_interventions": len(flags),
                "exchanges_completed": completed,
                "exchanges_missed": missed,
            },
            "children": [
                {
                    "name": f"{c.first_name} {c.last_name}",
                    "age": (
                        (today - c.date_of_birth).days // 365
                        if c.date_of_birth
                        else None
                    ),
                }
                for c in children
            ],
            "action_items": action_items,
            "parents": {
                "client": (
                    f"{parent_a.first_name} {parent_a.last_name}"
                    if parent_a
                    else "Client"
                ),
                "co_parent": parent_b.first_name if parent_b else "Co-Parent",
            },
            "next_steps": (
                "Contact your attorney if you have questions or if "
                "circumstances change."
            ),
        }

"""
Firm Analytics Report (A-4).

Aggregate practice metrics across every active case assigned to the
professional's firm(s): ARIA intervention rates, exchange compliance,
message volume, and a high-conflict watchlist.
"""

from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.custody_exchange import CustodyExchangeInstance
from app.models.family_file import FamilyFile
from app.models.message import Message, MessageFlag
from app.models.professional import CaseAssignment, FirmMembership


class FirmAnalyticsReport:
    """Firm-wide analytics across all assigned cases."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_data(
        self,
        family_file_id: str,
        professional_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> dict:
        # Firms this professional actively belongs to (explicit query — no
        # lazy relationship access in async context)
        firm_rows = await self.db.execute(
            select(FirmMembership.firm_id).where(
                FirmMembership.professional_id == professional_id,
                FirmMembership.status == "active",
            )
        )
        firm_ids = [r[0] for r in firm_rows.all()]

        # Fall back to the professional's own assignments when they have no
        # firm (solo practitioners)
        if firm_ids:
            assignment_query = select(CaseAssignment).where(
                CaseAssignment.firm_id.in_(firm_ids),
                CaseAssignment.status == "active",
            )
        else:
            assignment_query = select(CaseAssignment).where(
                CaseAssignment.professional_id == professional_id,
                CaseAssignment.status == "active",
            )
        assignments = list((await self.db.execute(assignment_query)).scalars().all())

        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        case_metrics = []
        total_flags = total_messages = total_exchanges = completed_exchanges = 0
        high_conflict = 0

        for assignment in assignments:
            ff_id = assignment.family_file_id

            flags_30d = (
                await self.db.scalar(
                    select(func.count(MessageFlag.id))
                    .select_from(MessageFlag)
                    .join(Message, Message.id == MessageFlag.message_id)
                    .where(
                        Message.family_file_id == ff_id,
                        Message.sent_at >= thirty_days_ago,
                    )
                )
            ) or 0

            messages = (
                await self.db.scalar(
                    select(func.count(Message.id)).where(
                        Message.family_file_id == ff_id,
                        Message.sent_at >= start_date,
                        Message.sent_at <= end_date,
                    )
                )
            ) or 0

            exchanges = list(
                (
                    await self.db.execute(
                        select(CustodyExchangeInstance).where(
                            CustodyExchangeInstance.exchange.has(family_file_id=ff_id),
                            CustodyExchangeInstance.scheduled_time >= start_date,
                            CustodyExchangeInstance.scheduled_time <= end_date,
                        )
                    )
                ).scalars().all()
            )
            completed = sum(1 for e in exchanges if e.status == "completed")
            missed = sum(1 for e in exchanges if e.status == "missed")

            exchange_rate = (completed / len(exchanges) * 100) if exchanges else 100.0
            aria_rate = (flags_30d / messages * 100) if messages else 0.0
            is_high_conflict = aria_rate > 15 or (exchanges and missed / len(exchanges) > 0.25)
            if is_high_conflict:
                high_conflict += 1

            ff = (
                await self.db.execute(select(FamilyFile).where(FamilyFile.id == ff_id))
            ).scalar_one_or_none()

            case_metrics.append(
                {
                    "case": ff.title if ff else ff_id,
                    "file_number": ff.family_file_number if ff else "—",
                    "role": assignment.assignment_role,
                    "messages": messages,
                    "aria_flags_30d": flags_30d,
                    "aria_rate_pct": round(aria_rate, 1),
                    "exchange_compliance_pct": round(exchange_rate, 1),
                    "missed_exchanges": missed,
                    "high_conflict": "YES" if is_high_conflict else "no",
                }
            )

            total_flags += flags_30d
            total_messages += messages
            total_exchanges += len(exchanges)
            completed_exchanges += completed

        total_cases = len(assignments)
        return {
            "report_type": "firm_analytics",
            "metadata": {
                "professional_id": professional_id,
                "firm_count": len(firm_ids),
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                },
                "generated_at": datetime.utcnow().isoformat(),
            },
            "practice_summary": {
                "active_cases": total_cases,
                "high_conflict_cases": high_conflict,
                "total_messages_period": total_messages,
                "aria_flags_30d": total_flags,
                "aria_intervention_rate_pct": round(
                    (total_flags / total_messages * 100) if total_messages else 0.0, 1
                ),
                "avg_exchange_compliance_pct": round(
                    (completed_exchanges / total_exchanges * 100)
                    if total_exchanges
                    else 100.0,
                    1,
                ),
            },
            # Sorted worst-first so the watchlist is at the top of the table
            "cases": sorted(
                case_metrics, key=lambda c: c["aria_rate_pct"], reverse=True
            ),
        }

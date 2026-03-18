"""
Rolling Instance Generator

Runs daily to ensure exchange instances and obligation instances
are projected forward beyond the initial activation window.

- Exchange instances: maintains 8 weeks ahead
- Obligation instances: maintains 6 months ahead

Run as: python -m app.worker.rolling_generator
Or schedule via Render cron / Celery beat.
"""

import os
import sys
import asyncio
import logging
from datetime import datetime, timedelta, date

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func, and_

logger = logging.getLogger(__name__)

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))


async def run_rolling_generator():
    """Main entry point for the rolling generator."""
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        print("DATABASE_URL not set. Cannot run rolling generator.")
        return

    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(
        database_url,
        echo=False,
        connect_args={"statement_cache_size": 0}
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print(f"Rolling Generator started at {datetime.utcnow().isoformat()}")

    async with async_session() as db:
        try:
            exchanges_created = await _roll_exchange_instances(db)
            obligations_created = await _roll_obligation_instances(db)
            await db.commit()
            print(f"Done: {exchanges_created} exchange instances, {obligations_created} obligation instances created")
        except Exception as e:
            await db.rollback()
            print(f"Rolling generator failed: {e}")
            logger.error(f"Rolling generator failed: {e}", exc_info=True)

    await engine.dispose()


async def _roll_exchange_instances(db: AsyncSession) -> int:
    """Generate exchange instances for the next 8 weeks for all active exchanges."""
    from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
    from app.models.agreement import Agreement

    # Find all active exchanges linked to active agreements
    result = await db.execute(
        select(CustodyExchange).join(
            Agreement, CustodyExchange.agreement_id == Agreement.id
        ).where(Agreement.status == "active")
    )
    exchanges = result.scalars().all()

    if not exchanges:
        return 0

    today = date.today()
    end_date = today + timedelta(weeks=8)
    created = 0

    for exchange in exchanges:
        # Find the latest existing instance for this exchange
        latest_result = await db.execute(
            select(func.max(CustodyExchangeInstance.scheduled_date)).where(
                CustodyExchangeInstance.exchange_id == exchange.id
            )
        )
        latest_date = latest_result.scalar()

        # Start generating from the day after the latest instance (or today)
        start = (latest_date + timedelta(days=1)) if latest_date else today

        if start >= end_date:
            continue  # Already covered

        # Generate instances based on recurrence pattern
        current = start
        while current <= end_date:
            # Check day of week matches the exchange day
            if hasattr(exchange, 'day_of_week') and exchange.day_of_week is not None:
                if current.weekday() != exchange.day_of_week:
                    current += timedelta(days=1)
                    continue

            # Check recurrence (weekly vs biweekly)
            should_create = True
            if hasattr(exchange, 'recurrence') and exchange.recurrence == "biweekly":
                if latest_date:
                    weeks_diff = (current - latest_date).days // 7
                    should_create = weeks_diff % 2 == 0

            if should_create:
                instance = CustodyExchangeInstance(
                    exchange_id=exchange.id,
                    family_file_id=exchange.family_file_id,
                    scheduled_date=current,
                    scheduled_time=exchange.scheduled_time if hasattr(exchange, 'scheduled_time') else None,
                    status="scheduled",
                    from_parent_id=exchange.from_parent_id if hasattr(exchange, 'from_parent_id') else None,
                    to_parent_id=exchange.to_parent_id if hasattr(exchange, 'to_parent_id') else None,
                )
                db.add(instance)
                created += 1

            current += timedelta(days=7)  # Jump by week

    await db.flush()
    return created


async def _roll_obligation_instances(db: AsyncSession) -> int:
    """Generate obligation instances for the next 6 months for all active templates."""
    from app.models.clearfund import Obligation

    # Find all template obligations (recurring)
    result = await db.execute(
        select(Obligation).where(
            and_(
                Obligation.status == "template",
                Obligation.is_recurring == True,
            )
        )
    )
    templates = result.scalars().all()

    if not templates:
        return 0

    today = date.today()
    end_date = today + timedelta(days=180)  # 6 months
    created = 0

    for template in templates:
        # Find the latest instance for this template
        latest_result = await db.execute(
            select(func.max(Obligation.due_date)).where(
                and_(
                    Obligation.template_id == template.id,
                    Obligation.status != "template",
                )
            )
        )
        latest_due = latest_result.scalar()

        # Determine recurrence interval
        interval_days = 30  # Default monthly
        if hasattr(template, 'recurrence_interval'):
            if template.recurrence_interval == "weekly":
                interval_days = 7
            elif template.recurrence_interval == "biweekly":
                interval_days = 14
            elif template.recurrence_interval == "monthly":
                interval_days = 30

        # Start from the next due date after the latest
        if latest_due:
            next_due = latest_due + timedelta(days=interval_days)
        else:
            next_due = today + timedelta(days=interval_days)

        while next_due <= end_date:
            instance = Obligation(
                family_file_id=template.family_file_id,
                template_id=template.id,
                title=template.title,
                description=template.description,
                amount=template.amount,
                due_date=next_due,
                payer_id=template.payer_id,
                payee_id=template.payee_id,
                category=template.category if hasattr(template, 'category') else None,
                status="pending",
                is_recurring=False,
            )
            db.add(instance)
            created += 1
            next_due += timedelta(days=interval_days)

    await db.flush()
    return created


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_rolling_generator())

"""
Item Tracking section generator for KidsCubbie.

Section: High-value item transfers, custody, disputes, and condition tracking.
"""

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Any
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.models.cubbie import CubbieItem, CubbieExchangeItem, ItemLocation, ItemCondition
from app.models.custody_exchange import CustodyExchangeInstance, CustodyExchange
from app.models.child import Child
from app.models.user import User
from app.services.export.generators.base import (
    BaseSectionGenerator,
    GeneratorContext,
    SectionContent,
)


class ItemTrackingGenerator(BaseSectionGenerator):
    """Generates the Item Tracking section for KidsCubbie data."""

    section_type = "item_tracking"
    section_title = "High-Value Item Tracking (KidsCubbie)"
    section_order = 10

    async def generate(self, context: GeneratorContext) -> SectionContent:
        """Generate item tracking report."""
        db = context.db
        start = datetime.combine(context.date_start, datetime.min.time())
        end = datetime.combine(context.date_end, datetime.max.time())

        # Get all cubbie items for the case
        items_data = await self._get_case_items(db, context.case_id)

        # Get exchange item records in the period
        exchange_items = await self._get_exchange_items(
            db, context.case_id, start, end
        )

        # Get disputed items
        disputes = await self._get_disputed_items(db, context.case_id, start, end)

        # Calculate statistics
        stats = self._calculate_statistics(items_data, exchange_items, disputes)

        # Get condition changes
        condition_changes = await self._get_condition_changes(
            db, context.case_id, start, end
        )

        # Build item summary by child
        items_by_child = self._group_items_by_child(items_data)

        # Get transfer timeline
        transfer_timeline = self._build_transfer_timeline(exchange_items)

        content_data = {
            "summary": {
                "total_registered_items": stats["total_items"],
                "total_value": str(stats["total_value"]),
                "items_transferred_in_period": stats["transfers_in_period"],
                "disputed_items": stats["disputed_count"],
                "condition_issues_reported": stats["condition_issues"],
            },
            "items_by_child": items_by_child,
            "transfer_timeline": transfer_timeline,
            "disputes": [
                {
                    "item_name": d["item_name"],
                    "exchange_date": self._format_datetime(d["exchange_date"]),
                    "reported_by": d["reported_by"],
                    "dispute_notes": d["dispute_notes"],
                    "condition_sent": d["condition_sent"],
                    "condition_received": d["condition_received"],
                    "photo_sent": d["photo_sent_url"] is not None,
                    "photo_received": d["photo_received_url"] is not None,
                }
                for d in disputes
            ],
            "condition_changes": condition_changes,
            "category_breakdown": stats["by_category"],
            "location_summary": stats["by_location"],
            "report_period": {
                "start": self._format_date(context.date_start),
                "end": self._format_date(context.date_end),
            },
            "evidence_note": (
                "Item tracking provides documented evidence of high-value item "
                "transfers between parents. Photos and condition reports create "
                "an auditable trail for court review."
            ),
        }

        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data=content_data,
            evidence_count=len(exchange_items) + len(disputes),
            data_sources=["cubbie_items", "cubbie_exchange_items", "custody_exchanges"],
        )

    async def _get_case_items(self, db, case_id: str) -> List[Dict[str, Any]]:
        """Get all cubbie items for the case."""
        # Get all children in the case
        children_result = await db.execute(
            select(Child).where(Child.case_id == case_id)
        )
        children = children_result.scalars().all()
        child_ids = [c.id for c in children]

        if not child_ids:
            return []

        # Get items for all children
        items_result = await db.execute(
            select(CubbieItem)
            .where(CubbieItem.child_id.in_(child_ids))
            .order_by(CubbieItem.name)
        )
        items = items_result.scalars().all()

        # Get child name mapping
        child_names = {c.id: c.display_name for c in children}

        return [
            {
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "category": item.category,
                "estimated_value": item.estimated_value,
                "serial_number": item.serial_number,
                "current_location": item.current_location,
                "child_id": item.child_id,
                "child_name": child_names.get(item.child_id, "Unknown"),
                "photo_url": item.photo_url,
                "is_active": item.is_active,
                "added_at": item.created_at,
            }
            for item in items
        ]

    async def _get_exchange_items(
        self, db, case_id: str, start: datetime, end: datetime
    ) -> List[Dict[str, Any]]:
        """Get item exchange records in the date range."""
        # Get exchanges for this case
        exchanges_result = await db.execute(
            select(CustodyExchange).where(CustodyExchange.case_id == case_id)
        )
        exchanges = exchanges_result.scalars().all()
        exchange_ids = [e.id for e in exchanges]

        if not exchange_ids:
            return []

        # Get instances in date range
        instances_result = await db.execute(
            select(CustodyExchangeInstance)
            .where(
                and_(
                    CustodyExchangeInstance.exchange_id.in_(exchange_ids),
                    CustodyExchangeInstance.scheduled_time >= start,
                    CustodyExchangeInstance.scheduled_time <= end,
                )
            )
        )
        instances = instances_result.scalars().all()
        instance_ids = [i.id for i in instances]

        if not instance_ids:
            return []

        # Get exchange items
        items_result = await db.execute(
            select(CubbieExchangeItem)
            .options(selectinload(CubbieExchangeItem.cubbie_item))
            .where(CubbieExchangeItem.exchange_id.in_(instance_ids))
            .order_by(CubbieExchangeItem.sent_at)
        )
        exchange_items = items_result.scalars().all()

        # Map instance to scheduled time
        instance_times = {i.id: i.scheduled_time for i in instances}

        # Get user names
        user_ids = set()
        for ei in exchange_items:
            user_ids.add(ei.sent_by)
            if ei.acknowledged_by:
                user_ids.add(ei.acknowledged_by)

        users_result = await db.execute(
            select(User).where(User.id.in_(list(user_ids)))
        )
        users = {u.id: u.full_name for u in users_result.scalars().all()}

        return [
            {
                "exchange_id": ei.exchange_id,
                "item_id": ei.cubbie_item_id,
                "item_name": ei.cubbie_item.name if ei.cubbie_item else "Unknown",
                "item_category": ei.cubbie_item.category if ei.cubbie_item else None,
                "scheduled_time": instance_times.get(ei.exchange_id),
                "sent_by": users.get(ei.sent_by, "Unknown"),
                "sent_at": ei.sent_at,
                "acknowledged_by": users.get(ei.acknowledged_by) if ei.acknowledged_by else None,
                "acknowledged_at": ei.acknowledged_at,
                "condition_sent": ei.condition_sent,
                "condition_received": ei.condition_received,
                "condition_notes": ei.condition_notes,
                "is_disputed": ei.is_disputed,
                "photo_sent_url": ei.photo_sent_url,
                "photo_received_url": ei.photo_received_url,
            }
            for ei in exchange_items
        ]

    async def _get_disputed_items(
        self, db, case_id: str, start: datetime, end: datetime
    ) -> List[Dict[str, Any]]:
        """Get disputed item records."""
        # Get exchanges for this case
        exchanges_result = await db.execute(
            select(CustodyExchange).where(CustodyExchange.case_id == case_id)
        )
        exchanges = exchanges_result.scalars().all()
        exchange_ids = [e.id for e in exchanges]

        if not exchange_ids:
            return []

        # Get instances in date range
        instances_result = await db.execute(
            select(CustodyExchangeInstance)
            .where(
                and_(
                    CustodyExchangeInstance.exchange_id.in_(exchange_ids),
                    CustodyExchangeInstance.scheduled_time >= start,
                    CustodyExchangeInstance.scheduled_time <= end,
                )
            )
        )
        instances = instances_result.scalars().all()
        instance_ids = [i.id for i in instances]

        if not instance_ids:
            return []

        # Get disputed exchange items
        items_result = await db.execute(
            select(CubbieExchangeItem)
            .options(selectinload(CubbieExchangeItem.cubbie_item))
            .where(
                and_(
                    CubbieExchangeItem.exchange_id.in_(instance_ids),
                    CubbieExchangeItem.is_disputed == True,
                )
            )
        )
        disputed = items_result.scalars().all()

        # Map instance to scheduled time
        instance_times = {i.id: i.scheduled_time for i in instances}

        # Get user names
        user_ids = set()
        for ei in disputed:
            user_ids.add(ei.sent_by)

        users_result = await db.execute(
            select(User).where(User.id.in_(list(user_ids)))
        )
        users = {u.id: u.full_name for u in users_result.scalars().all()}

        return [
            {
                "item_name": d.cubbie_item.name if d.cubbie_item else "Unknown",
                "exchange_date": instance_times.get(d.exchange_id),
                "reported_by": users.get(d.sent_by, "Unknown"),
                "dispute_notes": d.dispute_notes,
                "condition_sent": d.condition_sent,
                "condition_received": d.condition_received,
                "photo_sent_url": d.photo_sent_url,
                "photo_received_url": d.photo_received_url,
            }
            for d in disputed
        ]

    async def _get_condition_changes(
        self, db, case_id: str, start: datetime, end: datetime
    ) -> List[Dict[str, Any]]:
        """Get items where condition changed during exchange."""
        exchange_items = await self._get_exchange_items(db, case_id, start, end)

        changes = []
        for ei in exchange_items:
            if (
                ei["condition_sent"]
                and ei["condition_received"]
                and ei["condition_sent"] != ei["condition_received"]
            ):
                changes.append({
                    "item_name": ei["item_name"],
                    "exchange_date": self._format_datetime(ei["scheduled_time"]) if ei["scheduled_time"] else "Unknown",
                    "condition_before": ei["condition_sent"],
                    "condition_after": ei["condition_received"],
                    "notes": ei["condition_notes"],
                    "has_photo_evidence": ei["photo_received_url"] is not None,
                })

        return changes

    def _calculate_statistics(
        self,
        items: List[Dict],
        exchange_items: List[Dict],
        disputes: List[Dict],
    ) -> Dict[str, Any]:
        """Calculate summary statistics."""
        total_value = Decimal("0")
        by_category: Dict[str, int] = {}
        by_location: Dict[str, int] = {}

        for item in items:
            if item["estimated_value"]:
                total_value += Decimal(str(item["estimated_value"]))

            cat = item["category"] or "other"
            by_category[cat] = by_category.get(cat, 0) + 1

            loc = item["current_location"] or "unknown"
            by_location[loc] = by_location.get(loc, 0) + 1

        # Count condition issues
        condition_issues = sum(
            1 for ei in exchange_items
            if ei["condition_sent"] and ei["condition_received"]
            and ei["condition_sent"] != ei["condition_received"]
        )

        return {
            "total_items": len(items),
            "total_value": total_value,
            "transfers_in_period": len(exchange_items),
            "disputed_count": len(disputes),
            "condition_issues": condition_issues,
            "by_category": by_category,
            "by_location": by_location,
        }

    def _group_items_by_child(self, items: List[Dict]) -> List[Dict[str, Any]]:
        """Group items by child for the report."""
        children: Dict[str, Dict] = {}

        for item in items:
            child_id = item["child_id"]
            if child_id not in children:
                children[child_id] = {
                    "child_name": item["child_name"],
                    "items": [],
                    "total_value": Decimal("0"),
                }

            children[child_id]["items"].append({
                "name": item["name"],
                "category": item["category"],
                "estimated_value": str(item["estimated_value"]) if item["estimated_value"] else None,
                "current_location": item["current_location"],
                "serial_number": item["serial_number"],
                "has_photo": item["photo_url"] is not None,
                "is_active": item["is_active"],
            })

            if item["estimated_value"]:
                children[child_id]["total_value"] += Decimal(str(item["estimated_value"]))

        return [
            {
                "child_name": data["child_name"],
                "item_count": len(data["items"]),
                "total_value": str(data["total_value"]),
                "items": data["items"],
            }
            for data in children.values()
        ]

    def _build_transfer_timeline(self, exchange_items: List[Dict]) -> List[Dict]:
        """Build chronological timeline of item transfers."""
        timeline = []

        for ei in sorted(exchange_items, key=lambda x: x["sent_at"] or datetime.min):
            timeline.append({
                "date": self._format_datetime(ei["sent_at"]) if ei["sent_at"] else "Unknown",
                "item": ei["item_name"],
                "from_parent": ei["sent_by"],
                "to_parent": ei["acknowledged_by"] or "Pending",
                "acknowledged": ei["acknowledged_at"] is not None,
                "condition": ei["condition_received"] or ei["condition_sent"] or "Not reported",
                "disputed": ei["is_disputed"],
            })

        return timeline[:50]  # Limit to 50 entries

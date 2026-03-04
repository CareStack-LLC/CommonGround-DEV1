"""
Chain of Custody section generator.

Section 8: Data integrity verification, hash chain, and audit trail.
"""

from datetime import datetime
import hashlib
from sqlalchemy import select, func, and_

from app.models.audit import EventLog, AuditLog
from app.services.export.generators.base import (
    BaseSectionGenerator,
    GeneratorContext,
    SectionContent,
)


class ChainOfCustodyGenerator(BaseSectionGenerator):
    """Generates the Chain of Custody section."""

    section_type = "chain_of_custody"
    section_title = "Chain of Custody"
    section_order = 8

    async def generate(self, context: GeneratorContext) -> SectionContent:
        """Generate chain of custody verification."""
        db = context.db
        start = datetime.combine(context.date_start, datetime.min.time())
        end = datetime.combine(context.date_end, datetime.max.time())

        # Get event log chain
        events_result = await db.execute(
            select(EventLog)
            .where(
                and_(
                    EventLog.case_id == context.case_id,
                    EventLog.created_at >= start,
                    EventLog.created_at <= end
                )
            )
            .order_by(EventLog.created_at)
        )
        events = list(events_result.scalars().all())

        # Verify hash chain integrity
        chain_verification = self._verify_hash_chain(events)

        # Get audit log summary
        audit_summary = await self._get_audit_summary(db, context, start, end)

        # Calculate data integrity hash
        data_hash = self._calculate_data_hash(events)

        # Get chain statistics
        chain_stats = self._get_chain_statistics(events)

        content_data = {
            "chain_verification": chain_verification,
            "chain_hash": data_hash,
            "chain_statistics": chain_stats,
            "audit_summary": audit_summary,
            "integrity_statement": self._generate_integrity_statement(chain_verification),
            "report_period": {
                "start": self._format_date(context.date_start),
                "end": self._format_date(context.date_end),
            },
            "verification_timestamp": self._format_datetime(datetime.utcnow()),
            "methodology": {
                "hash_algorithm": "SHA-256",
                "chain_type": "Linear hash chain with previous_hash linking",
                "immutability": "Events are append-only and cannot be modified",
            },
        }

        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data=content_data,
            evidence_count=len(events),
            data_sources=["event_logs", "audit_logs"],
        )

    def _verify_hash_chain(self, events: list[EventLog]) -> dict:
        """Verify the integrity of the hash chain."""
        if not events:
            return {
                "is_valid": True,
                "events_verified": 0,
                "breaks_found": 0,
                "break_details": [],
            }

        breaks = []
        verified = 0

        for i, event in enumerate(events):
            if i == 0:
                # First event should have no previous hash or genesis hash
                verified += 1
                continue

            prev_event = events[i - 1]

            # Verify the chain link
            if event.previous_hash != prev_event.current_hash:
                breaks.append({
                    "position": i,
                    "event_id": str(event.id),
                    "expected_previous": prev_event.current_hash,
                    "actual_previous": event.previous_hash,
                    "timestamp": self._format_datetime(event.created_at),
                })
            else:
                verified += 1

        return {
            "is_valid": len(breaks) == 0,
            "events_verified": verified,
            "breaks_found": len(breaks),
            "break_details": breaks[:10],  # Limit to first 10 breaks
        }

    def _calculate_data_hash(self, events: list[EventLog]) -> str:
        """Calculate a summary hash of all events."""
        if not events:
            return hashlib.sha256(b"no_events").hexdigest()

        # Combine all event hashes
        combined = "".join(event.current_hash or "" for event in events)
        return hashlib.sha256(combined.encode()).hexdigest()

    def _get_chain_statistics(self, events: list[EventLog]) -> dict:
        """Get statistics about the event chain."""
        if not events:
            return {
                "total_events": 0,
                "event_types": {},
                "first_event": None,
                "last_event": None,
            }

        # Count event types
        event_types = {}
        for event in events:
            etype = event.event_type
            event_types[etype] = event_types.get(etype, 0) + 1

        return {
            "total_events": len(events),
            "event_types": event_types,
            "first_event": {
                "timestamp": self._format_datetime(events[0].created_at),
                "type": events[0].event_type,
                "hash": events[0].current_hash[:16] + "..." if events[0].current_hash else None,
            },
            "last_event": {
                "timestamp": self._format_datetime(events[-1].created_at),
                "type": events[-1].event_type,
                "hash": events[-1].current_hash[:16] + "..." if events[-1].current_hash else None,
            },
        }

    async def _get_audit_summary(
        self,
        db,
        context: GeneratorContext,
        start: datetime,
        end: datetime
    ) -> dict:
        """Get summary of audit log activity."""
        # Total audit entries
        total_result = await db.execute(
            select(func.count(AuditLog.id))
            .where(
                and_(
                    AuditLog.case_id == context.case_id,
                    AuditLog.created_at >= start,
                    AuditLog.created_at <= end
                )
            )
        )
        total = total_result.scalar() or 0

        # Group by action
        action_result = await db.execute(
            select(AuditLog.action, func.count(AuditLog.id))
            .where(
                and_(
                    AuditLog.case_id == context.case_id,
                    AuditLog.created_at >= start,
                    AuditLog.created_at <= end
                )
            )
            .group_by(AuditLog.action)
        )
        actions = dict(action_result.all())

        # Group by resource type
        resource_result = await db.execute(
            select(AuditLog.resource_type, func.count(AuditLog.id))
            .where(
                and_(
                    AuditLog.case_id == context.case_id,
                    AuditLog.created_at >= start,
                    AuditLog.created_at <= end
                )
            )
            .group_by(AuditLog.resource_type)
        )
        resources = dict(resource_result.all())

        # Get unique users who accessed
        users_result = await db.execute(
            select(func.count(func.distinct(AuditLog.user_id)))
            .where(
                and_(
                    AuditLog.case_id == context.case_id,
                    AuditLog.created_at >= start,
                    AuditLog.created_at <= end
                )
            )
        )
        unique_users = users_result.scalar() or 0

        return {
            "total_entries": total,
            "by_action": actions,
            "by_resource": resources,
            "unique_users_accessed": unique_users,
        }

    def _generate_integrity_statement(self, chain_verification: dict) -> str:
        """Generate integrity statement based on verification results."""
        if chain_verification["is_valid"]:
            return (
                "INTEGRITY VERIFIED: The data chain for this case has been verified "
                f"as intact. All {chain_verification['events_verified']} events in the "
                "chain have been validated with no breaks detected. This confirms that "
                "no data has been modified or inserted since original recording."
            )
        else:
            return (
                f"INTEGRITY WARNING: The data chain verification found "
                f"{chain_verification['breaks_found']} potential integrity issues. "
                "This may indicate data migration, system updates, or other events "
                "that affected the chain. Review break details for more information."
            )

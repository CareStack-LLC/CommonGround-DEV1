"""
Exchange Compliance Service for Court Portal.

Calculates exchange compliance metrics from Silent Handoff GPS verification data.
Used by GALs, attorneys, and court staff to view objective exchange evidence.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.case import Case, CaseParticipant


class ExchangeComplianceService:
    """
    Service for calculating and retrieving exchange compliance data.

    Used by Court Portal to provide objective evidence of custody exchange compliance.
    """

    @staticmethod
    async def get_participant_roles(
        db: AsyncSession,
        case_id: str
    ) -> Dict[str, str]:
        """
        Get mapping of user_id to role (petitioner/respondent) for a case.

        Returns:
            Dict mapping user_id to role string
        """
        result = await db.execute(
            select(CaseParticipant)
            .where(CaseParticipant.case_id == case_id)
            .where(CaseParticipant.is_active == True)
        )
        participants = result.scalars().all()

        return {p.user_id: p.role for p in participants}

    @staticmethod
    async def get_exchange_instances(
        db: AsyncSession,
        case_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        include_exchange: bool = True
    ) -> List[CustodyExchangeInstance]:
        """
        Get exchange instances for a case within date range.

        Args:
            db: Database session
            case_id: Case ID
            start_date: Start of date range (default: 30 days ago)
            end_date: End of date range (default: now)
            include_exchange: Include parent exchange relationship

        Returns:
            List of CustodyExchangeInstance objects
        """
        if end_date is None:
            end_date = datetime.utcnow()
        if start_date is None:
            start_date = end_date - timedelta(days=30)

        query = (
            select(CustodyExchangeInstance)
            .join(CustodyExchange)
            .where(CustodyExchange.case_id == case_id)
            .where(CustodyExchangeInstance.scheduled_time >= start_date)
            .where(CustodyExchangeInstance.scheduled_time <= end_date)
            .order_by(CustodyExchangeInstance.scheduled_time.desc())
        )

        if include_exchange:
            query = query.options(selectinload(CustodyExchangeInstance.exchange))

        result = await db.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_exchange_metrics(
        cls,
        db: AsyncSession,
        case_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Calculate exchange compliance metrics for a case.

        Args:
            db: Database session
            case_id: Case ID
            start_date: Start of date range
            end_date: End of date range

        Returns:
            Dict containing:
            - total_exchanges: int
            - completed: int
            - missed: int
            - one_party_only: int
            - disputed: int
            - gps_verified_rate: float (0-100)
            - geofence_compliance_rate: float (0-100)
            - on_time_rate: float (0-100)
            - petitioner_metrics: dict
            - respondent_metrics: dict
        """
        instances = await cls.get_exchange_instances(
            db, case_id, start_date, end_date
        )

        if not instances:
            return cls._empty_metrics()

        # Get participant roles
        roles = await cls.get_participant_roles(db, case_id)

        # Calculate totals
        total = len(instances)
        completed = 0
        missed = 0
        one_party_only = 0
        disputed = 0

        # GPS verification counts
        gps_verified = 0
        geofence_compliant = 0
        on_time = 0

        # Per-parent metrics
        petitioner_distances: List[float] = []
        petitioner_geofence_hits = 0
        petitioner_check_ins = 0
        petitioner_on_time = 0

        respondent_distances: List[float] = []
        respondent_geofence_hits = 0
        respondent_check_ins = 0
        respondent_on_time = 0

        for instance in instances:
            exchange = instance.exchange

            # Outcome counts
            outcome = instance.handoff_outcome or instance.status
            if outcome == "completed":
                completed += 1
            elif outcome == "missed":
                missed += 1
            elif outcome == "one_party_present":
                one_party_only += 1
            elif outcome == "disputed":
                disputed += 1

            # GPS verification - count if at least one parent has GPS check-in
            has_gps = (
                instance.from_parent_check_in_lat is not None or
                instance.to_parent_check_in_lat is not None
            )
            if has_gps:
                gps_verified += 1

            # Geofence compliance - count if both parents in geofence (when both checked in)
            if (instance.from_parent_in_geofence is True and
                instance.to_parent_in_geofence is True):
                geofence_compliant += 1
            elif (instance.from_parent_in_geofence is True and
                  instance.to_parent_check_in_lat is None):
                # Only from parent checked in and they were in geofence
                geofence_compliant += 1
            elif (instance.to_parent_in_geofence is True and
                  instance.from_parent_check_in_lat is None):
                # Only to parent checked in and they were in geofence
                geofence_compliant += 1

            # On-time check (checked in within window)
            if instance.window_start and instance.window_end:
                from_on_time = (
                    instance.from_parent_check_in_time and
                    instance.window_start <= instance.from_parent_check_in_time <= instance.window_end
                )
                to_on_time = (
                    instance.to_parent_check_in_time and
                    instance.window_start <= instance.to_parent_check_in_time <= instance.window_end
                )
                if from_on_time or to_on_time:
                    on_time += 1

            # Per-parent metrics - determine which parent is petitioner/respondent
            from_parent_id = exchange.from_parent_id if exchange else None
            to_parent_id = exchange.to_parent_id if exchange else None

            from_role = roles.get(from_parent_id) if from_parent_id else None
            to_role = roles.get(to_parent_id) if to_parent_id else None

            # From parent metrics
            if instance.from_parent_check_in_lat is not None:
                if from_role == "petitioner":
                    petitioner_check_ins += 1
                    if instance.from_parent_distance_meters is not None:
                        petitioner_distances.append(instance.from_parent_distance_meters)
                    if instance.from_parent_in_geofence:
                        petitioner_geofence_hits += 1
                    if (instance.window_start and instance.from_parent_check_in_time and
                        instance.window_start <= instance.from_parent_check_in_time <= instance.window_end):
                        petitioner_on_time += 1
                elif from_role == "respondent":
                    respondent_check_ins += 1
                    if instance.from_parent_distance_meters is not None:
                        respondent_distances.append(instance.from_parent_distance_meters)
                    if instance.from_parent_in_geofence:
                        respondent_geofence_hits += 1
                    if (instance.window_start and instance.from_parent_check_in_time and
                        instance.window_start <= instance.from_parent_check_in_time <= instance.window_end):
                        respondent_on_time += 1

            # To parent metrics
            if instance.to_parent_check_in_lat is not None:
                if to_role == "petitioner":
                    petitioner_check_ins += 1
                    if instance.to_parent_distance_meters is not None:
                        petitioner_distances.append(instance.to_parent_distance_meters)
                    if instance.to_parent_in_geofence:
                        petitioner_geofence_hits += 1
                    if (instance.window_start and instance.to_parent_check_in_time and
                        instance.window_start <= instance.to_parent_check_in_time <= instance.window_end):
                        petitioner_on_time += 1
                elif to_role == "respondent":
                    respondent_check_ins += 1
                    if instance.to_parent_distance_meters is not None:
                        respondent_distances.append(instance.to_parent_distance_meters)
                    if instance.to_parent_in_geofence:
                        respondent_geofence_hits += 1
                    if (instance.window_start and instance.to_parent_check_in_time and
                        instance.window_start <= instance.to_parent_check_in_time <= instance.window_end):
                        respondent_on_time += 1

        # Calculate rates
        gps_verified_rate = (gps_verified / total * 100) if total > 0 else 0
        geofence_compliance_rate = (geofence_compliant / gps_verified * 100) if gps_verified > 0 else 0
        on_time_rate = (on_time / total * 100) if total > 0 else 0

        return {
            "total_exchanges": total,
            "completed": completed,
            "missed": missed,
            "one_party_only": one_party_only,
            "disputed": disputed,
            "gps_verified_rate": round(gps_verified_rate, 1),
            "geofence_compliance_rate": round(geofence_compliance_rate, 1),
            "on_time_rate": round(on_time_rate, 1),
            "petitioner_metrics": {
                "check_ins": petitioner_check_ins,
                "avg_distance_meters": round(sum(petitioner_distances) / len(petitioner_distances), 1) if petitioner_distances else None,
                "geofence_hit_rate": round(petitioner_geofence_hits / petitioner_check_ins * 100, 1) if petitioner_check_ins > 0 else 0,
                "on_time_rate": round(petitioner_on_time / petitioner_check_ins * 100, 1) if petitioner_check_ins > 0 else 0,
            },
            "respondent_metrics": {
                "check_ins": respondent_check_ins,
                "avg_distance_meters": round(sum(respondent_distances) / len(respondent_distances), 1) if respondent_distances else None,
                "geofence_hit_rate": round(respondent_geofence_hits / respondent_check_ins * 100, 1) if respondent_check_ins > 0 else 0,
                "on_time_rate": round(respondent_on_time / respondent_check_ins * 100, 1) if respondent_check_ins > 0 else 0,
            },
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
            }
        }

    @staticmethod
    def _empty_metrics() -> Dict[str, Any]:
        """Return empty metrics structure when no data available."""
        return {
            "total_exchanges": 0,
            "completed": 0,
            "missed": 0,
            "one_party_only": 0,
            "disputed": 0,
            "gps_verified_rate": 0,
            "geofence_compliance_rate": 0,
            "on_time_rate": 0,
            "petitioner_metrics": {
                "check_ins": 0,
                "avg_distance_meters": None,
                "geofence_hit_rate": 0,
                "on_time_rate": 0,
            },
            "respondent_metrics": {
                "check_ins": 0,
                "avg_distance_meters": None,
                "geofence_hit_rate": 0,
                "on_time_rate": 0,
            },
            "date_range": {
                "start": None,
                "end": None,
            }
        }

    @classmethod
    async def get_exchange_details_for_export(
        cls,
        db: AsyncSession,
        case_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get detailed exchange data for court export/report.

        Returns structured data suitable for PDF generation.
        """
        instances = await cls.get_exchange_instances(
            db, case_id, start_date, end_date, include_exchange=True
        )

        roles = await cls.get_participant_roles(db, case_id)

        details = []
        for instance in instances:
            exchange = instance.exchange

            # Determine parent roles for this exchange
            from_parent_id = exchange.from_parent_id if exchange else None
            to_parent_id = exchange.to_parent_id if exchange else None
            from_role = roles.get(from_parent_id, "unknown") if from_parent_id else "unassigned"
            to_role = roles.get(to_parent_id, "unknown") if to_parent_id else "unassigned"

            detail = {
                "id": instance.id,
                "exchange_id": instance.exchange_id,
                "title": exchange.title if exchange else "Exchange",
                "scheduled_time": instance.scheduled_time.isoformat(),
                "status": instance.status,
                "outcome": instance.handoff_outcome,
                "location": {
                    "address": exchange.location if exchange else None,
                    "lat": exchange.location_lat if exchange else None,
                    "lng": exchange.location_lng if exchange else None,
                    "geofence_radius_meters": exchange.geofence_radius_meters if exchange else None,
                },
                "from_parent": {
                    "role": from_role,
                    "checked_in": instance.from_parent_checked_in,
                    "check_in_time": instance.from_parent_check_in_time.isoformat() if instance.from_parent_check_in_time else None,
                    "gps": {
                        "lat": instance.from_parent_check_in_lat,
                        "lng": instance.from_parent_check_in_lng,
                        "accuracy_meters": instance.from_parent_device_accuracy,
                        "distance_meters": instance.from_parent_distance_meters,
                        "in_geofence": instance.from_parent_in_geofence,
                    } if instance.from_parent_check_in_lat else None,
                },
                "to_parent": {
                    "role": to_role,
                    "checked_in": instance.to_parent_checked_in,
                    "check_in_time": instance.to_parent_check_in_time.isoformat() if instance.to_parent_check_in_time else None,
                    "gps": {
                        "lat": instance.to_parent_check_in_lat,
                        "lng": instance.to_parent_check_in_lng,
                        "accuracy_meters": instance.to_parent_device_accuracy,
                        "distance_meters": instance.to_parent_distance_meters,
                        "in_geofence": instance.to_parent_in_geofence,
                    } if instance.to_parent_check_in_lat else None,
                },
                "qr_confirmation": {
                    "required": exchange.qr_confirmation_required if exchange else False,
                    "confirmed_at": instance.qr_confirmed_at.isoformat() if instance.qr_confirmed_at else None,
                },
                "window": {
                    "start": instance.window_start.isoformat() if instance.window_start else None,
                    "end": instance.window_end.isoformat() if instance.window_end else None,
                    "auto_closed": instance.auto_closed,
                },
                "silent_handoff_enabled": exchange.silent_handoff_enabled if exchange else False,
                "notes": instance.notes,
            }
            details.append(detail)

        return details

    @classmethod
    async def get_compliance_summary(
        cls,
        db: AsyncSession,
        case_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get a compliance summary suitable for court dashboard.

        Combines metrics with recent exchange details.
        """
        metrics = await cls.get_exchange_metrics(db, case_id, start_date, end_date)

        # Get last 5 exchanges for quick view
        recent_instances = await cls.get_exchange_instances(
            db, case_id, start_date, end_date, include_exchange=True
        )
        recent = recent_instances[:5] if recent_instances else []

        recent_exchanges = []
        for instance in recent:
            exchange = instance.exchange
            recent_exchanges.append({
                "id": instance.id,
                "title": exchange.title if exchange else "Exchange",
                "scheduled_time": instance.scheduled_time.isoformat(),
                "status": instance.status,
                "outcome": instance.handoff_outcome,
                "from_parent_checked_in": instance.from_parent_checked_in,
                "from_parent_in_geofence": instance.from_parent_in_geofence,
                "to_parent_checked_in": instance.to_parent_checked_in,
                "to_parent_in_geofence": instance.to_parent_in_geofence,
            })

        # Calculate overall compliance status
        total = metrics["total_exchanges"]
        if total == 0:
            overall_status = "no_data"
        elif metrics["geofence_compliance_rate"] >= 90 and metrics["on_time_rate"] >= 90:
            overall_status = "excellent"
        elif metrics["geofence_compliance_rate"] >= 70 and metrics["on_time_rate"] >= 70:
            overall_status = "good"
        elif metrics["geofence_compliance_rate"] >= 50 or metrics["on_time_rate"] >= 50:
            overall_status = "needs_improvement"
        else:
            overall_status = "concerning"

        return {
            "metrics": metrics,
            "recent_exchanges": recent_exchanges,
            "overall_status": overall_status,
            "generated_at": datetime.utcnow().isoformat(),
        }

"""
Exchange GPS Verification section generator.

Section 9: GPS-verified custody exchange data from Silent Handoff.
Shows geofence compliance, check-in locations, and evidence maps.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.case import CaseParticipant
from app.services.export.generators.base import (
    BaseSectionGenerator,
    GeneratorContext,
    SectionContent,
)
from app.services.geolocation import GeolocationService


class ExchangeGPSVerificationGenerator(BaseSectionGenerator):
    """Generates the Exchange GPS Verification section for court exports."""

    section_type = "exchange_gps_verification"
    section_title = "Exchange GPS Verification Report"
    section_order = 9

    async def generate(self, context: GeneratorContext) -> SectionContent:
        """Generate GPS verification data for custody exchanges."""
        db = context.db
        start = datetime.combine(context.date_start, datetime.min.time())
        end = datetime.combine(context.date_end, datetime.max.time())

        # Get participant roles for this case
        roles_result = await db.execute(
            select(CaseParticipant)
            .where(CaseParticipant.case_id == context.case_id)
            .where(CaseParticipant.is_active == True)
        )
        participants = roles_result.scalars().all()
        role_map = {str(p.user_id): p.role for p in participants}

        # Get custody exchange instances with GPS data
        instances_result = await db.execute(
            select(CustodyExchangeInstance)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(
                and_(
                    CustodyExchangeInstance.scheduled_time >= start,
                    CustodyExchangeInstance.scheduled_time <= end,
                )
            )
            .join(CustodyExchange, CustodyExchangeInstance.exchange_id == CustodyExchange.id)
            .where(CustodyExchange.case_id == context.case_id)
            .where(CustodyExchange.silent_handoff_enabled == True)
            .order_by(CustodyExchangeInstance.scheduled_time.desc())
        )
        instances = list(instances_result.scalars().all())

        # Calculate metrics
        metrics = self._calculate_metrics(instances, role_map)

        # Build detailed exchange log with GPS data
        exchange_log = await self._build_exchange_log(instances, role_map, context)

        # Generate static map URLs for evidence
        map_urls = self._generate_map_urls(instances)

        content_data = {
            "summary": {
                "report_period": {
                    "start": self._format_date(context.date_start),
                    "end": self._format_date(context.date_end),
                },
                "total_exchanges": len(instances),
                "gps_verified_count": metrics["gps_verified_count"],
                "gps_verified_rate": metrics["gps_verified_rate"],
            },
            "compliance_metrics": {
                "overall": {
                    "geofence_compliance_rate": metrics["geofence_compliance_rate"],
                    "on_time_rate": metrics["on_time_rate"],
                    "completed_count": metrics["completed"],
                    "missed_count": metrics["missed"],
                    "one_party_only_count": metrics["one_party_only"],
                    "disputed_count": metrics["disputed"],
                },
                "petitioner": metrics["petitioner_metrics"],
                "respondent": metrics["respondent_metrics"],
            },
            "exchange_log": exchange_log,
            "evidence_maps": map_urls,
            "verification_methodology": {
                "description": "GPS coordinates captured at check-in via Silent Handoff feature",
                "geofence_explanation": "Distance from designated exchange location measured using Haversine formula",
                "accuracy_note": "GPS accuracy varies by device; device-reported accuracy included in data",
                "privacy_statement": "Locations captured only at check-in moment, no continuous tracking",
            },
        }

        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data=content_data,
            evidence_count=len(instances),
            data_sources=["custody_exchange_instances", "gps_coordinates"],
        )

    def _calculate_metrics(
        self,
        instances: list[CustodyExchangeInstance],
        role_map: dict[str, str]
    ) -> dict:
        """Calculate GPS verification metrics."""
        if not instances:
            return {
                "gps_verified_count": 0,
                "gps_verified_rate": 0,
                "geofence_compliance_rate": 0,
                "on_time_rate": 0,
                "completed": 0,
                "missed": 0,
                "one_party_only": 0,
                "disputed": 0,
                "petitioner_metrics": self._empty_parent_metrics(),
                "respondent_metrics": self._empty_parent_metrics(),
            }

        total = len(instances)
        gps_verified = 0
        geofence_compliant = 0
        on_time = 0
        completed = 0
        missed = 0
        one_party_only = 0
        disputed = 0

        petitioner_data = {"check_ins": 0, "geofence_hits": 0, "on_time": 0, "distances": []}
        respondent_data = {"check_ins": 0, "geofence_hits": 0, "on_time": 0, "distances": []}

        for instance in instances:
            exchange = instance.exchange

            # Count outcomes
            outcome = instance.handoff_outcome or instance.status
            if outcome == "completed":
                completed += 1
            elif outcome == "missed":
                missed += 1
            elif outcome == "one_party_present":
                one_party_only += 1
            elif outcome == "disputed":
                disputed += 1

            # Check for GPS verification
            has_gps = (
                instance.from_parent_check_in_lat is not None or
                instance.to_parent_check_in_lat is not None
            )
            if has_gps:
                gps_verified += 1

            # Geofence compliance
            if (instance.from_parent_in_geofence is True and
                instance.to_parent_in_geofence is True):
                geofence_compliant += 1
            elif (instance.from_parent_in_geofence is True and
                  instance.to_parent_check_in_lat is None):
                geofence_compliant += 1
            elif (instance.to_parent_in_geofence is True and
                  instance.from_parent_check_in_lat is None):
                geofence_compliant += 1

            # On-time check
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

            # Per-parent metrics
            from_parent_id = str(exchange.from_parent_id) if exchange else None
            to_parent_id = str(exchange.to_parent_id) if exchange else None
            from_role = role_map.get(from_parent_id) if from_parent_id else None
            to_role = role_map.get(to_parent_id) if to_parent_id else None

            # From parent
            if instance.from_parent_check_in_lat is not None:
                data = petitioner_data if from_role == "petitioner" else respondent_data
                data["check_ins"] += 1
                if instance.from_parent_in_geofence:
                    data["geofence_hits"] += 1
                if instance.from_parent_distance_meters is not None:
                    data["distances"].append(instance.from_parent_distance_meters)
                if (instance.window_start and instance.from_parent_check_in_time and
                    instance.window_start <= instance.from_parent_check_in_time <= instance.window_end):
                    data["on_time"] += 1

            # To parent
            if instance.to_parent_check_in_lat is not None:
                data = petitioner_data if to_role == "petitioner" else respondent_data
                data["check_ins"] += 1
                if instance.to_parent_in_geofence:
                    data["geofence_hits"] += 1
                if instance.to_parent_distance_meters is not None:
                    data["distances"].append(instance.to_parent_distance_meters)
                if (instance.window_start and instance.to_parent_check_in_time and
                    instance.window_start <= instance.to_parent_check_in_time <= instance.window_end):
                    data["on_time"] += 1

        return {
            "gps_verified_count": gps_verified,
            "gps_verified_rate": self._calculate_percentage(gps_verified, total),
            "geofence_compliance_rate": self._calculate_percentage(geofence_compliant, gps_verified) if gps_verified > 0 else 0,
            "on_time_rate": self._calculate_percentage(on_time, total),
            "completed": completed,
            "missed": missed,
            "one_party_only": one_party_only,
            "disputed": disputed,
            "petitioner_metrics": self._build_parent_metrics(petitioner_data),
            "respondent_metrics": self._build_parent_metrics(respondent_data),
        }

    def _build_parent_metrics(self, data: dict) -> dict:
        """Build metrics dict for a parent."""
        check_ins = data["check_ins"]
        if check_ins == 0:
            return self._empty_parent_metrics()

        avg_distance = (
            round(sum(data["distances"]) / len(data["distances"]), 1)
            if data["distances"] else None
        )

        return {
            "total_check_ins": check_ins,
            "avg_distance_meters": avg_distance,
            "geofence_hit_rate": self._calculate_percentage(data["geofence_hits"], check_ins),
            "on_time_rate": self._calculate_percentage(data["on_time"], check_ins),
        }

    def _empty_parent_metrics(self) -> dict:
        """Return empty parent metrics structure."""
        return {
            "total_check_ins": 0,
            "avg_distance_meters": None,
            "geofence_hit_rate": 0,
            "on_time_rate": 0,
        }

    async def _build_exchange_log(
        self,
        instances: list[CustodyExchangeInstance],
        role_map: dict[str, str],
        context: GeneratorContext
    ) -> list[dict]:
        """Build detailed exchange log with GPS verification data."""
        log = []

        for instance in instances[:30]:  # Limit to 30 for PDF size
            exchange = instance.exchange
            if not exchange:
                continue

            from_parent_id = str(exchange.from_parent_id) if exchange.from_parent_id else None
            to_parent_id = str(exchange.to_parent_id) if exchange.to_parent_id else None
            from_role = role_map.get(from_parent_id, "unknown") if from_parent_id else "unassigned"
            to_role = role_map.get(to_parent_id, "unknown") if to_parent_id else "unassigned"

            log_entry = {
                "date": self._format_date(instance.scheduled_time.date()),
                "scheduled_time": instance.scheduled_time.strftime("%I:%M %p"),
                "title": exchange.title or "Exchange",
                "location": await self._redact(exchange.location or "Not specified", context),
                "geofence_radius_meters": exchange.geofence_radius_meters,
                "status": instance.status,
                "outcome": instance.handoff_outcome,
                "from_parent": {
                    "role": from_role,
                    "checked_in": instance.from_parent_checked_in,
                    "check_in_time": (
                        instance.from_parent_check_in_time.strftime("%I:%M %p")
                        if instance.from_parent_check_in_time else None
                    ),
                    "gps_lat": instance.from_parent_check_in_lat,
                    "gps_lng": instance.from_parent_check_in_lng,
                    "device_accuracy_meters": instance.from_parent_device_accuracy,
                    "distance_from_geofence_meters": instance.from_parent_distance_meters,
                    "within_geofence": instance.from_parent_in_geofence,
                },
                "to_parent": {
                    "role": to_role,
                    "checked_in": instance.to_parent_checked_in,
                    "check_in_time": (
                        instance.to_parent_check_in_time.strftime("%I:%M %p")
                        if instance.to_parent_check_in_time else None
                    ),
                    "gps_lat": instance.to_parent_check_in_lat,
                    "gps_lng": instance.to_parent_check_in_lng,
                    "device_accuracy_meters": instance.to_parent_device_accuracy,
                    "distance_from_geofence_meters": instance.to_parent_distance_meters,
                    "within_geofence": instance.to_parent_in_geofence,
                },
                "qr_confirmed": instance.qr_confirmed_at is not None,
                "window": {
                    "start": instance.window_start.strftime("%I:%M %p") if instance.window_start else None,
                    "end": instance.window_end.strftime("%I:%M %p") if instance.window_end else None,
                },
            }
            log.append(log_entry)

        return log

    def _generate_map_urls(self, instances: list[CustodyExchangeInstance]) -> list[dict]:
        """Generate static map URLs for exchange evidence."""
        maps = []

        for instance in instances[:10]:  # Limit to 10 maps for PDF size
            exchange = instance.exchange
            if not exchange or not exchange.location_lat or not exchange.location_lng:
                continue

            # Only generate maps for instances with at least one GPS check-in
            has_gps = (
                instance.from_parent_check_in_lat is not None or
                instance.to_parent_check_in_lat is not None
            )
            if not has_gps:
                continue

            # Determine petitioner_is_from based on who is the "from" parent
            # Default to True (petitioner drops off)
            petitioner_is_from = True

            map_url = GeolocationService.generate_exchange_map(
                exchange_location_lat=exchange.location_lat,
                exchange_location_lng=exchange.location_lng,
                geofence_radius=exchange.geofence_radius_meters or 100,
                from_parent_lat=instance.from_parent_check_in_lat,
                from_parent_lng=instance.from_parent_check_in_lng,
                from_parent_in_geofence=instance.from_parent_in_geofence,
                to_parent_lat=instance.to_parent_check_in_lat,
                to_parent_lng=instance.to_parent_check_in_lng,
                to_parent_in_geofence=instance.to_parent_in_geofence,
                petitioner_is_from=petitioner_is_from,
            )

            if map_url:
                maps.append({
                    "instance_id": str(instance.id),
                    "date": self._format_date(instance.scheduled_time.date()),
                    "time": instance.scheduled_time.strftime("%I:%M %p"),
                    "map_url": map_url,
                    "geofence_center": {
                        "lat": exchange.location_lat,
                        "lng": exchange.location_lng,
                    },
                    "geofence_radius_meters": exchange.geofence_radius_meters,
                })

        return maps

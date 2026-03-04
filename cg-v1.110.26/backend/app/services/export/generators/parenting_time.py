"""
Parenting Time section generator.

Section 3: Exchange records, patterns, and timeliness analysis.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.models.schedule import ScheduleEvent, ExchangeCheckIn
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.user import User
from app.services.export.generators.base import (
    BaseSectionGenerator,
    GeneratorContext,
    SectionContent,
)
import httpx
import base64
from io import BytesIO
from app.services.geolocation import GeolocationService


class ParentingTimeGenerator(BaseSectionGenerator):
    """Generates the Parenting Time Report section."""

    section_type = "parenting_time"
    section_title = "Parenting Time Report"
    section_order = 3

    async def generate(self, context: GeneratorContext) -> SectionContent:
        """Generate parenting time analysis."""
        db = context.db
        start = datetime.combine(context.date_start, datetime.min.time())
        end = datetime.combine(context.date_end, datetime.max.time())

        # Get custody exchange instances
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
            .order_by(CustodyExchangeInstance.scheduled_time)
        )
        instances = list(instances_result.scalars().all())

        # ================================================
        # CUSTODY DAY TRACKING
        # ================================================
        from app.models.custody_day_record import CustodyDayRecord
        from app.models.case import Case, CaseParticipant
        
        # Get case to find family_file_id
        case = await db.get(Case, context.case_id)
        custody_tracking = {}
        
        if case and case.family_file_id:
            # Get custody day records
            custody_days_result = await db.execute(
                select(CustodyDayRecord).where(
                    and_(
                        CustodyDayRecord.family_file_id == case.family_file_id,
                        CustodyDayRecord.record_date >= context.date_start,
                        CustodyDayRecord.record_date <= context.date_end
                    )
                ).order_by(CustodyDayRecord.record_date)
            )
            custody_days = list(custody_days_result.scalars().all())
            
            # Get participants to map parent IDs to names
            participants_result = await db.execute(
                select(CaseParticipant).where(
                    CaseParticipant.case_id == context.case_id
                ).options(selectinload(CaseParticipant.user))
            )
            participants = participants_result.scalars().all()
            parent_map = {}
            for p in participants:
                if p.user:
                    parent_map[p.user_id] = {
                        "name": f"{p.user.first_name} {p.user.last_name}",
                        "role": p.role,
                        "days": 0,
                    }
            
            # Count days per parent
            for day in custody_days:
                if day.custodial_parent_id and day.custodial_parent_id in parent_map:
                    parent_map[day.custodial_parent_id]["days"] += 1
            
            total_days = len(custody_days)
            custody_tracking = {
                "total_days_tracked": total_days,
                "parents": [
                    {
                        "name": await self._redact(info["name"], context),
                        "role": info["role"],
                        "days": info["days"],
                        "percentage": round((info["days"] / total_days * 100), 1) if total_days > 0 else 0,
                    }
                    for info in parent_map.values()
                ],
                "by_month": self._group_custody_by_month(custody_days, parent_map),
            }
        
        # ================================================
        # PARENT CHECK-IN DETAILS
        # ================================================
        parent_checkin_details = []
        for instance in instances[:30]:  # Last 30 exchanges
            exchange = instance.exchange
            if exchange:
                checkin_entry = {
                    "date": instance.scheduled_time.strftime('%b %d, %Y'),
                    "time": instance.scheduled_time.strftime('%I:%M %p'),
                    "status": instance.status or "scheduled",
                    "from_parent": {
                        "checked_in": instance.from_parent_checked_in or False,
                        "check_in_time": instance.from_parent_check_in_time.strftime('%I:%M %p') if instance.from_parent_check_in_time else None,
                    },
                    "to_parent": {
                        "checked_in": instance.to_parent_checked_in or False,
                        "check_in_time": instance.to_parent_check_in_time.strftime('%I:%M %p') if instance.to_parent_check_in_time else None,
                    },
                    "location": await self._redact(exchange.location or "Unknown", context),
                }
                parent_checkin_details.append(checkin_entry)

        # Analyze patterns
        exchange_log = await self._build_exchange_log(instances, context)
        timeliness_analysis = self._analyze_timeliness(instances)
        patterns = self._identify_patterns(instances)

        # ================================================
        # MISSED EXCHANGE DETAILS (moved from Section 2)
        # ================================================
        missed_exchange_details = []
        for instance in instances:
            if instance.status == 'missed':
                exchange = instance.exchange
                
                # Determine scheduled location
                center_lat = exchange.location_lat or 37.7749 # Fallback SF
                center_lng = exchange.location_lng or -122.4194
                
                # Determine Responsible Parent
                is_from_missing = not instance.from_parent_checked_in
                is_to_missing = not instance.to_parent_checked_in
                
                responsible_name = "Both"
                if is_from_missing and not is_to_missing:
                    # Fetch name (hacky: optimize later)
                    p_name = "Parent A" 
                    # Participants lookup logic removed for simplicity, likely redundant for this report context if we don't have participant list handy inline.
                    # But we DO have participants from custody tracking section above!
                    # Let's reuse participants if available, or just generic.
                    if 'participants' in locals():
                        for p in participants:
                            if p.user_id == exchange.from_parent_id and p.user:
                                p_name = f"{p.user.first_name} {p.user.last_name}"
                    responsible_name = await self._redact(p_name, context)
                elif is_to_missing and not is_from_missing:
                    # Fetch name
                    p_name = "Parent B"
                    if 'participants' in locals():
                        for p in participants:
                            if p.user_id == exchange.to_parent_id and p.user:
                                p_name = f"{p.user.first_name} {p.user.last_name}"
                    responsible_name = await self._redact(p_name, context)
                
                # Build Check-in Points (Evidence)
                check_in_points = []
                
                # Helper to get initial
                def get_initial(u_id):
                    # quick participants lookup
                    if 'participants' in locals():
                        for p in participants:
                            if p.user_id == u_id and p.user:
                                return p.user.first_name[0].upper()
                    return "?"

                # Add From Parent (if present)
                if instance.from_parent_checked_in and instance.from_parent_check_in_lat:
                     check_in_points.append({
                         "lat": instance.from_parent_check_in_lat,
                         "lng": instance.from_parent_check_in_lng,
                         "label": get_initial(exchange.from_parent_id),
                         "in_geofence": instance.from_parent_in_geofence
                     })
                
                # Add To Parent (if present)
                if instance.to_parent_checked_in and instance.to_parent_check_in_lat:
                     check_in_points.append({
                         "lat": instance.to_parent_check_in_lat,
                         "lng": instance.to_parent_check_in_lng,
                         "label": get_initial(exchange.to_parent_id),
                         "in_geofence": instance.to_parent_in_geofence
                     })

                # Generate Mapbox URL
                map_url = GeolocationService.generate_static_map_url(
                    center_lat=center_lat,
                    center_lng=center_lng,
                    geofence_radius_meters=exchange.geofence_radius_meters or 150,
                    check_in_points=check_in_points,
                    width=600,
                    height=300,
                    zoom=14
                )
                
                # Fetch Image Bytes (to embed)
                map_b64 = None
                if map_url:
                    try:
                        async with httpx.AsyncClient() as client:
                            resp = await client.get(map_url, timeout=5.0)
                            if resp.status_code == 200:
                                map_b64 = base64.b64encode(resp.content).decode('utf-8')
                    except Exception as e:
                        print(f"Failed to fetch mapbox image: {e}")
                
                missed_exchange_details.append({
                    "date": self._format_date(instance.scheduled_time.date()),
                    "time": instance.scheduled_time.strftime("%I:%M %p"),
                    "responsible": responsible_name,
                    "location_name": await self._redact(exchange.location or "Unknown", context),
                    "map_url": map_url,
                    "map_image_b64": map_b64,
                    # Verify link
                    "verify_link": f"https://commonground.law/verify/exchange/{instance.id}" 
                })

        content_data = {
            "summary": {
                "total_exchanges": len(instances),
                "completed": len([i for i in instances if i.status == "completed"]),
                "cancelled": len([i for i in instances if i.status == "cancelled"]),
                "missed": len([i for i in instances if i.status == "missed"]),
            },
            "custody_tracking": custody_tracking,
            # "parent_checkin_details": parent_checkin_details, # REMOVED per user request
            "missed_exchange_details": missed_exchange_details, # ADDED per user request
            "exchange_log": exchange_log,
            "timeliness_analysis": timeliness_analysis,
            "patterns": patterns,
            "report_period": {
                "start": self._format_date(context.date_start),
                "end": self._format_date(context.date_end),
            },
        }

        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data=content_data,
            evidence_count=len(instances) + len(custody_days),
            data_sources=["custody_exchange_instances", "custody_day_records"],
        )

    async def _build_exchange_log(
        self,
        instances: list[CustodyExchangeInstance],
        context: GeneratorContext
    ) -> list[dict]:
        """Build detailed exchange log."""
        log = []
        for instance in instances[:50]:  # Limit to 50 most recent
            exchange = instance.exchange
            log_entry = {
                "date": self._format_date(instance.scheduled_time.date()),
                "scheduled_time": instance.scheduled_time.strftime("%I:%M %p"),
                "actual_time": (
                    instance.completed_at.strftime("%I:%M %p")
                    if instance.completed_at else None
                ),
                "status": instance.status,
                "location": await self._redact(
                    exchange.location if exchange else "Unknown",
                    context
                ),
                "notes": await self._redact(
                    instance.notes or "",
                    context
                ) if instance.notes else None,
            }
            log.append(log_entry)

        return log

    def _analyze_timeliness(self, instances: list[CustodyExchangeInstance]) -> dict:
        """Analyze check-in timeliness patterns using instance data."""
        if not instances:
            return {
                "total_checkins": 0,
                "on_time_count": 0,
                "on_time_percentage": 0,
                "average_delay_minutes": 0,
                "grace_period_used_count": 0,
            }

        total_valid_checkins = 0
        on_time_count = 0
        grace_period_count = 0
        late_delays = []

        GRACE_PERIOD_MINUTES = 15

        for instance in instances:
            scheduled = instance.scheduled_time
            
            # Helper to check a single parent's check-in
            def check_parent(check_in_time: Optional[datetime], is_checked_in: bool):
                nonlocal total_valid_checkins, on_time_count, grace_period_count
                
                if is_checked_in and check_in_time:
                    total_valid_checkins += 1
                    
                    if check_in_time <= scheduled:
                        on_time_count += 1
                    else:
                        delay_minutes = (check_in_time - scheduled).total_seconds() / 60
                        if delay_minutes <= GRACE_PERIOD_MINUTES:
                            grace_period_count += 1
                            # Consistently count grace period as "on-time" for the percentage?
                            # User request implied grace period is distinct but maybe acceptable?
                            # Usually grace period means "acceptable as on time". 
                            # Let's count it as on time for the high level metric, but track usage separately.
                            on_time_count += 1 
                        else:
                            late_delays.append(delay_minutes)

            # Check From Parent
            check_parent(instance.from_parent_check_in_time, instance.from_parent_checked_in)
            
            # Check To Parent
            check_parent(instance.to_parent_check_in_time, instance.to_parent_checked_in)

        avg_delay = sum(late_delays) / len(late_delays) if late_delays else 0

        return {
            "total_checkins": total_valid_checkins,
            "on_time_count": on_time_count,
            "on_time_percentage": self._calculate_percentage(on_time_count, total_valid_checkins),
            "average_delay_minutes": round(avg_delay, 1),
            "grace_period_used_count": grace_period_count,
        }

    def _identify_patterns(
        self,
        instances: list[CustodyExchangeInstance],
    ) -> dict:
        """Identify notable patterns in parenting time."""
        patterns = {
            "day_of_week_issues": [],
            "time_of_day_issues": [],
            "location_issues": [],
            "overall_trend": "stable",
        }

        if not instances:
            return patterns

        # Analyze day-of-week patterns
        day_issues = {}
        for instance in instances:
            if instance.status in ["cancelled", "missed"]:
                day = instance.scheduled_time.strftime("%A")
                day_issues[day] = day_issues.get(day, 0) + 1

        patterns["day_of_week_issues"] = [
            {"day": day, "issue_count": count}
            for day, count in day_issues.items()
            if count >= 2
        ]

        # Analyze trend over time
        total = len(instances)
        completed = len([i for i in instances if i.status == "completed"])
        completion_rate = self._calculate_percentage(completed, total)

        if completion_rate >= 90:
            patterns["overall_trend"] = "excellent"
        elif completion_rate >= 75:
            patterns["overall_trend"] = "good"
        elif completion_rate >= 50:
            patterns["overall_trend"] = "needs_attention"
        else:
            patterns["overall_trend"] = "concerning"

        return patterns

    def _group_custody_by_month(self, custody_days: list, parent_map: dict) -> list:
        """Group custody days by month for trend analysis."""
        from collections import defaultdict
        
        months = defaultdict(lambda: defaultdict(int))
        
        for day in custody_days:
            if day.custodial_parent_id:
                month_key = day.record_date.strftime('%Y-%m')
                months[month_key][day.custodial_parent_id] += 1
        
        result = []
        for month_key in sorted(months.keys()):
            month_data = {
                "month": datetime.strptime(month_key, '%Y-%m').strftime('%B %Y'),
                "parents": []
            }
            for parent_id, days in months[month_key].items():
                if parent_id in parent_map:
                    month_data["parents"].append({
                        "name": parent_map[parent_id]["name"],
                        "days": days,
                    })
            result.append(month_data)
        
        return result

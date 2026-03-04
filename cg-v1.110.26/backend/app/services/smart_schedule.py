"""
Smart Schedule Generator
Engine that turns 'Smart Rules' into concrete calendar events.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.family_file import FamilyFile
from app.models.agreement import Agreement

class SmartScheduleGenerator:
    """
    Consumes ScheduleRules (V3 Schema) and generates:
    1. Future projected events (for Calendar UI)
    2. Expected check-in windows (for Geofencing)
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_events(self, agreement_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """
        Generate concrete events for a specific time range based on the ACTIVE agreement rules.
        """
        # 1. Fetch Rules
        result = await self.db.execute(
            select(Agreement).where(Agreement.id == agreement_id)
        )
        agreement = result.scalar_one_or_none()
        if not agreement or not agreement.rules:
            return []

        events = []
        rules = agreement.rules
        
        # 2. Extract Pattern
        # This assumes 'rules' contains the compiled Smart Rules from sections
        schedule_rules = rules.get("schedule_pattern", {})
        holiday_rules = rules.get("holiday_rules", [])

        if not schedule_rules:
            return []

        # 3. Calculate Base Schedule
        base_events = self._generate_base_schedule(schedule_rules, start_date, end_date)
        events.extend(base_events)

        # 4. Apply Holidays (Overrides)
        # TODO: Implement holiday logic to override base schedule
        # holiday_events = self._generate_holidays(holiday_rules, start_date, end_date)
        # events = self._merge_events(base_events, holiday_events)

        return events

    def _generate_base_schedule(self, rule: Dict[str, Any], start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """
        Generate recurring schedule based on pattern type.
        """
        pattern_type = rule.get("type")
        cycle_days = rule.get("cycle_length_days", 14)
        anchor_date_str = rule.get("start_date") # e.g. "2024-01-01"
        sequence = rule.get("sequence", [])

        if not anchor_date_str or not sequence:
            return []

        anchor_date = datetime.strptime(anchor_date_str, "%Y-%m-%d")
        events = []
        
        # Calculate day difference to find where we are in the cycle
        # We iterate day by day or just map the sequence
        # (For MVP, simple day iteration is safe)
        
        current_date = start_date
        while current_date <= end_date:
            days_diff = (current_date - anchor_date).days
            cycle_index = days_diff % cycle_days
            
            # Find rule for this index
            # sequence usually: [{"day_offset": 0, "custodian_id": "uuid"}, ...]
            # We need to find the rule that covers this day
            # Assuming 'sequence' defines the owner for each day offset
            
            day_rule = next((item for item in sequence if item["day_offset"] == cycle_index), None)
            
            if day_rule:
                events.append({
                    "date": current_date.isoformat(),
                    "custodian_id": day_rule["custodian_id"],
                    "start_time": day_rule.get("start_time", "09:00"),
                    "type": "regular_custody"
                })
            
            # Increment day
            # In a real impl, we'd jump by weeks, but day-by-day is robust for MVP
            from datetime import timedelta
            current_date += timedelta(days=1)
            
        return events

    async def get_current_parent(self, agreement_id: str) -> Optional[str]:
        """
        Who should have the child RIGHT NOW?
        Used for "Live Status" dashboard.
        """
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Just generate for today
        events = await self.generate_events(agreement_id, today, today)
        if events:
             # In full version, check time-of-day transitions
             # For now, return the day's custodian
             return events[0].get("custodian_id")
        return None

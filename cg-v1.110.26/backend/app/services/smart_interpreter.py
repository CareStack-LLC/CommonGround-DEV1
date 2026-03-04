"""
Smart Interpreter Service
Parses text-based agreements into executable "Smart Rules" (V3 Schema).
"""

from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.agreement import Agreement, AgreementSection

class SmartInterpreterService:
    """
    Translates static text agreements into executable logic.
    Run as a background worker to keep 'smart_rules' in sync with 'content'.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def interpret_section(self, section_id: str) -> Dict[str, Any]:
        """
        Main entry point: Parse a specific section and update its smart_rules.
        """
        # 1. Fetch Section
        result = await self.db.execute(
            select(AgreementSection).where(AgreementSection.id == section_id)
        )
        section = result.scalar_one_or_none()
        if not section:
            return {"error": "Section not found"}

        # 2. Determine Parser by Section Type
        smart_rules = {}
        if section.section_type == "parenting_schedule":
            smart_rules = await self._parse_schedule(section.content)
        elif section.section_type == "holiday_schedule":
            smart_rules = await self._parse_holidays(section.content)
        elif section.section_type == "exchange_logistics":
            smart_rules = await self._parse_geofences(section.content)
        
        # 3. Save "Shadow" Data
        section.smart_rules = smart_rules
        await self.db.commit()
        
        return smart_rules

    async def _parse_schedule(self, content: str) -> Dict[str, Any]:
        """
        Extract SchedulePattern from text using basic heuristics (Regex/Keyword).
        In production, this would use LLM for higher accuracy.
        """
        content_lower = content.lower()
        
        # 1. Detect Pattern Type
        if "week on" in content_lower or "alternating weeks" in content_lower:
             return {
                "type": "schedule_pattern",
                "cycle_length_days": 14,
                "start_date": "2024-01-01",  # Placeholder anchor
                "sequence": [
                    {"day_offset": i, "custodian_id": "parent_a" if i < 7 else "parent_b"}
                    for i in range(14)
                ]
             }
        elif "2-2-3" in content_lower:
             return {
                "type": "schedule_pattern",
                "cycle_length_days": 14,
                "start_date": "2024-01-01",
                "sequence": [
                    {"day_offset": 0, "custodian_id": "parent_a"}, # 2
                    {"day_offset": 1, "custodian_id": "parent_a"},
                    {"day_offset": 2, "custodian_id": "parent_b"}, # 2
                    {"day_offset": 3, "custodian_id": "parent_b"},
                    {"day_offset": 4, "custodian_id": "parent_a"}, # 3
                    {"day_offset": 5, "custodian_id": "parent_a"},
                    {"day_offset": 6, "custodian_id": "parent_a"},
                    {"day_offset": 7, "custodian_id": "parent_b"}, # 2
                    {"day_offset": 8, "custodian_id": "parent_b"},
                    {"day_offset": 9, "custodian_id": "parent_a"}, # 2
                    {"day_offset": 10, "custodian_id": "parent_a"},
                    {"day_offset": 11, "custodian_id": "parent_b"}, # 3
                    {"day_offset": 12, "custodian_id": "parent_b"},
                    {"day_offset": 13, "custodian_id": "parent_b"},
                ]
             }
        
        return {"type": "unknown", "rules": []}

    async def _parse_holidays(self, content: str) -> Dict[str, Any]:
        """
        Extract HolidayRules from text.
        """
        rules = []
        content_lower = content.lower()
        
        if "thanksgiving" in content_lower:
            rules.append({
                "holiday_id": "thanksgiving",
                "allocation_strategy": "Alternating",
                "alternating_config": {
                    "odd_years": "parent_a",  # Default guess, needs LLM
                    "even_years": "parent_b"
                }
            })
            
        return {"type": "holiday_rules", "rules": rules}

    async def _parse_geofences(self, content: str) -> Dict[str, Any]:
        """
        Extract ExchangeLocation objects from text.
        """
        locations = []
        content_lower = content.lower()
        
        if "school" in content_lower:
             locations.append({
                 "label": "School",
                 "type": "school",
                 # In real app, we'd extract address and geocode
                 "coordinates": {"lat": 0.0, "lng": 0.0}, 
                 "geofence_radius_meters": 150
             })
             
        return {"type": "exchange_locations", "locations": locations}

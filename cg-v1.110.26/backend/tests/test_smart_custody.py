"""
Tests for Smart Custody Services (Phase 2 Logic)
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from app.services.smart_interpreter import SmartInterpreterService
from app.services.smart_schedule import SmartScheduleGenerator

@pytest.mark.asyncio
async def test_smart_interpreter_parsing():
    # Setup
    interpreter = SmartInterpreterService(db=MagicMock())
    
    # Test 1: Week On Week Off
    content_wowo = "We will have alternating weeks schedule."
    result_wowo = await interpreter._parse_schedule(content_wowo)
    assert result_wowo["type"] == "schedule_pattern"
    assert result_wowo["cycle_length_days"] == 14
    assert len(result_wowo["sequence"]) == 14
    assert result_wowo["sequence"][0]["custodian_id"] == "parent_a"
    assert result_wowo["sequence"][7]["custodian_id"] == "parent_b"

    # Test 2: 2-2-3
    content_223 = "We follow a 2-2-3 schedule."
    result_223 = await interpreter._parse_schedule(content_223)
    assert result_223["type"] == "schedule_pattern"
    assert result_223["cycle_length_days"] == 14
    assert result_223["sequence"][0]["custodian_id"] == "parent_a"   # Day 1 (2)
    assert result_223["sequence"][2]["custodian_id"] == "parent_b"   # Day 3 (2)
    assert result_223["sequence"][4]["custodian_id"] == "parent_a"   # Day 5 (3)

@pytest.mark.asyncio
async def test_smart_schedule_generator():
    # Setup
    generator = SmartScheduleGenerator(db=MagicMock())
    
    # Mock Rule: 2-2-3
    rule = {
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
            # ... rest implicitly tested by logic
        ]
    }
    
    # Test Range: Jan 1 (Mon) to Jan 7 (Sun)
    start = datetime(2024, 1, 1)
    end = datetime(2024, 1, 7)
    
    events = generator._generate_base_schedule(rule, start, end)
    
    assert len(events) == 7
    assert events[0]["custodian_id"] == "parent_a" # Jan 1
    assert events[1]["custodian_id"] == "parent_a" # Jan 2
    assert events[2]["custodian_id"] == "parent_b" # Jan 3
    assert events[3]["custodian_id"] == "parent_b" # Jan 4
    assert events[4]["custodian_id"] == "parent_a" # Jan 5

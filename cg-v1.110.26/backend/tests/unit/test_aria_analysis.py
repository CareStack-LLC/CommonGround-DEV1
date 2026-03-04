
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from app.services.professional.aria_analyzer_service import ARIAAnalyzerService
from app.models.message import Message

@pytest.mark.asyncio
async def test_calculate_lags():
    # Setup
    db = AsyncMock()
    service = ARIAAnalyzerService(db)
    
    # Create test messages
    m1 = MagicMock(spec=Message)
    m1.sender_id = "user_a"
    m1.created_at = datetime(2026, 1, 1, 10, 0, 0)
    
    m2 = MagicMock(spec=Message)
    m2.sender_id = "user_b"
    m2.created_at = datetime(2026, 1, 1, 12, 0, 0) # 2 hours lag
    
    m3 = MagicMock(spec=Message)
    m3.sender_id = "user_a"
    m3.created_at = datetime(2026, 1, 1, 13, 0, 0) # 1 hour lag
    
    messages = [m1, m2, m3]
    
    # Execute
    lags = service._calculate_lags(messages)
    
    # Verify
    assert "user_b" in lags
    assert lags["user_b"]["average_response_time_hours"] == 2.0
    assert "user_a" in lags
    assert lags["user_a"]["average_response_time_hours"] == 1.0

@pytest.mark.asyncio
async def test_fetch_messages_empty():
    db = AsyncMock()
    # Mock database result
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    db.execute.return_value = mock_result
    
    service = ARIAAnalyzerService(db)
    analysis = await service.analyze_thread("test_file_id")
    
    assert analysis["message_count"] == 0
    assert "No messages found" in analysis["summary"]

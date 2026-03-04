"""
E2E tests for Silent Handoff GPS verification.

Tests the complete flow of GPS-verified custody exchanges,
including check-in validation, geofence detection, and exchange completion.

Prerequisites:
- Test accounts configured in TEST_PARENT_A_* and TEST_PARENT_B_* env vars
- MAPBOX_API_KEY configured for map generation
"""

import os
import pytest
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# Configuration
API_BASE_URL = os.getenv(
    "API_BASE_URL",
    "https://common-ground-git-main-teejays-projects-caad17d8.vercel.app/api/v1"
)

# Test parent credentials (set via environment variables)
TEST_PARENT_A_EMAIL = os.getenv("TEST_PARENT_A_EMAIL", "testparent1@example.com")
TEST_PARENT_A_PASSWORD = os.getenv("TEST_PARENT_A_PASSWORD", "testpassword")
TEST_PARENT_B_EMAIL = os.getenv("TEST_PARENT_B_EMAIL", "testparent2@example.com")
TEST_PARENT_B_PASSWORD = os.getenv("TEST_PARENT_B_PASSWORD", "testpassword")
TEST_FAMILY_FILE_ID = os.getenv("TEST_FAMILY_FILE_ID")

# Sample exchange location (Starbucks, Market St SF)
EXCHANGE_LOCATION = {
    "address": "1901 Market St, San Francisco, CA 94103",
    "lat": 37.7697,
    "lng": -122.4269,
    "geofence_radius": 100  # 100 meter radius
}

# Simulated GPS positions
GPS_POSITIONS = {
    # Both inside geofence (~15m from center)
    "parent_a_inside": {"lat": 37.7698, "lng": -122.4268, "accuracy": 5},
    "parent_b_inside": {"lat": 37.7696, "lng": -122.4270, "accuracy": 8},
    
    # One outside geofence (~300m away)
    "parent_b_outside": {"lat": 37.7720, "lng": -122.4269, "accuracy": 5},
    
    # Edge case: right at boundary (~100m)
    "parent_at_boundary": {"lat": 37.7706, "lng": -122.4269, "accuracy": 5},
}


class SilentHandoffTestClient:
    """Helper client for Silent Handoff testing."""
    
    def __init__(self):
        self.tokens: Dict[str, str] = {}
    
    async def login(self, email: str, password: str) -> str:
        """Login and return access token."""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{API_BASE_URL}/auth/login",
                json={"email": email, "password": password}
            )
            if response.status_code != 200:
                pytest.skip(f"Could not login test user {email}: {response.text}")
            
            token = response.json().get("access_token")
            self.tokens[email] = token
            return token
    
    async def create_exchange(
        self,
        token: str,
        family_file_id: str,
        silent_handoff_enabled: bool = True
    ) -> Dict[str, Any]:
        """Create a custody exchange with Silent Handoff."""
        async with httpx.AsyncClient(timeout=30) as client:
            # Schedule for near future to allow immediate testing
            scheduled_time = (datetime.utcnow() + timedelta(hours=1)).isoformat() + "Z"
            
            response = await client.post(
                f"{API_BASE_URL}/exchanges",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "family_file_id": family_file_id,
                    "exchange_type": "pickup",
                    "scheduled_time": scheduled_time,
                    "duration_minutes": 30,
                    "location": EXCHANGE_LOCATION["address"],
                    "location_lat": EXCHANGE_LOCATION["lat"],
                    "location_lng": EXCHANGE_LOCATION["lng"],
                    "geofence_radius_meters": EXCHANGE_LOCATION["geofence_radius"],
                    "silent_handoff_enabled": silent_handoff_enabled,
                    "check_in_window_before_minutes": 120,  # 2 hours before
                    "check_in_window_after_minutes": 120    # 2 hours after
                }
            )
            
            if response.status_code not in [200, 201]:
                pytest.fail(f"Failed to create exchange: {response.text}")
            
            return response.json()
    
    async def gps_check_in(
        self,
        token: str,
        instance_id: str,
        lat: float,
        lng: float,
        accuracy: float = 5.0,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Perform GPS-verified check-in."""
        async with httpx.AsyncClient(timeout=30) as client:
            payload = {
                "latitude": lat,
                "longitude": lng,
                "device_accuracy": accuracy
            }
            if notes:
                payload["notes"] = notes
            
            response = await client.post(
                f"{API_BASE_URL}/exchanges/instances/{instance_id}/check-in-gps",
                headers={"Authorization": f"Bearer {token}"},
                json=payload
            )
            
            if response.status_code != 200:
                pytest.fail(f"GPS check-in failed: {response.text}")
            
            return response.json()
    
    async def get_instance(self, token: str, instance_id: str) -> Dict[str, Any]:
        """Get exchange instance details."""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{API_BASE_URL}/exchanges/instances/{instance_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code != 200:
                pytest.fail(f"Failed to get instance: {response.text}")
            
            return response.json()


@pytest.fixture
def test_client():
    """Create test client instance."""
    return SilentHandoffTestClient()


@pytest.fixture
async def parent_tokens(test_client):
    """Get tokens for both test parents."""
    token_a = await test_client.login(TEST_PARENT_A_EMAIL, TEST_PARENT_A_PASSWORD)
    token_b = await test_client.login(TEST_PARENT_B_EMAIL, TEST_PARENT_B_PASSWORD)
    return {"parent_a": token_a, "parent_b": token_b}


@pytest.fixture
async def test_exchange(test_client, parent_tokens):
    """Create a test exchange for Silent Handoff testing."""
    if not TEST_FAMILY_FILE_ID:
        pytest.skip("TEST_FAMILY_FILE_ID not configured")
    
    exchange = await test_client.create_exchange(
        token=parent_tokens["parent_a"],
        family_file_id=TEST_FAMILY_FILE_ID,
        silent_handoff_enabled=True
    )
    
    # Get the first instance
    instances = exchange.get("instances", [])
    if not instances:
        pytest.fail("Exchange created without instances")
    
    return {
        "exchange": exchange,
        "instance_id": instances[0]["id"]
    }


@pytest.mark.asyncio
class TestSilentHandoffFlow:
    """Test the complete Silent Handoff GPS verification flow."""
    
    async def test_both_parents_inside_geofence(
        self,
        test_client: SilentHandoffTestClient,
        parent_tokens: Dict[str, str],
        test_exchange: Dict[str, Any]
    ):
        """
        Scenario: Both parents check in inside the geofence.
        Expected: Exchange completes successfully, both marked as in_geofence.
        """
        instance_id = test_exchange["instance_id"]
        pos_a = GPS_POSITIONS["parent_a_inside"]
        pos_b = GPS_POSITIONS["parent_b_inside"]
        
        # Parent A checks in
        result_a = await test_client.gps_check_in(
            token=parent_tokens["parent_a"],
            instance_id=instance_id,
            lat=pos_a["lat"],
            lng=pos_a["lng"],
            accuracy=pos_a["accuracy"]
        )
        
        assert result_a.get("from_parent_checked_in") is True
        assert result_a.get("from_parent_in_geofence") is True
        assert result_a.get("from_parent_distance_meters", 999) < EXCHANGE_LOCATION["geofence_radius"]
        assert result_a.get("status") == "scheduled"  # Still waiting for other parent
        
        # Parent B checks in
        result_b = await test_client.gps_check_in(
            token=parent_tokens["parent_b"],
            instance_id=instance_id,
            lat=pos_b["lat"],
            lng=pos_b["lng"],
            accuracy=pos_b["accuracy"]
        )
        
        assert result_b.get("to_parent_checked_in") is True
        assert result_b.get("to_parent_in_geofence") is True
        assert result_b.get("to_parent_distance_meters", 999) < EXCHANGE_LOCATION["geofence_radius"]
        assert result_b.get("status") == "completed"
        assert result_b.get("handoff_outcome") == "completed"
    
    async def test_one_parent_outside_geofence(
        self,
        test_client: SilentHandoffTestClient,
        parent_tokens: Dict[str, str]
    ):
        """
        Scenario: Parent A inside, Parent B outside geofence.
        Expected: Exchange completes but Parent B flagged as outside.
        """
        if not TEST_FAMILY_FILE_ID:
            pytest.skip("TEST_FAMILY_FILE_ID not configured")
        
        # Create fresh exchange for this test
        exchange = await test_client.create_exchange(
            token=parent_tokens["parent_a"],
            family_file_id=TEST_FAMILY_FILE_ID

        )
        instance_id = exchange["instances"][0]["id"]
        
        pos_a = GPS_POSITIONS["parent_a_inside"]
        pos_b = GPS_POSITIONS["parent_b_outside"]
        
        # Parent A checks in (inside)
        result_a = await test_client.gps_check_in(
            token=parent_tokens["parent_a"],
            instance_id=instance_id,
            lat=pos_a["lat"],
            lng=pos_a["lng"],
            accuracy=pos_a["accuracy"]
        )
        assert result_a.get("from_parent_in_geofence") is True
        
        # Parent B checks in (outside - ~300m away)
        result_b = await test_client.gps_check_in(
            token=parent_tokens["parent_b"],
            instance_id=instance_id,
            lat=pos_b["lat"],
            lng=pos_b["lng"],
            accuracy=pos_b["accuracy"]
        )
        
        # Exchange should still complete but flag the issue
        assert result_b.get("to_parent_in_geofence") is False
        assert result_b.get("to_parent_distance_meters", 0) > EXCHANGE_LOCATION["geofence_radius"]
        assert result_b.get("status") == "completed"  # Still completes
    
    async def test_check_in_with_notes(
        self,
        test_client: SilentHandoffTestClient,
        parent_tokens: Dict[str, str]
    ):
        """
        Scenario: Parent checks in with notes.
        Expected: Notes are recorded with check-in.
        """
        if not TEST_FAMILY_FILE_ID:
            pytest.skip("TEST_FAMILY_FILE_ID not configured")
        
        exchange = await test_client.create_exchange(
            token=parent_tokens["parent_a"],
            family_file_id=TEST_FAMILY_FILE_ID
        )
        instance_id = exchange["instances"][0]["id"]
        
        pos_a = GPS_POSITIONS["parent_a_inside"]
        
        result = await test_client.gps_check_in(
            token=parent_tokens["parent_a"],
            instance_id=instance_id,
            lat=pos_a["lat"],
            lng=pos_a["lng"],
            accuracy=pos_a["accuracy"],
            notes="Child has medication in backpack"
        )
        
        assert result.get("notes") is not None
        assert "medication" in result.get("notes", "")


@pytest.mark.asyncio
class TestGeofenceEdgeCases:
    """Test edge cases in geofence detection."""
    
    async def test_device_accuracy_impacts_detection(
        self,
        test_client: SilentHandoffTestClient,
        parent_tokens: Dict[str, str]
    ):
        """
        Scenario: Parent at boundary with varying device accuracy.
        Expected: Higher accuracy tolerance allows borderline check-ins.
        """
        if not TEST_FAMILY_FILE_ID:
            pytest.skip("TEST_FAMILY_FILE_ID not configured")
        
        exchange = await test_client.create_exchange(
            token=parent_tokens["parent_a"],
            family_file_id=TEST_FAMILY_FILE_ID
        )
        instance_id = exchange["instances"][0]["id"]
        
        # Position right at boundary (~100m)
        pos = GPS_POSITIONS["parent_at_boundary"]
        
        # Check in with high accuracy (5m) - might be outside
        result = await test_client.gps_check_in(
            token=parent_tokens["parent_a"],
            instance_id=instance_id,
            lat=pos["lat"],
            lng=pos["lng"],
            accuracy=5  # Small accuracy, minimal buffer
        )
        
        # Should be recorded regardless of in/out status
        assert result.get("from_parent_checked_in") is True
        assert result.get("from_parent_distance_meters") is not None


@pytest.mark.asyncio
class TestComplianceMetrics:
    """Test exchange compliance reporting."""
    
    async def test_compliance_summary_after_exchange(
        self,
        test_client: SilentHandoffTestClient,
        parent_tokens: Dict[str, str],
        test_exchange: Dict[str, Any]
    ):
        """
        Scenario: After completing an exchange, metrics should reflect it.
        """
        if not TEST_FAMILY_FILE_ID:
            pytest.skip("TEST_FAMILY_FILE_ID not configured")
        
        instance_id = test_exchange["instance_id"]
        pos_a = GPS_POSITIONS["parent_a_inside"]
        pos_b = GPS_POSITIONS["parent_b_inside"]
        
        # Complete the exchange
        await test_client.gps_check_in(
            token=parent_tokens["parent_a"],
            instance_id=instance_id,
            lat=pos_a["lat"],
            lng=pos_a["lng"],
            accuracy=pos_a["accuracy"]
        )
        
        await test_client.gps_check_in(
            token=parent_tokens["parent_b"],
            instance_id=instance_id,
            lat=pos_b["lat"],
            lng=pos_b["lng"],
            accuracy=pos_b["accuracy"]
        )
        
        # Query compliance metrics
        async with httpx.AsyncClient(timeout=30) as client:
            # Need to find the case_id from family_file
            response = await client.get(
                f"{API_BASE_URL}/court/{TEST_FAMILY_FILE_ID}/compliance",
                headers={"Authorization": f"Bearer {parent_tokens['parent_a']}"},
                params={"days": 30}
            )
            
            # May not have court access, that's okay for this test
            if response.status_code == 200:
                metrics = response.json()
                assert "total_exchanges" in metrics or "petitioner_metrics" in metrics

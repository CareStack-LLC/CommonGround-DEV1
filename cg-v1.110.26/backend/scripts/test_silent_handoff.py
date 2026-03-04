#!/usr/bin/env python3
"""
Silent Handoff GPS Test Script

Tests the Mapbox GPS verification with the Marcus/Tasha family file.
Family File: ffb3296b-8723-483d-b7b2-7b6139101477

Usage:
    cd backend && python scripts/test_silent_handoff.py
"""

import asyncio
import httpx
from datetime import datetime, timedelta

# Configuration
API_BASE = "https://common-ground-git-main-teejays-projects-caad17d8.vercel.app/api/v1"
FAMILY_FILE_ID = "ffb3296b-8723-483d-b7b2-7b6139101477"

# Exchange location - Starbucks SF for testing
EXCHANGE_LOCATION = {
    "address": "1901 Market St, San Francisco, CA 94103",
    "lat": 37.7697,
    "lng": -122.4269,
    "geofence_radius": 100  # 100 meter radius
}

# Simulated GPS positions (both ~15m from center - inside geofence)
MARCUS_POSITION = {"lat": 37.7698, "lng": -122.4268, "accuracy": 5}
TASHA_POSITION = {"lat": 37.7696, "lng": -122.4270, "accuracy": 8}


async def login(email: str, password: str) -> str:
    """Login and return access token."""
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{API_BASE}/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code != 200:
            print(f"❌ Login failed for {email}: {response.text}")
            return None
        return response.json().get("access_token")


async def get_family_file_info(token: str, family_file_id: str) -> dict:
    """Get family file details."""
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{API_BASE}/family-files/{family_file_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code != 200:
            print(f"❌ Failed to get family file: {response.text}")
            return None
        return response.json()


async def create_exchange(token: str, family_file_id: str) -> dict:
    """Create a custody exchange with Silent Handoff enabled."""
    async with httpx.AsyncClient(timeout=30) as client:
        # Schedule for 30 minutes from now
        scheduled_time = (datetime.utcnow() + timedelta(minutes=30)).isoformat() + "Z"
        
        response = await client.post(
            f"{API_BASE}/exchanges",
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
                "silent_handoff_enabled": True,
                "check_in_window_before_minutes": 60,
                "check_in_window_after_minutes": 60,
                "title": "Test Silent Handoff Exchange"
            }
        )
        if response.status_code not in [200, 201]:
            print(f"❌ Failed to create exchange: {response.text}")
            return None
        return response.json()


async def list_exchange_instances(token: str, family_file_id: str) -> list:
    """List upcoming exchange instances for the family file."""
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{API_BASE}/exchanges/instances",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "family_file_id": family_file_id,
                "limit": 10
            }
        )
        if response.status_code != 200:
            print(f"❌ Failed to list instances: {response.text}")
            return []
        return response.json().get("instances", [])


async def gps_check_in(token: str, instance_id: str, lat: float, lng: float, accuracy: float, notes: str = None) -> dict:
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
            f"{API_BASE}/exchanges/instances/{instance_id}/check-in-gps",
            headers={"Authorization": f"Bearer {token}"},
            json=payload
        )
        if response.status_code != 200:
            print(f"❌ GPS check-in failed: {response.text}")
            return None
        return response.json()


async def basic_check_in(token: str, instance_id: str) -> dict:
    """Perform basic check-in (no GPS)."""
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{API_BASE}/exchanges/instances/{instance_id}/check-in",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code != 200:
            print(f"❌ Basic check-in failed: {response.text}")
            return None
        return response.json()


async def get_mapbox_static_map(lat: float, lng: float, radius: int, parent_positions: list) -> str:
    """Generate Mapbox static map URL for visualization."""
    from app.services.geolocation import GeolocationService
    
    check_in_points = []
    for i, pos in enumerate(parent_positions):
        label = "P" if i == 0 else "R"
        in_geofence, distance = GeolocationService.is_within_geofence(
            user_lat=pos["lat"],
            user_lng=pos["lng"],
            geofence_lat=lat,
            geofence_lng=lng,
            radius_meters=radius,
            device_accuracy_meters=pos.get("accuracy", 5)
        )
        check_in_points.append({
            "lat": pos["lat"],
            "lng": pos["lng"],
            "label": label,
            "in_geofence": in_geofence
        })
    
    return GeolocationService.generate_static_map_url(
        center_lat=lat,
        center_lng=lng,
        geofence_radius_meters=radius,
        check_in_points=check_in_points
    )


async def main():
    print("=" * 70)
    print("SILENT HANDOFF GPS VERIFICATION TEST")
    print("=" * 70)
    print(f"Family File: {FAMILY_FILE_ID}")
    print(f"Exchange Location: {EXCHANGE_LOCATION['address']}")
    print(f"Geofence: {EXCHANGE_LOCATION['lat']}, {EXCHANGE_LOCATION['lng']} (radius: {EXCHANGE_LOCATION['geofence_radius']}m)")
    print("=" * 70)
    
    # For this test, we need parent credentials
    # Prompt for them or use test accounts
    print("\n📧 Enter Marcus's credentials:")
    marcus_email = input("   Email: ").strip() or "marcus@test.com"
    marcus_password = input("   Password: ").strip() or "testpass"
    
    print("\n📧 Enter Tasha's credentials:")
    tasha_email = input("   Email: ").strip() or "tasha@test.com"
    tasha_password = input("   Password: ").strip() or "testpass"
    
    # Login both parents
    print("\n1️⃣ Logging in parents...")
    marcus_token = await login(marcus_email, marcus_password)
    tasha_token = await login(tasha_email, tasha_password)
    
    if not marcus_token or not tasha_token:
        print("❌ Could not login both parents. Exiting.")
        return
    
    print("   ✅ Both parents logged in")
    
    # Get family file info
    print("\n2️⃣ Fetching family file info...")
    family_info = await get_family_file_info(marcus_token, FAMILY_FILE_ID)
    if family_info:
        print(f"   ✅ Family: {family_info.get('family_name', 'N/A')}")
    
    # Create test exchange
    print("\n3️⃣ Creating test exchange with Silent Handoff...")
    exchange = await create_exchange(marcus_token, FAMILY_FILE_ID)
    if not exchange:
        print("❌ Could not create exchange. Exiting.")
        return
    
    exchange_id = exchange.get("id")
    instances = exchange.get("instances", [])
    
    if not instances:
        print("❌ No instances created. Exiting.")
        return
    
    instance_id = instances[0]["id"]
    print(f"   ✅ Exchange created: {exchange_id}")
    print(f"   ✅ Instance ID: {instance_id}")
    print(f"   ✅ Silent Handoff: {exchange.get('silent_handoff_enabled', False)}")
    
    # Marcus checks in with GPS
    print("\n4️⃣ Marcus checking in with GPS...")
    print(f"   Position: ({MARCUS_POSITION['lat']}, {MARCUS_POSITION['lng']})")
    print(f"   Accuracy: {MARCUS_POSITION['accuracy']}m")
    
    result_marcus = await gps_check_in(
        marcus_token,
        instance_id,
        MARCUS_POSITION["lat"],
        MARCUS_POSITION["lng"],
        MARCUS_POSITION["accuracy"],
        notes="Jayden has his backpack"
    )
    
    if result_marcus:
        print(f"   ✅ In geofence: {result_marcus.get('from_parent_in_geofence', 'N/A')}")
        print(f"   ✅ Distance: {result_marcus.get('from_parent_distance_meters', 'N/A')}m")
        print(f"   ✅ Status: {result_marcus.get('status')}")
    
    # Tasha checks in with GPS
    print("\n5️⃣ Tasha checking in with GPS...")
    print(f"   Position: ({TASHA_POSITION['lat']}, {TASHA_POSITION['lng']})")
    print(f"   Accuracy: {TASHA_POSITION['accuracy']}m")
    
    result_tasha = await gps_check_in(
        tasha_token,
        instance_id,
        TASHA_POSITION["lat"],
        TASHA_POSITION["lng"],
        TASHA_POSITION["accuracy"],
        notes="Received Jayden, all good"
    )
    
    if result_tasha:
        print(f"   ✅ In geofence: {result_tasha.get('to_parent_in_geofence', 'N/A')}")
        print(f"   ✅ Distance: {result_tasha.get('to_parent_distance_meters', 'N/A')}m")
        print(f"   ✅ Status: {result_tasha.get('status')}")
        print(f"   ✅ Handoff outcome: {result_tasha.get('handoff_outcome')}")
    
    # Generate Mapbox map URL
    print("\n6️⃣ Generating Mapbox static map...")
    try:
        map_url = await get_mapbox_static_map(
            EXCHANGE_LOCATION["lat"],
            EXCHANGE_LOCATION["lng"],
            EXCHANGE_LOCATION["geofence_radius"],
            [MARCUS_POSITION, TASHA_POSITION]
        )
        if map_url:
            print(f"   ✅ Map URL generated:")
            print(f"   {map_url}")
    except Exception as e:
        print(f"   ⚠️ Could not generate map: {e}")
    
    print("\n" + "=" * 70)
    print("TEST COMPLETE")
    print("=" * 70)
    
    # Summary
    if result_marcus and result_tasha:
        print("\n📊 SUMMARY:")
        print(f"   Exchange ID: {exchange_id}")
        print(f"   Instance ID: {instance_id}")
        print(f"   Marcus in geofence: {result_marcus.get('from_parent_in_geofence')}")
        print(f"   Tasha in geofence: {result_tasha.get('to_parent_in_geofence')}")
        print(f"   Final status: {result_tasha.get('status')}")
        print(f"   Handoff outcome: {result_tasha.get('handoff_outcome')}")


if __name__ == "__main__":
    asyncio.run(main())

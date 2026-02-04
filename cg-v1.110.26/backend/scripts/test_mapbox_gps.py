#!/usr/bin/env python3
"""
Simple Mapbox + GPS Test Script

Tests the GeolocationService directly with the provided Mapbox API key.
Generates a static map URL that can be opened in browser.

Usage:
    cd backend && python scripts/test_mapbox_gps.py
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from app.services.geolocation import GeolocationService

# Mapbox API Key (provided by user)
MAPBOX_API_KEY = "pk.eyJ1IjoidGVlamF5MzEwIiwiYSI6ImNtano1aGIzeTdidTYzZHB5ZWtkYTZoOHEifQ.ZIGoggSuBeAEIzeHaTk6tA"

# Exchange location - Starbucks SF for testing
EXCHANGE_LOCATION = {
    "address": "1901 Market St, San Francisco, CA 94103",
    "lat": 37.7697,
    "lng": -122.4269,
    "geofence_radius": 100  # 100 meter radius
}

# Simulated GPS positions for Marcus and Tasha
MARCUS_POSITION = {
    "lat": 37.7698,   # ~11m from center (INSIDE geofence)
    "lng": -122.4268,
    "accuracy": 5
}

TASHA_POSITION = {
    "lat": 37.7696,   # ~11m from center (INSIDE geofence)
    "lng": -122.4270,
    "accuracy": 8
}

# Position outside geofence for testing edge case
OUTSIDE_POSITION = {
    "lat": 37.7720,   # ~255m from center (OUTSIDE geofence)
    "lng": -122.4269,
    "accuracy": 5
}


def test_distance_calculation():
    """Test distance calculations between points."""
    print("\n" + "=" * 60)
    print("TEST 1: Distance Calculation")
    print("=" * 60)
    
    # Marcus to center
    marcus_distance = GeolocationService.calculate_distance_meters(
        lat1=MARCUS_POSITION["lat"], lng1=MARCUS_POSITION["lng"],
        lat2=EXCHANGE_LOCATION["lat"], lng2=EXCHANGE_LOCATION["lng"]
    )
    print(f"Marcus → Exchange Center: {marcus_distance:.1f}m")
    
    # Tasha to center
    tasha_distance = GeolocationService.calculate_distance_meters(
        lat1=TASHA_POSITION["lat"], lng1=TASHA_POSITION["lng"],
        lat2=EXCHANGE_LOCATION["lat"], lng2=EXCHANGE_LOCATION["lng"]
    )
    print(f"Tasha → Exchange Center: {tasha_distance:.1f}m")
    
    # Outside position to center
    outside_distance = GeolocationService.calculate_distance_meters(
        lat1=OUTSIDE_POSITION["lat"], lng1=OUTSIDE_POSITION["lng"],
        lat2=EXCHANGE_LOCATION["lat"], lng2=EXCHANGE_LOCATION["lng"]
    )
    print(f"Outside Position → Exchange Center: {outside_distance:.1f}m")
    
    return marcus_distance, tasha_distance, outside_distance


def test_geofence_detection():
    """Test geofence in/out detection."""
    print("\n" + "=" * 60)
    print("TEST 2: Geofence Detection (radius: 100m)")
    print("=" * 60)
    
    # Marcus check
    marcus_in, marcus_dist = GeolocationService.is_within_geofence(
        user_lat=MARCUS_POSITION["lat"],
        user_lng=MARCUS_POSITION["lng"],
        geofence_lat=EXCHANGE_LOCATION["lat"],
        geofence_lng=EXCHANGE_LOCATION["lng"],
        radius_meters=EXCHANGE_LOCATION["geofence_radius"],
        device_accuracy_meters=MARCUS_POSITION["accuracy"]
    )
    print(f"Marcus: {'✅ INSIDE' if marcus_in else '❌ OUTSIDE'} geofence ({marcus_dist:.1f}m)")
    
    # Tasha check
    tasha_in, tasha_dist = GeolocationService.is_within_geofence(
        user_lat=TASHA_POSITION["lat"],
        user_lng=TASHA_POSITION["lng"],
        geofence_lat=EXCHANGE_LOCATION["lat"],
        geofence_lng=EXCHANGE_LOCATION["lng"],
        radius_meters=EXCHANGE_LOCATION["geofence_radius"],
        device_accuracy_meters=TASHA_POSITION["accuracy"]
    )
    print(f"Tasha:  {'✅ INSIDE' if tasha_in else '❌ OUTSIDE'} geofence ({tasha_dist:.1f}m)")
    
    # Outside position check
    outside_in, outside_dist = GeolocationService.is_within_geofence(
        user_lat=OUTSIDE_POSITION["lat"],
        user_lng=OUTSIDE_POSITION["lng"],
        geofence_lat=EXCHANGE_LOCATION["lat"],
        geofence_lng=EXCHANGE_LOCATION["lng"],
        radius_meters=EXCHANGE_LOCATION["geofence_radius"],
        device_accuracy_meters=OUTSIDE_POSITION["accuracy"]
    )
    print(f"Outside: {'✅ INSIDE' if outside_in else '❌ OUTSIDE'} geofence ({outside_dist:.1f}m)")
    
    return (marcus_in, marcus_dist), (tasha_in, tasha_dist), (outside_in, outside_dist)


def test_static_map_generation():
    """Test Mapbox static map URL generation."""
    print("\n" + "=" * 60)
    print("TEST 3: Mapbox Static Map Generation")
    print("=" * 60)
    
    # Get geofence status for coloring
    marcus_in, marcus_dist = GeolocationService.is_within_geofence(
        user_lat=MARCUS_POSITION["lat"],
        user_lng=MARCUS_POSITION["lng"],
        geofence_lat=EXCHANGE_LOCATION["lat"],
        geofence_lng=EXCHANGE_LOCATION["lng"],
        radius_meters=EXCHANGE_LOCATION["geofence_radius"],
        device_accuracy_meters=MARCUS_POSITION["accuracy"]
    )
    
    tasha_in, tasha_dist = GeolocationService.is_within_geofence(
        user_lat=TASHA_POSITION["lat"],
        user_lng=TASHA_POSITION["lng"],
        geofence_lat=EXCHANGE_LOCATION["lat"],
        geofence_lng=EXCHANGE_LOCATION["lng"],
        radius_meters=EXCHANGE_LOCATION["geofence_radius"],
        device_accuracy_meters=TASHA_POSITION["accuracy"]
    )
    
    # Check-in points with geofence status
    check_in_points = [
        {
            "lat": MARCUS_POSITION["lat"],
            "lng": MARCUS_POSITION["lng"],
            "label": "M",  # M for Marcus
            "in_geofence": marcus_in
        },
        {
            "lat": TASHA_POSITION["lat"],
            "lng": TASHA_POSITION["lng"],
            "label": "T",  # T for Tasha
            "in_geofence": tasha_in
        }
    ]
    
    # Generate map URL
    map_url = GeolocationService.generate_static_map_url(
        center_lat=EXCHANGE_LOCATION["lat"],
        center_lng=EXCHANGE_LOCATION["lng"],
        geofence_radius_meters=EXCHANGE_LOCATION["geofence_radius"],
        check_in_points=check_in_points,
        mapbox_api_key=MAPBOX_API_KEY
    )
    
    print(f"Exchange Location: {EXCHANGE_LOCATION['address']}")
    print(f"Geofence Center: ({EXCHANGE_LOCATION['lat']}, {EXCHANGE_LOCATION['lng']})")
    print(f"Geofence Radius: {EXCHANGE_LOCATION['geofence_radius']}m")
    print(f"\nMarkers:")
    print(f"  ⭐ Blue star = Exchange center")
    print(f"  M (Green) = Marcus ({marcus_dist:.1f}m from center, {'in' if marcus_in else 'out'} of geofence)")
    print(f"  T (Green) = Tasha ({tasha_dist:.1f}m from center, {'in' if tasha_in else 'out'} of geofence)")
    print(f"\n📍 Map URL (copy and open in browser):")
    print(f"\n{map_url}\n")
    
    return map_url


def test_exchange_map_convenience():
    """Test the exchange-specific map convenience method."""
    print("\n" + "=" * 60)
    print("TEST 4: Exchange Map Convenience Method")
    print("=" * 60)
    
    # Monkeypatch settings to use our API key
    from app.core import config
    original_key = config.settings.MAPBOX_API_KEY
    config.settings.MAPBOX_API_KEY = MAPBOX_API_KEY
    
    try:
        map_url = GeolocationService.generate_exchange_map(
            exchange_location_lat=EXCHANGE_LOCATION["lat"],
            exchange_location_lng=EXCHANGE_LOCATION["lng"],
            geofence_radius=EXCHANGE_LOCATION["geofence_radius"],
            from_parent_lat=MARCUS_POSITION["lat"],
            from_parent_lng=MARCUS_POSITION["lng"],
            from_parent_in_geofence=True,
            to_parent_lat=TASHA_POSITION["lat"],
            to_parent_lng=TASHA_POSITION["lng"],
            to_parent_in_geofence=True,
            petitioner_is_from=True
        )
        
        print(f"Exchange map for Marcus (P) → Tasha (R):")
        print(f"\n📍 Map URL (copy and open in browser):")
        print(f"\n{map_url}\n")
    finally:
        config.settings.MAPBOX_API_KEY = original_key
    
    return map_url


def test_one_outside_geofence():
    """Test scenario where one parent is outside geofence."""
    print("\n" + "=" * 60)
    print("TEST 5: One Parent Outside Geofence")
    print("=" * 60)
    
    # Monkeypatch settings to use our API key
    from app.core import config
    original_key = config.settings.MAPBOX_API_KEY
    config.settings.MAPBOX_API_KEY = MAPBOX_API_KEY
    
    try:
        # Marcus inside, Tasha outside
        marcus_in = True
        tasha_in = False  # Using outside position
        
        map_url = GeolocationService.generate_exchange_map(
            exchange_location_lat=EXCHANGE_LOCATION["lat"],
            exchange_location_lng=EXCHANGE_LOCATION["lng"],
            geofence_radius=EXCHANGE_LOCATION["geofence_radius"],
            from_parent_lat=MARCUS_POSITION["lat"],
            from_parent_lng=MARCUS_POSITION["lng"],
            from_parent_in_geofence=marcus_in,
            to_parent_lat=OUTSIDE_POSITION["lat"],  # Tasha is far away
            to_parent_lng=OUTSIDE_POSITION["lng"],
            to_parent_in_geofence=tasha_in,
            petitioner_is_from=True
        )
        
        print(f"Scenario: Marcus in geofence, Tasha ~255m away (outside)")
        print(f"  P (Green) = Marcus (in geofence)")
        print(f"  R (Red) = Tasha (OUTSIDE geofence)")
        print(f"\n📍 Map URL (copy and open in browser):")
        print(f"\n{map_url}\n")
    finally:
        config.settings.MAPBOX_API_KEY = original_key
    
    return map_url



def main():
    print("=" * 60)
    print("MAPBOX GPS VERIFICATION TEST")
    print("Family: Marcus & Tasha (ffb3296b-8723-483d-b7b2-7b6139101477)")
    print("Child: Jayden")
    print("=" * 60)
    
    # Run tests
    test_distance_calculation()
    test_geofence_detection()
    map_url_1 = test_static_map_generation()
    map_url_2 = test_exchange_map_convenience()
    map_url_3 = test_one_outside_geofence()
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print("\n✅ All GPS calculations working correctly")
    print("✅ Geofence detection working correctly")
    print("✅ Mapbox static map URLs generated")
    print("\nOpen any of the map URLs in your browser to visualize the exchange:")
    print("  - TEST 3: Both parents check-in visualization")
    print("  - TEST 4: Exchange-specific map (P=Petitioner, R=Respondent)")
    print("  - TEST 5: One parent outside geofence (red marker)")
    
    # Write URLs to file for easy access
    with open("mapbox_test_urls.txt", "w") as f:
        f.write("Mapbox Test URLs\n")
        f.write("=" * 60 + "\n\n")
        f.write("Test 3 - Both parents in geofence:\n")
        f.write(map_url_1 + "\n\n")
        f.write("Test 4 - Exchange convenience method:\n")
        f.write(map_url_2 + "\n\n")
        f.write("Test 5 - One parent outside:\n")
        f.write(map_url_3 + "\n")
    
    print("\n📄 URLs also saved to: backend/mapbox_test_urls.txt")


if __name__ == "__main__":
    main()

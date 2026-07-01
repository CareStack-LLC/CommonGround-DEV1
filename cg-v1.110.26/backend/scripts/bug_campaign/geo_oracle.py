"""
Ground-truth geofence math — an INDEPENDENT mirror of
app/services/geolocation.py. If the API and this ever disagree, that gap is a
real bug in the Silent Handoff accuracy.

Kept deliberately as a standalone copy (not an import) so the Oracle does not
depend on the code under test.
"""

from __future__ import annotations

import math

EARTH_RADIUS_METERS = 6371000  # mirror of GeolocationService.EARTH_RADIUS_METERS
ACCURACY_BUFFER_CAP_M = 50     # mirror of `min(device_accuracy, 50)`


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in meters between two GPS points (mirror of calculate_distance_meters)."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_METERS * c


def effective_radius(radius_m: float, device_accuracy_m: float) -> float:
    return radius_m + min(device_accuracy_m, ACCURACY_BUFFER_CAP_M)


def is_within_geofence(
    user_lat: float,
    user_lng: float,
    geofence_lat: float,
    geofence_lng: float,
    radius_m: float,
    device_accuracy_m: float = 0.0,
) -> tuple[bool, float]:
    """Return (is_within, distance_m) — mirror of GeolocationService.is_within_geofence."""
    distance = haversine_m(user_lat, user_lng, geofence_lat, geofence_lng)
    return distance <= effective_radius(radius_m, device_accuracy_m), distance


def expected_source(in_geofence: bool) -> str:
    """The service sets check_in_source = silent_geofence if in-fence else gps."""
    return "silent_geofence" if in_geofence else "gps"

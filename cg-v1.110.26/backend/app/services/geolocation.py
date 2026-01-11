"""
Geolocation Service for Silent Handoff feature.

Handles:
- Haversine distance calculations between GPS coordinates
- Geofence verification (is user within radius of exchange location)
- Address geocoding via Mapbox API
"""

import math
from typing import Optional, Tuple
import httpx

from app.core.config import settings


class GeolocationService:
    """
    Service for GPS-based location verification in Silent Handoff.

    Privacy Design:
    - No continuous tracking
    - GPS captured only at check-in moment
    - Location data tied to specific exchange instance
    """

    MAPBOX_GEOCODING_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places"
    EARTH_RADIUS_METERS = 6371000  # Earth's radius in meters

    @staticmethod
    def calculate_distance_meters(
        lat1: float,
        lng1: float,
        lat2: float,
        lng2: float
    ) -> float:
        """
        Calculate distance between two GPS coordinates using Haversine formula.

        Args:
            lat1: Latitude of first point
            lng1: Longitude of first point
            lat2: Latitude of second point
            lng2: Longitude of second point

        Returns:
            Distance in meters between the two points
        """
        # Convert to radians
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lng2 - lng1)

        # Haversine formula
        a = (
            math.sin(delta_phi / 2) ** 2 +
            math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return GeolocationService.EARTH_RADIUS_METERS * c

    @staticmethod
    def is_within_geofence(
        user_lat: float,
        user_lng: float,
        geofence_lat: float,
        geofence_lng: float,
        radius_meters: float,
        device_accuracy_meters: float = 0
    ) -> Tuple[bool, float]:
        """
        Check if user location is within the geofence radius.

        Accounts for device GPS accuracy by adding it to the allowed radius.
        This prevents false negatives when device accuracy is low.

        Args:
            user_lat: User's GPS latitude
            user_lng: User's GPS longitude
            geofence_lat: Exchange location latitude
            geofence_lng: Exchange location longitude
            radius_meters: Allowed geofence radius
            device_accuracy_meters: Device-reported GPS accuracy

        Returns:
            Tuple of (is_within_geofence, distance_in_meters)
        """
        distance = GeolocationService.calculate_distance_meters(
            user_lat, user_lng, geofence_lat, geofence_lng
        )

        # Add device accuracy to radius (more lenient for less accurate devices)
        effective_radius = radius_meters + min(device_accuracy_meters, 50)  # Cap at 50m buffer

        is_within = distance <= effective_radius

        return is_within, distance

    @classmethod
    async def geocode_address(
        cls,
        address: str,
        mapbox_api_key: Optional[str] = None
    ) -> Optional[dict]:
        """
        Convert a street address to GPS coordinates using Mapbox API.

        Args:
            address: Street address to geocode
            mapbox_api_key: Optional Mapbox API key (uses settings if not provided)

        Returns:
            Dict with latitude, longitude, formatted_address, accuracy
            or None if geocoding fails
        """
        api_key = mapbox_api_key or settings.MAPBOX_API_KEY

        if not api_key:
            return None

        try:
            async with httpx.AsyncClient() as client:
                # URL-encode the address
                encoded_address = address.replace(" ", "%20")

                response = await client.get(
                    f"{cls.MAPBOX_GEOCODING_URL}/{encoded_address}.json",
                    params={
                        "access_token": api_key,
                        "limit": 1,
                        "types": "address,place,poi"
                    },
                    timeout=10.0
                )

                if response.status_code != 200:
                    return None

                data = response.json()

                if not data.get("features"):
                    return None

                feature = data["features"][0]
                coords = feature["geometry"]["coordinates"]

                # Determine accuracy from relevance score
                relevance = feature.get("relevance", 0)
                if relevance >= 0.9:
                    accuracy = "exact"
                elif relevance >= 0.7:
                    accuracy = "approximate"
                else:
                    accuracy = "fallback"

                return {
                    "latitude": coords[1],  # Mapbox returns [lng, lat]
                    "longitude": coords[0],
                    "formatted_address": feature.get("place_name", address),
                    "accuracy": accuracy
                }

        except httpx.TimeoutException:
            return None
        except Exception:
            return None

    @staticmethod
    def format_distance_for_display(distance_meters: float) -> str:
        """
        Format distance in a human-readable way.

        Args:
            distance_meters: Distance in meters

        Returns:
            Formatted string (e.g., "50m", "1.2km")
        """
        if distance_meters < 1000:
            return f"{int(round(distance_meters))}m"
        else:
            return f"{distance_meters / 1000:.1f}km"

    @staticmethod
    def validate_coordinates(lat: float, lng: float) -> bool:
        """
        Validate that GPS coordinates are within valid ranges.

        Args:
            lat: Latitude (-90 to 90)
            lng: Longitude (-180 to 180)

        Returns:
            True if coordinates are valid
        """
        return -90 <= lat <= 90 and -180 <= lng <= 180

    @classmethod
    def generate_static_map_url(
        cls,
        center_lat: float,
        center_lng: float,
        geofence_radius_meters: int,
        check_in_points: list = None,
        width: int = 600,
        height: int = 400,
        zoom: int = None,
        mapbox_api_key: str = None
    ) -> Optional[str]:
        """
        Generate a Mapbox Static API URL for visualizing an exchange location.

        Shows:
        - Geofence boundary (as a circle approximation via GeoJSON)
        - Check-in markers for each parent

        Args:
            center_lat: Exchange location latitude
            center_lng: Exchange location longitude
            geofence_radius_meters: Geofence radius in meters
            check_in_points: List of check-in points, each with:
                - lat: float
                - lng: float
                - label: str (e.g., "P" for petitioner, "R" for respondent)
                - in_geofence: bool (determines marker color)
            width: Image width in pixels (max 1280)
            height: Image height in pixels (max 1280)
            zoom: Optional zoom level (auto-calculated if not provided)
            mapbox_api_key: Optional API key (uses settings if not provided)

        Returns:
            URL string for the static map image, or None if API key not available
        """
        api_key = mapbox_api_key or settings.MAPBOX_API_KEY

        if not api_key:
            return None

        # Clamp dimensions
        width = min(width, 1280)
        height = min(height, 1280)

        # Calculate appropriate zoom level based on geofence radius if not provided
        if zoom is None:
            # Approximate zoom: 1 meter = ~0.0000089 degrees at equator
            # We want the geofence to take up about 60% of the map
            degrees_per_pixel = 360 / (256 * (2 ** 15))  # At zoom 15
            geofence_degrees = geofence_radius_meters * 0.0000089 * 2  # Diameter in degrees
            target_pixels = min(width, height) * 0.6
            pixels_needed = geofence_degrees / degrees_per_pixel

            # Adjust zoom based on ratio
            if pixels_needed > 0:
                zoom_adjustment = math.log2(target_pixels / pixels_needed)
                zoom = int(15 + zoom_adjustment)
                zoom = max(10, min(18, zoom))  # Clamp between 10 and 18
            else:
                zoom = 15

        # Build marker overlays
        markers = []

        # Add geofence center marker (blue pin)
        markers.append(f"pin-l-star+0000FF({center_lng},{center_lat})")

        # Add check-in point markers
        if check_in_points:
            for point in check_in_points:
                lat = point.get("lat")
                lng = point.get("lng")
                label = point.get("label", "")[:1]  # First character only
                in_geofence = point.get("in_geofence", False)

                if lat and lng:
                    # Green if in geofence, red if outside
                    color = "00AA00" if in_geofence else "CC0000"
                    markers.append(f"pin-s-{label.lower()}+{color}({lng},{lat})")

        # Join markers
        overlay = ",".join(markers) if markers else ""

        # Build URL
        # Format: /styles/v1/{username}/{style_id}/static/{overlay}/{lon},{lat},{zoom}/{width}x{height}
        style = "mapbox/streets-v12"
        base_url = f"https://api.mapbox.com/styles/v1/{style}/static"

        if overlay:
            url = f"{base_url}/{overlay}/{center_lng},{center_lat},{zoom}/{width}x{height}"
        else:
            url = f"{base_url}/{center_lng},{center_lat},{zoom}/{width}x{height}"

        url += f"?access_token={api_key}"

        # Add retina for better quality on high-DPI displays
        url += "&logo=false"  # Remove Mapbox logo for cleaner evidence images

        return url

    @classmethod
    def generate_exchange_map(
        cls,
        exchange_location_lat: float,
        exchange_location_lng: float,
        geofence_radius: int,
        from_parent_lat: Optional[float] = None,
        from_parent_lng: Optional[float] = None,
        from_parent_in_geofence: Optional[bool] = None,
        to_parent_lat: Optional[float] = None,
        to_parent_lng: Optional[float] = None,
        to_parent_in_geofence: Optional[bool] = None,
        petitioner_is_from: bool = True
    ) -> Optional[str]:
        """
        Generate a static map for a specific custody exchange.

        Convenience method that builds check_in_points from parent data.

        Args:
            exchange_location_lat: Exchange geofence center latitude
            exchange_location_lng: Exchange geofence center longitude
            geofence_radius: Geofence radius in meters
            from_parent_lat: From parent's check-in latitude
            from_parent_lng: From parent's check-in longitude
            from_parent_in_geofence: Whether from parent was in geofence
            to_parent_lat: To parent's check-in latitude
            to_parent_lng: To parent's check-in longitude
            to_parent_in_geofence: Whether to parent was in geofence
            petitioner_is_from: Whether the petitioner is the "from" parent

        Returns:
            URL string for the static map image
        """
        check_in_points = []

        # From parent check-in
        if from_parent_lat is not None and from_parent_lng is not None:
            label = "P" if petitioner_is_from else "R"
            check_in_points.append({
                "lat": from_parent_lat,
                "lng": from_parent_lng,
                "label": label,
                "in_geofence": from_parent_in_geofence or False
            })

        # To parent check-in
        if to_parent_lat is not None and to_parent_lng is not None:
            label = "R" if petitioner_is_from else "P"
            check_in_points.append({
                "lat": to_parent_lat,
                "lng": to_parent_lng,
                "label": label,
                "in_geofence": to_parent_in_geofence or False
            })

        return cls.generate_static_map_url(
            center_lat=exchange_location_lat,
            center_lng=exchange_location_lng,
            geofence_radius_meters=geofence_radius,
            check_in_points=check_in_points
        )

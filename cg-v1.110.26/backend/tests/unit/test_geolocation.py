"""
Unit tests for GeolocationService.

Tests GPS distance calculations, geofence verification,
and Mapbox static map URL generation.
"""

import pytest
from app.services.geolocation import GeolocationService


class TestDistanceCalculation:
    """Tests for Haversine distance calculation."""
    
    def test_same_point_returns_zero(self):
        """Distance between same point should be 0."""
        distance = GeolocationService.calculate_distance_meters(
            lat1=37.7749, lng1=-122.4194,
            lat2=37.7749, lng2=-122.4194
        )
        assert distance == 0
    
    def test_known_distance_sf_landmarks(self):
        """Test with known SF landmarks ~400m apart."""
        # SF City Hall: 37.7793, -122.4193
        # Civic Center BART: 37.7797, -122.4139
        distance = GeolocationService.calculate_distance_meters(
            lat1=37.7793, lng1=-122.4193,
            lat2=37.7797, lng2=-122.4139
        )
        # Should be approximately 450-500m
        assert 400 < distance < 550
    
    def test_one_kilometer_distance(self):
        """Test approximately 1km distance."""
        # 1 degree latitude ≈ 111km
        # 0.009 degrees ≈ 1km
        distance = GeolocationService.calculate_distance_meters(
            lat1=37.0, lng1=-122.0,
            lat2=37.009, lng2=-122.0
        )
        # Should be approximately 1000m
        assert 950 < distance < 1050
    
    def test_small_distance_10_meters(self):
        """Test very small distance ~10m."""
        # ~0.00009 degrees ≈ 10m
        distance = GeolocationService.calculate_distance_meters(
            lat1=37.7749, lng1=-122.4194,
            lat2=37.77499, lng2=-122.4194
        )
        # Should be approximately 10m
        assert 5 < distance < 15
    
    def test_negative_coordinates(self):
        """Test with negative (southern/eastern) coordinates."""
        # Sydney, Australia area
        distance = GeolocationService.calculate_distance_meters(
            lat1=-33.8688, lng1=151.2093,
            lat2=-33.8700, lng2=151.2100
        )
        assert distance > 0


class TestGeofenceVerification:
    """Tests for geofence radius checking."""
    
    def test_inside_geofence_small_offset(self):
        """User 10m from center, 100m radius - should be inside."""
        in_geofence, distance = GeolocationService.is_within_geofence(
            user_lat=37.7749, user_lng=-122.4194,
            geofence_lat=37.77499, geofence_lng=-122.4194,
            radius_meters=100
        )
        assert in_geofence is True
        assert distance < 100
    
    def test_outside_geofence_large_offset(self):
        """User 500m from center, 100m radius - should be outside."""
        # 0.0045 degrees ≈ 500m
        in_geofence, distance = GeolocationService.is_within_geofence(
            user_lat=37.7794, user_lng=-122.4194,
            geofence_lat=37.7749, geofence_lng=-122.4194,
            radius_meters=100
        )
        assert in_geofence is False
        assert distance > 100
    
    def test_exactly_on_boundary(self):
        """User exactly at radius boundary (~100m)."""
        # 0.0009 degrees ≈ 100m
        in_geofence, distance = GeolocationService.is_within_geofence(
            user_lat=37.7758, user_lng=-122.4194,
            geofence_lat=37.7749, geofence_lng=-122.4194,
            radius_meters=100
        )
        # Should be right around the boundary
        assert 80 < distance < 120
    
    def test_device_accuracy_expands_radius(self):
        """Device accuracy should expand effective radius."""
        # User is ~120m away
        base_lat = 37.7749
        offset_lat = 37.7760  # ~122m away
        
        # Without accuracy buffer - outside
        in_geofence_no_accuracy, dist = GeolocationService.is_within_geofence(
            user_lat=offset_lat, user_lng=-122.4194,
            geofence_lat=base_lat, geofence_lng=-122.4194,
            radius_meters=100,
            device_accuracy_meters=0
        )
        
        # With 30m accuracy buffer - inside (100 + 30 = 130m effective)
        in_geofence_with_accuracy, _ = GeolocationService.is_within_geofence(
            user_lat=offset_lat, user_lng=-122.4194,
            geofence_lat=base_lat, geofence_lng=-122.4194,
            radius_meters=100,
            device_accuracy_meters=30
        )
        
        assert in_geofence_no_accuracy is False
        assert in_geofence_with_accuracy is True
    
    def test_device_accuracy_capped_at_50m(self):
        """Device accuracy buffer should be capped at 50m."""
        # User at 160m (outside 100 + 50 = 150m effective radius)
        in_geofence, _ = GeolocationService.is_within_geofence(
            user_lat=37.7763, user_lng=-122.4194,  # ~155m away
            geofence_lat=37.7749, geofence_lng=-122.4194,
            radius_meters=100,
            device_accuracy_meters=100  # Should cap at 50m
        )
        # Even with 100m accuracy, cap at 50m means effective = 150m
        # User at 155m should be outside
        assert in_geofence is False


class TestCoordinateValidation:
    """Tests for coordinate validation."""
    
    def test_valid_coordinates(self):
        """Valid coordinates should return True."""
        assert GeolocationService.validate_coordinates(37.7749, -122.4194) is True
        assert GeolocationService.validate_coordinates(0, 0) is True
        assert GeolocationService.validate_coordinates(-90, 180) is True
        assert GeolocationService.validate_coordinates(90, -180) is True
    
    def test_invalid_latitude(self):
        """Invalid latitude should return False."""
        assert GeolocationService.validate_coordinates(91, 0) is False
        assert GeolocationService.validate_coordinates(-91, 0) is False
    
    def test_invalid_longitude(self):
        """Invalid longitude should return False."""
        assert GeolocationService.validate_coordinates(0, 181) is False
        assert GeolocationService.validate_coordinates(0, -181) is False


class TestDistanceFormatting:
    """Tests for human-readable distance formatting."""
    
    def test_format_meters(self):
        """Distances under 1km should be in meters."""
        assert GeolocationService.format_distance_for_display(50) == "50m"
        assert GeolocationService.format_distance_for_display(999) == "999m"
        assert GeolocationService.format_distance_for_display(0) == "0m"
    
    def test_format_kilometers(self):
        """Distances over 1km should be in kilometers."""
        assert GeolocationService.format_distance_for_display(1000) == "1.0km"
        assert GeolocationService.format_distance_for_display(1500) == "1.5km"
        assert GeolocationService.format_distance_for_display(10000) == "10.0km"


class TestStaticMapGeneration:
    """Tests for Mapbox static map URL generation."""
    
    def test_map_without_api_key_returns_none(self, monkeypatch):
        """Without API key, should return None."""
        monkeypatch.setattr("app.core.config.settings.MAPBOX_API_KEY", None)
        
        url = GeolocationService.generate_static_map_url(
            center_lat=37.7749,
            center_lng=-122.4194,
            geofence_radius_meters=100
        )
        assert url is None
    
    def test_map_url_structure(self, monkeypatch):
        """Map URL should have correct structure."""
        monkeypatch.setattr("app.core.config.settings.MAPBOX_API_KEY", "test_key")
        
        url = GeolocationService.generate_static_map_url(
            center_lat=37.7749,
            center_lng=-122.4194,
            geofence_radius_meters=100,
            check_in_points=[
                {"lat": 37.7748, "lng": -122.4193, "label": "P", "in_geofence": True},
                {"lat": 37.7751, "lng": -122.4196, "label": "R", "in_geofence": False}
            ]
        )
        
        assert url is not None
        assert "api.mapbox.com" in url
        assert "access_token=test_key" in url
        assert "pin-l-star" in url  # Center marker
        assert "pin-s-p" in url  # Petitioner marker
        assert "pin-s-r" in url  # Respondent marker
        assert "00AA00" in url  # Green for in-geofence
        assert "CC0000" in url  # Red for outside
    
    def test_map_dimensions_capped(self, monkeypatch):
        """Map dimensions should be capped at 1280."""
        monkeypatch.setattr("app.core.config.settings.MAPBOX_API_KEY", "test_key")
        
        url = GeolocationService.generate_static_map_url(
            center_lat=37.7749,
            center_lng=-122.4194,
            geofence_radius_meters=100,
            width=2000,
            height=2000
        )
        
        # Should be capped to 1280x1280
        assert "1280x1280" in url


class TestExchangeMapGeneration:
    """Tests for custody exchange map convenience method."""
    
    def test_exchange_map_with_both_parents(self, monkeypatch):
        """Map should include both parent check-in points."""
        monkeypatch.setattr("app.core.config.settings.MAPBOX_API_KEY", "test_key")
        
        url = GeolocationService.generate_exchange_map(
            exchange_location_lat=37.7749,
            exchange_location_lng=-122.4194,
            geofence_radius=100,
            from_parent_lat=37.7748,
            from_parent_lng=-122.4193,
            from_parent_in_geofence=True,
            to_parent_lat=37.7751,
            to_parent_lng=-122.4196,
            to_parent_in_geofence=True,
            petitioner_is_from=True
        )
        
        assert url is not None
        assert "pin-s-p" in url  # Petitioner (from parent)
        assert "pin-s-r" in url  # Respondent (to parent)
    
    def test_exchange_map_single_parent(self, monkeypatch):
        """Map should work with only one parent checked in."""
        monkeypatch.setattr("app.core.config.settings.MAPBOX_API_KEY", "test_key")
        
        url = GeolocationService.generate_exchange_map(
            exchange_location_lat=37.7749,
            exchange_location_lng=-122.4194,
            geofence_radius=100,
            from_parent_lat=37.7748,
            from_parent_lng=-122.4193,
            from_parent_in_geofence=True,
            # to_parent not provided
            petitioner_is_from=True
        )
        
        assert url is not None
        assert "pin-s-p" in url  # Only petitioner marker

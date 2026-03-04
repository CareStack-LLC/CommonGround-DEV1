"""
Centralized timezone utilities for CommonGround.

All datetime handling should use these utilities to ensure consistency:
- Database stores naive UTC datetimes
- API accepts/returns ISO 8601 strings (UTC)
- Frontend handles conversion to/from user's timezone
"""

from datetime import datetime, timezone
from typing import Optional

try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except ImportError:
    from backports.zoneinfo import ZoneInfo  # Fallback for older Python


# Valid US timezone identifiers
VALID_TIMEZONES = [
    "America/New_York",      # Eastern Time
    "America/Chicago",       # Central Time
    "America/Denver",        # Mountain Time
    "America/Los_Angeles",   # Pacific Time
    "America/Anchorage",     # Alaska Time
    "Pacific/Honolulu",      # Hawaii Time
]

DEFAULT_TIMEZONE = "America/Los_Angeles"


def utc_now() -> datetime:
    """
    Get current UTC time as naive datetime.

    Use this instead of datetime.utcnow() for consistency.
    Note: datetime.utcnow() is deprecated in Python 3.12+
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def strip_tz(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Convert timezone-aware datetime to naive UTC datetime.

    Use when receiving datetimes from API requests that may have
    timezone information attached.

    Args:
        dt: A datetime object (may or may not have tzinfo)

    Returns:
        Naive datetime in UTC, or None if input was None
    """
    if dt is None:
        return None
    if dt.tzinfo is not None:
        utc_dt = dt.astimezone(timezone.utc)
        return utc_dt.replace(tzinfo=None)
    return dt


def to_utc_naive(dt: datetime, from_tz: str) -> datetime:
    """
    Convert a naive datetime from a specific timezone to naive UTC.

    Use when a user enters a time in their local timezone and
    you need to store it as UTC.

    Args:
        dt: Naive datetime representing local time
        from_tz: IANA timezone identifier (e.g., "America/Los_Angeles")

    Returns:
        Naive datetime in UTC

    Example:
        # User in LA enters 6:30 PM on Jan 15
        la_time = datetime(2024, 1, 15, 18, 30)
        utc_time = to_utc_naive(la_time, "America/Los_Angeles")
        # Result: datetime(2024, 1, 16, 2, 30) - next day in UTC
    """
    if dt.tzinfo is not None:
        raise ValueError("Expected naive datetime, got timezone-aware datetime")

    tz = ZoneInfo(from_tz)
    local_dt = dt.replace(tzinfo=tz)
    utc_dt = local_dt.astimezone(timezone.utc)
    return utc_dt.replace(tzinfo=None)


def from_utc_naive(dt: datetime, to_tz: str) -> datetime:
    """
    Convert naive UTC datetime to a specific timezone (still naive).

    Use for display purposes when you need the local time value.

    Args:
        dt: Naive datetime in UTC
        to_tz: IANA timezone identifier (e.g., "America/New_York")

    Returns:
        Naive datetime in the target timezone

    Example:
        # UTC time is 2:30 AM on Jan 16
        utc_time = datetime(2024, 1, 16, 2, 30)
        ny_time = from_utc_naive(utc_time, "America/New_York")
        # Result: datetime(2024, 1, 15, 21, 30) - 9:30 PM previous day
    """
    if dt.tzinfo is not None:
        raise ValueError("Expected naive datetime, got timezone-aware datetime")

    utc_dt = dt.replace(tzinfo=timezone.utc)
    tz = ZoneInfo(to_tz)
    local_dt = utc_dt.astimezone(tz)
    return local_dt.replace(tzinfo=None)


def validate_timezone(tz: str) -> bool:
    """
    Check if timezone identifier is in our supported list.

    Args:
        tz: IANA timezone identifier

    Returns:
        True if valid, False otherwise
    """
    return tz in VALID_TIMEZONES


def format_for_api(dt: Optional[datetime]) -> Optional[str]:
    """
    Format datetime for API response.

    Returns ISO 8601 string with Z suffix to indicate UTC.

    Args:
        dt: Naive datetime (assumed UTC)

    Returns:
        ISO 8601 string like "2024-01-15T18:30:00Z", or None
    """
    if dt is None:
        return None
    return dt.isoformat() + "Z"


def parse_from_api(dt_string: Optional[str]) -> Optional[datetime]:
    """
    Parse datetime string from API request.

    Handles ISO 8601 strings with or without timezone info.
    Always returns naive UTC datetime.

    Args:
        dt_string: ISO 8601 datetime string

    Returns:
        Naive datetime in UTC, or None
    """
    if dt_string is None:
        return None

    # Parse the string - fromisoformat handles Z and +00:00
    dt_string = dt_string.replace("Z", "+00:00")
    dt = datetime.fromisoformat(dt_string)

    # Convert to UTC and strip timezone
    return strip_tz(dt)

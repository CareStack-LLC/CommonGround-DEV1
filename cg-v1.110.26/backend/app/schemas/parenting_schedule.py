"""
Parenting Schedule Schema - Extraction data structures for agreement activation.

Defines structured data formats for extracting parenting time, logistics,
and expense information from SharedCare Agreement sections.
"""

from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field
from enum import Enum


# =============================================================================
# Enums for Schedule Patterns and Settings
# =============================================================================

class SchedulePattern(str, Enum):
    """Common custody schedule patterns."""
    WEEK_ON_WEEK_OFF = "week_on_week_off"
    TWO_TWO_THREE = "2-2-3"
    EVERY_OTHER_WEEKEND = "every_other_weekend"
    EVERY_WEEKEND = "every_weekend"
    ALTERNATING_WEEKS = "alternating_weeks"
    FIVE_TWO_TWO_FIVE = "5-2-2-5"
    CUSTOM = "custom"


class PrimaryResidence(str, Enum):
    """Primary residence designation."""
    PARENT_A = "parent_a"
    PARENT_B = "parent_b"
    EQUAL = "equal"


class DayOfWeek(str, Enum):
    """Days of the week for transitions."""
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"


class ExchangeLocationType(str, Enum):
    """Types of exchange locations."""
    SCHOOL = "school"
    PARENT_A_HOME = "parent_a_home"
    PARENT_B_HOME = "parent_b_home"
    NEUTRAL_LOCATION = "neutral_location"
    DAYCARE = "daycare"
    POLICE_STATION = "police_station"


class TransportationResponsibility(str, Enum):
    """Who handles transportation for exchanges."""
    PICKING_UP_PARENT = "picking_up_parent"
    DROPPING_OFF_PARENT = "dropping_off_parent"
    SHARED = "shared"
    ALTERNATE = "alternate"


class SplitRatio(str, Enum):
    """Common expense split ratios."""
    FIFTY_FIFTY = "50/50"
    SIXTY_FORTY = "60/40"
    SEVENTY_THIRTY = "70/30"
    EIGHTY_TWENTY = "80/20"
    INCOME_BASED = "income_based"
    CUSTOM = "custom"


# =============================================================================
# Extraction Data Classes
# =============================================================================

class ParentingTimeData(BaseModel):
    """
    Structured data extracted from parenting_time section.

    Used to create recurring CustodyExchange records.
    """
    primary_residence: str = Field(
        description="Which parent has primary residence (parent_a, parent_b, equal)"
    )
    schedule_pattern: str = Field(
        description="Schedule pattern (week_on_week_off, 2-2-3, every_other_weekend, custom)"
    )
    custom_pattern_description: Optional[str] = Field(
        None,
        description="Description if pattern is 'custom'"
    )
    transition_day: str = Field(
        description="Day of week for transitions (Monday, Tuesday, etc.)"
    )
    transition_time: str = Field(
        description="Time for transitions (e.g., '6:00 PM', 'after school')"
    )
    schedule_notes: Optional[str] = Field(
        None,
        description="Additional notes about the schedule"
    )


class LogisticsData(BaseModel):
    """
    Structured data extracted from logistics_transitions section.

    Used to set default exchange locations and transportation rules.
    """
    exchange_location: str = Field(
        description="Type of exchange location (school, parent_a_home, neutral_location)"
    )
    exchange_location_address: Optional[str] = Field(
        None,
        description="Specific address if neutral_location"
    )
    transportation_responsibility: str = Field(
        description="Who handles transportation (picking_up_parent, dropping_off_parent, shared)"
    )
    transition_communication: str = Field(
        default="commonground",
        description="Communication method for logistics"
    )
    backup_plan: Optional[str] = Field(
        None,
        description="Backup plan if primary fails"
    )


class ExpenseData(BaseModel):
    """
    Structured data extracted from expenses_financial section.

    Used to set default split ratio for ClearFund obligations.
    """
    expense_categories: List[str] = Field(
        default_factory=lambda: ["medical", "education"],
        description="Categories of shared expenses"
    )
    split_ratio: str = Field(
        default="50/50",
        description="How expenses are split (50/50, 60/40, income_based, custom)"
    )
    custom_split_details: Optional[str] = Field(
        None,
        description="Details if split is 'custom'"
    )
    reimbursement_window: str = Field(
        default="30_days",
        description="Days for reimbursement (14_days, 30_days, 60_days)"
    )
    documentation_required: bool = Field(
        default=True,
        description="Whether receipts/documentation required"
    )
    payment_method: str = Field(
        default="commonground_clearfund",
        description="Preferred payment method"
    )


class ChildSupportData(BaseModel):
    """
    Structured data extracted from section_10_child_support.

    Used to create recurring ClearFund obligations for child support payments.
    """
    has_support: bool = Field(
        default=False,
        description="Whether child support is specified"
    )
    payer_parent_role: Optional[str] = Field(
        None,
        description="Which parent pays (parent_a or parent_b)"
    )
    receiver_parent_role: Optional[str] = Field(
        None,
        description="Which parent receives (parent_a or parent_b)"
    )
    amount: Optional[float] = Field(
        None,
        description="Payment amount"
    )
    frequency: str = Field(
        default="monthly",
        description="Payment frequency (weekly, biweekly, semimonthly, monthly)"
    )
    due_day: Optional[int] = Field(
        None,
        ge=1,
        le=28,
        description="Day of month for payment (1-28)"
    )
    payment_method: Optional[str] = Field(
        None,
        description="Preferred payment method"
    )


class ActivationResult(BaseModel):
    """Result of agreement activation processing."""
    exchanges_created: int = 0
    split_ratio_set: bool = False
    exchange_location_set: bool = False
    recurring_obligations_created: int = 0
    obligation_instances_created: int = 0
    errors: List[str] = Field(default_factory=list)


# =============================================================================
# Schedule Pattern Mapping
# =============================================================================

SCHEDULE_PATTERN_MAPPING: Dict[str, Dict[str, Any]] = {
    SchedulePattern.WEEK_ON_WEEK_OFF.value: {
        "recurrence_pattern": "biweekly",
        "exchanges_per_period": 1,
        "period_days": 14,
        "description": "Weekly alternating custody - one exchange every two weeks",
        "typical_exchange_days": ["Sunday"],  # Transition on Sunday evening
    },
    SchedulePattern.TWO_TWO_THREE.value: {
        "recurrence_pattern": "weekly",
        "exchanges_per_period": 3,
        "period_days": 7,
        "description": "2-2-3 rotation - exchanges Mon, Wed, Fri",
        "typical_exchange_days": ["Monday", "Wednesday", "Friday"],
    },
    SchedulePattern.EVERY_OTHER_WEEKEND.value: {
        "recurrence_pattern": "biweekly",
        "exchanges_per_period": 2,
        "period_days": 14,
        "description": "Every other weekend - Fri pickup, Sun dropoff",
        "typical_exchange_days": ["Friday", "Sunday"],
    },
    SchedulePattern.FIVE_TWO_TWO_FIVE.value: {
        "recurrence_pattern": "biweekly",
        "exchanges_per_period": 2,
        "period_days": 14,
        "description": "5-2-2-5 pattern - similar to every other weekend with midweek",
        "typical_exchange_days": ["Wednesday", "Friday"],
    },
    SchedulePattern.ALTERNATING_WEEKS.value: {
        "recurrence_pattern": "weekly",
        "exchanges_per_period": 1,
        "period_days": 7,
        "description": "Alternating full weeks",
        "typical_exchange_days": ["Sunday"],
    },
    SchedulePattern.CUSTOM.value: {
        "recurrence_pattern": "custom",
        "exchanges_per_period": None,
        "period_days": None,
        "description": "Custom schedule requiring manual configuration",
        "typical_exchange_days": [],
    },
}


# =============================================================================
# Helper Functions
# =============================================================================

def parse_split_ratio(ratio_str: str) -> Tuple[int, int]:
    """
    Parse split ratio string to (parent_a_percentage, parent_b_percentage).

    Examples:
        "50/50" -> (50, 50)
        "60/40" -> (60, 40)
        "income_based" -> (50, 50)  # Default, should be calculated
    """
    if "/" in ratio_str:
        parts = ratio_str.split("/")
        try:
            return int(parts[0]), int(parts[1])
        except (ValueError, IndexError):
            return 50, 50
    elif ratio_str == "income_based":
        return 50, 50  # Default, actual ratio set by agreement section
    else:
        return 50, 50  # Default equal split


def get_day_number(day: str) -> int:
    """
    Convert day name to Python weekday number (0=Monday, 6=Sunday).

    Args:
        day: Day name like "Monday", "Tuesday", etc.

    Returns:
        Integer 0-6 representing the weekday
    """
    mapping = {
        "Monday": 0,
        "Tuesday": 1,
        "Wednesday": 2,
        "Thursday": 3,
        "Friday": 4,
        "Saturday": 5,
        "Sunday": 6,
    }
    return mapping.get(day, 6)  # Default to Sunday


def get_recurrence_days_for_pattern(
    pattern: str,
    transition_day: str
) -> List[int]:
    """
    Get the recurrence_days list for a schedule pattern.

    Args:
        pattern: Schedule pattern string
        transition_day: The primary transition day

    Returns:
        List of day numbers for recurrence (1-indexed: 1=Sun, 2=Mon, ..., 7=Sat)
    """
    pattern_info = SCHEDULE_PATTERN_MAPPING.get(pattern, {})
    typical_days = pattern_info.get("typical_exchange_days", [])

    if not typical_days:
        # Use the specified transition day
        typical_days = [transition_day]

    # Convert to 1-indexed format used by custody_exchange
    # (0=Sun in JS, but custody_exchange uses 1=Sun, 2=Mon, etc.)
    result = []
    for day in typical_days:
        py_day = get_day_number(day)
        # Convert Python (0=Mon, 6=Sun) to recurrence_days (0=Sun, 1=Mon, 6=Sat)
        recurrence_day = (py_day + 1) % 7
        result.append(recurrence_day)

    return result


def parse_transition_time(time_str: str) -> Tuple[int, int]:
    """
    Parse time string to (hour, minute) in 24-hour format.

    Args:
        time_str: Time string like "6:00 PM", "after school", "18:00"

    Returns:
        Tuple of (hour, minute) in 24-hour format
    """
    time_str = time_str.strip().lower()

    # Handle common phrases
    if "after school" in time_str:
        return (15, 30)  # 3:30 PM
    if "before school" in time_str:
        return (7, 30)   # 7:30 AM
    if "morning" in time_str:
        return (9, 0)    # 9:00 AM
    if "evening" in time_str:
        return (18, 0)   # 6:00 PM
    if "noon" in time_str:
        return (12, 0)   # 12:00 PM

    # Try to parse time formats
    time_str = time_str.upper()

    try:
        # Handle "6:00 PM" or "6:00PM" format
        if "PM" in time_str or "AM" in time_str:
            is_pm = "PM" in time_str
            time_part = time_str.replace("PM", "").replace("AM", "").strip()

            if ":" in time_part:
                parts = time_part.split(":")
                hour = int(parts[0])
                minute = int(parts[1])
            else:
                hour = int(time_part)
                minute = 0

            if is_pm and hour != 12:
                hour += 12
            elif not is_pm and hour == 12:
                hour = 0

            return (hour, minute)

        # Handle "18:00" format
        elif ":" in time_str:
            parts = time_str.split(":")
            return (int(parts[0]), int(parts[1]))

    except (ValueError, IndexError):
        pass

    # Default to 6:00 PM
    return (18, 0)

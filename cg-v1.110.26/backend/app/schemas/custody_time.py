"""
Pydantic schemas for Custody Time tracking API.

Defines request/response models for custody statistics and parenting reports.
"""

from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class TimePeriod(str, Enum):
    """Rolling time periods for custody statistics."""
    THIRTY_DAYS = "30_days"
    NINETY_DAYS = "90_days"
    YEAR_TO_DATE = "ytd"
    ALL_TIME = "all_time"


class DeterminationMethod(str, Enum):
    """How custody was determined for a day."""
    SCHEDULED = "scheduled"
    CHECK_IN = "check_in"
    EXCHANGE_COMPLETED = "exchange_completed"
    MANUAL_OVERRIDE = "manual_override"
    BACKFILLED = "backfilled"


# =============================================================================
# Response Models
# =============================================================================

class ParentCustodyStats(BaseModel):
    """Statistics for a single parent."""
    user_id: str
    days: int
    percentage: float


class AgreedScheduleInfo(BaseModel):
    """Information about agreed custody schedule."""
    pattern: Optional[str] = None
    parent_a_percentage: int = 50
    parent_b_percentage: int = 50


class CustodyVariance(BaseModel):
    """Variance between actual and agreed custody."""
    parent_a: float
    parent_b: float


class PeriodInfo(BaseModel):
    """Date range information."""
    start_date: str
    end_date: str
    total_days: Optional[int] = None


class ChildCustodyStatsResponse(BaseModel):
    """Custody statistics for a single child."""
    child_id: str
    child_name: str
    period: PeriodInfo
    total_days: int
    recorded_days: int
    unknown_days: int
    parent_a: ParentCustodyStats
    parent_b: ParentCustodyStats
    agreed_schedule: AgreedScheduleInfo
    variance: CustodyVariance
    comparison_summary: str


class FamilyCustodyStatsResponse(BaseModel):
    """Custody statistics for all children in a family."""
    family_file_id: str
    period: PeriodInfo
    parent_a_id: str
    parent_b_id: str
    children: List[ChildCustodyStatsResponse]
    summary: str


class ExchangeStats(BaseModel):
    """Exchange statistics for parenting report."""
    total_scheduled: int
    completed: int
    missed: int
    completion_rate: float


class EventStats(BaseModel):
    """Event statistics for parenting report."""
    total_events: int
    by_category: Dict[str, int]


class ExpenseStats(BaseModel):
    """Expense statistics for parenting report."""
    total_expenses: int
    total_amount: float
    approved_count: int


class ParentingReportResponse(BaseModel):
    """Complete parenting report response."""
    family_file_id: str
    generated_at: str
    generated_by: str
    report_period: PeriodInfo
    custody_time: FamilyCustodyStatsResponse
    exchanges: ExchangeStats
    events: EventStats
    expenses: ExpenseStats


class CustodyDayRecordResponse(BaseModel):
    """Response for a single custody day record."""
    id: str
    family_file_id: str
    child_id: str
    record_date: str
    custodial_parent_id: Optional[str] = None
    determination_method: str
    confidence_score: Optional[int] = None
    is_disputed: bool = False
    created_at: str
    updated_at: str


# =============================================================================
# Request Models
# =============================================================================

class CustodyOverrideRequest(BaseModel):
    """Request to manually override custody for a day."""
    child_id: str = Field(..., description="Child ID to override custody for")
    parent_id: str = Field(..., description="Parent ID who now has custody")
    record_date: Optional[str] = Field(
        None,
        description="Date to override (YYYY-MM-DD). Defaults to today."
    )
    reason: Optional[str] = Field(
        None,
        max_length=500,
        description="Reason for override"
    )


class BackfillRequest(BaseModel):
    """Request to backfill custody records from schedule."""
    start_date: str = Field(..., description="Start date for backfill (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date for backfill (YYYY-MM-DD)")
    child_ids: Optional[List[str]] = Field(
        None,
        description="Specific child IDs to backfill. If None, backfills all children."
    )


class BackfillResponse(BaseModel):
    """Response from backfill operation."""
    family_file_id: str
    records_created: int
    start_date: str
    end_date: str


# =============================================================================
# Query Parameters
# =============================================================================

class CustodyStatsQuery(BaseModel):
    """Query parameters for custody stats."""
    period: Optional[TimePeriod] = Field(
        TimePeriod.THIRTY_DAYS,
        description="Rolling period for statistics"
    )
    start_date: Optional[str] = Field(
        None,
        description="Custom start date (overrides period)"
    )
    end_date: Optional[str] = Field(
        None,
        description="Custom end date (overrides period)"
    )

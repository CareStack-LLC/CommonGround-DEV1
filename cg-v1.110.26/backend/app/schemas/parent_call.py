"""Parent Call schemas for request/response validation."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CallSessionCreate(BaseModel):
    """Create a new parent call session."""

    family_file_id: str = Field(..., min_length=1, max_length=100)
    call_type: str = Field(default="video", max_length=20)
    aria_sensitivity_level: str = Field(
        default="moderate",
        pattern="^(strict|moderate|relaxed|off)$",
        description="ARIA sensitivity level: strict, moderate, relaxed, or off"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "family_file_id": "ff-123456",
                "call_type": "video",
                "aria_sensitivity_level": "moderate"
            }
        }


class CallSessionJoin(BaseModel):
    """Join an existing call session."""

    user_name: str = Field(..., min_length=1, max_length=100)

    class Config:
        json_schema_extra = {
            "example": {
                "user_name": "Parent A"
            }
        }


class CallSessionJoinResponse(BaseModel):
    """Response after joining a call."""

    session_id: str
    room_url: str
    token: str
    call_type: str
    status: str


class TranscriptChunkCreate(BaseModel):
    """Transcript chunk from Daily.co webhook."""

    speaker_id: str
    speaker_name: str
    content: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    start_time: float  # seconds from call start
    end_time: float


class ARIASettingsUpdate(BaseModel):
    """Update ARIA sensitivity settings for a call session."""

    sensitivity_level: str = Field(
        ...,
        pattern="^(strict|moderate|relaxed|off)$",
        description="ARIA sensitivity level: strict, moderate, relaxed, or off"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "sensitivity_level": "moderate"
            }
        }


class CallSessionResponse(BaseModel):
    """Response model for call session."""

    id: str
    family_file_id: str
    room_id: str
    parent_a_id: str
    parent_b_id: Optional[str]
    call_type: str
    status: str
    daily_room_name: str
    daily_room_url: str
    initiated_by: str
    initiated_at: datetime
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    joined_at: Optional[datetime]
    duration_seconds: Optional[int]
    recording_url: Optional[str]
    transcript_url: Optional[str]
    aria_active: bool
    aria_intervention_count: int
    aria_terminated_call: bool
    aria_sensitivity_level: str = "moderate"
    aria_sensitivity_threshold: float = 0.5
    max_duration_minutes: Optional[int]

    class Config:
        from_attributes = True


class CallFlagResponse(BaseModel):
    """Response model for call flag."""

    id: str
    session_id: str
    transcript_chunk_id: Optional[str]
    flag_type: str
    toxicity_score: float
    severity: str
    categories: List[str]
    intervention_taken: bool
    intervention_type: Optional[str]
    intervention_message: str
    flagged_at: datetime
    call_time_seconds: Optional[float] = None
    offending_speaker_id: Optional[str] = None
    mute_duration_seconds: Optional[float] = None

    class Config:
        from_attributes = True


class CallReportResponse(BaseModel):
    """Comprehensive call report for court."""

    session_id: str
    duration_seconds: int
    total_chunks: int
    flags_count: int
    overall_toxicity_score: float
    category_breakdown: Dict[str, int]
    severe_violations: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    intervention_summary: Dict[str, int]
    recommendations: List[str]
    generated_at: datetime


class CallARIAAnalysisResponse(BaseModel):
    """ARIA analysis summary for a call."""

    session_id: str
    aria_active: bool
    intervention_count: int
    call_terminated: bool
    flags: List[CallFlagResponse]
    overall_score: float
    recommendations: List[str]

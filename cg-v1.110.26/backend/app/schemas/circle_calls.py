"""Circle Call schemas for request/response validation."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CircleCallCreate(BaseModel):
    """Create a new circle call session (bidirectional)."""

    circle_contact_id: str = Field(..., min_length=1, max_length=100)
    child_id: str = Field(..., min_length=1, max_length=100)
    call_type: str = Field(default="video", max_length=20)

    class Config:
        json_schema_extra = {
            "example": {
                "circle_contact_id": "contact-123456",
                "child_id": "child-123456",
                "call_type": "video"
            }
        }


class CircleCallJoin(BaseModel):
    """Join an existing circle call session."""

    user_name: str = Field(..., min_length=1, max_length=100)

    class Config:
        json_schema_extra = {
            "example": {
                "user_name": "Emma"
            }
        }


class CircleCallJoinResponse(BaseModel):
    """Response after joining a circle call."""

    session_id: str
    room_url: str
    token: str
    call_type: str
    status: str


class CircleCallSessionResponse(BaseModel):
    """Response model for circle call session."""

    id: str
    family_file_id: str
    room_id: str
    circle_contact_id: str
    circle_contact_name: str
    child_id: str
    child_name: str
    call_type: str
    status: str
    daily_room_name: str
    daily_room_url: str
    initiated_by_id: str
    initiated_by_type: str  # "circle_contact" or "child"
    initiated_at: datetime
    joined_at: Optional[datetime]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    recording_url: Optional[str]
    transcript_storage_path: Optional[str]
    aria_active: bool
    aria_intervention_count: int
    aria_terminated_call: bool
    aria_threshold: float
    overall_safety_score: Optional[float]
    permission_snapshot: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class CircleCallTranscriptChunkCreate(BaseModel):
    """Transcript chunk from Daily.co webhook."""

    speaker_id: str
    speaker_name: str
    speaker_type: str  # "circle_contact" or "child"
    content: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    start_time: float  # seconds from call start
    end_time: float


class CircleCallFlagResponse(BaseModel):
    """Response model for circle call safety flag."""

    id: str
    session_id: str
    transcript_chunk_id: Optional[str]
    flag_type: str
    toxicity_score: float
    severity: str  # "low", "medium", "high", "severe"
    categories: List[str]  # ["inappropriate_content", "stranger_danger", etc.]
    triggers: List[str]  # Specific phrases that triggered the flag
    intervention_taken: bool
    intervention_type: Optional[str]  # "warning", "mute", "terminate"
    intervention_message: str
    flagged_at: datetime
    call_time_seconds: Optional[float]
    offending_speaker_id: Optional[str]
    offending_speaker_type: Optional[str]

    class Config:
        from_attributes = True


class CircleCallReportResponse(BaseModel):
    """Comprehensive circle call report for parents/court."""

    session_id: str
    circle_contact_name: str
    child_name: str
    call_type: str
    duration_seconds: int
    initiated_by_type: str
    total_transcript_chunks: int
    flags_count: int
    safety_rating: str  # "safe", "minor_concerns", "concerning", "unsafe"
    category_counts: Dict[str, int]
    severe_count: int
    high_count: int
    flags: List[Dict[str, Any]]
    permission_snapshot: Dict[str, Any]
    generated_at: datetime


class CircleCallSafetySummaryResponse(BaseModel):
    """ARIA safety summary for a circle call."""

    session_id: str
    aria_active: bool
    intervention_count: int
    call_terminated: bool
    aria_threshold: float
    flags: List[CircleCallFlagResponse]
    safety_rating: str
    recommendations: List[str]


class CircleCallHistoryResponse(BaseModel):
    """Summary response for call history list."""

    id: str
    circle_contact_name: str
    child_name: str
    call_type: str
    status: str
    initiated_by_type: str
    initiated_at: datetime
    duration_seconds: Optional[int]
    aria_intervention_count: int
    aria_terminated_call: bool
    has_recording: bool

    class Config:
        from_attributes = True

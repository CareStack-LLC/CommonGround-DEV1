"""
Pydantic schemas for the Aria customer success chatbot.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ── Public Request/Response Schemas ──────────────────────────────────

class ChatbotStartSessionRequest(BaseModel):
    source_page: Optional[str] = None


class ChatbotStartSessionResponse(BaseModel):
    session_id: str
    greeting: str


class ChatbotSendMessageRequest(BaseModel):
    session_id: str
    content: str = Field(..., max_length=2000)


class ChatbotSendMessageResponse(BaseModel):
    message_id: str
    reply: str


class ChatbotUpdateVisitorRequest(BaseModel):
    session_id: str
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)


class ChatbotUpdateVisitorResponse(BaseModel):
    success: bool


class ChatbotEscalateRequest(BaseModel):
    session_id: str
    reason: Optional[str] = None


class ChatbotEscalateResponse(BaseModel):
    success: bool
    message: str


# ── Admin Schemas ────────────────────────────────────────────────────

class ChatbotMessageItem(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatbotSessionListItem(BaseModel):
    id: str
    visitor_name: Optional[str] = None
    visitor_email: Optional[str] = None
    status: str
    message_count: int
    started_at: datetime
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatbotVisitorInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source_page: Optional[str] = None

    class Config:
        from_attributes = True


class ChatbotSessionDetail(BaseModel):
    id: str
    visitor: ChatbotVisitorInfo
    status: str
    message_count: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    escalation_reason: Optional[str] = None
    transcript_emailed: bool
    messages: List[ChatbotMessageItem]


class ChatbotAdminStats(BaseModel):
    total_sessions: int
    active_today: int
    avg_messages_per_session: float
    escalation_rate: float
    total_visitors: int


class ChatbotSessionsListResponse(BaseModel):
    sessions: List[ChatbotSessionListItem]
    total: int
    page: int
    per_page: int

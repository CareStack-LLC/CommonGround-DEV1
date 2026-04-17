"""Pydantic schemas for the Wave 3 C2 chores feature."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class ChoreCreate(BaseModel):
    family_file_id: str
    child_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    reward_amount: Optional[Decimal] = Field(None, ge=0, le=1000)
    due_at: Optional[datetime] = None


class ChoreUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    reward_amount: Optional[Decimal] = Field(None, ge=0, le=1000)
    due_at: Optional[datetime] = None


class ChoreRejectRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class ChoreResponse(BaseModel):
    id: str
    family_file_id: str
    child_id: str
    assigned_by: str
    title: str
    description: Optional[str]
    reward_amount: Optional[Decimal]
    status: str
    due_at: Optional[datetime]
    completed_at: Optional[datetime]
    approved_at: Optional[datetime]
    approved_by: Optional[str]
    rejection_reason: Optional[str]
    reward_credited: bool
    completion_photo_url: Optional[str] = None
    completion_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

"""Pydantic schemas for the Wave 3 C3 rewards store."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class RewardCreate(BaseModel):
    family_file_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    cost_amount: Decimal = Field(..., gt=0, le=10000)
    image_emoji: Optional[str] = Field(None, max_length=10)
    stock_limit: Optional[int] = Field(None, ge=0)


class RewardUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    cost_amount: Optional[Decimal] = Field(None, gt=0, le=10000)
    image_emoji: Optional[str] = Field(None, max_length=10)
    stock_limit: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class RewardResponse(BaseModel):
    id: str
    family_file_id: str
    title: str
    description: Optional[str]
    cost_amount: Decimal
    image_emoji: Optional[str]
    stock_limit: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RewardRedemptionCreate(BaseModel):
    reward_id: str
    # child_id is resolved from the child-auth token — callers don't send it.


class RewardRedemptionResponse(BaseModel):
    id: str
    reward_id: str
    child_id: str
    family_file_id: str
    cost_at_redemption: Decimal
    status: str
    wallet_transaction_id: Optional[str]
    fulfilled_by: Optional[str]
    fulfilled_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

"""
KidsCubbie Schemas - Pydantic models for cubbie API.

Cubbie items are high-value items that travel with children between homes.
Examples: Nintendo Switch, school laptops, tablets, musical instruments.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class ItemCategory(str, Enum):
    """Categories for cubbie items."""
    ELECTRONICS = "electronics"
    SCHOOL = "school"
    SPORTS = "sports"
    MEDICAL = "medical"
    MUSICAL = "musical"
    OTHER = "other"


class ItemLocation(str, Enum):
    """Current location of an item."""
    PARENT_A = "parent_a"
    PARENT_B = "parent_b"
    CHILD_TRAVELING = "child_traveling"


class ItemCondition(str, Enum):
    """Condition of an item."""
    EXCELLENT = "excellent"
    GOOD = "good"
    MINOR_WEAR = "minor_wear"
    NEEDS_REPAIR = "needs_repair"


# === CUBBIE ITEM SCHEMAS ===

class CubbieItemBase(BaseModel):
    """Base cubbie item fields."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category: ItemCategory = ItemCategory.OTHER
    estimated_value: Optional[Decimal] = Field(None, ge=0, le=99999.99)
    purchase_date: Optional[date] = None
    serial_number: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate and clean item name."""
        if not v or not v.strip():
            raise ValueError("Item name is required")
        return v.strip()


class CubbieItemCreate(CubbieItemBase):
    """Create cubbie item request."""
    child_id: str = Field(..., min_length=36, max_length=36)
    current_location: ItemLocation = ItemLocation.PARENT_A


class CubbieItemUpdate(BaseModel):
    """Update cubbie item request."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[ItemCategory] = None
    estimated_value: Optional[Decimal] = Field(None, ge=0, le=99999.99)
    purchase_date: Optional[date] = None
    serial_number: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=1000)
    current_location: Optional[ItemLocation] = None
    is_active: Optional[bool] = None


class CubbieItemResponse(CubbieItemBase):
    """Cubbie item response."""
    id: str
    child_id: str
    case_id: Optional[str] = None
    family_file_id: Optional[str] = None
    photo_url: Optional[str] = None
    added_by: str
    is_active: bool
    current_location: str
    last_location_update: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CubbieItemWithChild(CubbieItemResponse):
    """Cubbie item with child name for display."""
    child_name: str


# === CUBBIE EXCHANGE ITEM SCHEMAS ===

class CubbieExchangeItemCreate(BaseModel):
    """Add items to an exchange."""
    cubbie_item_ids: list[str] = Field(..., min_items=1, max_items=20)
    condition_sent: Optional[ItemCondition] = None


class CubbieExchangeItemAcknowledge(BaseModel):
    """Acknowledge receipt of an item."""
    condition_received: Optional[ItemCondition] = None
    condition_notes: Optional[str] = Field(None, max_length=500)


class CubbieExchangeItemDispute(BaseModel):
    """Flag an item as disputed."""
    dispute_notes: str = Field(..., min_length=10, max_length=1000)


class CubbieExchangeItemResponse(BaseModel):
    """Exchange item response."""
    id: str
    exchange_id: str
    cubbie_item_id: str
    item_name: str
    item_photo_url: Optional[str] = None
    sent_by: str
    sent_at: datetime
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    condition_sent: Optional[str] = None
    condition_received: Optional[str] = None
    condition_notes: Optional[str] = None
    photo_sent_url: Optional[str] = None
    photo_received_url: Optional[str] = None
    is_disputed: bool = False
    dispute_notes: Optional[str] = None
    dispute_resolved: bool = False
    dispute_resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# === CHILD PHOTO SCHEMAS ===

class ChildPhotoCreate(BaseModel):
    """Create child photo request."""
    photo_url: str = Field(..., max_length=500)
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    caption: Optional[str] = Field(None, max_length=500)
    is_profile_photo: bool = False
    taken_at: Optional[date] = None


class ChildPhotoResponse(BaseModel):
    """Child photo response."""
    id: str
    child_id: str
    uploaded_by: str
    photo_url: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    is_profile_photo: bool
    taken_at: Optional[date] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# === LIST RESPONSES ===

class CubbieItemListResponse(BaseModel):
    """List of cubbie items for a child."""
    child_id: str
    child_name: str
    items: list[CubbieItemResponse]
    total_value: Decimal
    active_count: int


class ExchangeItemsResponse(BaseModel):
    """Items for an exchange."""
    exchange_id: str
    items: list[CubbieExchangeItemResponse]
    pending_acknowledgment: int
    disputed_count: int

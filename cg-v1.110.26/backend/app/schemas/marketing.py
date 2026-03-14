"""
Marketing schemas for newsletter and contact form endpoints.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class NewsletterSubscribeRequest(BaseModel):
    email: EmailStr
    source: Optional[str] = "website"


class NewsletterSubscribeResponse(BaseModel):
    success: bool
    message: str


class ContactFormRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    inquiry_type: str = Field(..., pattern="^(general|support|professional|court|partnership)$")
    subject: Optional[str] = Field(None, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)


class ContactFormResponse(BaseModel):
    success: bool
    message: str

"""
Marketing schemas for newsletter, contact form, early adopter, and professional interest endpoints.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class NewsletterSubscribeRequest(BaseModel):
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=100)
    source: Optional[str] = "website"


class NewsletterSubscribeResponse(BaseModel):
    success: bool
    message: str


class EarlyAdopterRequest(BaseModel):
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=100)
    source: str = Field(default="website", max_length=50)


class EarlyAdopterResponse(BaseModel):
    success: bool
    message: str


class ContactFormRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    inquiry_type: str = Field(..., pattern="^(general|support|professional|court|partnership|security)$")
    subject: Optional[str] = Field(None, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)


class ContactFormResponse(BaseModel):
    success: bool
    message: str


class ProfessionalInterestRequest(BaseModel):
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    role: str = Field(
        default="attorney",
        pattern="^(attorney|mediator|gal|therapist|paralegal|other)$",
    )
    firm_name: Optional[str] = Field(None, max_length=200)
    source: str = Field(default="professionals_page", max_length=50)


class ProfessionalInterestResponse(BaseModel):
    success: bool
    message: str

"""
Marketing endpoints for newsletter subscriptions and contact form submissions.
"""

import logging

from fastapi import APIRouter, status

from app.schemas.marketing import (
    NewsletterSubscribeRequest,
    NewsletterSubscribeResponse,
    ContactFormRequest,
    ContactFormResponse,
)
from app.services.email import email_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Inquiry type to internal email routing
INQUIRY_EMAIL_MAP = {
    "support": "support@find-commonground.com",
    "professional": "partnerships@find-commonground.com",
    "court": "partnerships@find-commonground.com",
    "partnership": "partnerships@find-commonground.com",
    "general": "hello@find-commonground.com",
}
DEFAULT_INTERNAL_EMAIL = "hello@find-commonground.com"


@router.post("/newsletter", response_model=NewsletterSubscribeResponse, status_code=status.HTTP_200_OK)
async def subscribe_newsletter(request: NewsletterSubscribeRequest):
    """
    Subscribe to the CommonGround newsletter.

    Sends a welcome email to the subscriber. No authentication required.

    Args:
        request: Newsletter subscription with email and optional source

    Returns:
        NewsletterSubscribeResponse with success status
    """
    try:
        await email_service.send_newsletter_welcome(request.email)
        logger.info(f"Newsletter subscription from {request.email} (source: {request.source})")
        return NewsletterSubscribeResponse(
            success=True,
            message="You've been subscribed to the CommonGround newsletter!"
        )
    except Exception as e:
        logger.error(f"Newsletter subscription failed for {request.email}: {str(e)}")
        return NewsletterSubscribeResponse(
            success=False,
            message="We couldn't process your subscription right now. Please try again later."
        )


@router.post("/contact", response_model=ContactFormResponse, status_code=status.HTTP_200_OK)
async def submit_contact_form(request: ContactFormRequest):
    """
    Submit a contact form inquiry.

    Routes the inquiry to the appropriate internal team based on inquiry_type
    and sends a confirmation email to the submitter. No authentication required.

    Routing:
        - "support" -> support@find-commonground.com
        - "professional" / "court" / "partnership" -> partnerships@find-commonground.com
        - "general" / default -> hello@find-commonground.com

    Args:
        request: Contact form data with name, email, inquiry type, subject, and message

    Returns:
        ContactFormResponse with success status
    """
    try:
        internal_email = INQUIRY_EMAIL_MAP.get(request.inquiry_type, DEFAULT_INTERNAL_EMAIL)

        # Send notification to internal team
        await email_service.send_contact_form_notification(
            name=request.name,
            email=request.email,
            inquiry_type=request.inquiry_type,
            subject=request.subject,
            message=request.message,
            internal_email=internal_email,
        )

        # Send confirmation to submitter
        await email_service.send_contact_form_confirmation(
            to_email=request.email,
            name=request.name,
        )

        logger.info(f"Contact form submitted by {request.email} (type: {request.inquiry_type})")
        return ContactFormResponse(
            success=True,
            message="Your message has been sent. We'll get back to you shortly!"
        )
    except Exception as e:
        logger.error(f"Contact form submission failed for {request.email}: {str(e)}")
        return ContactFormResponse(
            success=False,
            message="We couldn't send your message right now. Please try again later."
        )

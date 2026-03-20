"""
Marketing endpoints for newsletter subscriptions, contact form, early adopter,
and professional interest lead capture.
"""

import logging

from fastapi import APIRouter, status

from app.schemas.marketing import (
    NewsletterSubscribeRequest,
    NewsletterSubscribeResponse,
    EarlyAdopterRequest,
    EarlyAdopterResponse,
    ContactFormRequest,
    ContactFormResponse,
    ProfessionalInterestRequest,
    ProfessionalInterestResponse,
)
from app.services.email import email_service
from app.core.config import settings
from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)

router = APIRouter()

# Inquiry type to internal email routing
INQUIRY_EMAIL_MAP = {
    "support": "support@find-commonground.com",
    "professional": "partnerships@find-commonground.com",
    "court": "partnerships@find-commonground.com",
    "partnership": "partnerships@find-commonground.com",
    "security": "support@find-commonground.com",
    "onboarding": "onboarding@find-commonground.com",
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
        # Add to SendGrid Marketing Contacts newsletter list
        list_ids = []
        if settings.SENDGRID_NEWSLETTER_LIST_ID:
            list_ids = [settings.SENDGRID_NEWSLETTER_LIST_ID]

        await email_service.add_marketing_contact(
            email=request.email,
            first_name=request.first_name or "",
            list_ids=list_ids if list_ids else None,
            custom_fields={
                "e1_T": request.source or "website",  # signup_source
                "e7_T": "lead",                        # lifecycle_stage
            },
        )

        # Send welcome email
        await email_service.send_newsletter_welcome(request.email)
        logger.info(f"Newsletter subscription from {request.email} (source: {request.source})")
        return NewsletterSubscribeResponse(
            success=True,
            message="You've been subscribed to the CommonGround newsletter!"
        )
    except Exception as e:
        logger.error(f"Newsletter subscription failed for {request.email}: {str(e)}")
        capture_error(e)
        return NewsletterSubscribeResponse(
            success=False,
            message="We couldn't process your subscription right now. Please try again later."
        )


@router.post("/early-adopter", response_model=EarlyAdopterResponse, status_code=status.HTTP_200_OK)
async def early_adopter_signup(request: EarlyAdopterRequest):
    """
    Sign up for the CommonGround early adopter list.

    Adds the contact to the SendGrid Marketing Contacts 'Early Adopters' list
    and sends a welcome email. No authentication required.

    Args:
        request: Early adopter signup with email, optional first name, and source page

    Returns:
        EarlyAdopterResponse with success status
    """
    try:
        # Add to SendGrid Marketing Contacts list
        list_ids = []
        if settings.SENDGRID_EARLY_ADOPTER_LIST_ID:
            list_ids = [settings.SENDGRID_EARLY_ADOPTER_LIST_ID]

        await email_service.add_marketing_contact(
            email=request.email,
            first_name=request.first_name or "",
            list_ids=list_ids if list_ids else None,
            custom_fields={
                "e1_T": request.source or "website",  # signup_source
                "e2_T": "parent",                       # user_type
                "e7_T": "lead",                         # lifecycle_stage
            },
        )

        # Send welcome email
        display_name = request.first_name or "there"
        await email_service.send_early_adopter_welcome(request.email, display_name)

        # Notify growth team
        try:
            await email_service.send_growth_notification(
                event_type="Early Adopter Signup",
                email=request.email,
                name=request.first_name or "",
                details={"Source": request.source},
            )
        except Exception:
            logger.warning(f"Failed to send growth notification for early adopter {request.email}")

        logger.info(f"Early adopter signup: {request.email} (source: {request.source})")
        return EarlyAdopterResponse(
            success=True,
            message="You're on the list! We'll reach out soon with your exclusive early adopter offer."
        )
    except Exception as e:
        logger.error(f"Early adopter signup failed for {request.email}: {str(e)}")
        capture_error(e)
        return EarlyAdopterResponse(
            success=False,
            message="We couldn't process your signup right now. Please try again later."
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

        # Add to SendGrid Marketing Contacts leads list for CRM tracking
        lead_list_ids = []
        if settings.SENDGRID_LEADS_LIST_ID:
            lead_list_ids = [settings.SENDGRID_LEADS_LIST_ID]

        # Extract first and last name from full name
        name_parts = request.name.split() if request.name else []
        contact_first = name_parts[0] if name_parts else ""
        contact_last = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        # Determine user_type from inquiry_type
        contact_user_type = "professional" if request.inquiry_type in ("professional", "court", "partnership") else "parent"

        await email_service.add_marketing_contact(
            email=request.email,
            first_name=contact_first,
            last_name=contact_last,
            list_ids=lead_list_ids if lead_list_ids else None,
            custom_fields={
                "e1_T": f"contact_{request.inquiry_type}",  # signup_source
                "e2_T": contact_user_type,                    # user_type
                "e3_T": request.inquiry_type,                 # inquiry_type
                "e4_T": contact_last,                         # last_name
                "e7_T": "lead",                               # lifecycle_stage
            },
        )

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
        capture_error(e)
        return ContactFormResponse(
            success=False,
            message="We couldn't send your message right now. Please try again later."
        )


@router.post("/professional-interest", response_model=ProfessionalInterestResponse, status_code=status.HTTP_200_OK)
async def professional_interest_signup(request: ProfessionalInterestRequest):
    """
    Capture a professional's interest in CommonGround.

    Adds the contact to the SendGrid Marketing Contacts 'Professional Leads' list
    and sends a notification to the partnerships team. No authentication required.

    Args:
        request: Professional interest with email, name, role, and firm

    Returns:
        ProfessionalInterestResponse with success status
    """
    try:
        # Add to SendGrid Marketing Contacts professional list
        list_ids = []
        if settings.SENDGRID_PROFESSIONAL_LIST_ID:
            list_ids = [settings.SENDGRID_PROFESSIONAL_LIST_ID]

        full_name = " ".join(filter(None, [request.first_name, request.last_name]))

        await email_service.add_marketing_contact(
            email=request.email,
            first_name=request.first_name or "",
            last_name=request.last_name or "",
            list_ids=list_ids if list_ids else None,
            custom_fields={
                "e1_T": f"professional_{request.source}",  # signup_source
                "e2_T": "professional",                     # user_type
                "e3_T": request.role,                       # inquiry_type / role
                "e4_T": request.last_name or "",            # last_name
                "e5_T": request.firm_name or "",            # firm_or_org
                "e7_T": "lead",                             # lifecycle_stage
            },
        )

        # Notify partnerships team
        await email_service.send_contact_form_notification(
            name=full_name or "Professional Lead",
            email=request.email,
            inquiry_type="professional",
            subject=f"Professional Interest: {request.role.title()}" + (f" — {request.firm_name}" if request.firm_name else ""),
            message=f"Role: {request.role.title()}\nFirm: {request.firm_name or 'Not provided'}\nSource: {request.source}",
            internal_email="partnerships@find-commonground.com",
        )

        # Send confirmation to the professional
        await email_service.send_contact_form_confirmation(
            to_email=request.email,
            name=request.first_name or "there",
        )

        logger.info(f"Professional interest: {request.email} (role: {request.role}, source: {request.source})")
        return ProfessionalInterestResponse(
            success=True,
            message="Thanks for your interest! Our partnerships team will reach out within 24 hours."
        )
    except Exception as e:
        logger.error(f"Professional interest signup failed for {request.email}: {str(e)}")
        capture_error(e)
        return ProfessionalInterestResponse(
            success=False,
            message="We couldn't process your request right now. Please try again later."
        )

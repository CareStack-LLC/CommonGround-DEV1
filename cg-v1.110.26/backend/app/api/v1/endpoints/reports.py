"""
Reports API - Professional report requests and payment processing.

This module handles:
- Professional investigation report requests
- Stripe payment processing for paid reports
- Email notifications to CommonGround team
"""

import logging
import stripe
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.family_file import FamilyFile
from app.services.email import EmailService

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


# ============================================================
# Request/Response Schemas
# ============================================================

class ProfessionalReportRequest(BaseModel):
    """Request to purchase a professional investigation report."""
    family_file_id: str = Field(..., description="Family file to generate report for")
    report_type: str = Field(..., description="Type of report: court_investigation_package, communication_analysis, financial_compliance_report, custody_compliance_report")
    description: Optional[str] = Field(None, description="Description of what the parent needs")
    urgency: str = Field("standard", description="Delivery speed: standard, rush, urgent")
    date_range_start: Optional[str] = Field(None, description="Start date for report data")
    date_range_end: Optional[str] = Field(None, description="End date for report data")
    price_cents: int = Field(..., ge=100, description="Price in cents")


class ProfessionalReportResponse(BaseModel):
    """Response with Stripe checkout URL."""
    success: bool
    checkout_url: Optional[str] = None
    message: str


# Report type metadata — price IDs are from the CommonGround Stripe test catalog (March 2026)
REPORT_TYPES = {
    "court_investigation_package": {
        "name": "Court Investigation Package",
        "description": "Comprehensive court-ready documentation package",
        "base_price_cents": 14900,
        "stripe_price_id": "price_1T7WgqB3EXvvERPfdLfdqwwC",  # Court Investigation Package
        "stripe_product_id": "prod_U5i6ZMoAoSQBEH",
    },
    "communication_analysis": {
        "name": "Communication Analysis Report",
        "description": "In-depth analysis of communication patterns and ARIA interventions",
        "base_price_cents": 7900,
        "stripe_price_id": "price_1T7WgrB3EXvvERPfgGIUwJwa",  # Communication Analysis Report
        "stripe_product_id": "prod_U5i6T4xMbbYmrh",
    },
    "financial_compliance_report": {
        "name": "Financial Compliance Report",
        "description": "Detailed expense tracking and financial compliance analysis",
        "base_price_cents": 7900,
        "stripe_price_id": "price_1T7WgrB3EXvvERPfR1NuSnre",  # Financial Compliance Report
        "stripe_product_id": "prod_U5i6uitcZE1ykf",
    },
    "custody_compliance_report": {
        "name": "Custody Compliance Report",
        "description": "Exchange-by-exchange analysis with GPS verification data",
        "base_price_cents": 9900,
        "stripe_price_id": "price_1T7WgqB3EXvvERPfyT0LGidv",  # Custody Compliance Report
        "stripe_product_id": "prod_U5i6FizFNRc51F",
    },
}

# Urgency add-on Stripe price IDs
URGENCY_STRIPE_PRICES = {
    "standard": None,
    "rush": "price_1T7WgsB3EXvvERPfzQwnJ8yq",    # Rush Report Delivery ($50)
    "urgent": "price_1T7WgsB3EXvvERPfSV4M1DmI",  # Urgent Report Delivery ($100)
}


# ============================================================
# Endpoints
# ============================================================

@router.post(
    "/request-professional",
    response_model=ProfessionalReportResponse,
    summary="Request a professional investigation report",
    description="Creates a Stripe checkout session for a professional report and notifies the CommonGround team.",
)
async def request_professional_report(
    request: ProfessionalReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfessionalReportResponse:
    """
    Request a professional investigation report.

    1. Validates the family file access
    2. Creates a Stripe checkout session
    3. Sends notification email to CommonGround team
    4. Returns checkout URL for payment
    """
    # Validate report type
    if request.report_type not in REPORT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid report type. Must be one of: {', '.join(REPORT_TYPES.keys())}"
        )

    # Verify user has access to family file
    result = await db.execute(
        select(FamilyFile).where(
            FamilyFile.id == request.family_file_id,
            FamilyFile.status == "active",
            (FamilyFile.parent_a_id == str(current_user.id)) |
            (FamilyFile.parent_b_id == str(current_user.id))
        )
    )
    family_file = result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found or you don't have access"
        )

    report_info = REPORT_TYPES[request.report_type]

    # Calculate final price with urgency
    urgency_fees = {"standard": 0, "rush": 5000, "urgent": 10000}
    urgency_fee = urgency_fees.get(request.urgency, 0)
    final_price_cents = report_info["base_price_cents"] + urgency_fee

    try:
        # Create Stripe checkout session for one-time payment
        success_url = f"{settings.FRONTEND_URL}/settings/reports?success=true&report_type={request.report_type}"
        cancel_url = f"{settings.FRONTEND_URL}/settings/reports?cancelled=true"

        # Get or create Stripe customer
        customer_id = None
        if hasattr(current_user, 'profile') and current_user.profile and current_user.profile.stripe_customer_id:
            customer_id = current_user.profile.stripe_customer_id

        # Build line items using real Stripe price IDs for the base report
        line_items = [
            {"price": report_info["stripe_price_id"], "quantity": 1}
        ]

        # Add urgency add-on as a separate line item if applicable
        urgency_price_id = URGENCY_STRIPE_PRICES.get(request.urgency)
        if urgency_price_id:
            line_items.append({"price": urgency_price_id, "quantity": 1})

        checkout_params = {
            "mode": "payment",
            "payment_method_types": ["card"],
            "line_items": line_items,
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {
                "type": "professional_report",
                "report_type": request.report_type,
                "family_file_id": request.family_file_id,
                "user_id": str(current_user.id),
                "urgency": request.urgency,
                "date_range_start": request.date_range_start or "",
                "date_range_end": request.date_range_end or "",
                "description": request.description or "",
            },
        }

        if customer_id:
            checkout_params["customer"] = customer_id
        else:
            checkout_params["customer_email"] = current_user.email

        session = stripe.checkout.Session.create(**checkout_params)

        # Send notification email to CommonGround team
        await _send_report_request_notification(
            user=current_user,
            family_file=family_file,
            report_type=request.report_type,
            report_name=report_info["name"],
            urgency=request.urgency,
            description=request.description,
            date_range_start=request.date_range_start,
            date_range_end=request.date_range_end,
            price_cents=final_price_cents,
            checkout_session_id=session.id,
        )

        logger.info(
            f"Professional report requested: user={current_user.id}, "
            f"type={request.report_type}, family_file={request.family_file_id}, "
            f"checkout_session={session.id}"
        )

        return ProfessionalReportResponse(
            success=True,
            checkout_url=session.url,
            message="Redirecting to payment..."
        )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment session. Please try again."
        )
    except Exception as e:
        logger.error(f"Error requesting professional report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred. Please try again."
        )


@router.get(
    "/types",
    summary="Get available professional report types",
    description="Get attorney report types with GTM spec codes (A-1 through A-8).",
)
async def get_professional_report_types() -> dict:
    """
    Get available professional/attorney report types.

    Returns both the internal type ID and the GTM spec code (A-1 through A-8).
    """
    from app.services.reports.report_registry import get_attorney_reports

    return {
        "report_types": [
            {
                "id": report["internal_type"],
                "code": report["code"],
                "name": report["name"],
                "description": report["description"],
                "tier_required": report["tier_required"],
                "sha256_verified": report["sha256_verified"],
                "court_ready": report["court_ready"],
                "available": report["available"],
                "paid": report.get("paid", False),
                "base_price_cents": report.get("base_price_cents"),
            }
            for report in get_attorney_reports()
        ]
    }


@router.get(
    "/catalog",
    summary="Get complete report catalog",
    description="Get all report types (parent P-1..P-7 and attorney A-1..A-8).",
)
async def get_report_catalog() -> dict:
    """
    Get the complete report catalog with all parent and attorney reports.

    This is the unified report registry aligned with the GTM spec taxonomy.
    """
    from app.services.reports.report_registry import (
        get_parent_reports,
        get_attorney_reports,
    )

    return {
        "parent_reports": [
            {
                "id": r["internal_type"],
                "code": r["code"],
                "name": r["name"],
                "description": r["description"],
                "tier_required": r["tier_required"],
                "sha256_verified": r["sha256_verified"],
                "court_ready": r["court_ready"],
                "available": r["available"],
            }
            for r in get_parent_reports()
        ],
        "attorney_reports": [
            {
                "id": r["internal_type"],
                "code": r["code"],
                "name": r["name"],
                "description": r["description"],
                "tier_required": r["tier_required"],
                "sha256_verified": r["sha256_verified"],
                "court_ready": r["court_ready"],
                "available": r["available"],
            }
            for r in get_attorney_reports()
        ],
    }


async def _send_report_request_notification(
    user: User,
    family_file,
    report_type: str,
    report_name: str,
    urgency: str,
    description: Optional[str],
    date_range_start: Optional[str],
    date_range_end: Optional[str],
    price_cents: int,
    checkout_session_id: str,
) -> None:
    """Send email notification to CommonGround team about report request."""
    email_service = EmailService()

    urgency_labels = {
        "standard": "Standard (3-5 business days)",
        "rush": "Rush (1-2 business days)",
        "urgent": "Urgent (24 hours)",
    }

    user_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or "Unknown"

    subject = f"[Report Request] {report_name} - {urgency.upper()}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #6B8E6B 0%, #7A9F7A 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; }}
            .field {{ margin-bottom: 15px; }}
            .field-label {{ font-weight: 600; color: #555; }}
            .field-value {{ margin-top: 4px; }}
            .urgent {{ background: #fee2e2; border: 1px solid #ef4444; padding: 10px; border-radius: 4px; margin-bottom: 15px; }}
            .rush {{ background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin-bottom: 15px; }}
            .footer {{ background: #f9fafb; padding: 15px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">Professional Report Request</h2>
            </div>
            <div class="content">
                {"<div class='urgent'><strong>URGENT REQUEST</strong> - 24 hour turnaround required</div>" if urgency == "urgent" else ""}
                {"<div class='rush'><strong>RUSH REQUEST</strong> - 1-2 business day turnaround</div>" if urgency == "rush" else ""}

                <div class="field">
                    <div class="field-label">Report Type</div>
                    <div class="field-value">{report_name}</div>
                </div>

                <div class="field">
                    <div class="field-label">Requested By</div>
                    <div class="field-value">{user_name} ({user.email})</div>
                </div>

                <div class="field">
                    <div class="field-label">Family File</div>
                    <div class="field-value">{family_file.title} (ID: {family_file.id})</div>
                </div>

                <div class="field">
                    <div class="field-label">Delivery Speed</div>
                    <div class="field-value">{urgency_labels.get(urgency, urgency)}</div>
                </div>

                <div class="field">
                    <div class="field-label">Amount</div>
                    <div class="field-value">${price_cents / 100:.2f}</div>
                </div>

                {f'''<div class="field">
                    <div class="field-label">Date Range</div>
                    <div class="field-value">{date_range_start or "Not specified"} to {date_range_end or "Not specified"}</div>
                </div>''' if date_range_start or date_range_end else ""}

                {f'''<div class="field">
                    <div class="field-label">Customer Notes</div>
                    <div class="field-value">{description}</div>
                </div>''' if description else ""}

                <div class="field">
                    <div class="field-label">Stripe Checkout Session</div>
                    <div class="field-value" style="font-family: monospace; font-size: 12px;">{checkout_session_id}</div>
                </div>
            </div>
            <div class="footer">
                <p style="margin: 0;">This is an automated notification from CommonGround. Payment status will be confirmed via Stripe webhook.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Log the email (in dev mode) or send via SendGrid (in prod)
    try:
        await email_service._send_email(
            to_email="reports@commonground.app",
            subject=subject,
            html_body=html_body,
        )
    except Exception as e:
        # Don't fail the request if email fails - just log it
        logger.error(f"Failed to send report request notification email: {e}")

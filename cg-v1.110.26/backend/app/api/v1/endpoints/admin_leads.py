"""
Admin Lead Generator API - Lead list management, campaigns, and SendGrid integration.

Endpoints for managing lead lists, importing contacts, creating email campaigns,
generating AI content, and syncing with SendGrid.

All endpoints require is_admin=True on the authenticated user.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Request / Response schemas
# =============================================================================

class LeadListCreate(BaseModel):
    name: str
    lead_type: str
    description: Optional[str] = None


class LeadCreate(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    metadata: Optional[dict] = None


class CampaignCreate(BaseModel):
    name: str
    list_id: str
    template_id: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    scheduled_at: Optional[str] = None


class CampaignContentRequest(BaseModel):
    tone: Optional[str] = "professional"
    goal: Optional[str] = None
    key_points: Optional[list[str]] = None


class TemplateCreate(BaseModel):
    name: str
    subject: str
    body_html: str
    body_text: Optional[str] = None
    category: Optional[str] = None


# =============================================================================
# Lead Lists
# =============================================================================

@router.get(
    "/lists",
    summary="List all lead lists",
)
async def list_lead_lists(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> list:
    """Return all lead lists with basic metadata."""
    from app.services.lead_service import get_all_lists

    return await get_all_lists(db)


@router.post(
    "/lists",
    summary="Create a new lead list",
    status_code=status.HTTP_201_CREATED,
)
async def create_lead_list(
    body: LeadListCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Create a new lead list for organizing contacts."""
    from app.services.lead_service import create_list

    result = await create_list(db, body.name, body.lead_type, body.description)
    await db.commit()
    return result


@router.get(
    "/lists/{list_id}",
    summary="Get lead list with lead count",
)
async def get_lead_list(
    list_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Get a single lead list with its lead count."""
    from app.services.lead_service import get_list_detail

    result = await get_list_detail(db, list_id)
    if not result:
        raise HTTPException(status_code=404, detail="Lead list not found")
    return result


@router.delete(
    "/lists/{list_id}",
    summary="Delete a lead list",
)
async def delete_lead_list(
    list_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Delete a lead list and its associated leads."""
    from app.services.lead_service import delete_list

    deleted = await delete_list(db, list_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Lead list not found")
    await db.commit()
    return {"deleted": True, "list_id": list_id}


@router.post(
    "/lists/{list_id}/import-csv",
    summary="Import leads from CSV file",
)
async def import_csv(
    list_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Upload a CSV file to bulk-import leads into a list."""
    from app.services.lead_service import import_csv_to_list

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")

    contents = await file.read()
    result = await import_csv_to_list(db, list_id, contents)
    await db.commit()
    return result


@router.post(
    "/lists/{list_id}/leads",
    summary="Add a single lead",
    status_code=status.HTTP_201_CREATED,
)
async def add_lead(
    list_id: str,
    body: LeadCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Add a single lead to a list."""
    from app.services.lead_service import add_lead_to_list

    result = await add_lead_to_list(db, list_id, body.model_dump())
    await db.commit()
    return result


@router.get(
    "/lists/{list_id}/leads",
    summary="List leads in a list (paginated)",
)
async def list_leads(
    list_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Return paginated leads belonging to a list."""
    from app.services.lead_service import get_leads_paginated

    return await get_leads_paginated(db, list_id, page, page_size)


@router.post(
    "/lists/{list_id}/sync-sendgrid",
    summary="Sync lead list to SendGrid",
)
async def sync_sendgrid(
    list_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Push leads in a list to a SendGrid contact list."""
    from app.services.lead_service import sync_list_to_sendgrid

    result = await sync_list_to_sendgrid(db, list_id)
    return result


# =============================================================================
# Campaigns
# =============================================================================

@router.get(
    "/campaigns",
    summary="List campaigns",
)
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> list:
    """Return all email campaigns."""
    from app.services.lead_service import get_all_campaigns

    return await get_all_campaigns(db)


@router.post(
    "/campaigns",
    summary="Create a campaign",
    status_code=status.HTTP_201_CREATED,
)
async def create_campaign(
    body: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Create a new email campaign."""
    from app.services.lead_service import create_campaign as svc_create_campaign

    result = await svc_create_campaign(db, body.model_dump())
    await db.commit()
    return result


@router.post(
    "/campaigns/{campaign_id}/generate-content",
    summary="AI generate email content",
)
async def generate_campaign_content(
    campaign_id: str,
    body: CampaignContentRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Use AI to generate email subject and body for a campaign."""
    from app.services.lead_service import ai_generate_campaign_content

    result = await ai_generate_campaign_content(
        db, campaign_id, body.tone, body.goal, body.key_points
    )
    await db.commit()
    return result


@router.post(
    "/campaigns/{campaign_id}/send",
    summary="Send campaign via SendGrid",
)
async def send_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Send a campaign to its target list via SendGrid."""
    from app.services.lead_service import send_campaign as svc_send_campaign

    result = await svc_send_campaign(db, campaign_id)
    await db.commit()
    return result


@router.get(
    "/campaigns/{campaign_id}/stats",
    summary="Get campaign stats",
)
async def get_campaign_stats(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Get delivery and engagement stats for a campaign."""
    from app.services.lead_service import get_campaign_stats as svc_get_campaign_stats

    result = await svc_get_campaign_stats(db, campaign_id)
    if not result:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return result


# =============================================================================
# Templates
# =============================================================================

@router.get(
    "/templates",
    summary="List campaign templates",
)
async def list_templates(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> list:
    """Return all email campaign templates."""
    from app.services.lead_service import get_all_templates

    return await get_all_templates(db)


@router.post(
    "/templates",
    summary="Create a campaign template",
    status_code=status.HTTP_201_CREATED,
)
async def create_template(
    body: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Create a new reusable email template."""
    from app.services.lead_service import create_template as svc_create_template

    result = await svc_create_template(db, body.model_dump())
    await db.commit()
    return result

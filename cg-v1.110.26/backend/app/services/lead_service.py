"""Lead generation, email campaign management, and SendGrid integration service."""

import csv
import io
import json
import logging
import re
from datetime import datetime
from typing import Optional

import anthropic
import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.lead import LeadList, Lead, EmailCampaign, CampaignTemplate

logger = logging.getLogger(__name__)
settings = Settings()

SENDGRID_API_BASE = "https://api.sendgrid.com/v3"
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


# ---------------------------------------------------------------------------
# Lead list management
# ---------------------------------------------------------------------------

async def create_lead_list(
    db: AsyncSession,
    name: str,
    lead_type: str,
    description: Optional[str] = None,
) -> LeadList:
    """Create a new LeadList record."""
    lead_list = LeadList(
        name=name,
        lead_type=lead_type,
        description=description,
        lead_count=0,
    )
    db.add(lead_list)
    await db.flush()
    logger.info("Created lead list %s (%s)", lead_list.id, name)
    return lead_list


async def import_leads_csv(
    db: AsyncSession,
    file_content: bytes,
    lead_list_id: str,
) -> dict:
    """Parse a CSV file and create Lead records.

    Expected columns: email, first_name, last_name, company, title.
    Returns a summary dict with imported/skipped/error counts.
    """
    text = file_content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    skipped = 0
    errors: list[str] = []

    for row_num, row in enumerate(reader, start=2):
        email = (row.get("email") or "").strip().lower()
        if not email:
            errors.append(f"Row {row_num}: missing email")
            continue
        if not EMAIL_REGEX.match(email):
            errors.append(f"Row {row_num}: invalid email '{email}'")
            skipped += 1
            continue

        # Check for duplicate within this list
        existing = await db.execute(
            select(Lead).where(Lead.lead_list_id == lead_list_id, Lead.email == email)
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        lead = Lead(
            lead_list_id=lead_list_id,
            email=email,
            first_name=(row.get("first_name") or "").strip() or None,
            last_name=(row.get("last_name") or "").strip() or None,
            company=(row.get("company") or "").strip() or None,
            title=(row.get("title") or "").strip() or None,
            source="import",
        )
        db.add(lead)
        imported += 1

    # Update lead_count on the list
    lead_list = await db.get(LeadList, lead_list_id)
    if lead_list:
        lead_list.lead_count = (lead_list.lead_count or 0) + imported

    await db.flush()
    logger.info(
        "CSV import for list %s: imported=%d skipped=%d errors=%d",
        lead_list_id, imported, skipped, len(errors),
    )
    return {"imported": imported, "skipped": skipped, "errors": errors}


async def add_lead_manually(
    db: AsyncSession,
    lead_list_id: str,
    email: str,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    company: Optional[str] = None,
    title: Optional[str] = None,
) -> Lead:
    """Add a single lead to a list."""
    email = email.strip().lower()
    if not EMAIL_REGEX.match(email):
        raise ValueError(f"Invalid email address: {email}")

    lead = Lead(
        lead_list_id=lead_list_id,
        email=email,
        first_name=first_name,
        last_name=last_name,
        company=company,
        title=title,
        source="manual",
    )
    db.add(lead)

    lead_list = await db.get(LeadList, lead_list_id)
    if lead_list:
        lead_list.lead_count = (lead_list.lead_count or 0) + 1

    await db.flush()
    logger.info("Added lead %s to list %s", email, lead_list_id)
    return lead


# ---------------------------------------------------------------------------
# SendGrid integration
# ---------------------------------------------------------------------------

def _sendgrid_headers() -> dict:
    """Return authorization headers for SendGrid API."""
    if not settings.SENDGRID_API_KEY:
        raise ValueError("SENDGRID_API_KEY not configured")
    return {
        "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
        "Content-Type": "application/json",
    }


async def create_sendgrid_list(name: str) -> dict:
    """Create a contact list in SendGrid Marketing API.

    Returns the created list payload including its ``id``.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{SENDGRID_API_BASE}/marketing/lists",
            headers=_sendgrid_headers(),
            json={"name": name},
        )
        resp.raise_for_status()
        data = resp.json()

    logger.info("Created SendGrid list '%s' (id=%s)", name, data.get("id"))
    return data


async def sync_leads_to_sendgrid(leads: list[Lead], list_id: str) -> dict:
    """Bulk-add leads as contacts to a SendGrid list.

    Uses PUT /marketing/contacts which upserts contacts and assigns them to
    the given list(s).
    """
    contacts = []
    for lead in leads:
        contact: dict = {"email": lead.email}
        if lead.first_name:
            contact["first_name"] = lead.first_name
        if lead.last_name:
            contact["last_name"] = lead.last_name
        if lead.company:
            contact["company"] = lead.company
        if lead.title:
            contact["title"] = lead.title
        contacts.append(contact)

    if not contacts:
        return {"synced": 0}

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.put(
            f"{SENDGRID_API_BASE}/marketing/contacts",
            headers=_sendgrid_headers(),
            json={
                "list_ids": [list_id],
                "contacts": contacts,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    logger.info("Synced %d contacts to SendGrid list %s", len(contacts), list_id)
    return {"synced": len(contacts), "job_id": data.get("job_id")}


# ---------------------------------------------------------------------------
# AI content generation
# ---------------------------------------------------------------------------

async def generate_campaign_content(
    audience: str,
    product_focus: str,
    tone: str,
) -> dict:
    """Use Claude to generate on-brand email HTML for CommonGround.

    Returns dict with ``subject``, ``html_content``, and ``plain_content``.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    prompt = (
        "You are a marketing email copywriter for CommonGround, an AI-powered "
        "co-parenting platform that helps separated families communicate better, "
        "manage custody schedules, and build healthier co-parenting relationships.\n\n"
        "Brand voice: empathetic, child-first, neutral, professional, hopeful.\n"
        "Product URL: https://www.find-commonground.com\n\n"
        f"Target audience: {audience}\n"
        f"Product focus: {product_focus}\n"
        f"Tone: {tone}\n\n"
        "Generate a marketing email with:\n"
        "1. A compelling subject line\n"
        "2. Full responsive HTML email body (inline CSS, mobile-friendly, "
        "CommonGround branding with #2563EB primary color)\n"
        "3. A plain-text version\n\n"
        "Return ONLY valid JSON with keys: subject, html_content, plain_content"
    )

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-sonnet-4-5-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text
        # Extract JSON from possible markdown code fences
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        result = json.loads(text.strip())
        logger.info("Generated campaign content for audience=%s", audience)
        return result
    except Exception as e:
        logger.error("Campaign content generation failed: %s", e)
        raise


# ---------------------------------------------------------------------------
# Campaign management
# ---------------------------------------------------------------------------

async def create_campaign(
    db: AsyncSession,
    name: str,
    lead_list_id: str,
    subject: str,
    html_content: str,
    plain_content: Optional[str] = None,
) -> EmailCampaign:
    """Create an EmailCampaign record in the database."""
    campaign = EmailCampaign(
        name=name,
        lead_list_id=lead_list_id,
        subject=subject,
        html_content=html_content,
        plain_content=plain_content,
        status="draft",
    )
    db.add(campaign)
    await db.flush()
    logger.info("Created campaign %s (%s)", campaign.id, name)
    return campaign


async def send_campaign(db: AsyncSession, campaign_id: str) -> dict:
    """Send an email campaign via SendGrid Single Sends.

    Steps:
    1. Load campaign and its lead list from the database.
    2. Create a Single Send in SendGrid.
    3. Schedule it for immediate sending.
    4. Update the campaign record with the SendGrid ID and status.
    """
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        raise ValueError(f"Campaign {campaign_id} not found")

    lead_list = await db.get(LeadList, campaign.lead_list_id) if campaign.lead_list_id else None
    if not lead_list or not lead_list.sendgrid_list_id:
        raise ValueError("Campaign lead list has no SendGrid list ID — sync leads first")

    headers = _sendgrid_headers()

    # Step 1: Create Single Send
    single_send_payload = {
        "name": campaign.name,
        "send_to": {"list_ids": [lead_list.sendgrid_list_id]},
        "email_config": {
            "subject": campaign.subject,
            "html_content": campaign.html_content,
            "plain_content": campaign.plain_content or "",
            "sender_id": None,  # uses default verified sender
            "generate_plain_content": not campaign.plain_content,
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Create
        resp = await client.post(
            f"{SENDGRID_API_BASE}/marketing/singlesends",
            headers=headers,
            json=single_send_payload,
        )
        resp.raise_for_status()
        ss_data = resp.json()
        singlesend_id = ss_data["id"]

        # Schedule for immediate send
        resp = await client.put(
            f"{SENDGRID_API_BASE}/marketing/singlesends/{singlesend_id}/schedule",
            headers=headers,
            json={"send_at": "now"},
        )
        resp.raise_for_status()

    campaign.sendgrid_singlesend_id = singlesend_id
    campaign.status = "sending"
    campaign.sent_at = datetime.utcnow()
    await db.flush()

    logger.info("Sent campaign %s via SendGrid singlesend %s", campaign_id, singlesend_id)
    return {"singlesend_id": singlesend_id, "status": "sending"}


async def get_campaign_stats(db: AsyncSession, campaign_id: str) -> dict:
    """Fetch campaign stats from SendGrid and update the local record."""
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        raise ValueError(f"Campaign {campaign_id} not found")
    if not campaign.sendgrid_singlesend_id:
        return {"error": "Campaign has not been sent via SendGrid"}

    headers = _sendgrid_headers()

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{SENDGRID_API_BASE}/marketing/stats/singlesends/{campaign.sendgrid_singlesend_id}",
            headers=headers,
        )
        resp.raise_for_status()
        stats = resp.json()

    # Persist stats locally
    campaign.stats_json = stats
    await db.flush()

    logger.info("Fetched stats for campaign %s", campaign_id)
    return stats


# ---------------------------------------------------------------------------
# Endpoint-facing adapters (thin wrappers used by admin_leads.py)
# ---------------------------------------------------------------------------

def _lead_to_dict(lead: Lead) -> dict:
    return {
        "id": lead.id,
        "email": lead.email,
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "company": lead.company,
        "title": lead.title,
        "source": lead.source,
        "status": lead.status,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }


def _list_to_dict(ll: LeadList) -> dict:
    return {
        "id": ll.id,
        "name": ll.name,
        "lead_type": ll.lead_type,
        "description": ll.description,
        "sendgrid_list_id": ll.sendgrid_list_id,
        "lead_count": ll.lead_count,
        "created_at": ll.created_at.isoformat() if ll.created_at else None,
    }


def _campaign_to_dict(c: EmailCampaign) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "lead_list_id": c.lead_list_id,
        "subject": c.subject,
        "html_content": c.html_content,
        "status": c.status,
        "sendgrid_singlesend_id": c.sendgrid_singlesend_id,
        "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
        "sent_at": c.sent_at.isoformat() if c.sent_at else None,
        "stats_json": c.stats_json,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


async def get_all_lists(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(LeadList).order_by(LeadList.created_at.desc()))
    return [_list_to_dict(ll) for ll in result.scalars().all()]


async def create_list(db: AsyncSession, name: str, lead_type: str, description: Optional[str] = None) -> dict:
    ll = await create_lead_list(db, name, lead_type, description)
    return _list_to_dict(ll)


async def get_list_detail(db: AsyncSession, list_id: str) -> Optional[dict]:
    ll = await db.get(LeadList, list_id)
    if not ll:
        return None
    return _list_to_dict(ll)


async def delete_list(db: AsyncSession, list_id: str) -> bool:
    ll = await db.get(LeadList, list_id)
    if not ll:
        return False
    await db.delete(ll)
    await db.flush()
    return True


async def import_csv_to_list(db: AsyncSession, list_id: str, contents: bytes) -> dict:
    return await import_leads_csv(db, contents, list_id)


async def add_lead_to_list(db: AsyncSession, list_id: str, data: dict) -> dict:
    lead = await add_lead_manually(
        db, list_id,
        email=data["email"],
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        company=data.get("company"),
        title=data.get("title"),
    )
    return _lead_to_dict(lead)


async def get_leads_paginated(db: AsyncSession, list_id: str, page: int = 1, page_size: int = 50) -> dict:
    offset = (page - 1) * page_size
    total_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.lead_list_id == list_id)
    )
    total = total_result.scalar() or 0
    result = await db.execute(
        select(Lead).where(Lead.lead_list_id == list_id)
        .order_by(Lead.created_at.desc())
        .offset(offset).limit(page_size)
    )
    leads = [_lead_to_dict(l) for l in result.scalars().all()]
    return {"leads": leads, "total": total, "page": page, "page_size": page_size}


async def sync_list_to_sendgrid(db: AsyncSession, list_id: str) -> dict:
    ll = await db.get(LeadList, list_id)
    if not ll:
        raise ValueError("Lead list not found")
    # Create SendGrid list if not already linked
    if not ll.sendgrid_list_id:
        sg_list = await create_sendgrid_list(ll.name)
        ll.sendgrid_list_id = sg_list["id"]
        await db.flush()
    # Fetch all leads and sync
    result = await db.execute(select(Lead).where(Lead.lead_list_id == list_id))
    leads = result.scalars().all()
    return await sync_leads_to_sendgrid(leads, ll.sendgrid_list_id)


async def get_all_campaigns(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(EmailCampaign).order_by(EmailCampaign.created_at.desc()))
    return [_campaign_to_dict(c) for c in result.scalars().all()]


async def ai_generate_campaign_content(
    db: AsyncSession, campaign_id: str,
    tone: Optional[str] = None, goal: Optional[str] = None,
    key_points: Optional[list[str]] = None,
) -> dict:
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        raise ValueError("Campaign not found")
    ll = await db.get(LeadList, campaign.lead_list_id) if campaign.lead_list_id else None
    audience = ll.lead_type if ll else "general"
    content = await generate_campaign_content(
        audience=audience,
        product_focus=goal or "general platform",
        tone=tone or "professional",
    )
    campaign.subject = content.get("subject", campaign.subject)
    campaign.html_content = content.get("html_content")
    campaign.plain_content = content.get("plain_content")
    await db.flush()
    return content


async def get_all_templates(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(CampaignTemplate).order_by(CampaignTemplate.created_at.desc()))
    return [
        {"id": t.id, "name": t.name, "target_audience": t.target_audience,
         "subject_template": t.subject_template, "created_at": t.created_at.isoformat() if t.created_at else None}
        for t in result.scalars().all()
    ]


async def create_template(db: AsyncSession, data: dict) -> dict:
    t = CampaignTemplate(
        name=data["name"],
        target_audience=data.get("category", "general"),
        subject_template=data["subject"],
        html_template=data["body_html"],
    )
    db.add(t)
    await db.flush()
    return {"id": t.id, "name": t.name, "target_audience": t.target_audience}

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
from app.models.lead import LeadList, Lead, EmailCampaign, CampaignTemplate, LandingPage
from app.models.user import User

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
    source: str = "import",
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
            source=source,
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
    source: str = "manual",
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
        source=source,
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
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=30.0)
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
        "utm_source": getattr(lead, "utm_source", None),
        "utm_medium": getattr(lead, "utm_medium", None),
        "utm_campaign": getattr(lead, "utm_campaign", None),
        "converted_user_id": getattr(lead, "converted_user_id", None),
        "converted_at": lead.converted_at.isoformat() if getattr(lead, "converted_at", None) else None,
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


async def import_csv_to_list(db: AsyncSession, list_id: str, contents: bytes, source: str = "import") -> dict:
    return await import_leads_csv(db, contents, list_id, source=source)


async def add_lead_to_list(db: AsyncSession, list_id: str, data: dict) -> dict:
    lead = await add_lead_manually(
        db, list_id,
        email=data["email"],
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        company=data.get("company"),
        title=data.get("title"),
        source=data.get("source", "manual"),
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


# ---------------------------------------------------------------------------
# Pipeline & conversion tracking
# ---------------------------------------------------------------------------

async def get_lead_pipeline(db: AsyncSession) -> dict:
    """Return funnel counts, source breakdown, and recent conversions."""
    try:
        # Funnel counts
        total = (await db.execute(select(func.count(Lead.id)))).scalar() or 0
        contacted = (await db.execute(
            select(func.count(Lead.id)).where(Lead.status == "contacted")
        )).scalar() or 0
        responded = (await db.execute(
            select(func.count(Lead.id)).where(Lead.status == "responded")
        )).scalar() or 0
        converted = (await db.execute(
            select(func.count(Lead.id)).where(Lead.status == "converted")
        )).scalar() or 0

        # Source breakdown
        source_result = await db.execute(
            select(Lead.source, func.count(Lead.id)).group_by(Lead.source)
        )
        by_source = {row[0]: row[1] for row in source_result}

        # Conversion rate
        conversion_rate = round(converted / total * 100, 1) if total > 0 else 0.0

        # Recent conversions (leads with converted_user_id set)
        recent_result = await db.execute(
            select(Lead)
            .where(Lead.converted_user_id.isnot(None))
            .order_by(Lead.converted_at.desc())
            .limit(10)
        )
        recent = [
            {
                "email": l.email,
                "source": l.source,
                "converted_at": l.converted_at.isoformat() if l.converted_at else None,
                "list_id": l.lead_list_id,
            }
            for l in recent_result.scalars().all()
        ]

        # Top lists by lead count
        list_result = await db.execute(
            select(LeadList).order_by(LeadList.lead_count.desc()).limit(5)
        )
        top_lists = []
        for ll in list_result.scalars().all():
            conv_count = (await db.execute(
                select(func.count(Lead.id)).where(
                    Lead.lead_list_id == ll.id,
                    Lead.status == "converted",
                )
            )).scalar() or 0
            top_lists.append({
                "id": ll.id,
                "name": ll.name,
                "lead_count": ll.lead_count,
                "converted": conv_count,
            })

        return {
            "funnel": {"total": total, "contacted": contacted, "responded": responded, "converted": converted},
            "by_source": by_source,
            "conversion_rate": conversion_rate,
            "recent_conversions": recent,
            "top_lists": top_lists,
        }
    except Exception as exc:
        logger.warning("Pipeline query failed (tables may not exist): %s", exc)
        return {
            "funnel": {"total": 0, "contacted": 0, "responded": 0, "converted": 0},
            "by_source": {},
            "conversion_rate": 0,
            "recent_conversions": [],
            "top_lists": [],
        }


async def match_leads_to_users(db: AsyncSession) -> dict:
    """Match lead emails to User accounts, updating conversion tracking."""
    try:
        # Get all leads without a converted_user_id
        unmatched = await db.execute(
            select(Lead).where(Lead.converted_user_id.is_(None))
        )
        leads = unmatched.scalars().all()
        if not leads:
            return {"matched": 0, "total_unmatched": 0}

        matched = 0
        for lead in leads:
            user_result = await db.execute(
                select(User).where(func.lower(User.email) == lead.email.lower()).limit(1)
            )
            user = user_result.scalar_one_or_none()
            if user:
                lead.converted_user_id = user.id
                lead.converted_at = user.created_at or datetime.utcnow()
                lead.status = "converted"
                matched += 1

        if matched > 0:
            await db.flush()

        logger.info("Matched %d leads to users", matched)
        return {"matched": matched, "total_unmatched": len(leads) - matched}
    except Exception as exc:
        logger.warning("Lead-user matching failed: %s", exc)
        return {"matched": 0, "error": str(exc)}


# ---------------------------------------------------------------------------
# Landing page management
# ---------------------------------------------------------------------------

def _landing_page_to_dict(lp: LandingPage) -> dict:
    d = {
        "id": lp.id,
        "slug": lp.slug,
        "title": lp.title,
        "headline": lp.headline,
        "subheadline": lp.subheadline,
        "hero_image_url": lp.hero_image_url,
        "body_html": lp.body_html,
        "cta_text": lp.cta_text,
        "cta_url": lp.cta_url,
        "target_audience": lp.target_audience,
        "status": lp.status,
        "seo_title": lp.seo_title,
        "seo_description": lp.seo_description,
        "og_image_url": lp.og_image_url,
        "utm_source": lp.utm_source,
        "utm_medium": lp.utm_medium,
        "utm_campaign": lp.utm_campaign,
        "view_count": lp.view_count,
        "created_at": lp.created_at.isoformat() if lp.created_at else None,
        "updated_at": lp.updated_at.isoformat() if lp.updated_at else None,
    }
    # Parse structured sections from body_html (format_version 2)
    sections_json = None
    if lp.body_html and lp.body_html.strip().startswith("{"):
        try:
            parsed = json.loads(lp.body_html)
            if parsed.get("format_version") == 2:
                sections_json = parsed
        except (json.JSONDecodeError, TypeError):
            pass
    d["sections_json"] = sections_json
    return d


async def get_all_landing_pages(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(LandingPage).order_by(LandingPage.created_at.desc()))
    return [_landing_page_to_dict(lp) for lp in result.scalars().all()]


async def get_landing_page_by_slug(db: AsyncSession, slug: str) -> Optional[dict]:
    result = await db.execute(select(LandingPage).where(LandingPage.slug == slug))
    lp = result.scalar_one_or_none()
    if not lp:
        return None
    # Increment view count for published pages
    if lp.status == "published":
        lp.view_count = (lp.view_count or 0) + 1
        await db.flush()
    return _landing_page_to_dict(lp)


async def create_landing_page(db: AsyncSession, data: dict) -> dict:
    # Truncate fields to avoid varchar overflow crashes
    def trunc(val: Optional[str], limit: int) -> Optional[str]:
        return val[:limit] if val else val

    slug = trunc(data.get("slug", "untitled"), 200) or "untitled"

    # Handle duplicate slugs by appending a suffix
    existing = await db.execute(select(LandingPage).where(LandingPage.slug == slug))
    if existing.scalar_one_or_none():
        import time
        slug = f"{slug}-{int(time.time()) % 10000}"

    lp = LandingPage(
        slug=slug,
        title=trunc(data.get("title", "Untitled"), 200) or "Untitled",
        headline=trunc(data.get("headline", ""), 500) or "",
        subheadline=data.get("subheadline"),
        hero_image_url=data.get("hero_image_url"),
        body_html=data.get("body_html", ""),
        cta_text=trunc(data.get("cta_text", "Get Started Free"), 100),
        cta_url=trunc(data.get("cta_url", "https://www.find-commonground.com/register"), 500),
        target_audience=trunc(data.get("target_audience", "general"), 100),
        status=data.get("status", "draft"),
        seo_title=trunc(data.get("seo_title"), 200),
        seo_description=trunc(data.get("seo_description"), 500),
        og_image_url=data.get("og_image_url"),
        utm_source=trunc(data.get("utm_source"), 100),
        utm_medium=trunc(data.get("utm_medium"), 100),
        utm_campaign=trunc(data.get("utm_campaign"), 200),
    )
    db.add(lp)
    await db.flush()
    return _landing_page_to_dict(lp)


async def update_landing_page(db: AsyncSession, page_id: str, data: dict) -> Optional[dict]:
    lp = await db.get(LandingPage, page_id)
    if not lp:
        return None
    for key in ["slug", "title", "headline", "subheadline", "hero_image_url",
                "body_html", "cta_text", "cta_url", "target_audience", "status",
                "seo_title", "seo_description", "og_image_url",
                "utm_source", "utm_medium", "utm_campaign"]:
        if key in data:
            setattr(lp, key, data[key])
    await db.flush()
    return _landing_page_to_dict(lp)


async def delete_landing_page(db: AsyncSession, page_id: str) -> bool:
    lp = await db.get(LandingPage, page_id)
    if not lp:
        return False
    await db.delete(lp)
    await db.flush()
    return True


async def ai_generate_landing_page(
    target_audience: str,
    key_message: str,
    tone: str = "professional",
    cta_destination: str = "https://www.find-commonground.com/register",
) -> dict:
    """Use Claude to generate a structured landing page with SEO and UTM.

    Returns structured section data (format_version 2) stored in body_html
    as JSON. The frontend renders this using the same template as /for-dads.
    """
    slug = re.sub(r"[^a-z0-9]+", "-", target_audience.lower()).strip("-")

    prompt = (
        "You are a conversion-focused landing page copywriter for CommonGround, "
        "an AI-powered co-parenting platform.\n\n"
        "Brand voice: empathetic, child-first, neutral, professional, hopeful.\n"
        "Brand colors: #3DAA8A (sage green, primary), #2D6A8F (navy), "
        "#F5A623 (gold accent), #E85D75 (pink accent), #1E3A4A (dark text).\n\n"
        "CommonGround features you can reference:\n"
        "- ARIA: AI communication monitor that detects manipulation/conflict patterns\n"
        "- KidSpace: Safe video calls, movies, storytime between parent and child\n"
        "- KidComs: Monitored messaging for children\n"
        "- ClearFund: Expense tracking and child support management\n"
        "- TimeBridge: Custody schedule and exchange management\n"
        "- Agreement Builder: Custody agreement creation wizard\n"
        "- Evidence Exports: Court-ready documentation\n"
        "- Silent Handoff: Contactless custody exchanges with GPS\n\n"
        f"Target audience: {target_audience}\n"
        f"Key message: {key_message}\n"
        f"Tone: {tone}\n\n"
        "Generate a STRUCTURED landing page as JSON with these exact keys:\n\n"
        "{\n"
        '  "slug": "url-safe-slug",\n'
        '  "title": "Browser tab title (60 chars max)",\n'
        '  "headline": "Hero headline, 8-12 words, emotionally compelling",\n'
        '  "headline_accent": "2-4 word phrase FROM the headline to highlight in green",\n'
        '  "subheadline": "2-3 sentences supporting the headline",\n'
        '  "hero_label": "Short uppercase label above headline, e.g. For dads who refuse to disappear",\n'
        '  "cta_text": "CTA button text, 3-6 words",\n'
        '  "pain_points_heading": "Section heading, e.g. Sound Familiar?",\n'
        '  "pain_points_subheading": "One sentence under the heading",\n'
        '  "pain_points": [\n'
        '    {"old": "The painful reality they face now", "cg": "How CommonGround fixes it"},\n'
        '    // exactly 4 items\n'
        '  ],\n'
        '  "features_label": "Short label like Your corner",\n'
        '  "features_heading": "Section heading for features",\n'
        '  "features_subheading": "One sentence under the heading",\n'
        '  "features": [\n'
        '    {\n'
        '      "icon": "MessageSquare",\n'
        '      "name": "ARIA",\n'
        '      "tagline": "Short tagline, 3-5 words",\n'
        '      "description": "2-3 sentences describing the benefit for this audience",\n'
        '      "accent": "#F5A623"\n'
        "    },\n"
        '    // exactly 3 features. Use real CommonGround feature names.\n'
        '    // Icon must be one of: MessageSquare, Video, FileText, Calendar, '
        'DollarSign, Shield, Heart, Users, Scale, MapPin, Clock, Gavel\n'
        '    // accent must be one of: #F5A623, #3DAA8A, #2D6A8F, #E85D75\n'
        "  ],\n"
        '  "testimonial": {\n'
        '    "quote": "A realistic testimonial quote (2-3 sentences) from this audience type",\n'
        '    "name": "First name only",\n'
        '    "title": "Brief context like CommonGround Early Adopter",\n'
        '    "initial": "First letter of name"\n'
        "  },\n"
        '  "early_adopter_label": "Early Adopter Offer",\n'
        '  "early_adopter_heading": "Emotionally compelling CTA heading",\n'
        '  "early_adopter_subheading": "One sentence about the offer",\n'
        '  "faq_heading": "Questions You Might Have",\n'
        '  "faqs": [\n'
        '    {"q": "Question relevant to this audience", "a": "Helpful, reassuring answer"},\n'
        '    // exactly 4 FAQs\n'
        "  ],\n"
        '  "seo_title": "SEO title, 60 chars max, include target keywords",\n'
        '  "seo_description": "Meta description, 160 chars max",\n'
        '  "utm_campaign": "lp-slug-name",\n'
        '  "marketing": {\n'
        '    "facebook": {\n'
        '      "headline": "Short hook for Facebook groups (under 100 chars)",\n'
        '      "body": "Community-oriented post (150-300 words, empathetic, shareable, question at end)",\n'
        '      "hashtags": ["5-8 hashtags for Facebook reach"],\n'
        '      "cta_text": "CTA text"\n'
        '    },\n'
        '    "instagram": {\n'
        '      "headline": "Attention-grabbing first line (under 80 chars)",\n'
        '      "body": "Instagram caption (150-200 words, emotional hook, line breaks, engagement question)",\n'
        '      "hashtags": ["20-30 mix of branded + discovery hashtags"],\n'
        '      "cta_text": "CTA text"\n'
        '    },\n'
        '    "tiktok": {\n'
        '      "headline": "Hook-first caption (under 80 chars)",\n'
        '      "body": "TikTok description (50-100 words, conversational, trend-aware)",\n'
        '      "hashtags": ["8-12 mix of viral + niche hashtags"],\n'
        '      "cta_text": "CTA text"\n'
        '    },\n'
        '    "linkedin": {\n'
        '      "headline": "Professional thought-leadership hook (under 100 chars)",\n'
        '      "body": "LinkedIn post (200-400 words, professional tone targeting family law professionals)",\n'
        '      "hashtags": ["5-8 professional hashtags"],\n'
        '      "cta_text": "CTA text"\n'
        '    },\n'
        '    "newsletter": {\n'
        '      "headline": "Email subject line (under 60 chars)",\n'
        '      "body": "Email body (200-300 words, warm personal tone, value-first, clear CTA)",\n'
        '      "hashtags": [],\n'
        '      "cta_text": "CTA button text"\n'
        '    }\n'
        '  }\n'
        "}\n\n"
        "Return ONLY valid JSON. No markdown, no code fences."
    )

    result = None
    try:
        if settings.ANTHROPIC_API_KEY:
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            result = json.loads(text.strip())
    except Exception as e:
        logger.warning("Claude landing page generation failed: %s", e)

    if not result:
        try:
            from openai import AsyncOpenAI
            if settings.OPENAI_API_KEY:
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                resp = await client.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    max_tokens=4096,
                )
                result = json.loads(resp.choices[0].message.content or "{}")
        except Exception as e:
            logger.warning("OpenAI landing page generation also failed: %s", e)
            raise ValueError("Both AI providers failed to generate landing page")

    # Fill in defaults
    result.setdefault("slug", slug)
    result.setdefault("cta_text", "Join the Early Adopter List")
    result.setdefault("utm_source", "landing_page")
    result.setdefault("utm_medium", "web")
    result.setdefault("target_audience", target_audience)

    # Build top-level fields for the LandingPage model
    top_level = {
        "slug": result.get("slug", slug),
        "title": result.get("title", f"CommonGround for {target_audience}"),
        "headline": result.get("headline", ""),
        "subheadline": result.get("subheadline", ""),
        "cta_text": result.get("cta_text", "Join the Early Adopter List"),
        "cta_url": cta_destination,
        "target_audience": target_audience,
        "seo_title": result.get("seo_title", ""),
        "seo_description": result.get("seo_description", ""),
        "utm_source": result.get("utm_source", "landing_page"),
        "utm_medium": result.get("utm_medium", "web"),
        "utm_campaign": result.get("utm_campaign", f"lp-{slug}"),
    }

    # --- Generate hero image with DALL-E ---
    hero_image_url = None
    try:
        hero_image_url = await _generate_landing_page_image(
            headline=result.get("headline", target_audience),
            target_audience=target_audience,
            slug=top_level["slug"],
        )
        if hero_image_url:
            top_level["hero_image_url"] = hero_image_url
            top_level["og_image_url"] = hero_image_url
    except Exception as exc:
        logger.warning("Landing page image generation failed: %s", exc)

    # --- Generate social media posts ---
    social_posts = await _generate_landing_page_social_posts(
        headline=result.get("headline", ""),
        subheadline=result.get("subheadline", ""),
        target_audience=target_audience,
        page_url=f"https://www.find-commonground.com/lp/{top_level['slug']}",
        utm_campaign=top_level["utm_campaign"],
    )
    if social_posts:
        result["social_posts"] = social_posts

    # Store structured sections as JSON in body_html
    result["format_version"] = 2
    top_level["body_html"] = json.dumps(result)

    # Append UTM params to CTA URL
    cta = top_level["cta_url"]
    sep = "&" if "?" in cta else "?"
    top_level["cta_url"] = (
        f"{cta}{sep}utm_source={top_level['utm_source']}"
        f"&utm_medium={top_level['utm_medium']}"
        f"&utm_campaign={top_level['utm_campaign']}"
    )

    return top_level


async def _generate_landing_page_image(
    headline: str,
    target_audience: str,
    slug: str,
) -> Optional[str]:
    """Generate a hero image for a landing page using DALL-E 3."""
    import os

    openai_key = os.environ.get("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", None)
    if not openai_key:
        logger.info("No OPENAI_API_KEY — skipping landing page image generation")
        return None

    brand_style = (
        "Warm, organic illustration style with flowing teal (#3DAA8A) blob outlines "
        "and soft color-pencil texture. Soft white (#F4F8F7) background. "
        "Small coral-pink (#E85D75) hand-drawn accent icons floating nearby. "
        "Calm, child-centered, trustworthy mood. "
        "No text, no words, no letters, no numbers in the image."
    )

    dalle_prompt = (
        f"{brand_style}\n\n"
        f"Subject: Create an illustration for a co-parenting landing page "
        f"targeting {target_audience}. Headline: {headline}\n\n"
        "The image should feel warm and supportive, showing themes of family, "
        "cooperation, children's wellbeing, or peaceful co-parenting. "
        "Use diverse, inclusive representation."
    )

    from openai import OpenAI
    client = OpenAI(api_key=openai_key)
    response = client.images.generate(
        model="dall-e-3",
        prompt=dalle_prompt,
        size="1792x1024",
        quality="standard",
        n=1,
    )

    image_url = response.data[0].url
    if not image_url:
        return None

    # Download and upload to Supabase
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        img_response = await http_client.get(image_url)
        img_response.raise_for_status()
        image_bytes = img_response.content

    try:
        from app.services.storage import storage_service, StorageBucket
        storage_path = f"lp-{slug}.png"
        public_url = await storage_service.upload_file(
            bucket=StorageBucket.BLOG_IMAGES,
            path=storage_path,
            file_content=image_bytes,
            content_type="image/png",
            upsert=True,
        )
        logger.info("Landing page image uploaded: %s", public_url)
        return public_url
    except Exception as exc:
        logger.warning("Supabase upload failed, using temporary URL: %s", exc)
        return image_url  # Fallback to OpenAI temp URL


async def _generate_landing_page_social_posts(
    headline: str,
    subheadline: str,
    target_audience: str,
    page_url: str,
    utm_campaign: str,
) -> list[dict]:
    """Generate social media posts for a landing page."""
    prompt = (
        "You are a social media marketer for CommonGround, an AI-powered co-parenting platform. "
        "Write social media posts to promote a landing page.\n\n"
        f"Landing page headline: {headline}\n"
        f"Subheadline: {subheadline}\n"
        f"Target audience: {target_audience}\n"
        f"Landing page URL: {page_url}?utm_source={{platform}}&utm_medium=social&utm_campaign={utm_campaign}\n\n"
        "Generate posts for these platforms as a JSON array:\n"
        "[\n"
        '  {"platform": "twitter", "headline": "hook under 100 chars", '
        '"body": "tweet text under 280 chars including URL", '
        '"hashtags": ["3-5 hashtags"], "cta_text": "short CTA"},\n'
        '  {"platform": "linkedin", "headline": "professional hook", '
        '"body": "200-300 word professional post", '
        '"hashtags": ["5-8 professional hashtags"], "cta_text": "CTA"},\n'
        '  {"platform": "facebook", "headline": "community hook", '
        '"body": "150-250 word shareable post", '
        '"hashtags": ["5-8 hashtags"], "cta_text": "CTA"},\n'
        '  {"platform": "instagram", "headline": "attention-grabbing first line", '
        '"body": "Instagram caption with line breaks", '
        '"hashtags": ["20-30 hashtags"], "cta_text": "CTA"}\n'
        "]\n\n"
        "Replace {platform} in the URL with the actual platform name. "
        "Return ONLY valid JSON array. No markdown."
    )

    try:
        if settings.ANTHROPIC_API_KEY:
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            posts = json.loads(text.strip())
            # Add CTA URL to each post
            for post in posts:
                platform = post.get("platform", "direct")
                post["cta_url"] = (
                    f"{page_url}?utm_source={platform}"
                    f"&utm_medium=social&utm_campaign={utm_campaign}"
                )
            return posts
    except Exception as exc:
        logger.warning("Social post generation failed: %s", exc)

    # Fallback: return empty list
    return []

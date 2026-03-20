"""Gmail monitoring service — OAuth, inbox fetch, AI analysis, and digest generation."""

import base64
import json
import logging
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from typing import Optional
from urllib.parse import urlencode

import anthropic
import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.inbox import MonitoredEmail, EmailDigest, GoogleOAuthToken

logger = logging.getLogger(__name__)
settings = Settings()

GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"

GOOGLE_OAUTH_CLIENT_ID = (
    "885830877371-elqoqij1pmsl599gc8qt5kmf0nn4jein.apps.googleusercontent.com"
)
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]


def _redirect_uri() -> str:
    """Build the OAuth redirect URI from settings."""
    return f"{settings.FRONTEND_URL}/api/auth/google/callback"


# ---------------------------------------------------------------------------
# OAuth2 flow
# ---------------------------------------------------------------------------

def get_oauth_url(state: Optional[str] = None) -> str:
    """Generate Google OAuth2 consent URL for Gmail API access."""
    params = {
        "client_id": GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": _redirect_uri(),
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    if state:
        params["state"] = state
    return f"{GOOGLE_AUTH_BASE}?{urlencode(params)}"


async def exchange_code_for_token(
    db: AsyncSession,
    code: str,
    email: str,
) -> GoogleOAuthToken:
    """Exchange authorization code for tokens and persist the refresh token."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "redirect_uri": _redirect_uri(),
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        token_data = resp.json()

    expires_in = token_data.get("expires_in", 3600)
    token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)

    # Upsert token record
    result = await db.execute(
        select(GoogleOAuthToken).where(GoogleOAuthToken.email == email)
    )
    token_record = result.scalar_one_or_none()

    if token_record:
        token_record.access_token = token_data["access_token"]
        token_record.refresh_token = token_data.get("refresh_token", token_record.refresh_token)
        token_record.token_expiry = token_expiry
        token_record.scopes = " ".join(GOOGLE_SCOPES)
    else:
        token_record = GoogleOAuthToken(
            email=email,
            access_token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            token_expiry=token_expiry,
            scopes=" ".join(GOOGLE_SCOPES),
        )
        db.add(token_record)

    await db.flush()
    logger.info("Stored OAuth token for %s", email)
    return token_record


async def _refresh_access_token(token_record: GoogleOAuthToken) -> str:
    """Refresh an expired access token using the stored refresh token."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "refresh_token": token_record.refresh_token,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        token_data = resp.json()

    token_record.access_token = token_data["access_token"]
    expires_in = token_data.get("expires_in", 3600)
    token_record.token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
    return token_data["access_token"]


async def _get_gmail_client(
    db: AsyncSession,
    email: str,
) -> tuple[httpx.AsyncClient, str]:
    """Load token from DB, refresh if expired, return authenticated client and access token.

    The caller is responsible for closing the returned client (use as async context manager
    or call ``await client.aclose()``).
    """
    result = await db.execute(
        select(GoogleOAuthToken).where(GoogleOAuthToken.email == email)
    )
    token_record = result.scalar_one_or_none()
    if not token_record:
        raise ValueError(f"No OAuth token found for {email}. Please authenticate first.")

    # Refresh if expired or about to expire in the next minute
    if not token_record.access_token or (
        token_record.token_expiry
        and token_record.token_expiry < datetime.utcnow() + timedelta(minutes=1)
    ):
        access_token = await _refresh_access_token(token_record)
        await db.flush()
    else:
        access_token = token_record.access_token

    client = httpx.AsyncClient(
        timeout=30.0,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    return client, access_token


# ---------------------------------------------------------------------------
# Email fetching
# ---------------------------------------------------------------------------

def _decode_body(payload: dict) -> str:
    """Recursively extract and decode the message body from a Gmail payload."""
    # Direct body data
    body_data = payload.get("body", {}).get("data")
    if body_data:
        return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")

    # Multipart — prefer text/html, fall back to text/plain
    parts = payload.get("parts", [])
    html_body = ""
    plain_body = ""
    for part in parts:
        mime_type = part.get("mimeType", "")
        if mime_type == "text/html":
            data = part.get("body", {}).get("data", "")
            if data:
                html_body = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
        elif mime_type == "text/plain":
            data = part.get("body", {}).get("data", "")
            if data:
                plain_body = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
        elif mime_type.startswith("multipart/"):
            nested = _decode_body(part)
            if nested:
                return nested

    return html_body or plain_body


def _extract_header(headers: list[dict], name: str) -> str:
    """Get a header value by name from the Gmail message headers."""
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


async def fetch_new_emails(
    db: AsyncSession,
    since_hours: int = 6,
) -> list[MonitoredEmail]:
    """Fetch recent emails for all monitored accounts and create MonitoredEmail records."""
    monitored_addresses = [
        e.strip()
        for e in settings.GOOGLE_MONITORED_EMAILS.split(",")
        if e.strip()
    ]
    new_emails: list[MonitoredEmail] = []

    after_epoch = int((datetime.utcnow() - timedelta(hours=since_hours)).timestamp())

    for address in monitored_addresses:
        try:
            client, _ = await _get_gmail_client(db, address)
        except ValueError:
            logger.warning("No OAuth token for %s — skipping", address)
            continue

        try:
            # List messages
            resp = await client.get(
                f"{GMAIL_API_BASE}/users/me/messages",
                params={
                    "q": f"after:{after_epoch}",
                    "maxResults": 50,
                },
            )
            resp.raise_for_status()
            message_ids = [m["id"] for m in resp.json().get("messages", [])]

            for msg_id in message_ids:
                # Skip if already stored
                existing = await db.execute(
                    select(MonitoredEmail).where(
                        MonitoredEmail.gmail_message_id == msg_id
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                # Fetch full message
                msg_resp = await client.get(
                    f"{GMAIL_API_BASE}/users/me/messages/{msg_id}",
                    params={"format": "full"},
                )
                msg_resp.raise_for_status()
                msg_data = msg_resp.json()

                headers = msg_data.get("payload", {}).get("headers", [])
                body = _decode_body(msg_data.get("payload", {}))
                received_ts = int(msg_data.get("internalDate", "0")) / 1000

                from_raw = _extract_header(headers, "From")
                # Parse "Name <email>" format
                from_name = None
                from_email = from_raw
                if "<" in from_raw and ">" in from_raw:
                    from_name = from_raw.split("<")[0].strip().strip('"')
                    from_email = from_raw.split("<")[1].split(">")[0]

                email_record = MonitoredEmail(
                    gmail_message_id=msg_id,
                    thread_id=msg_data.get("threadId"),
                    from_email=from_email,
                    from_name=from_name,
                    to_email=address,
                    subject=_extract_header(headers, "Subject") or "(no subject)",
                    body_preview=body[:500] if body else "",
                    body_full=body or "",
                    received_at=datetime.utcfromtimestamp(received_ts) if received_ts else datetime.utcnow(),
                )
                db.add(email_record)
                new_emails.append(email_record)

        except Exception as e:
            logger.error("Error fetching emails for %s: %s", address, e)
        finally:
            await client.aclose()

    await db.flush()
    logger.info("Fetched %d new emails across %d accounts", len(new_emails), len(monitored_addresses))
    return new_emails


# ---------------------------------------------------------------------------
# AI email analysis
# ---------------------------------------------------------------------------

async def analyze_email(db: AsyncSession, email_id: str) -> dict:
    """Use Claude to determine urgency, category, summary, and draft response for an email."""
    email_record = await db.get(MonitoredEmail, email_id)
    if not email_record:
        raise ValueError(f"Email {email_id} not found")

    if not settings.ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    prompt = (
        "You are the executive assistant for CommonGround, an AI-powered co-parenting "
        "platform (https://www.find-commonground.com). Analyze the following inbound email "
        "and provide a JSON response.\n\n"
        f"From: {email_record.from_name or ''} <{email_record.from_email}>\n"
        f"To: {email_record.to_email}\n"
        f"Subject: {email_record.subject}\n"
        f"Body:\n{email_record.body_full[:3000]}\n\n"
        "Return ONLY valid JSON with these keys:\n"
        "- is_urgent (bool): true if requires response within 24h\n"
        "- urgency_reason (string or null): why it's urgent\n"
        "- category (string): one of support, sales, partnership, spam, personal, other\n"
        "- summary (string): 1-2 sentence summary\n"
        "- draft_response (string): professional, empathetic draft reply (CommonGround brand voice)"
    )

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-sonnet-4-5-20250514",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        analysis = json.loads(text.strip())

        email_record.is_urgent = analysis.get("is_urgent", False)
        email_record.urgency_reason = analysis.get("urgency_reason")
        email_record.category = analysis.get("category", "other")
        email_record.ai_summary = analysis.get("summary")
        email_record.ai_draft_response = analysis.get("draft_response")
        email_record.processed_at = datetime.utcnow()

        await db.flush()
        logger.info("Analyzed email %s — category=%s urgent=%s", email_id, email_record.category, email_record.is_urgent)
        return analysis

    except Exception as e:
        logger.error("Email analysis failed for %s: %s", email_id, e)
        raise


# ---------------------------------------------------------------------------
# Reply via Gmail
# ---------------------------------------------------------------------------

async def send_reply(
    db: AsyncSession,
    email_id: str,
    response_body: str,
) -> dict:
    """Send a reply to a monitored email via Gmail API."""
    email_record = await db.get(MonitoredEmail, email_id)
    if not email_record:
        raise ValueError(f"Email {email_id} not found")

    client, _ = await _get_gmail_client(db, email_record.to_email)

    try:
        # Build the reply MIME message
        mime_msg = MIMEText(response_body, "plain")
        mime_msg["To"] = email_record.from_email
        mime_msg["From"] = email_record.to_email
        mime_msg["Subject"] = f"Re: {email_record.subject}"
        mime_msg["In-Reply-To"] = email_record.gmail_message_id
        mime_msg["References"] = email_record.gmail_message_id

        raw_message = base64.urlsafe_b64encode(
            mime_msg.as_bytes()
        ).decode("ascii")

        resp = await client.post(
            f"{GMAIL_API_BASE}/users/me/messages/send",
            json={
                "raw": raw_message,
                "threadId": email_record.thread_id,
            },
        )
        resp.raise_for_status()
        send_data = resp.json()

        email_record.draft_status = "sent"
        await db.flush()

        logger.info("Sent reply for email %s to %s", email_id, email_record.from_email)
        return {"message_id": send_data.get("id"), "thread_id": send_data.get("threadId")}

    finally:
        await client.aclose()


# ---------------------------------------------------------------------------
# Digest and stats
# ---------------------------------------------------------------------------

async def generate_digest(
    db: AsyncSession,
    hours: int = 6,
) -> EmailDigest:
    """Compile recent monitored emails into an EmailDigest record."""
    period_end = datetime.utcnow()
    period_start = period_end - timedelta(hours=hours)

    result = await db.execute(
        select(MonitoredEmail).where(
            MonitoredEmail.received_at >= period_start,
            MonitoredEmail.received_at <= period_end,
        )
    )
    emails = result.scalars().all()

    urgent_count = sum(1 for e in emails if e.is_urgent)

    # Build category breakdown
    by_category: dict[str, int] = {}
    for e in emails:
        cat = e.category or "other"
        by_category[cat] = by_category.get(cat, 0) + 1

    summary_json = {
        "total": len(emails),
        "urgent": urgent_count,
        "by_category": by_category,
        "emails": [
            {
                "id": e.id,
                "from": e.from_email,
                "subject": e.subject,
                "category": e.category,
                "is_urgent": e.is_urgent,
                "summary": e.ai_summary,
            }
            for e in emails
        ],
    }

    digest = EmailDigest(
        period_start=period_start,
        period_end=period_end,
        total_emails=len(emails),
        urgent_count=urgent_count,
        summary_json=summary_json,
    )
    db.add(digest)
    await db.flush()

    logger.info(
        "Generated digest: %d emails (%d urgent) for %s — %s",
        len(emails), urgent_count, period_start.isoformat(), period_end.isoformat(),
    )
    return digest


async def get_inbox_stats(db: AsyncSession) -> dict:
    """Return aggregate inbox stats: counts by category, urgent count, pending drafts."""
    # Category counts
    cat_result = await db.execute(
        select(MonitoredEmail.category, func.count(MonitoredEmail.id)).group_by(
            MonitoredEmail.category
        )
    )
    by_category = {row[0]: row[1] for row in cat_result.all()}

    # Urgent count
    urgent_result = await db.execute(
        select(func.count(MonitoredEmail.id)).where(
            MonitoredEmail.is_urgent.is_(True),
            MonitoredEmail.draft_status.in_(["pending", "approved"]),
        )
    )
    urgent_count = urgent_result.scalar() or 0

    # Pending drafts
    pending_result = await db.execute(
        select(func.count(MonitoredEmail.id)).where(
            MonitoredEmail.draft_status == "pending"
        )
    )
    pending_drafts = pending_result.scalar() or 0

    # Total
    total_result = await db.execute(select(func.count(MonitoredEmail.id)))
    total = total_result.scalar() or 0

    return {
        "total": total,
        "by_category": by_category,
        "urgent_pending": urgent_count,
        "pending_drafts": pending_drafts,
    }


# ---------------------------------------------------------------------------
# Adapter functions (called by admin_inbox.py endpoints)
# ---------------------------------------------------------------------------

def _email_to_dict(email: MonitoredEmail) -> dict:
    """Convert a MonitoredEmail to a JSON-serializable dict."""
    return {
        "id": email.id,
        "gmail_message_id": email.gmail_message_id,
        "thread_id": email.thread_id,
        "from_email": email.from_email,
        "from_name": email.from_name,
        "to_email": email.to_email,
        "subject": email.subject,
        "body_preview": email.body_preview,
        "body_full": email.body_full,
        "received_at": email.received_at.isoformat() if email.received_at else None,
        "is_urgent": email.is_urgent,
        "urgency_reason": email.urgency_reason,
        "category": email.category,
        "ai_summary": email.ai_summary,
        "ai_draft_response": email.ai_draft_response,
        "draft_status": email.draft_status,
        "admin_notes": email.admin_notes,
        "processed_at": email.processed_at.isoformat() if email.processed_at else None,
        "created_at": email.created_at.isoformat() if email.created_at else None,
    }


async def get_google_oauth_url() -> str:
    """Adapter: return OAuth consent URL."""
    return get_oauth_url()


async def exchange_oauth_code(db: AsyncSession, code: str) -> dict:
    """Adapter: exchange code for tokens using first monitored email."""
    monitored = [
        e.strip()
        for e in settings.GOOGLE_MONITORED_EMAILS.split(",")
        if e.strip()
    ]
    email = monitored[0] if monitored else "hello@find-commonground.com"
    token_record = await exchange_code_for_token(db, code, email)
    return {"email": token_record.email, "status": "connected"}


async def get_emails_paginated(
    db: AsyncSession,
    *,
    category: str | None = None,
    is_urgent: bool | None = None,
    draft_status: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    """Adapter: paginated email listing with filters."""
    from sqlalchemy import desc

    query = select(MonitoredEmail)
    count_query = select(func.count(MonitoredEmail.id))

    if category:
        query = query.where(MonitoredEmail.category == category)
        count_query = count_query.where(MonitoredEmail.category == category)
    if is_urgent is not None:
        query = query.where(MonitoredEmail.is_urgent.is_(is_urgent))
        count_query = count_query.where(MonitoredEmail.is_urgent.is_(is_urgent))
    if draft_status:
        query = query.where(MonitoredEmail.draft_status == draft_status)
        count_query = count_query.where(MonitoredEmail.draft_status == draft_status)

    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(desc(MonitoredEmail.received_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    emails = result.scalars().all()

    return {
        "emails": [_email_to_dict(e) for e in emails],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


async def get_email_by_id(db: AsyncSession, email_id: str) -> dict | None:
    """Adapter: get a single email by ID."""
    email = await db.get(MonitoredEmail, email_id)
    if not email:
        return None
    return _email_to_dict(email)


async def approve_email_draft(db: AsyncSession, email_id: str) -> dict:
    """Adapter: approve an AI draft and send it via Gmail."""
    email = await db.get(MonitoredEmail, email_id)
    if not email:
        raise ValueError(f"Email {email_id} not found")
    if not email.ai_draft_response:
        raise ValueError("No AI draft available to approve")

    email.draft_status = "approved"
    result = await send_reply(db, email_id, email.ai_draft_response)
    return {"status": "sent", **result}


async def reject_email_draft(db: AsyncSession, email_id: str) -> dict:
    """Adapter: reject an AI draft."""
    email = await db.get(MonitoredEmail, email_id)
    if not email:
        raise ValueError(f"Email {email_id} not found")

    email.draft_status = "rejected"
    await db.flush()
    return {"status": "rejected", "email_id": email_id}


async def sync_emails(db: AsyncSession) -> dict:
    """Adapter: trigger a manual email sync + AI analysis."""
    new_emails = await fetch_new_emails(db)

    # Auto-analyze each new email
    analyzed = 0
    for email in new_emails:
        try:
            await analyze_email(db, email.id)
            analyzed += 1
        except Exception as e:
            logger.warning("Could not analyze email %s: %s", email.id, e)

    return {
        "fetched": len(new_emails),
        "analyzed": analyzed,
    }


async def get_digests(db: AsyncSession, limit: int = 20) -> list[dict]:
    """Adapter: return recent digest summaries."""
    from sqlalchemy import desc

    result = await db.execute(
        select(EmailDigest)
        .order_by(desc(EmailDigest.created_at))
        .limit(limit)
    )
    digests = result.scalars().all()
    return [
        {
            "id": d.id,
            "period_start": d.period_start.isoformat() if d.period_start else None,
            "period_end": d.period_end.isoformat() if d.period_end else None,
            "total_emails": d.total_emails,
            "urgent_count": d.urgent_count,
            "summary_json": d.summary_json,
            "sent_at": d.sent_at.isoformat() if d.sent_at else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in digests
    ]

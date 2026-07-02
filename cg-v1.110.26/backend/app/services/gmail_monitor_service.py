"""Gmail monitoring service — OAuth, inbox fetch, AI analysis, and digest generation."""

import base64
import json
import logging
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from typing import Optional
from urllib.parse import urlencode

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.ai_clients import get_async_anthropic, get_async_openai
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
        if resp.status_code != 200:
            error_body = resp.text
            logger.error(
                "Google token exchange failed (HTTP %s): %s  |  redirect_uri=%s",
                resp.status_code,
                error_body,
                _redirect_uri(),
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


_ALIAS_DOMAIN = "find-commonground.com"


def _parse_email_list(raw: str) -> list[str]:
    """Pull bare email addresses out of a raw ``To:``-style header string.

    Gmail hands us strings like ``"CG Info" <info@find-commonground.com>,
    "CG Sales" <sales@find-commonground.com>``. We want just the addresses,
    lowercased, in order.
    """
    if not raw:
        return []
    out: list[str] = []
    for part in raw.split(","):
        part = part.strip()
        if "<" in part and ">" in part:
            part = part.split("<", 1)[1].split(">", 1)[0]
        part = part.strip().strip('"').strip("'")
        if "@" in part:
            out.append(part.lower())
    return out


def _extract_recipient_alias(headers: list[dict], fallback: str) -> str:
    """Figure out which alias the admin actually sent mail *to*.

    When all of ``info@``, ``partnerships@``, ``hello@``, etc. forward to
    the same authenticated mailbox (``teejay@find-commonground.com``),
    Gmail's ``message.messages.get`` still exposes the original recipient
    two ways:

    1. ``Delivered-To:`` — the most reliable signal. Gmail writes the
       actual alias here even when the ``To:`` header was a BCC, a group
       address, or a list. We prefer this.
    2. ``To:`` — fallback when ``Delivered-To`` is absent (some automated
       senders strip it).

    If both headers contain several addresses, we prefer one on our own
    domain (``find-commonground.com``) over third-party ones. If nothing
    useful is found we fall back to the authenticated OAuth account —
    that preserves the old behavior instead of 500'ing the sync.
    """
    for header_name in ("Delivered-To", "To"):
        candidates = _parse_email_list(_extract_header(headers, header_name))
        if not candidates:
            continue
        # Prefer the matching-domain address (our alias) if present.
        own_domain = [c for c in candidates if c.endswith(f"@{_ALIAS_DOMAIN}")]
        if own_domain:
            return own_domain[0]
        # Otherwise return whatever we found — better than no data.
        return candidates[0]
    return (fallback or "").lower()


async def _resolve_sync_addresses(db: AsyncSession) -> list[str]:
    """Figure out which Gmail inboxes to pull from on a sync run.

    Priority:
      1. Env var ``GOOGLE_MONITORED_EMAILS`` intersected with addresses that
         actually have an OAuth token row (avoids trying to sync an address
         the admin never authorized).
      2. If (1) is empty, fall back to **every** stored Gmail token
         (``scopes`` contains "gmail" — this excludes the GA4 token which
         lives in the same table under email ``ga4-analytics@commonground``).

    Rationale: the env-var whitelist pattern is brittle — one typo on Render
    and sync silently returns ``{fetched: 0}`` because no address matches.
    After a successful OAuth handshake the admin is absolutely expecting the
    connected inbox to start syncing; falling back to the token table makes
    that the default behavior.
    """
    env_list = [
        e.strip()
        for e in (settings.GOOGLE_MONITORED_EMAILS or "").split(",")
        if e.strip()
    ]

    if env_list:
        matched_rows = await db.execute(
            select(GoogleOAuthToken.email).where(
                GoogleOAuthToken.email.in_(env_list)
            )
        )
        matched = [r[0] for r in matched_rows.all()]
        if matched:
            return matched
        logger.warning(
            "GOOGLE_MONITORED_EMAILS=%s has no matching OAuth token rows; "
            "falling back to every Gmail-scoped token in the DB.",
            env_list,
        )

    fallback_rows = await db.execute(
        select(GoogleOAuthToken.email).where(
            GoogleOAuthToken.scopes.ilike("%gmail%")
        )
    )
    return [r[0] for r in fallback_rows.all()]


async def is_gmail_connected(db: AsyncSession) -> bool:
    """Return True when we have at least one Gmail-scoped OAuth token.

    Called by ``/admin/inbox/status``. Previously this function did not
    exist and the endpoint silently caught the ``ImportError`` and
    returned ``connected: false`` forever — which is why the frontend kept
    showing "Gmail isn't connected yet" right after a successful OAuth
    handshake.

    We filter on ``scopes LIKE '%gmail%'`` so the GA4 token (stored in the
    same ``google_oauth_tokens`` table under the sentinel email
    ``ga4-analytics@commonground`` with analytics/webmasters scopes) does
    not count as a Gmail connection.
    """
    result = await db.execute(
        select(func.count(GoogleOAuthToken.id)).where(
            GoogleOAuthToken.scopes.ilike("%gmail%")
        )
    )
    return (result.scalar() or 0) > 0


async def fetch_new_emails(
    db: AsyncSession,
    since_hours: int = 72,
) -> list[MonitoredEmail]:
    """Fetch recent emails for all monitored accounts and create MonitoredEmail records."""
    monitored_addresses = await _resolve_sync_addresses(db)
    new_emails: list[MonitoredEmail] = []

    logger.info("Syncing emails for monitored addresses: %s", monitored_addresses)
    if not monitored_addresses:
        logger.warning(
            "No Gmail OAuth tokens found. Set GOOGLE_MONITORED_EMAILS and "
            "complete the Connect flow on /superadmin/inbox."
        )

    after_epoch = int((datetime.utcnow() - timedelta(hours=since_hours)).timestamp())

    for address in monitored_addresses:
        try:
            client, _ = await _get_gmail_client(db, address)
            logger.info("Got Gmail client for %s", address)
        except ValueError as ve:
            logger.warning("No OAuth token for %s — skipping: %s", address, ve)
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
            if resp.status_code != 200:
                logger.error("Gmail API error for %s (HTTP %s): %s", address, resp.status_code, resp.text[:500])
                resp.raise_for_status()
            gmail_data = resp.json()
            message_ids = [m["id"] for m in gmail_data.get("messages", [])]
            logger.info("Gmail returned %d messages for %s (since %d hours ago)", len(message_ids), address, since_hours)

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

                # Use the *actual* alias from the message headers, not the
                # account we authenticated as. All of info@, partnerships@,
                # hello@, etc. route to the same mailbox — storing the
                # authenticated address here made every email appear under
                # the "TeeJay" tab on /superadmin/inbox.
                recipient_alias = _extract_recipient_alias(headers, address)

                email_record = MonitoredEmail(
                    gmail_message_id=msg_id,
                    thread_id=msg_data.get("threadId"),
                    from_email=from_email,
                    from_name=from_name,
                    to_email=recipient_alias,
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
        "CommonGround email addresses and their purposes:\n"
        "- hello@find-commonground.com — General inquiries\n"
        "- info@find-commonground.com — General information requests\n"
        "- support@find-commonground.com — Customer support\n"
        "- sales@find-commonground.com — Sales inquiries, pricing, demos\n"
        "- onboarding@find-commonground.com — New user onboarding help\n"
        "- partnerships@find-commonground.com — Business partnerships, integrations\n"
        "- teejay@find-commonground.com — CEO/founder direct\n"
        "All are aliases for the same account.\n\n"
        f"From: {email_record.from_name or ''} <{email_record.from_email}>\n"
        f"To: {email_record.to_email}\n"
        f"Subject: {email_record.subject}\n"
        f"Body:\n{email_record.body_full[:3000]}\n\n"
        "Return ONLY valid JSON with these keys:\n"
        "- is_urgent (bool): true if requires response within 24h\n"
        "- urgency_reason (string or null): why it's urgent\n"
        "- priority (string): one of 'high', 'medium', 'low'\n"
        "  high = needs response today, medium = within 2-3 days, low = informational/no rush\n"
        "- category (string): one of:\n"
        "  support (bug reports, feature issues, account problems),\n"
        "  sales (pricing questions, demos, enterprise inquiries),\n"
        "  onboarding (new user questions, setup help, getting started),\n"
        "  billing (payment issues, refunds, subscription changes),\n"
        "  partnership (business partnerships, integrations, legal professionals),\n"
        "  legal (legal notices, compliance, attorney communications),\n"
        "  feedback (product feedback, feature requests, reviews),\n"
        "  notification (automated notifications, system alerts, newsletters),\n"
        "  spam (unsolicited marketing, scams),\n"
        "  personal (personal messages to team members),\n"
        "  other (doesn't fit any category)\n"
        "- suggested_label (string): a short label for organizing, e.g. 'Bug Report', "
        "'Pricing Question', 'New User Help', 'Payment Failed'\n"
        "- summary (string): 1-2 sentence summary of the email\n"
        "- action_needed (string): specific action to take, e.g. 'Reply with pricing info', "
        "'Escalate to engineering', 'No action needed'\n"
        "- draft_response (string): professional, empathetic draft reply in CommonGround brand voice. "
        "Sign as 'The CommonGround Team' unless it's a personal email to teejay."
    )

    try:
        client = get_async_anthropic()
        response = await client.messages.create(
            model="claude-sonnet-4-5",
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
        # Store extra analysis fields in admin_notes as JSON if present
        extra = {}
        if analysis.get("priority"):
            extra["priority"] = analysis["priority"]
        if analysis.get("suggested_label"):
            extra["suggested_label"] = analysis["suggested_label"]
        if analysis.get("action_needed"):
            extra["action_needed"] = analysis["action_needed"]
        if extra:
            email_record.admin_notes = json.dumps(extra)
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

_EMAIL_SIGNATURE = """
<br><br>
<table cellpadding="0" cellspacing="0" style="border-top: 2px solid #3DAA8A; padding-top: 16px; margin-top: 24px; font-family: 'DM Sans', Helvetica, Arial, sans-serif;">
  <tr>
    <td style="padding-right: 16px; vertical-align: top;">
      <img src="https://find-commonground.com/images/logo-email.png" alt="CommonGround" width="48" height="48" style="border-radius: 12px;" />
    </td>
    <td style="vertical-align: top;">
      <div style="font-size: 14px; font-weight: 600; color: #1E3A4A;">CommonGround Team</div>
      <div style="font-size: 12px; color: #6B8A9A; margin-top: 2px;">The calm way to co-parent</div>
      <div style="margin-top: 8px;">
        <a href="https://find-commonground.com" style="font-size: 12px; color: #3DAA8A; text-decoration: none;">find-commonground.com</a>
        <span style="color: #D0E4EC; margin: 0 6px;">|</span>
        <a href="mailto:hello@find-commonground.com" style="font-size: 12px; color: #3DAA8A; text-decoration: none;">hello@find-commonground.com</a>
      </div>
    </td>
  </tr>
</table>
"""


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
        # Build the reply MIME message (HTML to support formatting)
        # Convert plain newlines to <br> if the body doesn't contain HTML tags
        if "<" not in response_body or "<br" not in response_body.lower():
            html_body = response_body.replace("\n", "<br>")
        else:
            html_body = response_body
        # Append branded signature
        html_body += _EMAIL_SIGNATURE
        mime_msg = MIMEText(html_body, "html")
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
    """Exchange code for tokens, detecting the actual Google account email."""
    monitored = [
        e.strip()
        for e in settings.GOOGLE_MONITORED_EMAILS.split(",")
        if e.strip()
    ]
    fallback_email = monitored[0] if monitored else "teejay@find-commonground.com"

    # Exchange the code first to get the access token
    token_record = await exchange_code_for_token(db, code, fallback_email)

    # Now use the token to detect the actual authenticated Gmail address
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            profile_resp = await client.get(
                f"{GMAIL_API_BASE}/users/me/profile",
                headers={"Authorization": f"Bearer {token_record.access_token}"},
            )
            if profile_resp.status_code == 200:
                actual_email = profile_resp.json().get("emailAddress", "")
                if actual_email and actual_email != token_record.email:
                    logger.info(
                        "OAuth token was for %s, updating record from %s",
                        actual_email, token_record.email,
                    )
                    token_record.email = actual_email
                    await db.flush()
    except Exception as exc:
        logger.warning("Could not detect Gmail profile email: %s", exc)

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


async def backfill_recipient_aliases(
    db: AsyncSession,
    limit: int = 500,
) -> dict:
    """Re-hydrate the ``to_email`` column for emails synced before the alias fix.

    Before the alias fix, every synced email got stored with
    ``to_email = <the authenticated OAuth account>`` — which meant the
    frontend's per-alias tab bar (Hello / Info / Partnerships / etc.) put
    everything under "TeeJay." This function walks existing
    ``MonitoredEmail`` rows, re-fetches the original message from Gmail
    (by ``gmail_message_id``), and updates ``to_email`` to the real
    recipient alias extracted from ``Delivered-To`` / ``To`` headers.

    Returns counts so the admin UI can show a summary. Caps at ``limit``
    so the request can't hang forever on a huge inbox — just call it
    again if more need fixing.
    """
    addresses = await _resolve_sync_addresses(db)
    if not addresses:
        return {"updated": 0, "checked": 0, "skipped": 0, "reason": "no_gmail_tokens"}

    # One Gmail client per authenticated account; reused across rows.
    clients: dict[str, httpx.AsyncClient] = {}
    try:
        for addr in addresses:
            try:
                client, _ = await _get_gmail_client(db, addr)
                clients[addr] = client
            except ValueError as ve:
                logger.warning("backfill: cannot auth %s — %s", addr, ve)

        if not clients:
            return {"updated": 0, "checked": 0, "skipped": 0, "reason": "all_clients_failed"}

        # Only touch rows whose current to_email is one of the authenticated
        # addresses (the pre-fix default). Rows already on the right alias
        # are skipped — cheap idempotence.
        result = await db.execute(
            select(MonitoredEmail)
            .where(MonitoredEmail.to_email.in_(list(clients.keys())))
            .order_by(MonitoredEmail.received_at.desc())
            .limit(limit)
        )
        rows = list(result.scalars().all())

        updated = 0
        skipped = 0
        # Gmail's v1 API doesn't let us batch message.get by ID in a single
        # call, but since we only need headers we can request a tiny
        # ``metadata`` format which is ~10x cheaper than ``full``.
        for row in rows:
            # Pick a client — use the account that originally synced this row.
            client = clients.get(row.to_email) or next(iter(clients.values()))
            try:
                resp = await client.get(
                    f"{GMAIL_API_BASE}/users/me/messages/{row.gmail_message_id}",
                    params={
                        "format": "metadata",
                        "metadataHeaders": "To,Delivered-To",
                    },
                )
                if resp.status_code != 200:
                    skipped += 1
                    continue
                headers = resp.json().get("payload", {}).get("headers", [])
                new_alias = _extract_recipient_alias(headers, row.to_email)
                if new_alias and new_alias != row.to_email:
                    row.to_email = new_alias
                    updated += 1
                else:
                    skipped += 1
            except Exception as exc:
                logger.warning(
                    "backfill: failed to refetch %s: %s", row.gmail_message_id, exc
                )
                skipped += 1

        await db.flush()
        return {"updated": updated, "checked": len(rows), "skipped": skipped}
    finally:
        for c in clients.values():
            await c.aclose()


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


async def generate_thread_reply(
    db: AsyncSession,
    email_id: str,
    instructions: str = "",
) -> dict:
    """Generate an AI reply with full thread context."""
    email_record = await db.get(MonitoredEmail, email_id)
    if not email_record:
        raise ValueError("Email not found")

    # Load thread context
    thread_emails = [email_record]
    if email_record.thread_id:
        result = await db.execute(
            select(MonitoredEmail)
            .where(MonitoredEmail.thread_id == email_record.thread_id)
            .order_by(MonitoredEmail.received_at.asc())
        )
        thread_emails = list(result.scalars().all())

    # Build thread context (cap at 10k chars)
    thread_text = ""
    for i, msg in enumerate(thread_emails):
        entry = (
            f"--- Message {i + 1} ---\n"
            f"From: {msg.from_name or msg.from_email} <{msg.from_email}>\n"
            f"To: {msg.to_email}\n"
            f"Date: {msg.received_at.isoformat() if msg.received_at else 'unknown'}\n"
            f"Subject: {msg.subject}\n\n"
            f"{msg.body_full[:2000]}\n\n"
        )
        if len(thread_text) + len(entry) > 10000:
            thread_text += f"\n[{len(thread_emails) - i} earlier messages truncated]\n"
            break
        thread_text += entry

    instruction_line = ""
    if instructions:
        instruction_line = f"\nSpecial instructions: {instructions}\n"

    prompt = (
        "You are the executive assistant for CommonGround, an AI-powered co-parenting "
        "platform (https://www.find-commonground.com). Generate a professional, "
        "empathetic reply to the latest email in this thread.\n\n"
        "Guidelines:\n"
        "- Reference earlier messages in the thread where relevant\n"
        "- Be helpful and solution-oriented\n"
        "- Match the formality level of the sender\n"
        "- Sign as 'The CommonGround Team' unless it's a personal email to teejay\n"
        f"{instruction_line}\n"
        f"Email Thread ({len(thread_emails)} messages):\n\n{thread_text}\n\n"
        "Generate a reply to the LATEST message. Return ONLY the reply text, no JSON."
    )

    draft = None
    provider = None

    try:
        if settings.ANTHROPIC_API_KEY:
            client = get_async_anthropic()
            response = await client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}],
            )
            draft = response.content[0].text.strip()
            provider = "claude"
    except Exception as e:
        logger.warning("Claude thread reply failed: %s", e)

    if not draft:
        try:
            if settings.OPENAI_API_KEY:
                oai = get_async_openai()
                resp = await oai.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=1500,
                )
                draft = (resp.choices[0].message.content or "").strip()
                provider = "openai"
        except Exception as e:
            logger.warning("OpenAI thread reply also failed: %s", e)

    if not draft:
        draft = "Unable to generate a reply at this time. Please compose manually."
        provider = None

    return {
        "draft_response": draft,
        "provider": provider,
        "thread_length": len(thread_emails),
    }


async def get_inbox_kpis(db: AsyncSession) -> dict:
    """Compute inbox KPIs: volume trends, recipient breakdown, approval rates."""
    kpis: dict = {}

    try:
        # By recipient
        result = await db.execute(
            select(MonitoredEmail.to_email, func.count(MonitoredEmail.id))
            .group_by(MonitoredEmail.to_email)
        )
        kpis["by_recipient"] = {row[0]: row[1] for row in result}
    except Exception as e:
        logger.warning("KPI by_recipient failed: %s", e)
        kpis["by_recipient"] = {}

    try:
        # Volume trend: daily counts for last 30 days
        from sqlalchemy import cast, Date
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        result = await db.execute(
            select(
                cast(MonitoredEmail.received_at, Date).label("day"),
                func.count(MonitoredEmail.id),
            )
            .where(MonitoredEmail.received_at >= thirty_days_ago)
            .group_by("day")
            .order_by("day")
        )
        kpis["volume_trend"] = [
            {"date": row[0].isoformat() if row[0] else None, "count": row[1]}
            for row in result
        ]
    except Exception as e:
        logger.warning("KPI volume_trend failed: %s", e)
        kpis["volume_trend"] = []

    try:
        # Draft approval rate
        total_with_drafts = await db.scalar(
            select(func.count(MonitoredEmail.id))
            .where(MonitoredEmail.ai_draft_response.isnot(None))
        ) or 0
        approved_or_sent = await db.scalar(
            select(func.count(MonitoredEmail.id))
            .where(
                MonitoredEmail.ai_draft_response.isnot(None),
                MonitoredEmail.draft_status.in_(["approved", "sent"]),
            )
        ) or 0
        kpis["draft_approval_rate"] = (
            round(approved_or_sent / total_with_drafts * 100, 1)
            if total_with_drafts > 0 else 0
        )
        kpis["total_with_drafts"] = total_with_drafts
        kpis["approved_or_sent"] = approved_or_sent
    except Exception as e:
        logger.warning("KPI approval rate failed: %s", e)
        kpis["draft_approval_rate"] = 0

    try:
        # Category distribution
        result = await db.execute(
            select(MonitoredEmail.category, func.count(MonitoredEmail.id))
            .group_by(MonitoredEmail.category)
        )
        kpis["by_category"] = {row[0]: row[1] for row in result}
    except Exception as e:
        logger.warning("KPI by_category failed: %s", e)
        kpis["by_category"] = {}

    try:
        # Total and urgent
        kpis["total"] = await db.scalar(select(func.count(MonitoredEmail.id))) or 0
        kpis["urgent"] = await db.scalar(
            select(func.count(MonitoredEmail.id))
            .where(MonitoredEmail.is_urgent == True)
        ) or 0
    except Exception as e:
        logger.warning("KPI totals failed: %s", e)
        kpis.setdefault("total", 0)
        kpis.setdefault("urgent", 0)

    return kpis

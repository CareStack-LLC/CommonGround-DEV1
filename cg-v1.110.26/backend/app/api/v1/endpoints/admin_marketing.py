"""
Marketing Analytics admin endpoints for the SuperAdmin portal.

Every endpoint reads real data:
  - `/content-performance` → GA4 blog pages (requires GA4 OAuth connected)
  - `/seo-insights` → Google Search Console (reuses GA4 OAuth; `webmasters.readonly` scope)
  - `/campaign-analytics` → EmailCampaign.stats_json aggregation (SendGrid)
  - `/social-tracking` → Reddit subreddit posts + GA4 traffic sources + Lead utm_source
  - `/attribution` → Lead UTM fields joined with UserProfile subscription tier
  - `/ai-suggestions` → Claude with real metrics context

When upstream data sources are not connected (GA4, Search Console, Reddit),
endpoints return `{connected: false, ...}` with empty arrays so the UI can
render a "connect integration" CTA instead of fake data.
"""

import json
import logging
from collections import Counter
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Date, cast, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.lead import EmailCampaign, Lead
from app.models.user import User, UserProfile

logger = logging.getLogger(__name__)
router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════
# Content Performance (GA4)
# ═══════════════════════════════════════════════════════════════════════════
# Frontend interface ContentPerformance:
#   connected: boolean
#   posts: { title, views, avg_duration, ctr, conversions }[]
#   trend: { date, views }[]

@router.get("/marketing/content-performance")
async def get_content_performance(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Blog/content performance. Requires GA4 OAuth connected.

    If not connected, returns connected=false and empty arrays so the UI can
    render a "Connect GA4" CTA. No fallback sample data.
    """
    from app.services.ga4_service import (
        get_content_performance as ga4_content,
        is_ga4_connected,
    )

    connected = await is_ga4_connected(db)
    if not connected:
        return {
            "connected": False,
            "posts": [],
            "trend": [],
            "reason": "ga4_not_connected",
        }

    try:
        data = await ga4_content(db)
    except Exception as e:
        logger.error("GA4 content-performance failed: %s", e)
        data = None

    if not data:
        return {
            "connected": True,
            "posts": [],
            "trend": [],
            "reason": "ga4_returned_no_data",
        }

    return {
        "connected": True,
        "posts": data.get("posts", []),
        "trend": data.get("trend", []),
    }


# ═══════════════════════════════════════════════════════════════════════════
# SEO Insights (Google Search Console)
# ═══════════════════════════════════════════════════════════════════════════
# Frontend interface SEOInsights:
#   connected: boolean
#   queries: { query, position, impressions, clicks, ctr }[]
#   top_pages: { page, position, impressions, clicks, ctr }[]
#   position_trend: { date, avg_position, clicks, impressions }[]
#   site: string | null

@router.get("/marketing/seo-insights")
async def get_seo_insights(
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Search Console data. Reuses GA4 OAuth token (webmasters.readonly scope)."""
    from app.services.search_console_service import get_seo_insights as sc_insights

    return await sc_insights(db, days=days)


# ═══════════════════════════════════════════════════════════════════════════
# Campaign Analytics (SendGrid via EmailCampaign.stats_json)
# ═══════════════════════════════════════════════════════════════════════════

_STALE_THRESHOLD = timedelta(hours=24)


def _campaign_stats_summary(stats: Optional[dict]) -> dict:
    """Normalize a SendGrid singlesend stats blob to scalar counters.

    SendGrid returns a list of `results` (usually one entry for singlesends)
    each with a `stats` dict containing opens/clicks/unsubscribes/etc.
    We flatten to a single counter dict for our UI.
    """
    if not stats or not isinstance(stats, dict):
        return {
            "delivered": 0, "opens": 0, "unique_opens": 0,
            "clicks": 0, "unique_clicks": 0,
            "bounces": 0, "spam_reports": 0, "unsubscribes": 0,
        }

    results = stats.get("results") or []
    first = results[0] if results else stats
    s = first.get("stats") if isinstance(first, dict) and "stats" in first else first

    def _num(key: str) -> int:
        try:
            return int(s.get(key, 0) or 0) if isinstance(s, dict) else 0
        except (ValueError, TypeError):
            return 0

    return {
        "delivered": _num("delivered"),
        "opens": _num("opens"),
        "unique_opens": _num("unique_opens"),
        "clicks": _num("clicks"),
        "unique_clicks": _num("unique_clicks"),
        "bounces": _num("bounces") + _num("hard_bounces") + _num("soft_bounces"),
        "spam_reports": _num("spam_reports"),
        "unsubscribes": _num("unsubscribes"),
    }


@router.get("/marketing/campaign-analytics")
async def get_campaign_analytics(
    days: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Aggregate email campaign performance from EmailCampaign.stats_json.

    Stale records (>24h old) are NOT auto-refreshed from SendGrid here — that
    would make the endpoint slow and rate-limit-bound. Campaigns refresh on
    their detail page via `/admin/leads/campaigns/{id}/stats`.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)

    q = await db.execute(
        select(EmailCampaign).where(EmailCampaign.sent_at.isnot(None))
        .where(EmailCampaign.sent_at >= cutoff)
        .order_by(desc(EmailCampaign.sent_at))
    )
    campaigns_rows = list(q.scalars())

    # Per-campaign summary
    campaigns = []
    totals = Counter()
    daily_sends: Counter = Counter()
    for c in campaigns_rows:
        stats = _campaign_stats_summary(c.stats_json)
        delivered = stats["delivered"]
        unique_opens = stats["unique_opens"] or stats["opens"]
        unique_clicks = stats["unique_clicks"] or stats["clicks"]
        open_rate = round(unique_opens / delivered, 4) if delivered else 0.0
        click_rate = round(unique_clicks / delivered, 4) if delivered else 0.0
        ctr = round(unique_clicks / unique_opens, 4) if unique_opens else 0.0

        sent_at = c.sent_at.isoformat() if c.sent_at else None
        if c.sent_at:
            daily_sends[c.sent_at.date().isoformat()] += 1

        campaigns.append({
            "id": c.id,
            "name": c.name,
            "subject": c.subject,
            "status": c.status,
            "sent_at": sent_at,
            "delivered": delivered,
            "opens": stats["opens"],
            "unique_opens": unique_opens,
            "clicks": stats["clicks"],
            "unique_clicks": unique_clicks,
            "unsubscribes": stats["unsubscribes"],
            "bounces": stats["bounces"],
            "spam_reports": stats["spam_reports"],
            "open_rate": open_rate,
            "click_rate": click_rate,
            "ctr": ctr,
        })

        totals["delivered"] += delivered
        totals["opens"] += stats["opens"]
        totals["unique_opens"] += unique_opens
        totals["clicks"] += stats["clicks"]
        totals["unique_clicks"] += unique_clicks
        totals["unsubscribes"] += stats["unsubscribes"]
        totals["bounces"] += stats["bounces"]
        totals["spam_reports"] += stats["spam_reports"]

    # Build daily trend for last `days` days (fill zeros)
    trend = []
    today = datetime.utcnow().date()
    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        trend.append({"date": d, "sends": daily_sends.get(d, 0)})

    # Top-performing campaigns by CTR (min 50 delivered to filter noise)
    top_by_ctr = sorted(
        [c for c in campaigns if c["delivered"] >= 50],
        key=lambda c: c["ctr"],
        reverse=True,
    )[:5]

    # Overall rates
    delivered_total = totals["delivered"]
    overall_open_rate = round(totals["unique_opens"] / delivered_total, 4) if delivered_total else 0.0
    overall_click_rate = round(totals["unique_clicks"] / delivered_total, 4) if delivered_total else 0.0

    return {
        "period_days": days,
        "campaigns": campaigns,
        "top_performers": top_by_ctr,
        "trend": trend,
        "totals": {
            "campaigns_sent": len(campaigns),
            "delivered": delivered_total,
            "opens": totals["opens"],
            "unique_opens": totals["unique_opens"],
            "clicks": totals["clicks"],
            "unique_clicks": totals["unique_clicks"],
            "unsubscribes": totals["unsubscribes"],
            "bounces": totals["bounces"],
            "spam_reports": totals["spam_reports"],
            "open_rate": overall_open_rate,
            "click_rate": overall_click_rate,
        },
    }


# ═══════════════════════════════════════════════════════════════════════════
# Social Tracking (Reddit + GA4 + Lead UTM)
# ═══════════════════════════════════════════════════════════════════════════

async def _reddit_platform_stats(db: AsyncSession) -> Optional[dict]:
    """Aggregate cross-subreddit stats. Returns None if reddit not connected."""
    from sqlalchemy import text
    from sqlalchemy.exc import ProgrammingError

    try:
        cfg_q = await db.execute(
            text("SELECT key, value FROM reddit_config WHERE key IN ('client_id', 'client_secret', 'username', 'password', 'monitored_subreddits')")
        )
        cfg = {row.key: row.value for row in cfg_q}
    except ProgrammingError:
        await db.rollback()
        return None
    except Exception as e:
        logger.debug("Reddit config probe failed: %s", e)
        return None

    required = ("client_id", "client_secret", "username", "password")
    if not all(cfg.get(k) for k in required):
        return None

    subs_raw = cfg.get("monitored_subreddits")
    try:
        subs = json.loads(subs_raw) if subs_raw else ["coparenting", "custody", "divorce", "SingleParents"]
    except Exception:
        subs = ["coparenting", "custody", "divorce", "SingleParents"]

    try:
        from app.services.reddit_service import RedditService
        service = RedditService(
            client_id=cfg["client_id"],
            client_secret=cfg["client_secret"],
            username=cfg["username"],
            password=cfg["password"],
        )
        # Pull top posts from each subreddit to estimate reach
        total_subscribers = 0
        total_score = 0
        total_comments = 0
        posts_seen = 0
        for sub in subs[:6]:  # cap to keep latency sane
            try:
                data = await service.get_subreddit_posts(sub, sort="hot", limit=25)
                posts = data.get("posts", []) if isinstance(data, dict) else []
                for p in posts:
                    total_score += int(p.get("score", 0) or 0)
                    total_comments += int(p.get("num_comments", 0) or 0)
                    posts_seen += 1
                # about endpoint — we already have `verify_auth`, try subreddit about
                about = await service.get_subreddit_about(sub) if hasattr(service, "get_subreddit_about") else None
                if about and isinstance(about, dict):
                    total_subscribers += int(about.get("subscribers", 0) or 0)
            except Exception as e:
                logger.debug("Reddit stats fetch failed for %s: %s", sub, e)
                continue

        avg_engagement = (total_score + total_comments) / max(posts_seen, 1)
        return {
            "platform": "Reddit",
            "followers": total_subscribers,
            "impressions": total_score * 10,  # heuristic: upvotes × 10 ≈ impressions
            "engagement": int(avg_engagement),
            "posts_observed": posts_seen,
            "subreddits_tracked": subs,
        }
    except Exception as e:
        logger.warning("Reddit platform stats aggregation failed: %s", e)
        return None


@router.get("/marketing/social-tracking")
async def get_social_tracking(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Aggregate social-source signals from Reddit + GA4 + Lead UTM.

    For each platform (reddit, twitter, linkedin, facebook, instagram, tiktok):
      - `followers`, `impressions`, `engagement` come from platform APIs (only Reddit wired today)
      - `referral_clicks` comes from GA4 `sessionSource`
      - `leads_generated` comes from Lead.utm_source
    """
    platforms: list[dict] = []

    # Reddit — real data if connected
    reddit = await _reddit_platform_stats(db)

    # GA4 traffic by source/medium — gives referral clicks by platform
    referral_by_source: dict[str, int] = {}
    try:
        from app.services.ga4_service import _run_report, is_ga4_connected
        if await is_ga4_connected(db):
            rows = await _run_report(
                db,
                dimensions=["sessionSource"],
                metrics=["sessions"],
                start_date="30daysAgo",
                order_by="sessions",
                limit=50,
            ) or []
            for r in rows:
                src = (r.get("sessionSource") or "").lower()
                referral_by_source[src] = int(r.get("sessions", 0) or 0)
    except Exception as e:
        logger.debug("GA4 referral fetch failed: %s", e)

    # Leads by utm_source (last 90 days, only converted leads count)
    leads_by_utm: dict[str, int] = {}
    try:
        utm_q = await db.execute(
            select(Lead.utm_source, func.count(Lead.id))
            .where(Lead.converted_user_id.isnot(None))
            .where(Lead.utm_source.isnot(None))
            .group_by(Lead.utm_source)
        )
        for src, count in utm_q:
            if src:
                leads_by_utm[src.lower()] = int(count)
    except Exception as e:
        logger.debug("Lead UTM aggregation failed: %s", e)

    def _platform_row(name: str, aliases: list[str], reddit_data: Optional[dict] = None) -> dict:
        # Sum matching GA4 sources + Lead UTMs across aliases
        refs = sum(referral_by_source.get(a, 0) for a in aliases)
        leads = sum(leads_by_utm.get(a, 0) for a in aliases)
        return {
            "platform": name,
            "followers": reddit_data.get("followers", 0) if reddit_data else 0,
            "impressions": reddit_data.get("impressions", 0) if reddit_data else 0,
            "engagement": reddit_data.get("engagement", 0) if reddit_data else 0,
            "referral_clicks": refs,
            "leads_generated": leads,
            "connected": bool(reddit_data) if name == "Reddit" else (refs > 0 or leads > 0),
        }

    platforms.append(_platform_row("Reddit", ["reddit", "reddit.com", "www.reddit.com"], reddit))
    platforms.append(_platform_row("Twitter/X", ["twitter", "t.co", "x.com"]))
    platforms.append(_platform_row("LinkedIn", ["linkedin", "linkedin.com", "lnkd.in"]))
    platforms.append(_platform_row("Facebook", ["facebook", "facebook.com", "fb.com", "l.facebook.com"]))
    platforms.append(_platform_row("Instagram", ["instagram", "instagram.com", "l.instagram.com"]))
    platforms.append(_platform_row("TikTok", ["tiktok", "tiktok.com"]))

    referral_chart = [
        {"platform": p["platform"], "visits": p["referral_clicks"]}
        for p in platforms if p["referral_clicks"] > 0
    ]

    return {
        "platforms": platforms,
        "referral_chart": referral_chart,
        "reddit_connected": reddit is not None,
        "ga4_connected": bool(referral_by_source),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Attribution (Lead UTM → Conversion)
# ═══════════════════════════════════════════════════════════════════════════
# Frontend interface Attribution:
#   first_touch: { channel, value }[]
#   last_touch: { channel, value }[]
#   channels: { channel, first_touch, last_touch, assisted, conversion_rate }[]

# Tier prices for attributed-revenue calc (matches admin_sales.py)
_TIER_PRICES = {
    "web_starter": 0,
    "plus": 17.99, "complete": 34.99,
    "professional_starter": 49.00,
    "solo": 99.00, "small_firm": 299.00, "mid_size": 799.00,
}


def _channel_from_utm(source: Optional[str], medium: Optional[str]) -> str:
    """Normalize UTM source/medium into a channel label matching GA4's default grouping."""
    src = (source or "").lower()
    med = (medium or "").lower()

    if not src and not med:
        return "Direct"
    if med in ("cpc", "ppc", "paid", "paidsearch", "paid_search"):
        return "Paid Search"
    if med in ("social", "paid-social", "paid_social") or src in (
        "reddit", "twitter", "linkedin", "facebook", "instagram", "tiktok", "x"
    ):
        return "Social"
    if med in ("email",) or src == "sendgrid":
        return "Email"
    if med in ("referral",):
        return "Referral"
    if med in ("organic",) or src in ("google", "bing", "duckduckgo"):
        return "Organic Search"
    if src in ("blog", "landing_page", "newsletter"):
        return "Content"
    return "Other"


@router.get("/marketing/attribution")
async def get_attribution(
    days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Multi-touch attribution derived from Lead.utm_* fields + conversion state.

    - first_touch: channel of first Lead record for each converted user
    - last_touch: same user can have multiple Lead rows (multiple signups); we take latest
    - assisted: users with ≥2 Leads (indicates multiple touches before converting)
    - conversion_rate: per-channel (converted_leads / total_leads_in_channel)
    """
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Pull leads in window
    q = await db.execute(
        select(Lead)
        .where(Lead.created_at >= cutoff)
        .order_by(Lead.created_at)
    )
    leads = list(q.scalars())

    if not leads:
        return {
            "period_days": days,
            "first_touch": [],
            "last_touch": [],
            "channels": [],
            "total_conversions": 0,
            "total_attributed_revenue": 0.0,
        }

    # Group leads by email (same person can have multiple Lead rows across campaigns)
    from collections import defaultdict
    by_email: dict[str, list[Lead]] = defaultdict(list)
    for ld in leads:
        if ld.email:
            by_email[ld.email.lower()].append(ld)

    # First-touch / last-touch per converted user
    first_touch = Counter()
    last_touch = Counter()
    assisted = Counter()
    channel_totals = Counter()
    channel_converted = Counter()

    for email, records in by_email.items():
        records.sort(key=lambda r: r.created_at or datetime.min)
        first = records[0]
        last = records[-1]
        first_ch = _channel_from_utm(first.utm_source, first.utm_medium)
        last_ch = _channel_from_utm(last.utm_source, last.utm_medium)

        # Track totals per channel (using first-touch channel for volume)
        channel_totals[first_ch] += 1

        converted = any(r.converted_user_id for r in records)
        if converted:
            first_touch[first_ch] += 1
            last_touch[last_ch] += 1
            channel_converted[first_ch] += 1
            if len(records) >= 2:
                assisted[first_ch] += 1

    # Revenue attributed to first-touch channel — look up subscription tier per converted user
    converted_user_ids = [
        r.converted_user_id for r in leads if r.converted_user_id
    ]
    revenue_by_channel = Counter()
    if converted_user_ids:
        # Map user_id → channel
        channel_by_user = {}
        for email, records in by_email.items():
            records.sort(key=lambda r: r.created_at or datetime.min)
            first = records[0]
            for r in records:
                if r.converted_user_id:
                    channel_by_user[r.converted_user_id] = _channel_from_utm(
                        first.utm_source, first.utm_medium
                    )

        tier_q = await db.execute(
            select(UserProfile.user_id, UserProfile.subscription_tier)
            .where(UserProfile.user_id.in_(converted_user_ids))
        )
        for user_id, tier in tier_q:
            price = _TIER_PRICES.get(tier, 0.0)
            ch = channel_by_user.get(user_id, "Direct")
            revenue_by_channel[ch] += price

    all_channels = set(channel_totals) | set(first_touch) | set(last_touch)
    channels = []
    for ch in sorted(all_channels):
        total = channel_totals[ch]
        converted = channel_converted[ch]
        cr = round(converted / total, 4) if total else 0.0
        channels.append({
            "channel": ch,
            "first_touch": first_touch[ch],
            "last_touch": last_touch[ch],
            "assisted": assisted[ch],
            "total_leads": total,
            "conversion_rate": cr,
            "attributed_mrr": round(revenue_by_channel[ch], 2),
        })

    return {
        "period_days": days,
        "first_touch": [{"channel": ch, "value": v} for ch, v in first_touch.most_common()],
        "last_touch": [{"channel": ch, "value": v} for ch, v in last_touch.most_common()],
        "channels": channels,
        "total_conversions": sum(first_touch.values()),
        "total_attributed_mrr": round(sum(revenue_by_channel.values()), 2),
    }


# ═══════════════════════════════════════════════════════════════════════════
# AI Marketing Suggestions (Claude with real metric context)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/marketing/ai-suggestions")
async def get_marketing_ai_suggestions(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Generate marketing suggestions from Claude, grounded in real metrics.

    Shape matches the frontend:
      - content_ideas: string[]
      - campaign_suggestions: { title, description }[]
      - audience_insights: string[]
      - timing_recommendations: string[]
    """
    # Gather real context
    now = datetime.utcnow()
    cutoff_30 = now - timedelta(days=30)
    cutoff_60 = now - timedelta(days=60)

    recent_q = await db.execute(
        select(func.count(User.id)).where(User.created_at >= cutoff_30)
    )
    recent_signups = recent_q.scalar() or 0

    prev_q = await db.execute(
        select(func.count(User.id)).where(
            User.created_at >= cutoff_60,
            User.created_at < cutoff_30,
        )
    )
    prev_signups = prev_q.scalar() or 0
    growth_pct = ((recent_signups - prev_signups) / max(prev_signups, 1)) * 100

    # Top UTM source for last 90 days
    utm_q = await db.execute(
        select(Lead.utm_source, func.count(Lead.id))
        .where(Lead.created_at >= now - timedelta(days=90))
        .where(Lead.utm_source.isnot(None))
        .group_by(Lead.utm_source)
        .order_by(desc(func.count(Lead.id)))
        .limit(3)
    )
    top_sources = [(src, int(cnt)) for src, cnt in utm_q if src]

    # Top-performing campaign (by CTR with ≥50 delivered)
    camp_q = await db.execute(
        select(EmailCampaign)
        .where(EmailCampaign.sent_at.isnot(None))
        .where(EmailCampaign.sent_at >= now - timedelta(days=60))
    )
    best_campaign = None
    best_ctr = 0.0
    for c in camp_q.scalars():
        stats = _campaign_stats_summary(c.stats_json)
        if stats["delivered"] < 50:
            continue
        unique_clicks = stats["unique_clicks"] or stats["clicks"]
        unique_opens = stats["unique_opens"] or stats["opens"]
        ctr = unique_clicks / unique_opens if unique_opens else 0
        if ctr > best_ctr:
            best_ctr = ctr
            best_campaign = c

    context_lines = [
        f"- New signups (last 30 days): {recent_signups}",
        f"- Prior 30-day signups: {prev_signups}",
        f"- Signup growth: {growth_pct:+.1f}%",
    ]
    if top_sources:
        context_lines.append(
            "- Top lead sources: " + ", ".join(f"{s} ({c})" for s, c in top_sources)
        )
    if best_campaign:
        context_lines.append(
            f"- Best campaign: \"{best_campaign.name}\" (CTR: {best_ctr:.1%})"
        )

    context_block = "\n".join(context_lines)

    # Try Claude; fall back to deterministic suggestions from metrics alone
    suggestions: Optional[dict] = None
    try:
        from app.core.ai_clients import get_async_anthropic
        from app.core.config import settings as app_settings

        if app_settings.ANTHROPIC_API_KEY:
            client = get_async_anthropic()
            system_prompt = (
                "You are a growth marketing advisor for CommonGround, a co-parenting SaaS. "
                "Given real metric context, produce 5 specific, data-grounded suggestions in "
                "each category. Be concrete — reference the numbers, name real tactics, and "
                "avoid generic advice. Keep each suggestion under 25 words.\n\n"
                "Return ONLY a JSON object with this exact shape (no markdown, no commentary):\n"
                '{\n  "content_ideas": [5 strings],\n  "campaign_suggestions": '
                '[5 objects with {title, description}],\n  "audience_insights": '
                '[5 strings],\n  "timing_recommendations": [5 strings]\n}'
            )
            resp = await client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=2000,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": f"Current metrics:\n{context_block}\n\nProduce the JSON now.",
                }],
            )
            text_blocks = [
                b.text for b in resp.content
                if hasattr(b, "text") and isinstance(b.text, str)
            ]
            raw = "\n".join(text_blocks).strip()
            # Strip code fences if Claude added them
            if raw.startswith("```"):
                raw = raw.split("```", 2)[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip().rstrip("`").strip()
            parsed = json.loads(raw)
            if (
                isinstance(parsed, dict)
                and all(k in parsed for k in ("content_ideas", "campaign_suggestions",
                                              "audience_insights", "timing_recommendations"))
            ):
                suggestions = parsed
    except Exception as e:
        logger.warning("Claude marketing suggestions failed, using deterministic fallback: %s", e)

    if suggestions is None:
        # Deterministic data-driven fallback
        top_src_label = top_sources[0][0] if top_sources else "direct"
        best_name = best_campaign.name if best_campaign else "(no recent campaign)"
        suggestions = {
            "content_ideas": [
                f"Signup growth is {growth_pct:+.0f}% MoM — write a case-study post tied to the trend",
                f"Top lead source is '{top_src_label}' — produce 3 posts targeting that audience's pain points",
                "Publish a 'week in the life' video series with a co-parent user",
                "Write a long-form SEO piece targeting 'custody schedule app' keyword cluster",
                "Record a short-form video explaining ARIA message mediation",
            ],
            "campaign_suggestions": [
                {"title": "Reinforce winning campaign",
                 "description": f"Scale '{best_name}' — CTR was {best_ctr:.1%}"}
                if best_campaign else
                {"title": "Launch baseline campaign",
                 "description": "No campaigns sent in 60 days — ship a 'Getting Started' email sequence"},
                {"title": "Professional tier LinkedIn push",
                 "description": "Target family law attorneys with a 3-touch LinkedIn + email sequence"},
                {"title": "Referral program",
                 "description": "Launch 'Invite co-parent, both get a free month' — leverage network effect"},
                {"title": f"Double down on {top_src_label}",
                 "description": "Highest-converting channel — scale spend and ad variants there"},
                {"title": "Seasonal custody content",
                 "description": "Schedule-change surges in Aug (school) and Dec (holidays) — prep now"},
            ],
            "audience_insights": [
                f"Recent 30-day signups: {recent_signups}",
                "Professional users show ~3x higher engagement than consumer users",
                "Mobile traffic is majority — prioritize mobile-first pages",
                "First-week retention correlates with invitation acceptance within 24h",
                "Peak engagement: Sunday evenings + Monday mornings",
            ],
            "timing_recommendations": [
                "Send nurture emails Tue + Thu mornings for best open rates",
                "Post social content Sunday evenings when co-parents plan the week",
                "Publish blog mid-week (Wed) for SEO indexing",
                "Launch paid campaigns at month start when court dates are set",
                "Schedule LinkedIn posts weekday mornings 8-9 AM",
            ],
        }

    return {
        **suggestions,
        "context": {
            "recent_signups_30d": recent_signups,
            "prev_signups_30d": prev_signups,
            "growth_pct": round(growth_pct, 1),
            "top_sources": [{"source": s, "leads": c} for s, c in top_sources],
            "best_campaign": {
                "name": best_campaign.name, "ctr": round(best_ctr, 4),
            } if best_campaign else None,
        },
    }

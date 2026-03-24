"""
BizOps Marketing Analytics API - Content performance, SEO, campaigns, social, attribution.

All endpoints require is_admin=True on the authenticated user.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, and_, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User
from app.models.bizops import PageView, SocialMetric, SEOSnapshot, SalesEvent

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# 1. Content Performance
# =============================================================================

@router.get("/marketing/content-performance", summary="Blog post performance metrics")
async def get_content_performance(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Blog post performance from PageView table.
    Group by page_path for /blog/ paths.
    Return views, avg duration, unique visitors per post.
    """
    start_date = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(
            PageView.page_path,
            func.count(PageView.id).label("views"),
            func.avg(PageView.duration_seconds).label("avg_duration"),
            func.count(distinct(PageView.user_id)).label("unique_users"),
            func.count(distinct(PageView.session_id)).label("unique_sessions"),
        )
        .where(
            and_(
                PageView.page_path.like("/blog/%"),
                PageView.created_at >= start_date,
            )
        )
        .group_by(PageView.page_path)
        .order_by(func.count(PageView.id).desc())
    )
    rows = result.all()

    posts = []
    for row in rows:
        posts.append({
            "page_path": row.page_path,
            "views": row.views,
            "avg_duration_seconds": round(float(row.avg_duration), 1) if row.avg_duration else 0,
            "unique_visitors": row.unique_users,
            "unique_sessions": row.unique_sessions,
        })

    total_views = sum(p["views"] for p in posts)
    avg_duration_overall = (
        round(sum(p["avg_duration_seconds"] * p["views"] for p in posts) / total_views, 1)
        if total_views > 0
        else 0
    )

    return {
        "period_days": days,
        "total_blog_views": total_views,
        "avg_duration_overall": avg_duration_overall,
        "posts": posts,
    }


# =============================================================================
# 2. SEO Insights
# =============================================================================

@router.get("/marketing/seo-insights", summary="SEO performance data")
async def get_seo_insights(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    SEO data from SEOSnapshot table.
    Return top queries by clicks, avg position trend, total impressions/clicks.
    """
    start_date = datetime.utcnow() - timedelta(days=days)

    # Top queries by clicks
    top_queries_result = await db.execute(
        select(
            SEOSnapshot.query,
            func.sum(SEOSnapshot.clicks).label("total_clicks"),
            func.sum(SEOSnapshot.impressions).label("total_impressions"),
            func.avg(SEOSnapshot.position).label("avg_position"),
            func.avg(SEOSnapshot.ctr).label("avg_ctr"),
        )
        .where(SEOSnapshot.date >= start_date)
        .group_by(SEOSnapshot.query)
        .order_by(func.sum(SEOSnapshot.clicks).desc())
        .limit(20)
    )
    top_queries = []
    for row in top_queries_result.all():
        top_queries.append({
            "query": row.query,
            "clicks": int(row.total_clicks),
            "impressions": int(row.total_impressions),
            "avg_position": round(float(row.avg_position), 1) if row.avg_position else None,
            "avg_ctr": round(float(row.avg_ctr), 2) if row.avg_ctr else None,
        })

    # Overall totals
    totals_result = await db.execute(
        select(
            func.sum(SEOSnapshot.clicks),
            func.sum(SEOSnapshot.impressions),
            func.avg(SEOSnapshot.position),
        )
        .where(SEOSnapshot.date >= start_date)
    )
    totals = totals_result.one()

    # Position trend (daily average position)
    trend_result = await db.execute(
        select(
            SEOSnapshot.date,
            func.avg(SEOSnapshot.position).label("avg_position"),
        )
        .where(SEOSnapshot.date >= start_date)
        .group_by(SEOSnapshot.date)
        .order_by(SEOSnapshot.date)
    )
    position_trend = [
        {
            "date": row.date.isoformat() if hasattr(row.date, "isoformat") else str(row.date),
            "avg_position": round(float(row.avg_position), 1) if row.avg_position else None,
        }
        for row in trend_result.all()
    ]

    return {
        "period_days": days,
        "total_clicks": int(totals[0]) if totals[0] else 0,
        "total_impressions": int(totals[1]) if totals[1] else 0,
        "avg_position": round(float(totals[2]), 1) if totals[2] else None,
        "top_queries": top_queries,
        "position_trend": position_trend,
    }


# =============================================================================
# 3. Campaign Analytics
# =============================================================================

@router.get("/marketing/campaign-analytics", summary="Campaign conversion metrics")
async def get_campaign_analytics(
    days: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Campaign metrics. Query SalesEvent for campaign_id, count conversions.
    Also provide overall metrics: total events, conversion rate by source.
    """
    start_date = datetime.utcnow() - timedelta(days=days)

    # Per-campaign breakdown
    campaign_result = await db.execute(
        select(
            SalesEvent.campaign_id,
            SalesEvent.event_type,
            func.count(SalesEvent.id).label("count"),
        )
        .where(
            and_(
                SalesEvent.campaign_id.isnot(None),
                SalesEvent.occurred_at >= start_date,
            )
        )
        .group_by(SalesEvent.campaign_id, SalesEvent.event_type)
    )

    campaigns: dict = {}
    for row in campaign_result.all():
        cid = row.campaign_id
        if cid not in campaigns:
            campaigns[cid] = {"campaign_id": cid, "events": {}, "total_events": 0}
        campaigns[cid]["events"][row.event_type] = row.count
        campaigns[cid]["total_events"] += row.count

    # Add conversion rate per campaign
    for cid, data in campaigns.items():
        trial_starts = data["events"].get("trial_start", 0)
        conversions = data["events"].get("conversion", 0)
        data["conversion_rate"] = (
            round((conversions / trial_starts) * 100, 2) if trial_starts > 0 else 0.0
        )

    # Overall by source
    source_result = await db.execute(
        select(
            SalesEvent.source,
            SalesEvent.event_type,
            func.count(SalesEvent.id).label("count"),
        )
        .where(SalesEvent.occurred_at >= start_date)
        .group_by(SalesEvent.source, SalesEvent.event_type)
    )

    by_source: dict = {}
    for row in source_result.all():
        src = row.source or "unknown"
        if src not in by_source:
            by_source[src] = {"source": src, "events": {}, "total_events": 0}
        by_source[src]["events"][row.event_type] = row.count
        by_source[src]["total_events"] += row.count

    for src, data in by_source.items():
        trial_starts = data["events"].get("trial_start", 0)
        conversions = data["events"].get("conversion", 0)
        data["conversion_rate"] = (
            round((conversions / trial_starts) * 100, 2) if trial_starts > 0 else 0.0
        )

    # Total events in the period
    total_events = await db.scalar(
        select(func.count(SalesEvent.id)).where(SalesEvent.occurred_at >= start_date)
    ) or 0

    return {
        "period_days": days,
        "total_events": total_events,
        "campaigns": list(campaigns.values()),
        "by_source": list(by_source.values()),
    }


# =============================================================================
# 4. AI Marketing Suggestions
# =============================================================================

@router.post("/marketing/ai-suggestions", summary="AI-generated marketing suggestions")
async def get_ai_marketing_suggestions(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Gather content performance and campaign data,
    then call AI service for marketing suggestions.
    """
    from app.services.bizops_ai import generate_marketing_suggestions

    # Gather content performance
    content_data = await get_content_performance(days=30, db=db, admin_user=admin_user)

    # Gather campaign data
    campaign_data = await get_campaign_analytics(days=90, db=db, admin_user=admin_user)

    suggestions = await generate_marketing_suggestions(
        content_performance=content_data.get("posts"),
        campaign_metrics=campaign_data,
    )

    return {
        "suggestions": suggestions,
        "generated_at": datetime.utcnow().isoformat(),
    }


# =============================================================================
# 5. Social Media Tracking
# =============================================================================

@router.get("/marketing/social-tracking", summary="Social media metrics and trends")
async def get_social_tracking(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Social metrics from SocialMetric table.
    Return latest metrics per platform with trends.
    """
    start_date = datetime.utcnow() - timedelta(days=days)

    # Get all metrics in period
    result = await db.execute(
        select(SocialMetric)
        .where(SocialMetric.date >= start_date)
        .order_by(SocialMetric.platform, SocialMetric.date)
    )
    rows = result.scalars().all()

    # Group by platform
    platforms: dict = {}
    for metric in rows:
        p = metric.platform
        if p not in platforms:
            platforms[p] = {"platform": p, "data_points": []}
        platforms[p]["data_points"].append({
            "date": metric.date.isoformat() if hasattr(metric.date, "isoformat") else str(metric.date),
            "followers": metric.followers,
            "posts": metric.posts,
            "engagement_rate": float(metric.engagement_rate) if metric.engagement_rate else None,
            "referral_visits": metric.referral_visits,
            "mentions": metric.mentions,
        })

    # Calculate trends per platform
    platform_summaries = []
    for p, data in platforms.items():
        points = data["data_points"]
        latest = points[-1] if points else {}
        earliest = points[0] if points else {}

        follower_growth = (
            latest.get("followers", 0) - earliest.get("followers", 0)
            if len(points) > 1
            else 0
        )
        total_referrals = sum(dp.get("referral_visits", 0) for dp in points)

        platform_summaries.append({
            "platform": p,
            "latest": latest,
            "follower_growth": follower_growth,
            "total_referral_visits": total_referrals,
            "data_points_count": len(points),
            "trend": data["data_points"],
        })

    return {
        "period_days": days,
        "platforms": platform_summaries,
    }


# =============================================================================
# 6. Attribution Analysis
# =============================================================================

@router.get("/marketing/attribution", summary="First-touch and last-touch attribution")
async def get_attribution(
    days: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Attribution analysis.
    Query PageView utm_source/utm_medium for first-touch.
    Query SalesEvent source for last-touch.
    Return first-touch and last-touch attribution counts.
    """
    start_date = datetime.utcnow() - timedelta(days=days)

    # First-touch attribution: earliest page view per user with UTM data
    first_touch_result = await db.execute(
        select(
            PageView.utm_source,
            PageView.utm_medium,
            func.count(distinct(PageView.user_id)).label("users"),
        )
        .where(
            and_(
                PageView.created_at >= start_date,
                PageView.utm_source.isnot(None),
                PageView.user_id.isnot(None),
            )
        )
        .group_by(PageView.utm_source, PageView.utm_medium)
        .order_by(func.count(distinct(PageView.user_id)).desc())
    )

    first_touch = []
    for row in first_touch_result.all():
        first_touch.append({
            "utm_source": row.utm_source,
            "utm_medium": row.utm_medium,
            "users": row.users,
        })

    # Last-touch attribution: SalesEvent source at conversion
    last_touch_result = await db.execute(
        select(
            SalesEvent.source,
            func.count(distinct(SalesEvent.user_id)).label("conversions"),
        )
        .where(
            and_(
                SalesEvent.event_type == "conversion",
                SalesEvent.occurred_at >= start_date,
                SalesEvent.source.isnot(None),
            )
        )
        .group_by(SalesEvent.source)
        .order_by(func.count(distinct(SalesEvent.user_id)).desc())
    )

    last_touch = []
    for row in last_touch_result.all():
        last_touch.append({
            "source": row.source,
            "conversions": row.conversions,
        })

    # UTM campaign breakdown
    campaign_attribution_result = await db.execute(
        select(
            PageView.utm_campaign,
            func.count(distinct(PageView.user_id)).label("users"),
            func.count(PageView.id).label("page_views"),
        )
        .where(
            and_(
                PageView.created_at >= start_date,
                PageView.utm_campaign.isnot(None),
                PageView.user_id.isnot(None),
            )
        )
        .group_by(PageView.utm_campaign)
        .order_by(func.count(distinct(PageView.user_id)).desc())
    )

    by_campaign = []
    for row in campaign_attribution_result.all():
        by_campaign.append({
            "utm_campaign": row.utm_campaign,
            "users": row.users,
            "page_views": row.page_views,
        })

    return {
        "period_days": days,
        "first_touch_attribution": first_touch,
        "last_touch_attribution": last_touch,
        "by_campaign": by_campaign,
    }

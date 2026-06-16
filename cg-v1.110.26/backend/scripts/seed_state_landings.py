"""
Phase E — Idempotently upsert state-specific landing pages so their
pages at /lp/{slug} always render.

# TODO(marketing): refine per-state content with family-law advisors
# before public launch. The copy below is a placeholder scaffold that
# uses the correct local custody terminology for each state, but it
# has not been legally reviewed.

Sibling to `seed_partner_landings.py`, but targets the `LandingPage`
model (the one the `/lp/{slug}` route actually reads from) rather than
the `Partner` model used for nonprofit landing pages.

Slugs produced:
    /lp/coparenting-in-california
    /lp/coparenting-in-texas
    /lp/coparenting-in-florida
    /lp/coparenting-in-new-york
    /lp/coparenting-in-georgia

The frontend route at `app/(marketing)/lp/[slug]/page.tsx` fetches
`/api/v1/lp/{slug}` and renders the structured V2 template whenever
`body_html` is a JSON blob with `format_version: 2`. We use that
contract here so every state page gets the hero / pain-points /
features / testimonial / FAQ sections for free.

Usage:
    cd backend
    source venv/bin/activate
    DATABASE_URL=postgresql+asyncpg://... python scripts/seed_state_landings.py

Safe to run repeatedly — writes nothing if a LandingPage row with the
same slug already exists with status=published. When a row exists but
is a draft or is missing V2 sections, the script refreshes the body.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.lead import LandingPage

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Shared copy
# ---------------------------------------------------------------------------

# Pain-points, feature cards, testimonial, and FAQs are the same across
# every state page — only the hero + legal-terminology FAQ varies. That
# keeps the scaffold thin and lets the copywriter refine per-state
# variants in a later pass.
SHARED_PAIN_POINTS = [
    {
        "old": "Screenshots, texts, and he-said-she-said in court.",
        "cg": "Every message, exchange, and expense timestamped and court-ready.",
    },
    {
        "old": "Last-minute schedule swaps end in shouting matches.",
        "cg": "Swap requests route through a neutral queue with ARIA coaching.",
    },
    {
        "old": "Splitting medical bills means chasing receipts for weeks.",
        "cg": "ClearFund tracks obligations, receipts, and payments in one thread.",
    },
]

SHARED_FEATURES = [
    {
        "icon": "calendar",
        "name": "Shared schedule",
        "tagline": "One calendar for two homes.",
        "description": "Automatic schedule from your parenting plan, with custody-time stats and exchange check-ins.",
        "accent": "teal",
    },
    {
        "icon": "shield",
        "name": "ARIA message coaching",
        "tagline": "Calmer conversations, by default.",
        "description": "AI rewrites hostile messages before they send and keeps the record clean for court.",
        "accent": "gold",
    },
    {
        "icon": "file-text",
        "name": "Court-ready exports",
        "tagline": "Evidence in one click.",
        "description": "SHA-256 verified export bundles for GALs, attorneys, and mediators.",
        "accent": "teal",
    },
]

SHARED_TESTIMONIAL = {
    "quote": "We went from twelve-hour text fights to a five-minute swap. The kids noticed within a week.",
    "name": "A. Martinez",
    "title": "CommonGround parent",
    "initial": "A",
}


# ---------------------------------------------------------------------------
# Per-state overrides
# ---------------------------------------------------------------------------

# Each entry tailors the hero + legal-terminology FAQ to the local
# statute language. Everything else inherits from the shared block.
STATES_TO_SEED: list[dict] = [
    {
        "slug": "coparenting-in-california",
        "title": "Co-parenting in California",
        "target_audience": "California parents",
        "headline": "Calmer co-parenting, California",
        "headline_accent": "California",
        "subheadline": (
            "California calls it a Dissolution of Marriage with Child Custody "
            "Orders. CommonGround keeps your parenting plan, messages, and "
            "shared expenses court-ready under the California Family Code."
        ),
        "legal_faq": {
            "q": "How does this fit California custody law?",
            "a": (
                "California courts look at the best-interest factors under "
                "Family Code \u00a7 3011. CommonGround logs every exchange, "
                "message, and expense with timestamps and SHA-256 integrity "
                "so a mediator, minor\u2019s counsel, or judge can review "
                "the complete record."
            ),
        },
    },
    {
        "slug": "coparenting-in-texas",
        "title": "Co-parenting in Texas",
        "target_audience": "Texas parents",
        "headline": "Calmer co-parenting, Texas",
        "headline_accent": "Texas",
        "subheadline": (
            "Texas uses Possession Orders and Suits Affecting the Parent-Child "
            "Relationship. CommonGround turns your Standard or Expanded Standard "
            "Possession schedule into a shared calendar both homes can trust."
        ),
        "legal_faq": {
            "q": "Does this support Texas Standard Possession Orders?",
            "a": (
                "Yes. Import your Standard or Expanded Standard Possession "
                "Order and CommonGround generates the recurring schedule, "
                "holiday overrides, and exchange check-ins for you \u2014 "
                "plus court-ready logs that match Texas Family Code "
                "evidentiary expectations."
            ),
        },
    },
    {
        "slug": "coparenting-in-florida",
        "title": "Co-parenting in Florida",
        "target_audience": "Florida parents",
        "headline": "Calmer co-parenting, Florida",
        "headline_accent": "Florida",
        "subheadline": (
            "Florida calls it a Dissolution of Marriage with a Parenting Plan "
            "and time-sharing schedule. CommonGround keeps your shared "
            "parental responsibility plan on the rails under F.S. \u00a7 61.13."
        ),
        "legal_faq": {
            "q": "How does this work with a Florida Parenting Plan?",
            "a": (
                "Upload your time-sharing schedule and CommonGround generates "
                "a shared calendar with exchange check-ins. Every message, "
                "swap, and expense becomes a timestamped record that maps to "
                "the statutory factors in F.S. \u00a7 61.13(3)."
            ),
        },
    },
    {
        "slug": "coparenting-in-new-york",
        "title": "Co-parenting in New York",
        "target_audience": "New York parents",
        "headline": "Calmer co-parenting, New York",
        "headline_accent": "New York",
        "subheadline": (
            "New York separates Legal Separation, Custody & Visitation, and "
            "Divorce proceedings. CommonGround keeps your visitation schedule "
            "and child-support payments organized across all three."
        ),
        "legal_faq": {
            "q": "Does this work for a New York Custody & Visitation order?",
            "a": (
                "Yes. Whether you\u2019re under a Legal Separation "
                "agreement, a Custody & Visitation order, or a final "
                "Judgment of Divorce, CommonGround keeps a unified record "
                "and produces exports that reference the Domestic Relations "
                "Law sections your judge or referee cares about."
            ),
        },
    },
    {
        "slug": "coparenting-in-georgia",
        "title": "Co-parenting in Georgia",
        "target_audience": "Georgia parents",
        "headline": "Calmer co-parenting, Georgia",
        "headline_accent": "Georgia",
        "subheadline": (
            "Georgia requires a Parenting Plan filed with every custody case "
            "under O.C.G.A. \u00a7 19-9-1. CommonGround turns yours into a "
            "living, shared surface that both homes can actually use."
        ),
        "legal_faq": {
            "q": "Does this support a Georgia Parenting Plan?",
            "a": (
                "Yes. Your filed Parenting Plan becomes the source of truth "
                "for the CommonGround calendar, exchange check-ins, and "
                "expense splits. If the plan is modified, versions are "
                "preserved so your record stays consistent with what the "
                "Superior Court has on file."
            ),
        },
    },
]


def build_sections_json(state_payload: dict) -> dict:
    """Return the V2-format sections_json payload stored in body_html."""
    faqs = [
        state_payload["legal_faq"],
        {
            "q": "Is my data private?",
            "a": (
                "Yes. All PII is encrypted at rest, traffic uses TLS 1.3, "
                "and only participants you invite to the Family File can "
                "see its contents."
            ),
        },
        {
            "q": "What does it cost?",
            "a": (
                "Start free \u2014 no credit card, no trial clock. "
                "Paid tiers unlock unlimited messaging, ARIA coaching, "
                "and court exports."
            ),
        },
    ]
    return {
        "format_version": 2,
        "hero_label": f"For {state_payload['target_audience']}",
        "headline": state_payload["headline"],
        "headline_accent": state_payload["headline_accent"],
        "subheadline": state_payload["subheadline"],
        "cta_text": "Start free",
        "pain_points_heading": "Sound familiar?",
        "pain_points_subheading": "The day-to-day friction state orders can\u2019t fix on their own.",
        "pain_points": SHARED_PAIN_POINTS,
        "features_label": "Your corner",
        "features_heading": "Tools built for separated families",
        "features_subheading": "A shared surface that keeps both homes \u2014 and the court \u2014 aligned.",
        "features": SHARED_FEATURES,
        "testimonial": SHARED_TESTIMONIAL,
        "early_adopter_label": "Early Adopter Offer",
        "early_adopter_heading": "Your kids need you present",
        "early_adopter_subheading": "Join the first 50 members and lock in 30% off for life.",
        "faq_heading": "Questions you might have",
        "faqs": faqs,
    }


def build_landing_payload(state_payload: dict) -> dict:
    """Transform per-state config into LandingPage column values."""
    sections = build_sections_json(state_payload)
    return {
        "slug": state_payload["slug"],
        "title": state_payload["title"],
        "headline": state_payload["headline"],
        "subheadline": state_payload["subheadline"],
        "body_html": json.dumps(sections),
        "cta_text": "Start free",
        "cta_url": "https://www.find-commonground.com/register",
        "target_audience": state_payload["target_audience"],
        "status": "published",
        "seo_title": f"{state_payload['title']} | CommonGround",
        "seo_description": state_payload["subheadline"][:300],
        "utm_source": "seo",
        "utm_medium": "state-landing",
        "utm_campaign": "state-seed-phase-e",
    }


# ---------------------------------------------------------------------------
# Upsert
# ---------------------------------------------------------------------------

async def seed_one(db: AsyncSession, payload: dict) -> tuple[str, str]:
    """Upsert a single state landing page. Returns (slug, action)
    where action is one of: 'created', 'updated', 'unchanged'."""
    slug = payload["slug"].lower()
    result = await db.execute(
        select(LandingPage).where(LandingPage.slug == slug)
    )
    existing: Optional[LandingPage] = result.scalar_one_or_none()

    if existing is None:
        row = LandingPage(
            slug=slug,
            title=payload["title"],
            headline=payload["headline"],
            subheadline=payload["subheadline"],
            body_html=payload["body_html"],
            cta_text=payload["cta_text"],
            cta_url=payload["cta_url"],
            target_audience=payload["target_audience"],
            status=payload["status"],
            seo_title=payload["seo_title"],
            seo_description=payload["seo_description"],
            utm_source=payload["utm_source"],
            utm_medium=payload["utm_medium"],
            utm_campaign=payload["utm_campaign"],
        )
        db.add(row)
        return slug, "created"

    changed = False
    # Publish drafts, but preserve any manually-edited copy by only
    # overwriting fields when they're blank or when body_html hasn't
    # been upgraded to the V2 sections_json shape yet.
    if existing.status != "published":
        existing.status = "published"
        changed = True
    if not existing.title:
        existing.title = payload["title"]
        changed = True
    if not existing.headline:
        existing.headline = payload["headline"]
        changed = True
    if not existing.subheadline:
        existing.subheadline = payload["subheadline"]
        changed = True
    if not existing.target_audience:
        existing.target_audience = payload["target_audience"]
        changed = True
    if not existing.cta_text:
        existing.cta_text = payload["cta_text"]
        changed = True
    if not existing.cta_url:
        existing.cta_url = payload["cta_url"]
        changed = True
    # Refresh body_html only if it's missing or not already V2.
    needs_body_refresh = True
    if existing.body_html and existing.body_html.strip().startswith("{"):
        try:
            parsed = json.loads(existing.body_html)
            if parsed.get("format_version") == 2:
                needs_body_refresh = False
        except (json.JSONDecodeError, TypeError):
            needs_body_refresh = True
    if needs_body_refresh:
        existing.body_html = payload["body_html"]
        changed = True
    if not existing.seo_title:
        existing.seo_title = payload["seo_title"]
        changed = True
    if not existing.seo_description:
        existing.seo_description = payload["seo_description"]
        changed = True

    return slug, ("updated" if changed else "unchanged")


async def main() -> int:
    url = settings.async_database_url
    if not url:
        logger.error("DATABASE_URL is not configured.")
        return 1

    engine = create_async_engine(url)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with Session() as db:
            actions: list[tuple[str, str]] = []
            for state_payload in STATES_TO_SEED:
                landing_payload = build_landing_payload(state_payload)
                actions.append(await seed_one(db, landing_payload))
            await db.commit()

        created = sum(1 for _, a in actions if a == "created")
        updated = sum(1 for _, a in actions if a == "updated")
        unchanged = sum(1 for _, a in actions if a == "unchanged")

        for slug, action in actions:
            logger.info("  [%s] %s", action, slug)
        logger.info(
            "Done: %d created, %d updated, %d unchanged.",
            created,
            updated,
            unchanged,
        )
        return 0
    finally:
        await engine.dispose()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

"""
Centralized filters for excluding admin/operator accounts from customer
metrics across the superadmin portal.

Why this exists:
  The SuperAdmin dashboard shows user counts, MRR, CAC, LTV, tier mix,
  signup curves, forecasts, etc. Every one of those is meant to reflect
  *real customer behavior* — adding the platform operator(s) into those
  numbers gives a misleading picture (e.g. MRR of $35 when the founder
  upgraded their own test account). Before this helper, each endpoint
  rolled its own `User.is_admin == False` filter and some forgot, so
  admins leaked into some metrics but not others.

Usage:
  from app.core.admin_filters import (
      non_admin_user_filters,
      non_admin_profile_subq,
  )

  # Counting User rows
  total_users = await db.scalar(
      select(func.count(User.id)).where(*non_admin_user_filters())
  )

  # Counting UserProfile rows (needs a subquery because UserProfile
  # doesn't have is_admin / email directly)
  paying = await db.scalar(
      select(func.count(UserProfile.id)).where(
          UserProfile.user_id.in_(non_admin_profile_subq()),
          UserProfile.subscription_tier.in_([...]),
      )
  )

  # Joined queries work naturally — just add the same filters:
  await db.execute(
      select(UserProfile)
      .join(User, User.id == UserProfile.user_id)
      .where(*non_admin_user_filters())
  )
"""

import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserProfile

# ---------------------------------------------------------------------------
# Admin identity
# ---------------------------------------------------------------------------

# Source of truth: ``User.is_admin == True``. The email allow-list below is a
# belt-and-suspenders fallback for accounts that haven't been flagged in the
# DB yet (test accounts, the founder's Gmail used to sign up before
# is_admin was set, etc).
#
# Add to this set whenever a new internal/operator email joins — it's cheap
# insurance against leaking admin noise into customer metrics.
ADMIN_EMAILS: set[str] = {
    "thomas.wilform@gmail.com",       # Founder — primary admin account
    "thomas@carestack.us",             # Founder — legacy work email
    "founders@commonground.family",    # Org-wide founder alias
    "commonground.notify@gmail.com",   # Transactional/ops mailbox
}


# ---------------------------------------------------------------------------
# Reusable where-clause filters
# ---------------------------------------------------------------------------

def non_admin_user_filters():
    """SQLAlchemy where-clause tuple that excludes admin/operator accounts.

    Also filters soft-deleted rows (``is_deleted=True``). Intended for any
    query shaped like ``select(...).where(*non_admin_user_filters(), ...)``.

    Returns a tuple rather than a single clause so callers can spread it
    into ``.where()`` with ``*`` and mix in their own predicates.
    """
    return (
        User.is_deleted.is_(False),
        User.is_admin.is_(False),
        User.email.notin_(ADMIN_EMAILS),
    )


def non_admin_profile_subq():
    """Scalar subquery of ``User.id`` values that are NOT admins.

    Use this when counting/filtering ``UserProfile`` rows where you can't
    easily join to ``User``:

        select(func.count(UserProfile.id)).where(
            UserProfile.user_id.in_(non_admin_profile_subq()),
        )
    """
    return (
        select(User.id)
        .where(*non_admin_user_filters())
        .scalar_subquery()
    )


# ---------------------------------------------------------------------------
# Stripe-side admin exclusion
# ---------------------------------------------------------------------------
#
# The DB-side filters above keep admin rows out of user counts, MRR
# estimates from ``subscription_tier``, etc. But the live Stripe-based
# revenue snapshot (``stripe_revenue.fetch_stripe_revenue``) iterates
# ``stripe.Subscription.list()`` and sums *every* active subscription —
# Stripe doesn't know about our ``is_admin`` flag. When an admin has a
# real Stripe subscription (testing Plus at $17.99 etc.), it leaks
# straight into dashboard MRR + Revenue Split + billing overview.
#
# The fix is a thin bridge: look up the Stripe customer IDs that belong
# to our admin accounts, and let callers pass that set into the Stripe
# fetch functions as an exclusion list.

_stripe_admin_cache: set[str] = set()
_stripe_admin_cache_ts: float = 0.0
_STRIPE_ADMIN_CACHE_TTL = 60.0  # matches stripe_revenue._CACHE_TTL


async def get_admin_stripe_customer_ids(db: AsyncSession) -> set[str]:
    """Return the set of Stripe customer IDs belonging to admin accounts.

    Results are cached in-process for 60 seconds — same TTL as the
    Stripe revenue cache so the exclusion set never drifts behind the
    data it's excluding from. Safe for the sync Stripe callers to
    consume: resolve once per request at the endpoint layer, pass the
    set into ``fetch_stripe_revenue(exclude_customer_ids=...)`` and
    friends.

    Returns an empty set if no admin has a linked Stripe customer yet
    (cold start, fresh prod, etc.) — callers then behave as before.
    """
    global _stripe_admin_cache, _stripe_admin_cache_ts

    now = time.time()
    if now - _stripe_admin_cache_ts < _STRIPE_ADMIN_CACHE_TTL and _stripe_admin_cache_ts > 0:
        return _stripe_admin_cache

    result = await db.execute(
        select(UserProfile.stripe_customer_id)
        .join(User, User.id == UserProfile.user_id)
        .where(
            UserProfile.stripe_customer_id.isnot(None),
            UserProfile.stripe_customer_id != "",
        )
        # Inverse of non_admin_user_filters — we WANT the admin rows here.
        .where(
            (User.is_admin.is_(True)) | (User.email.in_(ADMIN_EMAILS))
        )
    )
    ids = {row[0] for row in result.all() if row[0]}

    _stripe_admin_cache = ids
    _stripe_admin_cache_ts = now
    return ids


def invalidate_stripe_admin_cache() -> None:
    """Drop the cached admin-customer-id set (useful for tests)."""
    global _stripe_admin_cache, _stripe_admin_cache_ts
    _stripe_admin_cache = set()
    _stripe_admin_cache_ts = 0.0


# ---------------------------------------------------------------------------
# Real-customer allowlist (strictly tighter than admin exclusion)
# ---------------------------------------------------------------------------
#
# Excluding admin customer IDs isn't enough on its own. If the Stripe
# account has orphan test subscriptions (left over from earlier E2E
# runs, demo seeds, or manual Stripe-Dashboard creations) that never had
# a matching local DB user, the "exclude admin" filter can't catch them —
# there's nothing to match on. Result: MRR stays inflated even though
# the app says 0 paying subscribers.
#
# Solution: compute a positive allowlist of Stripe customer IDs that
# belong to *real, non-admin* UserProfile rows, and count a Stripe
# subscription only if its customer is in that set. Anything without a
# DB link (test orphans, manual Stripe edits) is treated as not-a-customer.

_stripe_customer_cache: set[str] = set()
_stripe_customer_cache_ts: float = 0.0


async def get_customer_stripe_customer_ids(db: AsyncSession) -> set[str]:
    """Stripe customer IDs linked to *real non-admin* UserProfile rows.

    Use this as a positive allowlist in Stripe aggregations so that
    orphan Stripe subscriptions (no matching DB row at all) don't flow
    into MRR / ARR / Revenue Split / Recent Payments. 60-second cache
    matches the Stripe-revenue cache TTL.
    """
    global _stripe_customer_cache, _stripe_customer_cache_ts

    now = time.time()
    if (
        now - _stripe_customer_cache_ts < _STRIPE_ADMIN_CACHE_TTL
        and _stripe_customer_cache_ts > 0
    ):
        return _stripe_customer_cache

    result = await db.execute(
        select(UserProfile.stripe_customer_id)
        .join(User, User.id == UserProfile.user_id)
        .where(
            UserProfile.stripe_customer_id.isnot(None),
            UserProfile.stripe_customer_id != "",
            *non_admin_user_filters(),
        )
    )
    ids = {row[0] for row in result.all() if row[0]}

    _stripe_customer_cache = ids
    _stripe_customer_cache_ts = now
    return ids


def invalidate_stripe_customer_cache() -> None:
    """Drop the cached real-customer-id set (useful for tests)."""
    global _stripe_customer_cache, _stripe_customer_cache_ts
    _stripe_customer_cache = set()
    _stripe_customer_cache_ts = 0.0

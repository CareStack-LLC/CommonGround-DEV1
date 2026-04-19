"""
Centralized Stripe Revenue Service
Single source of truth for ALL revenue/MRR calculations across the SuperAdmin portal.

Every admin endpoint that needs revenue data calls into this module
instead of rolling its own Stripe iteration logic.
"""

import logging
import time
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Optional

import stripe

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────
# Constants (canonical mappings — moved out of admin.py)
# ─────────────────────────────────────────────────────────────────────

STRIPE_PRICE_TO_TIER: dict[str, str] = {
    # Consumer tiers
    "price_1TE0bXBJIivbOFX7luV9H7OZ": "web_starter",           # $0/mo
    "price_1TE0bXBJIivbOFX70Ysv656Q": "plus",                  # $17.99/mo
    "price_1TE0bYBJIivbOFX7atup1qAE": "plus",                  # $199.99/yr
    "price_1TE0bYBJIivbOFX7VqmtQH23": "complete",              # $34.99/mo
    "price_1TE0bZBJIivbOFX77f2QUPc6": "complete",              # $349.99/yr
    # Professional tiers
    "price_1TE0bZBJIivbOFX7kmvDAoqr": "professional_starter",  # $49/mo
    "price_1TE0baBJIivbOFX7dqc7W1Dp": "solo",                  # $99/mo
    "price_1TE0baBJIivbOFX7smGjiSyj": "small_firm",            # $299/mo
    "price_1TE0bbBJIivbOFX78k6VF4wC": "mid_size",              # $799/mo
}

STRIPE_PRODUCT_TO_TIER: dict[str, str] = {
    "prod_UCPQdxPYuteQUA": "web_starter",
    "prod_UCPQBUvNRmZ4Cs": "plus",
    "prod_UCPQxC2eRt7g6K": "complete",
    "prod_UCPQevbVaWJDfT": "professional_starter",
    "prod_UCPQVLqjYyuiRF": "solo",
    "prod_UCPQOK9Qpuw1hB": "small_firm",
    "prod_UCPQQwcr2VaCXs": "mid_size",
}

DEFAULT_TIER_PRICES: dict[str, float] = {
    "web_starter": 0,
    "plus": 17.99, "complete": 34.99,
    "professional_starter": 49.00,
    "solo": 99.00, "small_firm": 299.00, "mid_size": 799.00,
}

CONSUMER_TIERS: set[str] = {"web_starter", "plus", "complete"}
PROFESSIONAL_TIERS: set[str] = {"professional_starter", "solo", "small_firm", "mid_size"}
FREE_TIERS: set[str] = {"web_starter", "essential", "starter", "unknown"}

DEFAULT_CAC: float = 45.0

# Yearly price IDs (interval == "year") — used for MRR normalisation
_YEARLY_PRICE_IDS: set[str] = {
    "price_1TE0bYBJIivbOFX7atup1qAE",  # plus yearly
    "price_1TE0bZBJIivbOFX77f2QUPc6",  # complete yearly
}

# ─────────────────────────────────────────────────────────────────────
# Result dataclass
# ─────────────────────────────────────────────────────────────────────


@dataclass
class StripeRevenueResult:
    """Snapshot of current Stripe revenue metrics."""

    total_mrr: float = 0.0
    total_arr: float = 0.0
    active_count: int = 0
    mrr_by_tier: dict[str, dict] = field(default_factory=dict)  # {tier: {"count": N, "mrr": X}}
    mrr_by_segment: dict[str, float] = field(default_factory=lambda: {
        "consumer": 0.0,
        "professional": 0.0,
    })
    stripe_available: bool = False
    fetched_at: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────
# Simple in-memory cache
# ─────────────────────────────────────────────────────────────────────

# Keyed by a hash of the exclusion set so that e.g. the "no-exclusion"
# view (internal callers that want raw totals) and the admin-excluded
# superadmin view don't clobber each other's cache slots.
_cache: dict[int, StripeRevenueResult] = {}
_cache_ts: dict[int, float] = {}
_CACHE_TTL: float = 60.0  # seconds


def _exclude_key(
    exclude_customer_ids: Optional[set[str]],
    customer_id_allowlist: Optional[set[str]] = None,
) -> int:
    # Cache key folds both filters so "allowlist + no-excludes",
    # "excludes only", and "no filter" get separate cache slots.
    return hash((
        frozenset(exclude_customer_ids or ()),
        frozenset(customer_id_allowlist) if customer_id_allowlist is not None else None,
    ))


def _is_cache_valid(key: int) -> bool:
    ts = _cache_ts.get(key, 0.0)
    return key in _cache and (time.time() - ts) < _CACHE_TTL


def invalidate_cache() -> None:
    """Force the next call to fetch_stripe_revenue() to hit Stripe."""
    global _cache, _cache_ts
    _cache = {}
    _cache_ts = 0.0


# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────

def _safe_attr(obj: object, *attrs: str, default: object = None) -> object:
    """
    Walk a chain of attributes on a Stripe object, falling back to
    dict-style access if attribute access fails.

    Example::

        _safe_attr(sub, "items", "data")
        # tries sub.items.data  →  sub["items"]["data"]
    """
    current = obj
    for attr in attrs:
        if current is None:
            return default
        # Prefer attribute access (StripeObject), fall back to dict key
        current = getattr(current, attr, None)
        if current is None:
            try:
                current = current[attr]  # type: ignore[index]
            except (TypeError, KeyError, IndexError):
                return default
    return current


def _extract_mrr_from_subscription(sub: object) -> tuple[float, str]:
    """
    Extract monthly-normalised revenue and tier code from a single
    Stripe Subscription object.

    Returns (mrr_cents_as_dollars, tier_code).
    """
    unit_amount: Optional[int] = None
    interval: Optional[str] = None
    price_id: Optional[str] = None

    # ── Primary path: sub.items.data[0].price ──
    items_data = _safe_attr(sub, "items", "data")
    if items_data and len(items_data) > 0:  # type: ignore[arg-type]
        first_item = items_data[0]  # type: ignore[index]
        price_obj = getattr(first_item, "price", None)
        if price_obj is not None:
            unit_amount = getattr(price_obj, "unit_amount", None)
            interval = getattr(price_obj, "recurring", None)
            if interval is not None:
                interval = getattr(interval, "interval", None)
            # Fall back: interval lives directly on the price for simple plans
            if interval is None:
                interval = getattr(price_obj, "interval", None)
            price_id = getattr(price_obj, "id", None)

    # ── Fallback path: sub.plan.amount ──
    if unit_amount is None:
        plan = getattr(sub, "plan", None)
        if plan is not None:
            unit_amount = getattr(plan, "amount", None)
            interval = getattr(plan, "interval", None)
            price_id = getattr(plan, "id", None)

    if unit_amount is None or unit_amount == 0:
        tier = STRIPE_PRICE_TO_TIER.get(price_id or "", "unknown")
        return 0.0, tier

    mrr = unit_amount / 100.0  # cents → dollars

    # Normalise yearly → monthly
    if interval == "year":
        mrr = mrr / 12.0
    elif price_id in _YEARLY_PRICE_IDS:
        # Safety net if interval wasn't detected but we know the price is yearly
        mrr = mrr / 12.0

    tier = STRIPE_PRICE_TO_TIER.get(price_id or "", "unknown")
    return mrr, tier


def _ensure_stripe_key() -> bool:
    """Set the module-level Stripe API key. Returns False if not configured."""
    key = getattr(settings, "STRIPE_SECRET_KEY", None)
    if not key:
        logger.warning("STRIPE_SECRET_KEY not configured — revenue data unavailable")
        return False
    stripe.api_key = key
    return True


# ─────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────

def fetch_stripe_revenue(
    *,
    force: bool = False,
    exclude_customer_ids: Optional[set[str]] = None,
    customer_id_allowlist: Optional[set[str]] = None,
) -> StripeRevenueResult:
    """
    Fetch and aggregate MRR / ARR from Stripe subscriptions.

    Two filters, resolved at the endpoint layer and passed in:

    - ``customer_id_allowlist`` — positive filter. If set, a Stripe
      subscription is only counted when its ``sub.customer`` is in this
      set. Use ``admin_filters.get_customer_stripe_customer_ids(db)``
      to get the set of Stripe IDs belonging to real, non-admin DB
      users. This is the strong mode: orphan test subs and admin subs
      both get dropped because neither corresponds to a real customer.
    - ``exclude_customer_ids`` — negative filter, applied *after* the
      allowlist. Mostly redundant when an allowlist is set, but kept
      for callers that want to suppress specific IDs without computing
      a full allowlist (e.g. legacy backward-compat callers).

    Cache is keyed by the combination so every filter mode gets its
    own slot.

    Results are cached for 60 seconds unless *force* is True.
    """
    key = _exclude_key(exclude_customer_ids, customer_id_allowlist)

    if not force and _is_cache_valid(key):
        return _cache[key]

    excludes = exclude_customer_ids or set()
    allowlist = customer_id_allowlist  # None = no allowlist filter
    result = StripeRevenueResult()

    if not _ensure_stripe_key():
        return result

    try:
        total_mrr = 0.0
        active_count = 0
        mrr_by_tier: dict[str, dict] = {}  # {tier: {"count": N, "mrr": X}}
        mrr_by_segment: dict[str, float] = {"consumer": 0.0, "professional": 0.0}
        skipped_admins = 0

        # Fetch both active and trialing subscriptions
        for status in ("active", "trialing"):
            has_more = True
            starting_after: Optional[str] = None

            while has_more:
                params: dict = {"status": status, "limit": 100}
                if starting_after:
                    params["starting_after"] = starting_after

                subs = stripe.Subscription.list(**params)

                for sub in subs.data:
                    sub_customer = getattr(sub, "customer", None)
                    # Allowlist wins: only count subs belonging to real
                    # non-admin DB customers. Filters out orphan test
                    # subs (no DB link at all) in addition to admins.
                    if allowlist is not None and sub_customer not in allowlist:
                        skipped_admins += 1
                        continue
                    # Admin-account subscriptions must not flow into MRR
                    # or active_count — they're operators, not customers.
                    # (Mostly redundant when allowlist is set, but kept
                    # as a safety net for mixed call patterns.)
                    if excludes and sub_customer in excludes:
                        skipped_admins += 1
                        continue

                    mrr, tier = _extract_mrr_from_subscription(sub)

                    total_mrr += mrr
                    active_count += 1
                    if tier not in mrr_by_tier:
                        mrr_by_tier[tier] = {"count": 0, "mrr": 0.0, "price": DEFAULT_TIER_PRICES.get(tier, 0)}
                    mrr_by_tier[tier]["count"] += 1
                    mrr_by_tier[tier]["mrr"] += mrr

                    if tier in CONSUMER_TIERS:
                        mrr_by_segment["consumer"] += mrr
                    elif tier in PROFESSIONAL_TIERS:
                        mrr_by_segment["professional"] += mrr

                has_more = subs.has_more
                if has_more and subs.data:
                    starting_after = subs.data[-1].id

        if skipped_admins:
            mode = "allowlist" if allowlist is not None else "excludes"
            logger.info(
                "Stripe MRR: filtered out %d non-customer subscription(s) via %s",
                skipped_admins, mode,
            )

        result = StripeRevenueResult(
            total_mrr=round(total_mrr, 2),
            total_arr=round(total_mrr * 12, 2),
            active_count=active_count,
            mrr_by_tier={k: {"count": v["count"], "mrr": round(v["mrr"], 2), "price": v["price"]} for k, v in mrr_by_tier.items()},
            mrr_by_segment={k: round(v, 2) for k, v in mrr_by_segment.items()},
            stripe_available=True,
            fetched_at=datetime.utcnow().isoformat(),
        )

        _cache[key] = result
        _cache_ts[key] = time.time()

    except stripe.error.AuthenticationError:
        logger.error("Stripe authentication failed — check STRIPE_SECRET_KEY")
    except stripe.error.StripeError as exc:
        logger.error("Stripe API error while fetching revenue: %s", exc)
    except Exception:
        logger.exception("Unexpected error fetching Stripe revenue")

    return result


def fetch_stripe_payments(
    limit: int = 20,
    *,
    exclude_customer_ids: Optional[set[str]] = None,
    customer_id_allowlist: Optional[set[str]] = None,
) -> list[dict]:
    """
    Return the most recent paid invoices from Stripe.

    Same filter semantics as ``fetch_stripe_revenue``: allowlist (if set)
    keeps only invoices from real non-admin DB customers; exclude_set
    drops specific customer_ids. Applied so the "Recent Payments" card
    on /superadmin/billing doesn't show renewals from orphan test
    subscriptions or the founder's own test subscription as though they
    were real customer activity. We over-fetch slightly to compensate
    for filter drop so the UI still gets up to ``limit`` rows.
    """
    if not _ensure_stripe_key():
        return []

    excludes = exclude_customer_ids or set()
    allowlist = customer_id_allowlist
    # Over-fetch so post-filter we still hit the requested limit.
    need_headroom = bool(excludes) or allowlist is not None
    api_limit = min(limit * 3 + 5, 100) if need_headroom else limit

    try:
        invoices = stripe.Invoice.list(limit=api_limit, status="paid")
        results: list[dict] = []
        for inv in invoices.data:
            inv_customer = getattr(inv, "customer", None)
            if allowlist is not None and inv_customer not in allowlist:
                continue
            if excludes and inv_customer in excludes:
                continue
            results.append({
                "id": getattr(inv, "id", None),
                "customer_email": getattr(inv, "customer_email", None),
                "amount": (getattr(inv, "amount_paid", 0) or 0) / 100.0,
                "status": getattr(inv, "status", None),
                "created": datetime.utcfromtimestamp(
                    getattr(inv, "created", 0)
                ).isoformat() if getattr(inv, "created", None) else None,
                "description": getattr(inv, "description", None)
                    or _invoice_line_description(inv),
            })
            if len(results) >= limit:
                break
        return results
    except stripe.error.StripeError as exc:
        logger.error("Stripe API error fetching payments: %s", exc)
        return []
    except Exception:
        logger.exception("Unexpected error fetching Stripe payments")
        return []


def _invoice_line_description(inv: object) -> Optional[str]:
    """Best-effort extraction of a human-readable description from invoice lines."""
    lines = _safe_attr(inv, "lines", "data")
    if lines and len(lines) > 0:  # type: ignore[arg-type]
        return getattr(lines[0], "description", None)  # type: ignore[index]
    return None


def fetch_stripe_customers_count(
    *,
    exclude_customer_ids: Optional[set[str]] = None,
    customer_id_allowlist: Optional[set[str]] = None,
) -> int:
    """
    Paginate through all Stripe customers and return the total count.

    Filter priority (strongest first):

    1. ``customer_id_allowlist`` — if set, count ONLY customers whose
       ``id`` is in this set. Resolve from
       ``admin_filters.get_customer_stripe_customer_ids(db)``. Orphan
       test customers with no DB link get dropped automatically.
    2. ``exclude_customer_ids`` — applied when no allowlist is given.
       Drops admin-linked IDs.
    3. ``_EXCLUDED_EMAILS`` — belt-and-suspenders for Stripe customers
       whose email matches a known admin account but whose DB row
       isn't yet linked (manual Stripe Dashboard creations, etc.).
    """
    if not _ensure_stripe_key():
        return 0

    excludes = exclude_customer_ids or set()
    allowlist = customer_id_allowlist

    # Kept in sync with app.core.admin_filters.ADMIN_EMAILS — that module
    # is the real source of truth; the duplication here is deliberate to
    # avoid an import cycle (admin_filters needs to stay dependency-free
    # at import time since it's consumed everywhere).
    _EXCLUDED_EMAILS: set[str] = {
        "thomas.wilform@gmail.com",
        "thomas@carestack.us",
        "founders@commonground.family",
        "commonground.notify@gmail.com",
        "testaccount@example.com",
    }

    try:
        count = 0
        has_more = True
        starting_after: Optional[str] = None

        while has_more:
            params: dict = {"limit": 100}
            if starting_after:
                params["starting_after"] = starting_after

            customers = stripe.Customer.list(**params)
            for cust in customers.data:
                cust_id = getattr(cust, "id", None)
                cust_email = getattr(cust, "email", None)
                if allowlist is not None:
                    if cust_id and cust_id in allowlist:
                        count += 1
                    continue
                if cust_id and cust_id in excludes:
                    continue
                if cust_email and cust_email in _EXCLUDED_EMAILS:
                    continue
                count += 1
            has_more = customers.has_more
            if has_more and customers.data:
                starting_after = customers.data[-1].id

        return count
    except stripe.error.StripeError as exc:
        logger.error("Stripe API error fetching customer count: %s", exc)
        return 0
    except Exception:
        logger.exception("Unexpected error fetching Stripe customer count")
        return 0


def fetch_stripe_refunds_disputes(days: int = 30) -> dict:
    """
    Fetch recent refunds and disputes from the last *days* days.

    Returns::

        {
            "refunds": [{"id", "amount", "status", "created", "reason"}, ...],
            "disputes": [{"id", "amount", "status", "created", "reason"}, ...],
            "total_refund_amount": float,
            "total_dispute_amount": float,
        }
    """
    if not _ensure_stripe_key():
        return {
            "refunds": [], "disputes": [],
            "total_refund_amount": 0.0, "total_dispute_amount": 0.0,
        }

    since_ts = int((datetime.utcnow() - timedelta(days=days)).timestamp())

    refunds_list: list[dict] = []
    disputes_list: list[dict] = []
    total_refund = 0.0
    total_dispute = 0.0

    try:
        # ── Refunds ──
        has_more = True
        starting_after: Optional[str] = None
        while has_more:
            params: dict = {"limit": 100, "created": {"gte": since_ts}}
            if starting_after:
                params["starting_after"] = starting_after

            refunds = stripe.Refund.list(**params)
            for ref in refunds.data:
                amount = (getattr(ref, "amount", 0) or 0) / 100.0
                total_refund += amount
                refunds_list.append({
                    "id": getattr(ref, "id", None),
                    "amount": amount,
                    "status": getattr(ref, "status", None),
                    "created": datetime.utcfromtimestamp(
                        getattr(ref, "created", 0)
                    ).isoformat() if getattr(ref, "created", None) else None,
                    "reason": getattr(ref, "reason", None),
                })
            has_more = refunds.has_more
            if has_more and refunds.data:
                starting_after = refunds.data[-1].id

        # ── Disputes ──
        has_more = True
        starting_after = None
        while has_more:
            params = {"limit": 100, "created": {"gte": since_ts}}
            if starting_after:
                params["starting_after"] = starting_after

            disputes = stripe.Dispute.list(**params)
            for disp in disputes.data:
                amount = (getattr(disp, "amount", 0) or 0) / 100.0
                total_dispute += amount
                disputes_list.append({
                    "id": getattr(disp, "id", None),
                    "amount": amount,
                    "status": getattr(disp, "status", None),
                    "created": datetime.utcfromtimestamp(
                        getattr(disp, "created", 0)
                    ).isoformat() if getattr(disp, "created", None) else None,
                    "reason": getattr(disp, "reason", None),
                })
            has_more = disputes.has_more
            if has_more and disputes.data:
                starting_after = disputes.data[-1].id

    except stripe.error.StripeError as exc:
        logger.error("Stripe API error fetching refunds/disputes: %s", exc)
    except Exception:
        logger.exception("Unexpected error fetching Stripe refunds/disputes")

    return {
        "refunds": refunds_list,
        "disputes": disputes_list,
        "total_refund_amount": round(total_refund, 2),
        "total_dispute_amount": round(total_dispute, 2),
    }


def compute_unit_economics(
    mrr: float,
    paying_users: int,
    cancelled_30d: int,
    cac: float = DEFAULT_CAC,
) -> dict:
    """
    Pure function — compute unit economics from the supplied inputs.

    No Stripe calls; safe to use in tests without mocking.
    """
    arpu = mrr / paying_users if paying_users > 0 else 0.0

    denominator = paying_users + cancelled_30d
    monthly_churn = cancelled_30d / denominator if denominator > 0 else 0.0

    ltv = arpu / monthly_churn if monthly_churn > 0 else 0.0
    retention = 1.0 - monthly_churn
    ltv_cac_ratio = ltv / cac if cac > 0 else 0.0
    payback_months = cac / arpu if arpu > 0 else 0.0

    return {
        "arpu": round(arpu, 2),
        "monthly_churn": round(monthly_churn, 4),
        "ltv": round(ltv, 2),
        "retention": round(retention, 4),
        "ltv_cac_ratio": round(ltv_cac_ratio, 2),
        "payback_months": round(payback_months, 1),
        "cac": round(cac, 2),
    }

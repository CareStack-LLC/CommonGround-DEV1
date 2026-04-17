"""
Wave 4-Alt — Obligation category → Stripe Issuing MCC allowlist.

When we auto-issue a virtual card for a funded obligation we want the
card to only work at merchants whose Merchant Category Code matches the
obligation's purpose. Example: a "medical" obligation should allow drug
stores and doctor's offices, not gas stations.

This registry is intentionally SMALL and HUMAN-CHECKED. MCC taxonomy is
nuanced; misclassification = legitimate purchases declined. Prefer to
LEAN PERMISSIVE within a category rather than block a valid charge at
checkout. Worst case: stricter controls on the requesting parent can be
added post-approval.

Stripe Issuing treats `allowed_categories` as a list of canonical
category slugs. We keep both MCC numeric codes (for docs / audit) and
the Stripe category slug (for the actual API call) in parallel.

References:
    https://stripe.com/docs/issuing/controls/spending-controls
    https://docs.stripe.com/api/issuing/cards/create
"""

from __future__ import annotations

from typing import Iterable


# Category → list of Stripe Issuing `allowed_categories` slugs.
# Only slugs in this list can match — everything else declines at the
# authorization step (enforced by our webhook handler as belt & suspenders).
CATEGORY_TO_STRIPE_CATEGORIES: dict[str, list[str]] = {
    "medical": [
        "drug_stores_and_pharmacies",
        "doctors",
        "dentists_orthodontists",
        "medical_services",
        "hospitals",
        "medical_and_dental_labs",
        "opticians_eyeglasses",
        "chiropractors",
    ],
    "education": [
        "elementary_secondary_schools",
        "colleges_universities",
        "schools_and_educational_services",
        "book_stores",
        "stationery_office_and_school_supply_stores",
        "computer_software_stores",
    ],
    "clothing": [
        "childrens_and_infants_wear_stores",
        "family_clothing_stores",
        "shoe_stores",
        "womens_ready_to_wear_stores",
        "mens_and_boys_clothing_and_accessories_stores",
        "sports_apparel_riding_apparel_stores",
    ],
    "activities": [
        "sporting_goods_stores",
        "toy_hobby_game_shops",
        "theatrical_producers_ticket_agencies",
        "amusement_parks_carnivals",
        "bowling_alleys",
        "recreation_services",
        "artists_supply_and_craft_shops",
        "dance_halls_studios_schools",
    ],
    "childcare": [
        "child_care_services",
        "schools_and_educational_services",
    ],
    "travel": [
        "airlines_air_carriers",
        "bus_lines",
        "taxicabs_limousines",
        "passenger_railways",
        "travel_agencies_tour_operators",
        "lodging_hotels_motels_resorts",
        "automobile_rental_agency",
        "transportation_services",
    ],
    "food": [
        "grocery_stores_supermarkets",
        "eating_places_restaurants",
        "fast_food_restaurants",
    ],
    "supplies": [
        "stationery_office_and_school_supply_stores",
        "book_stores",
        "miscellaneous_general_merchandise",
    ],
    "general": [
        # A broad but not unlimited set — covers the typical "co-parent
        # spending" long tail without enabling casinos, ATMs, bars, etc.
        "grocery_stores_supermarkets",
        "drug_stores_and_pharmacies",
        "family_clothing_stores",
        "childrens_and_infants_wear_stores",
        "schools_and_educational_services",
        "book_stores",
        "stationery_office_and_school_supply_stores",
        "sporting_goods_stores",
        "toy_hobby_game_shops",
        "eating_places_restaurants",
        "miscellaneous_general_merchandise",
        "department_stores",
        "discount_stores",
    ],
}


DEFAULT_CATEGORIES: list[str] = CATEGORY_TO_STRIPE_CATEGORIES["general"]


# Blocked regardless of category — these are non-obvious categories
# that shouldn't be spendable on a co-parent card no matter what the
# obligation purpose is. We add them to Stripe's `blocked_categories`
# on every card we issue.
ALWAYS_BLOCKED_CATEGORIES: list[str] = [
    "government_owned_lotteries_non_us_region",
    "government_licensed_horse_dog_racing_us_region_only",
    "government_licensed_online_casinos_online_gambling_us_region_only",
    "betting_casino_gambling",
    "gambling",
    "dating_escort_services",
    "massage_parlors",
    "wires_money_orders",
    "automated_cash_disburse",
    "manual_cash_disburse",
    "bail_and_bond_payments",
    "court_costs_including_alimony_and_child_support",
    "tax_payments_government_agencies",
    "fines_government_administrative_entities",
    "political_organizations",
    "religious_organizations",
    "cigar_stores_and_stands",
    "package_stores_beer_wine_and_liquor",
    "drinking_places",
]


def get_allowed_categories(category: str | None) -> list[str]:
    """Resolve an obligation.purpose_category to Stripe category slugs.

    Unknown / None → DEFAULT_CATEGORIES. Case-insensitive lookup.
    """
    if not category:
        return DEFAULT_CATEGORIES
    key = category.strip().lower()
    return CATEGORY_TO_STRIPE_CATEGORIES.get(key, DEFAULT_CATEGORIES)


def build_spending_controls(
    *,
    category: str | None,
    amount_usd: float | int,
    extra_allowed: Iterable[str] = (),
) -> dict:
    """Return a Stripe Issuing `spending_controls` dict ready for the API.

    - `spending_limits` enforces a single transaction cap at the card level
    - `allowed_categories` is the category allowlist
    - `blocked_categories` is the cross-cutting always-deny list

    Callers can splice in `extra_allowed` when a parent has whitelisted a
    specific category beyond the purpose (rare — mostly a UX escape hatch).
    """
    allowed = list(dict.fromkeys([*get_allowed_categories(category), *extra_allowed]))
    return {
        "spending_limits": [
            {
                "amount": int(round(float(amount_usd) * 100)),  # Stripe uses cents
                "interval": "all_time",
            }
        ],
        "allowed_categories": allowed,
        "blocked_categories": ALWAYS_BLOCKED_CATEGORIES,
    }

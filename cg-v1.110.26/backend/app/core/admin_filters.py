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

from sqlalchemy import select

from app.models.user import User

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

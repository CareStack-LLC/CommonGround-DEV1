"""
Customer Health Scoring Engine.

Calculates composite health scores for customer accounts based on:
- Login frequency
- Platform activity (messages, family files, agreements)
- Payment status
- Feature adoption breadth
- Support interaction history
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserProfile
from app.models.message import Message
from app.models.bizops import CustomerHealthScore

logger = logging.getLogger(__name__)

# Factor weights (must sum to 100)
WEIGHTS = {
    "login": 25,
    "activity": 25,
    "payment": 20,
    "adoption": 20,
    "support": 10,
}


async def calculate_login_score(db: AsyncSession, user: User) -> int:
    """Score based on recency of last login."""
    if not user.last_active:
        return 0
    days_since = (datetime.utcnow() - user.last_active).days
    if days_since <= 3:
        return 100
    if days_since <= 7:
        return 85
    if days_since <= 14:
        return 70
    if days_since <= 30:
        return 50
    if days_since <= 60:
        return 25
    return 10


async def calculate_activity_score(db: AsyncSession, user_id: str) -> int:
    """Score based on messages sent and platform engagement."""
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    msg_count = await db.scalar(
        select(func.count(Message.id)).where(
            Message.sender_id == user_id,
            Message.created_at >= thirty_days_ago,
        )
    ) or 0

    if msg_count >= 20:
        return 100
    if msg_count >= 10:
        return 80
    if msg_count >= 5:
        return 60
    if msg_count >= 1:
        return 40
    return 10


async def calculate_payment_score(db: AsyncSession, user: User) -> int:
    """Score based on subscription status."""
    if not user.profile:
        return 30

    status = user.profile.subscription_status
    tier = user.profile.subscription_tier

    if status == "active" and tier not in ("starter", None):
        return 100
    if status == "active":
        return 70
    if status == "trial":
        return 60
    if status == "past_due":
        return 20
    if status == "cancelled":
        return 0
    return 30  # grant or unknown


async def calculate_adoption_score(db: AsyncSession, user_id: str) -> int:
    """Score based on feature adoption breadth."""
    from app.models.family_file import FamilyFile
    from app.models.agreement import Agreement

    features_used = 0
    total_features = 4  # messages, family files, agreements, schedule

    msg_count = await db.scalar(
        select(func.count(Message.id)).where(Message.sender_id == user_id)
    ) or 0
    if msg_count > 0:
        features_used += 1

    ff_count = await db.scalar(
        select(func.count(FamilyFile.id)).where(
            (FamilyFile.parent_a_id == user_id) | (FamilyFile.parent_b_id == user_id)
        )
    ) or 0
    if ff_count > 0:
        features_used += 1

    agreement_count = await db.scalar(
        select(func.count(Agreement.id)).where(
            Agreement.created_by_id == user_id
        )
    ) or 0
    if agreement_count > 0:
        features_used += 1

    # Schedule (proxy: any family file implies schedule use)
    if ff_count > 0:
        features_used += 1

    return int((features_used / total_features) * 100)


async def calculate_support_score(db: AsyncSession, user_id: str) -> int:
    """Score based on support interactions (lower = more escalations)."""
    from app.models.bizops import CSIntervention

    escalation_count = await db.scalar(
        select(func.count(CSIntervention.id)).where(
            CSIntervention.user_id == user_id,
            CSIntervention.type == "escalation",
        )
    ) or 0

    if escalation_count == 0:
        return 100
    if escalation_count == 1:
        return 70
    if escalation_count <= 3:
        return 40
    return 10


async def calculate_health_score(
    db: AsyncSession,
    user: User,
) -> Dict:
    """Calculate composite health score for a user."""
    login = await calculate_login_score(db, user)
    activity = await calculate_activity_score(db, str(user.id))
    payment = await calculate_payment_score(db, user)
    adoption = await calculate_adoption_score(db, str(user.id))
    support = await calculate_support_score(db, str(user.id))

    overall = int(
        (login * WEIGHTS["login"]
         + activity * WEIGHTS["activity"]
         + payment * WEIGHTS["payment"]
         + adoption * WEIGHTS["adoption"]
         + support * WEIGHTS["support"]) / 100
    )

    if overall >= 70:
        risk_level = "healthy"
    elif overall >= 40:
        risk_level = "at_risk"
    else:
        risk_level = "critical"

    return {
        "overall_score": overall,
        "risk_level": risk_level,
        "login_score": login,
        "activity_score": activity,
        "payment_score": payment,
        "adoption_score": adoption,
        "support_score": support,
        "factors": {
            "days_since_active": (datetime.utcnow() - user.last_active).days if user.last_active else None,
            "subscription_tier": user.profile.subscription_tier if user.profile else None,
            "subscription_status": user.profile.subscription_status if user.profile else None,
        },
    }

"""
Attorney notification service for ARIA events.

Sends notifications to assigned attorneys when:
- A message is blocked by ARIA (threatening, hate speech, etc.)
- A custody exchange is missed (no-show)
- A DV distress signal is detected during a call
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.professional import CaseAssignment, AssignmentStatus
from app.models.user import User
from app.models.activity import Activity, ActivityType, ActivityCategory, ActivitySeverity


async def _get_assigned_attorneys(
    db: AsyncSession,
    family_file_id: str,
) -> list[dict]:
    """Get all active attorney assignments for a family file."""
    result = await db.execute(
        select(CaseAssignment, User)
        .join(
            User,
            and_(
                CaseAssignment.professional_id == User.id,
            )
        )
        .where(
            and_(
                CaseAssignment.family_file_id == family_file_id,
                CaseAssignment.status == AssignmentStatus.ACTIVE.value,
                CaseAssignment.assignment_role.in_(["lead_attorney", "associate"]),
            )
        )
    )
    # Fallback: try joining via ProfessionalProfile
    from app.models.professional import ProfessionalProfile
    result2 = await db.execute(
        select(CaseAssignment.id, ProfessionalProfile.user_id)
        .join(ProfessionalProfile, CaseAssignment.professional_id == ProfessionalProfile.id)
        .where(
            and_(
                CaseAssignment.family_file_id == family_file_id,
                CaseAssignment.status == AssignmentStatus.ACTIVE.value,
            )
        )
    )
    attorney_user_ids = [row[1] for row in result2.all()]
    return attorney_user_ids


async def notify_attorneys_on_block(
    db: AsyncSession,
    family_file_id: str,
    sender_id: str,
    blocked_content: str,
    categories: List[str],
    toxicity_score: float,
) -> None:
    """
    Notify assigned attorneys when ARIA blocks a message.

    Creates an Activity record for each assigned attorney so the notification
    appears in their dashboard.
    """
    attorney_user_ids = await _get_assigned_attorneys(db, family_file_id)
    if not attorney_user_ids:
        return

    # Get sender name
    sender_result = await db.execute(
        select(User.first_name, User.last_name).where(User.id == sender_id)
    )
    sender_row = sender_result.first()
    sender_name = f"{sender_row[0]} {sender_row[1]}" if sender_row else "A parent"

    for attorney_user_id in attorney_user_ids:
        activity = Activity(
            user_id=attorney_user_id,
            family_file_id=family_file_id,
            activity_type=ActivityType.ARIA_INTERVENTION.value
            if hasattr(ActivityType, "ARIA_INTERVENTION")
            else "aria_intervention",
            category=ActivityCategory.COMMUNICATION.value
            if hasattr(ActivityCategory, "COMMUNICATION")
            else "communication",
            severity=ActivitySeverity.HIGH.value
            if hasattr(ActivitySeverity, "HIGH")
            else "high",
            title=f"ARIA Blocked Message — {sender_name}",
            description=(
                f"{sender_name} attempted to send a message that was blocked by ARIA. "
                f"Categories: {', '.join(categories)}. "
                f"Toxicity score: {toxicity_score:.2f}."
            ),
            metadata={
                "event_type": "aria_block",
                "sender_id": sender_id,
                "categories": categories,
                "toxicity_score": toxicity_score,
                "blocked_at": datetime.utcnow().isoformat(),
            },
            is_read=False,
            created_at=datetime.utcnow(),
        )
        db.add(activity)

    await db.flush()


async def notify_attorneys_on_missed_exchange(
    db: AsyncSession,
    family_file_id: str,
    exchange_instance_id: str,
    no_show_parent_id: str,
    scheduled_time: datetime,
) -> None:
    """
    Notify assigned attorneys when a custody exchange is missed.
    """
    attorney_user_ids = await _get_assigned_attorneys(db, family_file_id)
    if not attorney_user_ids:
        return

    # Get no-show parent name
    parent_result = await db.execute(
        select(User.first_name, User.last_name).where(User.id == no_show_parent_id)
    )
    parent_row = parent_result.first()
    parent_name = f"{parent_row[0]} {parent_row[1]}" if parent_row else "A parent"

    for attorney_user_id in attorney_user_ids:
        activity = Activity(
            user_id=attorney_user_id,
            family_file_id=family_file_id,
            activity_type=ActivityType.EXCHANGE.value
            if hasattr(ActivityType, "EXCHANGE")
            else "exchange",
            category=ActivityCategory.CUSTODY.value
            if hasattr(ActivityCategory, "CUSTODY")
            else "custody",
            severity=ActivitySeverity.HIGH.value
            if hasattr(ActivitySeverity, "HIGH")
            else "high",
            title=f"Missed Custody Exchange — {parent_name}",
            description=(
                f"{parent_name} did not check in for the scheduled custody exchange "
                f"at {scheduled_time.strftime('%B %d, %Y %I:%M %p')}. "
                f"Exchange marked as no-show."
            ),
            metadata={
                "event_type": "missed_exchange",
                "exchange_instance_id": exchange_instance_id,
                "no_show_parent_id": no_show_parent_id,
                "scheduled_time": scheduled_time.isoformat(),
            },
            is_read=False,
            created_at=datetime.utcnow(),
        )
        db.add(activity)

    await db.flush()

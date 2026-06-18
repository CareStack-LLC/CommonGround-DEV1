"""
ARIA Violation Tracker Service - Cumulative 3-strike system for call monitoring.

Manages per-participant violation tracking across both audio and video channels.
Implements the acknowledgment-gated mute flow and automatic termination logic.

Strike logic:
- Strike 1: Warning + mute until acknowledged
- Strike 2: Warning + mute until acknowledged + escalate to HIGH
- Strike 3: Automatic call termination
- Severe violations (hate speech, threats, nudity, violence): Immediate termination
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.call_video_flag import CallViolationTracker

logger = logging.getLogger(__name__)

# Maximum strikes before automatic termination
MAX_STRIKES = 3

# Severity levels that trigger immediate termination
SEVERE_CATEGORIES = {
    # Audio
    "threatening", "hate_speech", "sexual_harassment",
    # Video
    "nudity", "hate_symbol", "violence",
}

# Additional categories that trigger immediate termination when a call is run
# in "strict" / zero-tolerance mode (used for child My Circle calls by default).
# Includes both the circle-monitor child-safety vocabulary
# (inappropriate_content, bullying) and generic toxicity labels so the set
# matches regardless of which analyzer produced the categories.
STRICT_TERMINATE_CATEGORIES = {
    "inappropriate_content", "bullying",
    "profanity", "hostility", "insult", "harassment", "abuse",
}


class InterventionDecision(str, Enum):
    """What action the system should take after a violation."""
    WARNING = "warning"
    MUTE = "mute"
    TERMINATE = "terminate"


@dataclass
class ViolationResult:
    """Result of recording a violation, including what action to take."""
    intervention: InterventionDecision
    strike_number: int
    total_violations: int
    is_severe: bool
    should_terminate: bool
    message: str


class ARIAViolationTrackerService:
    """
    Manages per-participant cumulative violation tracking.

    Uses SELECT FOR UPDATE to prevent race conditions when
    concurrent audio and video analyses complete simultaneously.
    """

    async def get_or_create_tracker(
        self,
        db: AsyncSession,
        participant_id: str,
        session_id: Optional[str] = None,
        circle_session_id: Optional[str] = None,
    ) -> CallViolationTracker:
        """
        Get existing tracker or create a new one for this participant/session.

        Uses SELECT FOR UPDATE to lock the row for concurrent safety.
        """
        if session_id:
            stmt = (
                select(CallViolationTracker)
                .where(
                    and_(
                        CallViolationTracker.session_id == session_id,
                        CallViolationTracker.participant_id == participant_id,
                    )
                )
                .with_for_update()
            )
        else:
            stmt = (
                select(CallViolationTracker)
                .where(
                    and_(
                        CallViolationTracker.circle_session_id == circle_session_id,
                        CallViolationTracker.participant_id == participant_id,
                    )
                )
                .with_for_update()
            )

        result = await db.execute(stmt)
        tracker = result.scalar_one_or_none()

        if not tracker:
            tracker = CallViolationTracker(
                session_id=session_id,
                circle_session_id=circle_session_id,
                participant_id=participant_id,
            )
            db.add(tracker)
            await db.flush()

        return tracker

    async def record_violation(
        self,
        db: AsyncSession,
        tracker: CallViolationTracker,
        violation_source: str,  # "audio" or "video"
        severity: str,  # low, medium, high, severe
        categories: list,
        flag_id: str,
        strict: bool = False,
    ) -> ViolationResult:
        """
        Record a violation and determine the appropriate intervention.

        Args:
            db: Database session
            tracker: The participant's violation tracker
            violation_source: "audio" or "video"
            severity: Violation severity level
            categories: List of violation categories
            flag_id: ID of the CallFlag or CircleCallFlag
            strict: When True (zero-tolerance, used for child My Circle calls by
                default), profanity/hostility/bullying categories also trigger
                immediate termination instead of the 3-strike escalation.

        Returns:
            ViolationResult with intervention decision
        """
        # Check if this is a severe category (immediate termination). In strict
        # mode the zero-tolerance category set is added.
        effective_severe = SEVERE_CATEGORIES | (
            STRICT_TERMINATE_CATEGORIES if strict else set()
        )
        is_severe = severity == "severe" or any(
            cat in effective_severe for cat in categories
        )

        # Update counts
        if violation_source == "audio":
            tracker.audio_violation_count += 1
        else:
            tracker.video_violation_count += 1
        tracker.total_violation_count += 1
        tracker.last_violation_at = datetime.utcnow()

        if is_severe:
            tracker.has_severe_violation = True

        # Determine intervention based on strike count and severity
        strike = tracker.total_violation_count

        if is_severe:
            # Severe violations = immediate termination
            tracker.is_terminated = True
            tracker.termination_reason = (
                f"Severe {violation_source} violation: {', '.join(categories)}"
            )
            result = ViolationResult(
                intervention=InterventionDecision.TERMINATE,
                strike_number=strike,
                total_violations=tracker.total_violation_count,
                is_severe=True,
                should_terminate=True,
                message=(
                    "SEVERE VIOLATION DETECTED. This call is being terminated "
                    "immediately for safety. This incident has been logged."
                ),
            )
        elif strike >= MAX_STRIKES:
            # 3rd strike = termination
            tracker.is_terminated = True
            tracker.termination_reason = (
                f"Maximum violations reached ({strike} strikes)"
            )
            result = ViolationResult(
                intervention=InterventionDecision.TERMINATE,
                strike_number=strike,
                total_violations=tracker.total_violation_count,
                is_severe=False,
                should_terminate=True,
                message=(
                    f"Strike {strike}/{MAX_STRIKES}: Maximum violations reached. "
                    "This call is being terminated. This incident has been logged "
                    "and will be included in the call report."
                ),
            )
        else:
            # Strike 1 or 2 = mute until acknowledged
            tracker.pending_acknowledgment_flag_id = flag_id

            # Update intervention counts
            if violation_source == "audio":
                tracker.audio_mute_count += 1
            else:
                tracker.video_mute_count += 1

            escalation = ""
            if strike == 2:
                escalation = " This is your second violation - one more will end this call."

            result = ViolationResult(
                intervention=InterventionDecision.MUTE,
                strike_number=strike,
                total_violations=tracker.total_violation_count,
                is_severe=False,
                should_terminate=False,
                message=(
                    f"Strike {strike}/{MAX_STRIKES}: Your {violation_source} has been muted "
                    f"due to a violation ({', '.join(categories)}). "
                    f"You must acknowledge this warning to be unmuted.{escalation}"
                ),
            )

        await db.flush()

        logger.warning(
            f"Violation recorded: participant={tracker.participant_id[:8]}... "
            f"strike={strike}/{MAX_STRIKES} source={violation_source} "
            f"severe={is_severe} action={result.intervention.value}"
        )

        return result

    async def acknowledge_violation(
        self,
        db: AsyncSession,
        tracker: CallViolationTracker,
        flag_id: str,
    ) -> bool:
        """
        Acknowledge a violation to clear the mute state.

        Args:
            db: Database session
            tracker: The participant's violation tracker
            flag_id: ID of the flag being acknowledged

        Returns:
            True if acknowledgment was successful
        """
        if tracker.pending_acknowledgment_flag_id != flag_id:
            logger.warning(
                f"Acknowledgment mismatch: expected {tracker.pending_acknowledgment_flag_id}, "
                f"got {flag_id}"
            )
            return False

        if tracker.is_terminated:
            logger.warning("Cannot acknowledge - call already terminated")
            return False

        tracker.pending_acknowledgment_flag_id = None
        tracker.last_acknowledged_at = datetime.utcnow()
        await db.flush()

        logger.info(
            f"Violation acknowledged: participant={tracker.participant_id[:8]}... "
            f"flag={flag_id[:8]}..."
        )
        return True

    def should_terminate(self, tracker: CallViolationTracker) -> bool:
        """Check if the call should be terminated based on tracker state."""
        return (
            tracker.is_terminated
            or tracker.has_severe_violation
            or tracker.total_violation_count >= MAX_STRIKES
        )


# Global instance
aria_violation_tracker = ARIAViolationTrackerService()

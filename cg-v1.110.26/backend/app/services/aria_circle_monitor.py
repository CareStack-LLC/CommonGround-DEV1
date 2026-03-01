"""
ARIA Circle Call Monitor Service

Provides real-time child safety monitoring for circle contact-child voice/video calls.
Designed to protect children from inappropriate content and alert parents immediately
to concerning conversation.

Categories monitored:
- Inappropriate content (profanity, sexual references)
- Stranger danger signals (requests to keep secrets, meet without parents)
- Grooming patterns (inappropriate compliments, gift offers, trust-building)
- Bullying behavior (threats, intimidation, put-downs)
- Child distress signals (crying, fear, discomfort)

Key differences from parent call ARIA:
- Stricter threshold (0.3 vs 0.5)
- Child protection focus vs conflict mediation
- Immediate termination on SEVERE flags
- Different categories and detection patterns
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.circle_call import (
    CircleCallSession,
    CircleCallTranscriptChunk,
    CircleCallFlag,
    CircleCallSeverity,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class ARIACircleMonitor:
    """
    ARIA service for monitoring circle contact-child calls for child safety.

    Uses Claude API for nuanced analysis of spoken conversation.
    Real-time analysis triggers interventions (warning → mute → terminate).
    """

    # Child safety categories (different from parent conflict categories)
    SAFETY_CATEGORIES = [
        "inappropriate_content",  # Profanity, sexual references
        "stranger_danger",  # Requests to keep secrets, meet alone
        "grooming",  # Inappropriate compliments, trust-building, gift offers
        "bullying",  # Threats, intimidation, mean behavior
        "distress_signals",  # Child crying, expressing fear or discomfort
    ]

    # Severity thresholds for child safety (stricter than parent calls)
    CHILD_SAFETY_THRESHOLD = 0.3  # vs 0.5 for parent calls

    def __init__(self):
        self.anthropic_api_key = settings.ANTHROPIC_API_KEY

    async def analyze_transcript_chunk(
        self,
        db: AsyncSession,
        chunk: CircleCallTranscriptChunk
    ) -> Optional[CircleCallFlag]:
        """
        Real-time analysis of transcript chunk for child safety.

        Args:
            db: Database session
            chunk: Transcript chunk to analyze

        Returns:
            CircleCallFlag if safety concern detected, None otherwise
        """
        # Skip if already analyzed
        if chunk.analyzed:
            return None

        # Mark as analyzed
        chunk.analyzed = True

        try:
            # Analyze with Claude API
            analysis = await self._analyze_with_claude(chunk.content, chunk.speaker_type)

            # Update chunk
            chunk.toxicity_score = analysis.get("toxicity_score", 0.0)
            chunk.flagged = analysis["toxicity_score"] > self.CHILD_SAFETY_THRESHOLD

            await db.commit()

            # Create flag if threshold exceeded
            if chunk.flagged:
                return await self._create_flag(
                    db=db,
                    chunk=chunk,
                    analysis=analysis
                )

            return None

        except Exception as e:
            logger.error(f"Failed to analyze transcript chunk {chunk.id}: {e}")
            await db.rollback()
            return None

    async def _analyze_with_claude(
        self,
        text: str,
        speaker_type: str
    ) -> Dict[str, Any]:
        """
        Analyze text using Claude API for child safety.

        Args:
            text: Transcript text to analyze
            speaker_type: "circle_contact" or "child"

        Returns:
            Dict with toxicity_score, severity, categories, reason
        """
        if not self.anthropic_api_key:
            logger.warning("ANTHROPIC_API_KEY not set - using mock analysis")
            return {
                "toxicity_score": 0.0,
                "severity": "safe",
                "categories": [],
                "reason": "Mock analysis - API key not configured",
            }

        # Build prompt for child safety analysis
        prompt = f"""You are ARIA, a child safety AI assistant monitoring a video call between a circle contact (grandparent, aunt, family friend, etc.) and a child.

Analyze the following spoken text from the {speaker_type} for child safety concerns:

"{text}"

Evaluate for these child safety categories:
1. inappropriate_content - Profanity, sexual references, adult content
2. stranger_danger - Requests to keep secrets, meet without parents knowing
3. grooming - Inappropriate compliments, excessive gift offers, building inappropriate trust
4. bullying - Threats, intimidation, mean behavior, put-downs
5. distress_signals - Child expressing fear, discomfort, crying

Provide analysis in JSON format:
{{
  "toxicity_score": 0.0-1.0 (0 = completely safe, 1 = severe danger),
  "severity": "safe" | "low" | "medium" | "high" | "severe",
  "categories": ["category1", "category2"],
  "reason": "Brief explanation of concern",
  "triggers": ["specific phrase 1", "specific phrase 2"]
}}

IMPORTANT child safety thresholds:
- 0.0-0.2: Safe, appropriate conversation
- 0.3-0.5: Mild concern, log for parent review
- 0.6-0.8: Moderate concern, send alert to parents
- 0.9-1.0: SEVERE - Immediate termination required

Be very sensitive to child safety but avoid false positives on normal family conversation.
"""

        try:
            # Use Anthropic SDK
            import anthropic

            client = anthropic.Anthropic(api_key=self.anthropic_api_key)

            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse JSON response
            import json
            result_text = response.content[0].text

            # Extract JSON from response
            start_idx = result_text.find("{")
            end_idx = result_text.rfind("}") + 1
            json_str = result_text[start_idx:end_idx]

            analysis = json.loads(json_str)

            logger.info(f"ARIA circle analysis: toxicity={analysis.get('toxicity_score')} severity={analysis.get('severity')}")

            return analysis

        except Exception as e:
            logger.error(f"Claude API call failed: {e}")
            # Return safe default on error
            return {
                "toxicity_score": 0.0,
                "severity": "safe",
                "categories": [],
                "reason": f"Analysis failed: {str(e)}",
            }

    async def _create_flag(
        self,
        db: AsyncSession,
        chunk: CircleCallTranscriptChunk,
        analysis: Dict[str, Any]
    ) -> CircleCallFlag:
        """
        Create CircleCallFlag for safety concern.

        Args:
            db: Database session
            chunk: Transcript chunk
            analysis: Claude analysis result

        Returns:
            Created CircleCallFlag
        """
        # Get session
        result = await db.execute(
            select(CircleCallSession).where(CircleCallSession.id == chunk.session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError(f"Session {chunk.session_id} not found")

        # Determine severity
        toxicity = analysis.get("toxicity_score", 0.0)
        if toxicity >= 0.9:
            severity = CircleCallSeverity.SEVERE.value
            intervention_type = "terminate"
            intervention_message = "Call terminated for child safety - severe concern detected"
        elif toxicity >= 0.6:
            severity = CircleCallSeverity.HIGH.value
            intervention_type = "warning"
            intervention_message = "High concern detected - parents have been alerted"
        elif toxicity >= 0.3:
            severity = CircleCallSeverity.MEDIUM.value
            intervention_type = "warning"
            intervention_message = "Moderate concern detected - flagged for parent review"
        else:
            severity = CircleCallSeverity.LOW.value
            intervention_type = None
            intervention_message = "Minor concern logged"

        # Create flag
        flag = CircleCallFlag(
            session_id=chunk.session_id,
            transcript_chunk_id=chunk.id,
            flag_type="real_time",
            toxicity_score=toxicity,
            severity=severity,
            categories=analysis.get("categories", []),
            triggers=analysis.get("triggers", []),
            intervention_taken=intervention_type is not None,
            intervention_type=intervention_type,
            intervention_message=intervention_message,
            flagged_at=datetime.utcnow(),
            call_time_seconds=chunk.start_time,
            offending_speaker_id=chunk.speaker_id,
            offending_speaker_type=chunk.speaker_type,
        )

        db.add(flag)

        # Increment session intervention count
        session.increment_aria_intervention()

        # If SEVERE, terminate call immediately
        if severity == CircleCallSeverity.SEVERE.value:
            await self._terminate_call_for_safety(db, session, analysis.get("reason"))

        await db.commit()
        await db.refresh(flag)

        logger.warning(
            f"ARIA flag created for session {chunk.session_id}: "
            f"severity={severity} categories={analysis.get('categories')}"
        )

        return flag

    async def _terminate_call_for_safety(
        self,
        db: AsyncSession,
        session: CircleCallSession,
        reason: str
    ) -> None:
        """
        Immediately terminate call for severe child safety violation.

        Args:
            db: Database session
            session: Call session to terminate
            reason: Termination reason
        """
        # Mark session as terminated
        session.end(terminated_by_aria=True, reason=f"Child safety: {reason}")

        # TODO: Eject all participants from Daily.co room
        # This requires Daily.co API integration
        # await daily_service.eject_all_participants(session.daily_room_name)

        await db.commit()

        logger.critical(
            f"ARIA TERMINATED circle call {session.id} for child safety: {reason}"
        )

    async def get_session_safety_summary(
        self,
        db: AsyncSession,
        session_id: str
    ) -> Dict[str, Any]:
        """
        Get safety summary for a completed call session.

        Args:
            db: Database session
            session_id: Call session ID

        Returns:
            Dict with safety metrics and flags
        """
        # Get all flags for session
        result = await db.execute(
            select(CircleCallFlag)
            .where(CircleCallFlag.session_id == session_id)
            .order_by(CircleCallFlag.flagged_at)
        )
        flags = result.scalars().all()

        # Calculate metrics
        total_flags = len(flags)
        severe_count = sum(1 for f in flags if f.severity == CircleCallSeverity.SEVERE.value)
        high_count = sum(1 for f in flags if f.severity == CircleCallSeverity.HIGH.value)

        # Get category breakdown
        category_counts = {}
        for flag in flags:
            for category in flag.categories:
                category_counts[category] = category_counts.get(category, 0) + 1

        # Overall safety rating
        if severe_count > 0:
            safety_rating = "unsafe"
        elif high_count > 0:
            safety_rating = "concerning"
        elif total_flags > 0:
            safety_rating = "minor_concerns"
        else:
            safety_rating = "safe"

        return {
            "session_id": session_id,
            "total_flags": total_flags,
            "severe_count": severe_count,
            "high_count": high_count,
            "category_counts": category_counts,
            "safety_rating": safety_rating,
            "flags": [
                {
                    "severity": f.severity,
                    "categories": f.categories,
                    "reason": f.intervention_message,
                    "flagged_at": f.flagged_at.isoformat(),
                }
                for f in flags
            ],
        }


# Global singleton instance
aria_circle_monitor = ARIACircleMonitor()

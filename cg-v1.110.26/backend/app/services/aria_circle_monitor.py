"""
ARIA Circle Call Monitor Service

Provides real-time child safety monitoring for circle contact-child voice/video calls.
Designed to protect children from inappropriate content and alert parents immediately
to concerning conversation.

Enhanced with:
- Full child safety category coverage
- Cumulative 3-strike violation tracking per participant
- Acknowledgment-gated muting (mic stays muted until user acknowledges)
- Video frame analysis integration
- Combined audio + video court-ready reporting

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

import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.circle_call import (
    CircleCallSession,
    CircleCallTranscriptChunk,
    CircleCallFlag,
    CircleCallSeverity,
)
from app.models.call_video_flag import VideoFrameAnalysis
from app.core.config import settings
from app.services.aria_violation_tracker import (
    ARIAViolationTrackerService,
    ViolationResult,
    InterventionDecision,
)

logger = logging.getLogger(__name__)


@dataclass
class CircleRealtimeFlag:
    """Result of real-time transcript analysis for circle calls."""
    chunk_id: str
    is_severe: bool
    toxicity_score: float
    categories: List[str]
    intervention_needed: bool
    intervention_type: Optional[str]  # warning, mute, terminate
    warning_message: str
    speaker_id: Optional[str] = None
    speaker_type: Optional[str] = None


@dataclass
class CircleCallReport:
    """Comprehensive circle call safety report for court."""
    session_id: str
    child_id: str
    circle_contact_id: str
    duration_seconds: int
    total_chunks: int
    flags_count: int
    overall_safety_score: float
    category_breakdown: Dict[str, int]
    severe_violations: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    safety_rating: str
    recommendations: List[str]
    generated_at: datetime
    # Video analysis data
    video_frames_analyzed: int = 0
    video_flags_count: int = 0
    video_violations: List[Dict[str, Any]] = field(default_factory=list)


class ARIACircleMonitor:
    """
    ARIA service for monitoring circle contact-child calls for child safety.

    Enhanced with:
    - Full child safety category coverage
    - Cumulative 3-strike violation tracking per participant
    - Acknowledgment-gated muting (mute until acknowledged, not timed)
    - Video frame analysis integration
    - Combined audio + video court-ready reporting
    """

    # Child safety categories
    SAFETY_CATEGORIES = [
        "inappropriate_content",
        "stranger_danger",
        "grooming",
        "bullying",
        "distress_signals",
    ]

    # Severity thresholds for child safety (stricter than parent calls)
    CHILD_SAFETY_THRESHOLD = 0.3

    def __init__(self):
        self.anthropic_api_key = settings.ANTHROPIC_API_KEY
        self.violation_tracker = ARIAViolationTrackerService()

    async def analyze_transcript_chunk(
        self,
        db: AsyncSession,
        chunk: CircleCallTranscriptChunk,
    ) -> Optional[CircleRealtimeFlag]:
        """
        Real-time analysis of transcript chunk for child safety.

        Returns CircleRealtimeFlag if safety concern detected, None otherwise.
        """
        if chunk.analyzed:
            return None

        chunk.analyzed = True

        try:
            analysis = await self._analyze_with_claude(chunk.content, chunk.speaker_type)

            chunk.toxicity_score = analysis.get("toxicity_score", 0.0)
            chunk.flagged = analysis["toxicity_score"] > self.CHILD_SAFETY_THRESHOLD

            await db.flush()

            if chunk.flagged:
                flag = await self._create_flag(db=db, chunk=chunk, analysis=analysis)

                # Determine intervention type from flag
                if flag.severity == CircleCallSeverity.SEVERE.value:
                    intervention_type = "terminate"
                elif flag.severity == CircleCallSeverity.HIGH.value:
                    intervention_type = "mute"
                else:
                    intervention_type = "warning"

                return CircleRealtimeFlag(
                    chunk_id=chunk.id,
                    is_severe=flag.severity in [
                        CircleCallSeverity.SEVERE.value,
                        CircleCallSeverity.HIGH.value,
                    ],
                    toxicity_score=analysis["toxicity_score"],
                    categories=analysis.get("categories", []),
                    intervention_needed=True,
                    intervention_type=intervention_type,
                    warning_message=flag.intervention_message,
                    speaker_id=chunk.speaker_id,
                    speaker_type=chunk.speaker_type,
                )

            return None

        except Exception as e:
            logger.error(f"Failed to analyze transcript chunk {chunk.id}: {e}")
            await db.rollback()
            return None

    async def _analyze_with_claude(
        self,
        text: str,
        speaker_type: str,
    ) -> Dict[str, Any]:
        """Analyze text using Claude API for child safety."""
        if not self.anthropic_api_key:
            logger.warning("ANTHROPIC_API_KEY not set - using mock analysis")
            return {
                "toxicity_score": 0.0,
                "severity": "safe",
                "categories": [],
                "reason": "Mock analysis - API key not configured",
            }

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

Be very sensitive to child safety but avoid false positives on normal family conversation."""

        try:
            import anthropic

            client = anthropic.Anthropic(api_key=self.anthropic_api_key)

            response = client.messages.create(
                model="claude-sonnet-4-5-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )

            result_text = response.content[0].text
            start_idx = result_text.find("{")
            end_idx = result_text.rfind("}") + 1
            json_str = result_text[start_idx:end_idx]

            analysis = json.loads(json_str)

            logger.info(
                f"ARIA circle analysis: toxicity={analysis.get('toxicity_score')} "
                f"severity={analysis.get('severity')}"
            )

            return analysis

        except Exception as e:
            logger.error(f"Claude API call failed: {e}")
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
        analysis: Dict[str, Any],
    ) -> CircleCallFlag:
        """
        Create CircleCallFlag with violation tracker integration.

        Uses 3-strike system: mute until acknowledged, terminate on strike 3 or severe.
        """
        result = await db.execute(
            select(CircleCallSession).where(CircleCallSession.id == chunk.session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError(f"Session {chunk.session_id} not found")

        # Determine severity from toxicity score
        toxicity = analysis.get("toxicity_score", 0.0)
        if toxicity >= 0.9:
            severity = CircleCallSeverity.SEVERE.value
        elif toxicity >= 0.6:
            severity = CircleCallSeverity.HIGH.value
        elif toxicity >= 0.3:
            severity = CircleCallSeverity.MEDIUM.value
        else:
            severity = CircleCallSeverity.LOW.value

        # Create flag with violation_source tracking
        flag = CircleCallFlag(
            session_id=chunk.session_id,
            transcript_chunk_id=chunk.id,
            flag_type="real_time",
            toxicity_score=toxicity,
            severity=severity,
            categories=analysis.get("categories", []),
            triggers=analysis.get("triggers", []),
            intervention_taken=False,  # Will be set by violation tracker
            intervention_type=None,
            intervention_message="",
            flagged_at=datetime.utcnow(),
            call_time_seconds=chunk.start_time,
            violation_source="audio",
            offending_speaker_id=chunk.speaker_id,
            offending_speaker_type=chunk.speaker_type,
        )

        db.add(flag)
        await db.flush()

        # Use violation tracker for 3-strike system
        tracker = await self.violation_tracker.get_or_create_tracker(
            db=db,
            participant_id=chunk.speaker_id,
            circle_session_id=chunk.session_id,
        )

        violation_result = await self.violation_tracker.record_violation(
            db=db,
            tracker=tracker,
            violation_source="audio",
            severity=severity,
            categories=analysis.get("categories", []),
            flag_id=flag.id,
        )

        # Update flag with intervention from tracker
        if violation_result.should_terminate:
            flag.intervention_taken = True
            flag.intervention_type = "terminate"
            flag.intervention_message = violation_result.message
            await self._terminate_call_for_safety(
                db, session, violation_result.message
            )
        elif violation_result.intervention == InterventionDecision.MUTE:
            flag.intervention_taken = True
            flag.intervention_type = "mute"
            flag.intervention_message = violation_result.message
        elif violation_result.intervention == InterventionDecision.WARNING:
            flag.intervention_taken = True
            flag.intervention_type = "warning"
            flag.intervention_message = violation_result.message
        else:
            flag.intervention_message = "Flagged for parent review"

        # Increment session intervention count
        session.increment_aria_intervention()

        await db.flush()

        logger.warning(
            f"ARIA flag created for circle session {chunk.session_id}: "
            f"severity={severity} strike={violation_result.strike_number} "
            f"action={violation_result.intervention.value} "
            f"categories={analysis.get('categories')}"
        )

        return flag

    async def handle_video_violation(
        self,
        db: AsyncSession,
        session: CircleCallSession,
        participant_id: str,
        violation_type: str,
        violation_score: float,
        violation_description: str,
        frame_analysis_id: str,
    ) -> Dict[str, Any]:
        """
        Handle a video frame violation during a circle call.

        Creates a CircleCallFlag with violation_source="video" and
        integrates with the 3-strike violation tracker.

        Returns action details for WebSocket broadcast.
        """
        # Determine severity from score
        if violation_score >= 0.9:
            severity = CircleCallSeverity.SEVERE.value
        elif violation_score >= 0.6:
            severity = CircleCallSeverity.HIGH.value
        elif violation_score >= 0.3:
            severity = CircleCallSeverity.MEDIUM.value
        else:
            severity = CircleCallSeverity.LOW.value

        # Create flag for video violation
        flag = CircleCallFlag(
            session_id=session.id,
            transcript_chunk_id=None,
            flag_type="real_time",
            toxicity_score=violation_score,
            severity=severity,
            categories=[violation_type],
            triggers=[],
            intervention_taken=False,
            intervention_type=None,
            intervention_message="",
            flagged_at=datetime.utcnow(),
            call_time_seconds=None,
            violation_source="video",
            offending_speaker_id=participant_id,
            offending_speaker_type=None,
        )

        db.add(flag)
        await db.flush()

        # Use violation tracker
        tracker = await self.violation_tracker.get_or_create_tracker(
            db=db,
            participant_id=participant_id,
            circle_session_id=session.id,
        )

        violation_result = await self.violation_tracker.record_violation(
            db=db,
            tracker=tracker,
            violation_source="video",
            severity=severity,
            categories=[violation_type],
            flag_id=flag.id,
        )

        # Update flag
        if violation_result.should_terminate:
            flag.intervention_taken = True
            flag.intervention_type = "terminate"
            flag.intervention_message = violation_result.message
            session.end(
                terminated_by_aria=True,
                reason=f"Video violation: {violation_description}",
            )
        elif violation_result.intervention == InterventionDecision.MUTE:
            flag.intervention_taken = True
            flag.intervention_type = "mute"
            flag.intervention_message = violation_result.message
        else:
            flag.intervention_taken = True
            flag.intervention_type = "warning"
            flag.intervention_message = violation_result.message

        session.increment_aria_intervention()
        await db.flush()

        logger.warning(
            f"ARIA video flag created for circle session {session.id}: "
            f"type={violation_type} score={violation_score:.2f} "
            f"strike={violation_result.strike_number} "
            f"action={violation_result.intervention.value}"
        )

        return {
            "event_type": (
                "aria_call_terminate"
                if violation_result.should_terminate
                else "aria_video_block"
                if violation_result.intervention == InterventionDecision.MUTE
                else "aria_warning"
            ),
            "flag_id": flag.id,
            "participant_id": participant_id,
            "violation_type": violation_type,
            "violation_score": violation_score,
            "severity": severity,
            "strike_number": violation_result.strike_number,
            "should_terminate": violation_result.should_terminate,
            "message": violation_result.message,
            "requires_acknowledgment": (
                violation_result.intervention == InterventionDecision.MUTE
            ),
        }

    async def _terminate_call_for_safety(
        self,
        db: AsyncSession,
        session: CircleCallSession,
        reason: str,
    ) -> None:
        """Immediately terminate call for severe child safety violation."""
        session.end(terminated_by_aria=True, reason=f"Child safety: {reason}")
        await db.flush()

        logger.critical(
            f"ARIA TERMINATED circle call {session.id} for child safety: {reason}"
        )

    async def get_session_safety_summary(
        self,
        db: AsyncSession,
        session_id: str,
    ) -> Dict[str, Any]:
        """Get safety summary for a completed call session."""
        # Get all flags
        result = await db.execute(
            select(CircleCallFlag)
            .where(CircleCallFlag.session_id == session_id)
            .order_by(CircleCallFlag.flagged_at)
        )
        flags = result.scalars().all()

        # Get video frame analysis
        video_result = await db.execute(
            select(VideoFrameAnalysis)
            .where(VideoFrameAnalysis.circle_session_id == session_id)
            .order_by(VideoFrameAnalysis.captured_at)
        )
        video_analyses = video_result.scalars().all()

        # Calculate metrics
        total_flags = len(flags)
        audio_flags = [f for f in flags if f.violation_source == "audio"]
        video_flags = [f for f in flags if f.violation_source == "video"]
        severe_count = sum(1 for f in flags if f.severity == CircleCallSeverity.SEVERE.value)
        high_count = sum(1 for f in flags if f.severity == CircleCallSeverity.HIGH.value)

        # Category breakdown
        category_counts = {}
        for flag in flags:
            for category in flag.categories:
                category_counts[category] = category_counts.get(category, 0) + 1

        # Safety rating
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
            "audio_flags": len(audio_flags),
            "video_flags": len(video_flags),
            "severe_count": severe_count,
            "high_count": high_count,
            "category_counts": category_counts,
            "safety_rating": safety_rating,
            "video_frames_analyzed": len(video_analyses),
            "video_frames_flagged": sum(1 for v in video_analyses if v.is_flagged),
            "flags": [
                {
                    "severity": f.severity,
                    "categories": f.categories,
                    "violation_source": f.violation_source,
                    "reason": f.intervention_message,
                    "acknowledged": f.acknowledged,
                    "flagged_at": f.flagged_at.isoformat(),
                }
                for f in flags
            ],
        }

    async def generate_circle_call_report(
        self,
        db: AsyncSession,
        session_id: str,
    ) -> CircleCallReport:
        """
        Generate comprehensive court-ready circle call safety report.

        Includes audio and video violation analysis with combined timeline.
        """
        # Get session
        result = await db.execute(
            select(CircleCallSession).where(CircleCallSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Get all transcript chunks
        chunks_result = await db.execute(
            select(CircleCallTranscriptChunk)
            .where(CircleCallTranscriptChunk.session_id == session_id)
            .order_by(CircleCallTranscriptChunk.start_time)
        )
        chunks = chunks_result.scalars().all()

        # Get all flags
        flags_result = await db.execute(
            select(CircleCallFlag)
            .where(CircleCallFlag.session_id == session_id)
            .order_by(CircleCallFlag.flagged_at)
        )
        flags = flags_result.scalars().all()

        # Get video frame analyses
        video_result = await db.execute(
            select(VideoFrameAnalysis)
            .where(VideoFrameAnalysis.circle_session_id == session_id)
            .order_by(VideoFrameAnalysis.captured_at)
        )
        video_analyses = video_result.scalars().all()

        # Build category breakdown
        category_breakdown = {}
        for flag in flags:
            for category in flag.categories:
                category_breakdown[category] = category_breakdown.get(category, 0) + 1

        # Build timeline (audio + video merged)
        timeline = []

        for flag in flags:
            timeline.append({
                "time_seconds": flag.call_time_seconds,
                "type": f"{flag.violation_source}_violation",
                "severity": flag.severity,
                "categories": flag.categories,
                "intervention": flag.intervention_type,
                "message": flag.intervention_message,
                "speaker_id": flag.offending_speaker_id,
                "speaker_type": flag.offending_speaker_type,
                "acknowledged": flag.acknowledged,
            })

        # Add video violations to timeline
        video_violations = []
        for va in video_analyses:
            if va.is_flagged:
                video_violations.append({
                    "frame_number": va.frame_number,
                    "captured_at": va.captured_at.isoformat(),
                    "call_time_seconds": va.call_time_seconds,
                    "violation_type": va.violation_type,
                    "violation_score": va.violation_score,
                    "violation_description": va.violation_description,
                    "frame_hash": va.frame_hash,
                    "frame_storage_path": va.frame_storage_path,
                    "participant_id": va.participant_id,
                })

        # Sort timeline by time
        timeline.sort(key=lambda x: x.get("time_seconds") or 0)

        # Severe violations
        severe_violations = [
            {
                "severity": f.severity,
                "categories": f.categories,
                "violation_source": f.violation_source,
                "intervention": f.intervention_type,
                "time_seconds": f.call_time_seconds,
                "speaker_id": f.offending_speaker_id,
            }
            for f in flags
            if f.severity in [CircleCallSeverity.SEVERE.value, CircleCallSeverity.HIGH.value]
        ]

        # Calculate overall safety score (0 = safe, 1 = dangerous)
        if not flags:
            overall_safety_score = 0.0
        else:
            scores = [f.toxicity_score for f in flags]
            overall_safety_score = max(scores)

        # Safety rating
        if any(f.severity == CircleCallSeverity.SEVERE.value for f in flags):
            safety_rating = "unsafe"
        elif any(f.severity == CircleCallSeverity.HIGH.value for f in flags):
            safety_rating = "concerning"
        elif flags:
            safety_rating = "minor_concerns"
        else:
            safety_rating = "safe"

        # Recommendations
        recommendations = []
        if safety_rating == "unsafe":
            recommendations.append(
                "URGENT: Severe child safety concerns detected. "
                "Review of contact permissions is strongly recommended."
            )
        if any("grooming" in f.categories for f in flags):
            recommendations.append(
                "Grooming behavior patterns detected. "
                "Consider restricting unsupervised contact."
            )
        if any("stranger_danger" in f.categories for f in flags):
            recommendations.append(
                "Stranger danger signals detected. "
                "Review contact's relationship and access permissions."
            )
        if session.aria_terminated_call:
            recommendations.append(
                f"Call was terminated by ARIA for safety: {session.aria_termination_reason}"
            )

        return CircleCallReport(
            session_id=session_id,
            child_id=session.child_id,
            circle_contact_id=session.circle_contact_id,
            duration_seconds=session.duration_seconds or 0,
            total_chunks=len(chunks),
            flags_count=len(flags),
            overall_safety_score=overall_safety_score,
            category_breakdown=category_breakdown,
            severe_violations=severe_violations,
            timeline=timeline,
            safety_rating=safety_rating,
            recommendations=recommendations,
            generated_at=datetime.utcnow(),
            video_frames_analyzed=len(video_analyses),
            video_flags_count=sum(1 for v in video_analyses if v.is_flagged),
            video_violations=video_violations,
        )

    def generate_circle_call_report_text(self, report: CircleCallReport) -> str:
        """Generate human-readable text report for court documentation."""
        lines = [
            "=" * 60,
            "ARIA CHILD SAFETY REPORT - CIRCLE CALL",
            "=" * 60,
            "",
            f"Session ID: {report.session_id}",
            f"Child ID: {report.child_id}",
            f"Circle Contact ID: {report.circle_contact_id}",
            f"Duration: {report.duration_seconds // 60}m {report.duration_seconds % 60}s",
            f"Generated: {report.generated_at.isoformat()}",
            "",
            "--- SAFETY ASSESSMENT ---",
            f"Overall Safety Rating: {report.safety_rating.upper()}",
            f"Overall Safety Score: {report.overall_safety_score:.2f}",
            f"Total Flags: {report.flags_count}",
            f"Severe Violations: {len(report.severe_violations)}",
            "",
        ]

        # Category breakdown
        if report.category_breakdown:
            lines.append("--- CATEGORY BREAKDOWN ---")
            for category, count in sorted(
                report.category_breakdown.items(), key=lambda x: x[1], reverse=True
            ):
                lines.append(f"  {category}: {count}")
            lines.append("")

        # Video analysis summary
        lines.append("--- VIDEO FRAME ANALYSIS ---")
        lines.append(f"Frames Analyzed: {report.video_frames_analyzed}")
        lines.append(f"Frames Flagged: {report.video_flags_count}")
        if report.video_violations:
            for vv in report.video_violations:
                lines.append(
                    f"  Frame #{vv['frame_number']} at {vv['call_time_seconds']:.1f}s: "
                    f"{vv['violation_type']} (score: {vv['violation_score']:.2f}) "
                    f"- {vv['violation_description']}"
                )
                lines.append(f"    Evidence hash: {vv['frame_hash']}")
                if vv.get("frame_storage_path"):
                    lines.append(f"    Storage: {vv['frame_storage_path']}")
        lines.append("")

        # Severe violations
        if report.severe_violations:
            lines.append("--- SEVERE VIOLATIONS ---")
            for sv in report.severe_violations:
                lines.append(
                    f"  [{sv['severity'].upper()}] at {sv.get('time_seconds', 'N/A')}s: "
                    f"{', '.join(sv['categories'])} "
                    f"(source: {sv['violation_source']}, speaker: {sv.get('speaker_id', 'N/A')})"
                )
            lines.append("")

        # Timeline
        if report.timeline:
            lines.append("--- VIOLATION TIMELINE ---")
            for event in report.timeline:
                time_str = (
                    f"{event['time_seconds']:.1f}s"
                    if event.get("time_seconds") is not None
                    else "N/A"
                )
                ack_str = " [ACK]" if event.get("acknowledged") else " [UNACK]"
                lines.append(
                    f"  {time_str}: [{event['severity'].upper()}] "
                    f"{event['type']} - {', '.join(event.get('categories', []))}"
                    f"{ack_str}"
                )
            lines.append("")

        # Recommendations
        if report.recommendations:
            lines.append("--- RECOMMENDATIONS ---")
            for i, rec in enumerate(report.recommendations, 1):
                lines.append(f"  {i}. {rec}")
            lines.append("")

        lines.append("=" * 60)
        lines.append("END OF ARIA CHILD SAFETY REPORT")
        lines.append("=" * 60)

        return "\n".join(lines)


# Global singleton instance
aria_circle_monitor = ARIACircleMonitor()

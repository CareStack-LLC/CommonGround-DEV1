"""
ARIA Call Monitor Service - Real-time and post-call analysis for parent calls.

Provides:
1. Real-time transcript chunk analysis (all violation categories)
2. Video frame analysis integration
3. Cumulative 3-strike violation tracking with acknowledgment-gated muting
4. Post-call comprehensive transcript and video analysis
5. Court-ready call reports with audio + video evidence
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
import anthropic
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.parent_call import (
    ParentCallSession,
    CallTranscriptChunk,
    CallFlag,
    CallStatus,
    CallSeverity,
)
from app.models.call_video_flag import VideoFrameAnalysis, CallViolationTracker
from app.services.aria import ARIAService, ToxicityLevel, ToxicityCategory
from app.services.aria_patterns import (
    HATE_SPEECH_PATTERNS,
    SEXUAL_HARASSMENT_PATTERNS,
    THREATENING_PATTERNS,
    PROFANITY_PATTERNS,
    CUSTODY_WEAPONIZATION_PATTERNS,
    FINANCIAL_COERCION_PATTERNS,
    HOSTILITY_PATTERNS,
)
from app.services.aria_violation_tracker import (
    ARIAViolationTrackerService,
    ViolationResult,
    InterventionDecision,
)
from app.services.daily_video import DailyVideoService
from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)


class InterventionType(Enum):
    """Types of ARIA interventions during calls"""
    WARNING = "warning"
    MUTE = "mute"
    TERMINATE = "terminate"


@dataclass
class RealtimeFlag:
    """Result of real-time transcript analysis"""
    chunk_id: str
    is_severe: bool
    toxicity_score: float
    categories: List[str]
    intervention_needed: bool
    intervention_type: Optional[InterventionType]
    warning_message: str
    speaker_id: Optional[str] = None
    mute_duration_seconds: Optional[float] = None  # None = until acknowledged


@dataclass
class CallReport:
    """Comprehensive call analysis report for court"""
    session_id: str
    duration_seconds: int
    total_chunks: int
    flags_count: int
    overall_toxicity_score: float
    category_breakdown: Dict[str, int]
    severe_violations: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    intervention_summary: Dict[str, int]
    recommendations: List[str]
    generated_at: datetime
    # Video analysis data
    video_frames_analyzed: int = 0
    video_flags_count: int = 0
    video_violations: List[Dict[str, Any]] = field(default_factory=list)


class ARIACallMonitor:
    """
    ARIA Call Monitoring Service.

    Enhanced with:
    - Full pattern coverage (all categories, not just SEVERE)
    - Cumulative 3-strike violation tracking per participant
    - Acknowledgment-gated muting (mic stays muted until user acknowledges)
    - Video frame analysis integration
    - Combined audio + video court reports
    """

    # Full pattern set for real-time detection (imported from aria_patterns.py)
    DETECTION_PATTERNS = {
        ToxicityCategory.HATE_SPEECH: HATE_SPEECH_PATTERNS,
        ToxicityCategory.SEXUAL_HARASSMENT: SEXUAL_HARASSMENT_PATTERNS,
        ToxicityCategory.THREATENING: THREATENING_PATTERNS,
        ToxicityCategory.PROFANITY: PROFANITY_PATTERNS,
        ToxicityCategory.CUSTODY_WEAPONIZATION: CUSTODY_WEAPONIZATION_PATTERNS,
        ToxicityCategory.FINANCIAL_COERCION: FINANCIAL_COERCION_PATTERNS,
        ToxicityCategory.HOSTILITY: HOSTILITY_PATTERNS,
    }

    # Sensitivity level thresholds - configurable per call
    SENSITIVITY_THRESHOLDS = {
        "strict": {"warning": 0.3, "mute": 0.5, "terminate": 0.7},
        "moderate": {"warning": 0.5, "mute": 0.65, "terminate": 0.85},
        "relaxed": {"warning": 0.7, "mute": 0.8, "terminate": 0.9},
        "off": {"warning": 1.1, "mute": 1.1, "terminate": 1.1},
    }

    WARNING_DURATION = 10  # Seconds before termination countdown

    def get_thresholds(self, sensitivity_level: str = "moderate") -> Dict[str, float]:
        """Get thresholds for given sensitivity level"""
        return self.SENSITIVITY_THRESHOLDS.get(
            sensitivity_level.lower(),
            self.SENSITIVITY_THRESHOLDS["moderate"]
        )

    def __init__(self):
        """Initialize ARIA call monitor"""
        self.aria_service = ARIAService()
        self.daily_service = DailyVideoService()
        self.violation_tracker = ARIAViolationTrackerService()
        self.compiled_patterns = self._compile_patterns()

        # Initialize AI clients (shared singletons)
        from app.core.ai_clients import get_async_anthropic, get_async_openai
        self.claude_client = get_async_anthropic()
        self.openai_client = get_async_openai() if settings.OPENAI_API_KEY else None

    def _compile_patterns(self) -> Dict[ToxicityCategory, List[re.Pattern]]:
        """Compile all detection patterns for real-time analysis"""
        compiled = {}
        for category, patterns in self.DETECTION_PATTERNS.items():
            compiled[category] = [re.compile(p, re.IGNORECASE) for p in patterns]
        return compiled

    async def analyze_transcript_chunk_realtime(
        self,
        db: AsyncSession,
        chunk: CallTranscriptChunk,
        sensitivity_level: str = "moderate"
    ) -> Optional[RealtimeFlag]:
        """
        Real-time analysis of transcript chunk using full pattern coverage.

        Checks ALL violation categories (not just SEVERE).
        Returns intervention recommendation if needed.
        """
        if sensitivity_level.lower() == "off":
            return None

        content = chunk.content.lower()

        # Step 1: Quick regex check across ALL categories
        detected_categories = []
        for category, patterns in self.compiled_patterns.items():
            for pattern in patterns:
                if pattern.search(content):
                    detected_categories.append(category)
                    break

        # No patterns found - skip
        if not detected_categories:
            return None

        # Step 2: Fast AI analysis for context scoring
        try:
            toxicity_score = await self._quick_toxicity_analysis(chunk.content)
        except Exception as e:
            logger.error(f"AI toxicity analysis failed: {e}")
            capture_error(e)
            # Fallback scoring based on categories detected
            base_score = 0.5
            # Severe categories get higher base
            severe_cats = {ToxicityCategory.HATE_SPEECH, ToxicityCategory.THREATENING,
                          ToxicityCategory.SEXUAL_HARASSMENT}
            if any(c in severe_cats for c in detected_categories):
                base_score = 0.75
            additional_score = max(0, len(detected_categories) - 1) * 0.1
            toxicity_score = min(base_score + additional_score, 1.0)

        # Step 3: Get dynamic thresholds
        thresholds = self.get_thresholds(sensitivity_level)

        # Step 4: Determine if flagged
        is_flagged = toxicity_score >= thresholds["warning"]
        if not is_flagged:
            return None

        # Determine intervention type
        if toxicity_score >= thresholds["terminate"]:
            intervention_type = InterventionType.TERMINATE
            warning_message = (
                "SEVERE VIOLATION DETECTED: This call will be terminated. "
                "This incident has been logged."
            )
        elif toxicity_score >= thresholds["mute"]:
            intervention_type = InterventionType.MUTE
            warning_message = (
                "Your microphone has been muted due to inappropriate language. "
                "You must acknowledge this warning to be unmuted."
            )
        else:
            intervention_type = InterventionType.WARNING
            warning_message = (
                "WARNING: Your language is inappropriate and violates "
                "communication standards. Please remain respectful."
            )

        return RealtimeFlag(
            chunk_id=chunk.id,
            is_severe=toxicity_score >= thresholds["mute"],
            toxicity_score=toxicity_score,
            categories=[cat.value for cat in detected_categories],
            intervention_needed=True,
            intervention_type=intervention_type,
            warning_message=warning_message,
            speaker_id=chunk.speaker_id,
            mute_duration_seconds=None,  # Indefinite until acknowledged
        )

    async def _quick_toxicity_analysis(self, content: str) -> float:
        """Quick AI analysis for violation scoring using OpenAI."""
        if not self.openai_client:
            raise ValueError("OpenAI client not configured")

        prompt = f"""Analyze this co-parenting communication for violations.

Categories to check:
- Profanity and swearing
- Direct threats of violence or harm
- Hate speech (racial, homophobic, misogynistic slurs)
- Sexual harassment
- Hostile or aggressive language
- Custody weaponization (using kids as leverage)
- Financial coercion

Text: "{content}"

Respond with ONLY a number from 0.0 to 1.0:
- 0.0-0.3: Clean/appropriate
- 0.4-0.6: Mild issues (profanity, slight hostility)
- 0.7-0.84: Severe (warning needed)
- 0.85-1.0: Extremely severe (terminate call)

Score:"""

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=10,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )
            score_text = response.choices[0].message.content.strip()
            score = float(score_text)
            return max(0.0, min(1.0, score))
        except Exception as e:
            logger.error(f"OpenAI toxicity analysis error: {e}")
            capture_error(e)
            raise

    async def handle_violation(
        self,
        db: AsyncSession,
        session: ParentCallSession,
        flag: RealtimeFlag,
        chunk: CallTranscriptChunk
    ) -> Dict[str, Any]:
        """
        Handle a violation during a call with cumulative 3-strike tracking.

        Flow:
        1. Create CallFlag record with violation_source="audio"
        2. Update violation tracker (3-strike logic)
        3. Override intervention if tracker says terminate (strike 3)
        4. Return action details for WebSocket broadcast
        """
        thresholds = self.get_thresholds(session.aria_sensitivity_level)

        # Determine severity
        if flag.toxicity_score >= thresholds["terminate"]:
            severity = CallSeverity.SEVERE.value
        elif flag.toxicity_score >= thresholds["mute"]:
            severity = CallSeverity.HIGH.value
        else:
            severity = CallSeverity.MEDIUM.value

        # Create flag record
        call_flag = CallFlag(
            session_id=session.id,
            transcript_chunk_id=chunk.id,
            flag_type="real_time",
            toxicity_score=flag.toxicity_score,
            severity=severity,
            categories=flag.categories,
            triggers=[],
            intervention_taken=True,
            intervention_type=flag.intervention_type.value if flag.intervention_type else None,
            intervention_message=flag.warning_message,
            violation_source="audio",
            acknowledged=False,
            flagged_at=datetime.utcnow(),
            call_time_seconds=chunk.start_time,
            offending_speaker_id=flag.speaker_id,
            mute_duration_seconds=None,  # Indefinite until acknowledged
        )
        db.add(call_flag)
        await db.flush()

        # Update violation tracker (3-strike system)
        tracker = await self.violation_tracker.get_or_create_tracker(
            db=db,
            participant_id=flag.speaker_id,
            session_id=session.id,
        )

        violation_result = await self.violation_tracker.record_violation(
            db=db,
            tracker=tracker,
            violation_source="audio",
            severity=severity,
            categories=flag.categories,
            flag_id=call_flag.id,
        )

        # Override intervention based on tracker decision
        should_terminate = violation_result.should_terminate
        should_mute = violation_result.intervention == InterventionDecision.MUTE

        # Update session
        session.aria_intervention_count += 1
        if should_terminate:
            session.aria_terminated_call = True
            session.aria_termination_reason = violation_result.message

        await db.commit()
        await db.refresh(call_flag)

        logger.warning(
            f"ARIA audio violation in session {session.id}: "
            f"score={flag.toxicity_score:.2f}, "
            f"strike={violation_result.strike_number}/3, "
            f"action={violation_result.intervention.value}, "
            f"speaker={flag.speaker_id}"
        )

        return {
            "type": "aria_audio_mute" if should_mute else ("aria_call_terminate" if should_terminate else "aria_warning"),
            "flag_id": call_flag.id,
            "severity": severity,
            "intervention_type": violation_result.intervention.value,
            "warning_message": violation_result.message,
            "should_terminate": should_terminate,
            "termination_delay": self.WARNING_DURATION if should_terminate else None,
            "should_mute": should_mute,
            "mute_speaker_id": flag.speaker_id if should_mute else None,
            "requires_acknowledgment": should_mute,
            "strike_number": violation_result.strike_number,
            "total_violations": violation_result.total_violations,
            "call_time_seconds": chunk.start_time,
            "violation_source": "audio",
            "timestamp": datetime.utcnow().isoformat(),
        }

    # Keep backward compatibility
    async def handle_severe_violation(
        self,
        db: AsyncSession,
        session: ParentCallSession,
        flag: RealtimeFlag,
        chunk: CallTranscriptChunk
    ) -> Dict[str, Any]:
        """Backward-compatible wrapper for handle_violation."""
        return await self.handle_violation(db, session, flag, chunk)

    async def handle_video_violation(
        self,
        db: AsyncSession,
        session: ParentCallSession,
        frame_analysis: VideoFrameAnalysis,
    ) -> Dict[str, Any]:
        """
        Handle a video frame violation with 3-strike tracking.

        Args:
            db: Database session
            session: Active call session
            frame_analysis: The flagged VideoFrameAnalysis record

        Returns:
            Action details for WebSocket broadcast
        """
        # Determine severity from violation score
        if frame_analysis.violation_score >= 0.9:
            severity = CallSeverity.SEVERE.value
        elif frame_analysis.violation_score >= 0.7:
            severity = CallSeverity.HIGH.value
        else:
            severity = CallSeverity.MEDIUM.value

        # Create a CallFlag for the video violation
        call_flag = CallFlag(
            session_id=session.id,
            transcript_chunk_id=None,
            flag_type="real_time",
            toxicity_score=frame_analysis.violation_score,
            severity=severity,
            categories=[frame_analysis.violation_type] if frame_analysis.violation_type else [],
            triggers=[],
            intervention_taken=True,
            intervention_type="video_mute",
            intervention_message=f"Video violation detected: {frame_analysis.violation_description}",
            violation_source="video",
            acknowledged=False,
            flagged_at=datetime.utcnow(),
            call_time_seconds=frame_analysis.call_time_seconds,
            offending_speaker_id=frame_analysis.participant_id,
            mute_duration_seconds=None,
        )
        db.add(call_flag)
        await db.flush()

        # Update frame analysis with intervention info
        frame_analysis.intervention_taken = True
        frame_analysis.intervention_type = "video_mute"

        # Update violation tracker
        tracker = await self.violation_tracker.get_or_create_tracker(
            db=db,
            participant_id=frame_analysis.participant_id,
            session_id=session.id,
        )

        violation_result = await self.violation_tracker.record_violation(
            db=db,
            tracker=tracker,
            violation_source="video",
            severity=severity,
            categories=[frame_analysis.violation_type] if frame_analysis.violation_type else [],
            flag_id=call_flag.id,
        )

        should_terminate = violation_result.should_terminate
        should_block_video = violation_result.intervention in (
            InterventionDecision.MUTE, InterventionDecision.TERMINATE
        )

        session.aria_intervention_count += 1
        if should_terminate:
            session.aria_terminated_call = True
            session.aria_termination_reason = violation_result.message

        await db.commit()
        await db.refresh(call_flag)

        logger.warning(
            f"ARIA video violation in session {session.id}: "
            f"type={frame_analysis.violation_type}, "
            f"score={frame_analysis.violation_score:.2f}, "
            f"strike={violation_result.strike_number}/3, "
            f"participant={frame_analysis.participant_id}"
        )

        return {
            "type": "aria_video_block" if should_block_video else "aria_call_terminate",
            "flag_id": call_flag.id,
            "severity": severity,
            "intervention_type": violation_result.intervention.value,
            "warning_message": violation_result.message,
            "should_terminate": should_terminate,
            "termination_delay": self.WARNING_DURATION if should_terminate else None,
            "block_video": should_block_video,
            "block_participant_id": frame_analysis.participant_id,
            "requires_acknowledgment": not should_terminate,
            "strike_number": violation_result.strike_number,
            "total_violations": violation_result.total_violations,
            "violation_type": frame_analysis.violation_type,
            "violation_description": frame_analysis.violation_description,
            "call_time_seconds": frame_analysis.call_time_seconds,
            "violation_source": "video",
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def analyze_full_call_transcript(
        self,
        db: AsyncSession,
        session_id: str
    ) -> CallReport:
        """
        Post-call comprehensive analysis of entire transcript + video frames.

        Uses full ARIA pipeline with all categories and AI tiers.
        Includes video frame analysis summary.
        """
        # Get session
        result = await db.execute(
            select(ParentCallSession).where(ParentCallSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Get all transcript chunks
        chunks_result = await db.execute(
            select(CallTranscriptChunk)
            .where(CallTranscriptChunk.session_id == session_id)
            .order_by(CallTranscriptChunk.start_time)
        )
        chunks = list(chunks_result.scalars().all())

        # Get all flags (audio + video)
        flags_result = await db.execute(
            select(CallFlag)
            .where(CallFlag.session_id == session_id)
            .order_by(CallFlag.flagged_at)
        )
        flags = list(flags_result.scalars().all())

        # Get video frame analyses
        video_result = await db.execute(
            select(VideoFrameAnalysis)
            .where(VideoFrameAnalysis.session_id == session_id)
            .order_by(VideoFrameAnalysis.captured_at)
        )
        video_frames = list(video_result.scalars().all())

        # Analyze each chunk with full ARIA
        category_breakdown: Dict[str, int] = {}
        severe_violations = []
        timeline = []
        total_score = 0.0
        analyzed_count = 0

        for chunk in chunks:
            if chunk.analyzed:
                continue

            analysis = self.aria_service.analyze_message(chunk.content)
            chunk.analyzed = True
            chunk.flagged = analysis.is_flagged
            chunk.toxicity_score = analysis.toxicity_score

            for category in analysis.categories:
                cat_name = category.value
                category_breakdown[cat_name] = category_breakdown.get(cat_name, 0) + 1

            if analysis.toxicity_level in [ToxicityLevel.HIGH, ToxicityLevel.SEVERE]:
                severe_violations.append({
                    "timestamp": chunk.timestamp.isoformat(),
                    "speaker_id": chunk.speaker_id,
                    "speaker_name": chunk.speaker_name,
                    "content": chunk.content,
                    "score": analysis.toxicity_score,
                    "level": analysis.toxicity_level.value,
                    "categories": [c.value for c in analysis.categories],
                    "source": "audio",
                })

            timeline.append({
                "time": chunk.start_time,
                "speaker": chunk.speaker_name,
                "flagged": analysis.is_flagged,
                "score": analysis.toxicity_score,
                "source": "audio",
            })

            total_score += analysis.toxicity_score
            analyzed_count += 1

        await db.commit()

        overall_score = total_score / analyzed_count if analyzed_count > 0 else 0.0

        # Build video violations list
        video_violations = []
        flagged_frames = [f for f in video_frames if f.is_flagged]
        for frame in flagged_frames:
            video_violations.append({
                "timestamp": frame.captured_at.isoformat(),
                "participant_id": frame.participant_id,
                "call_time_seconds": frame.call_time_seconds,
                "violation_type": frame.violation_type,
                "violation_score": frame.violation_score,
                "violation_description": frame.violation_description,
                "frame_hash": frame.frame_hash,
                "frame_storage_path": frame.frame_storage_path,
                "source": "video",
            })

            # Add video violations to timeline
            timeline.append({
                "time": frame.call_time_seconds,
                "speaker": f"Participant {frame.participant_id[:8]}...",
                "flagged": True,
                "score": frame.violation_score or 0.0,
                "source": "video",
                "violation_type": frame.violation_type,
            })

        # Sort timeline by time
        timeline.sort(key=lambda x: x["time"])

        # Intervention summary (audio + video)
        audio_flags = [f for f in flags if f.violation_source == "audio"]
        video_flags = [f for f in flags if f.violation_source == "video"]
        intervention_summary = {
            "warnings": sum(1 for f in flags if f.intervention_type == "warning"),
            "audio_mutes": sum(1 for f in audio_flags if f.intervention_type == "mute"),
            "video_blocks": sum(1 for f in video_flags if f.intervention_type == "video_mute"),
            "mutes": sum(1 for f in flags if f.intervention_type in ("mute", "video_mute")),
            "terminations": sum(1 for f in flags if f.intervention_type == "terminate"),
        }

        recommendations = self._generate_recommendations(
            overall_score, category_breakdown, severe_violations,
            intervention_summary, video_violations
        )

        return CallReport(
            session_id=session_id,
            duration_seconds=session.duration_seconds or 0,
            total_chunks=len(chunks),
            flags_count=len(flags),
            overall_toxicity_score=overall_score,
            category_breakdown=category_breakdown,
            severe_violations=severe_violations,
            timeline=timeline,
            intervention_summary=intervention_summary,
            recommendations=recommendations,
            generated_at=datetime.utcnow(),
            video_frames_analyzed=len(video_frames),
            video_flags_count=len(flagged_frames),
            video_violations=video_violations,
        )

    def _generate_recommendations(
        self,
        overall_score: float,
        categories: Dict[str, int],
        severe_violations: List[Dict],
        interventions: Dict[str, int],
        video_violations: Optional[List[Dict]] = None,
    ) -> List[str]:
        """Generate court recommendations based on call analysis"""
        recommendations = []

        if overall_score >= 0.7:
            recommendations.append(
                "CRITICAL: This call demonstrates severe communication issues. "
                "Consider court-ordered communication training or supervised exchanges."
            )
        elif overall_score >= 0.5:
            recommendations.append(
                "WARNING: Frequent toxic communication patterns detected. "
                "Recommend mediation and communication guidelines."
            )
        elif overall_score >= 0.3:
            recommendations.append(
                "CAUTION: Some communication issues present. "
                "Parents may benefit from co-parenting communication resources."
            )
        else:
            recommendations.append(
                "Communication within acceptable parameters. "
                "Continue monitoring for compliance."
            )

        if "threatening" in categories:
            recommendations.append(
                f"URGENT: {categories['threatening']} instances of threatening language detected. "
                "Immediate intervention required to ensure safety."
            )

        if "hate_speech" in categories or "sexual_harassment" in categories:
            recommendations.append(
                "SEVERE: Hate speech or harassment detected. "
                "This violates court standards and may warrant sanctions."
            )

        if "custody_weaponization" in categories:
            recommendations.append(
                "Custody is being used as leverage in financial disputes. "
                "Recommend clear separation of parenting time and financial issues."
            )

        if interventions.get("terminations", 0) > 0:
            recommendations.append(
                f"ARIA terminated this call {interventions['terminations']} time(s) due to severe violations. "
                "Parents are unable to communicate safely without intervention."
            )

        if len(severe_violations) >= 5:
            recommendations.append(
                f"{len(severe_violations)} severe violations detected. "
                "High-conflict communication pattern requires structured intervention."
            )

        # Video-specific recommendations
        if video_violations:
            nudity_count = sum(1 for v in video_violations if v.get("violation_type") == "nudity")
            violence_count = sum(1 for v in video_violations if v.get("violation_type") == "violence")
            hate_count = sum(1 for v in video_violations if v.get("violation_type") == "hate_symbol")

            if nudity_count > 0:
                recommendations.append(
                    f"VIDEO: {nudity_count} instance(s) of inappropriate visual content detected. "
                    "Video monitoring flagged nudity or indecent exposure."
                )
            if violence_count > 0:
                recommendations.append(
                    f"VIDEO: {violence_count} instance(s) of violent imagery detected. "
                    "Weapons or physical aggression observed on camera."
                )
            if hate_count > 0:
                recommendations.append(
                    f"VIDEO: {hate_count} instance(s) of hate symbols detected. "
                    "Hate imagery displayed on camera violates safety standards."
                )

        return recommendations

    async def get_speaker_violation_summary(
        self,
        db: AsyncSession,
        session_id: str
    ) -> Dict[str, Dict[str, Any]]:
        """Get violation stats grouped by speaker for court reporting."""
        flags_result = await db.execute(
            select(CallFlag)
            .where(CallFlag.session_id == session_id)
            .order_by(CallFlag.flagged_at)
        )
        flags = list(flags_result.scalars().all())

        speaker_stats: Dict[str, Dict[str, Any]] = {}

        for flag in flags:
            speaker_id = flag.offending_speaker_id or "unknown"

            if speaker_id not in speaker_stats:
                speaker_stats[speaker_id] = {
                    "total_violations": 0,
                    "audio_violations": 0,
                    "video_violations": 0,
                    "warnings": 0,
                    "mutes": 0,
                    "video_blocks": 0,
                    "terminates": 0,
                    "categories": {},
                    "highest_score": 0.0,
                    "acknowledged_count": 0,
                }

            stats = speaker_stats[speaker_id]
            stats["total_violations"] += 1

            if flag.violation_source == "video":
                stats["video_violations"] += 1
            else:
                stats["audio_violations"] += 1

            if flag.intervention_type == "warning":
                stats["warnings"] += 1
            elif flag.intervention_type == "mute":
                stats["mutes"] += 1
            elif flag.intervention_type == "video_mute":
                stats["video_blocks"] += 1
            elif flag.intervention_type == "terminate":
                stats["terminates"] += 1

            if flag.acknowledged:
                stats["acknowledged_count"] += 1

            if flag.toxicity_score > stats["highest_score"]:
                stats["highest_score"] = flag.toxicity_score

            for cat in (flag.categories or []):
                stats["categories"][cat] = stats["categories"].get(cat, 0) + 1

        return speaker_stats

    async def generate_call_report_text(
        self,
        report: CallReport,
        session: ParentCallSession,
        speaker_summary: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> str:
        """Generate formatted text report for court export."""
        lines = []
        lines.append("# ARIA Call Analysis Report")
        lines.append("")
        lines.append(f"**Session ID:** {report.session_id}")
        lines.append(f"**Date:** {session.initiated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        lines.append(f"**Duration:** {report.duration_seconds // 60} minutes {report.duration_seconds % 60} seconds")
        lines.append(f"**Call Type:** {session.call_type.upper()}")
        lines.append(f"**Participants:** Parent A (ID: {session.parent_a_id}), Parent B (ID: {session.parent_b_id or 'N/A'})")
        lines.append("")

        # ARIA Settings
        lines.append("## ARIA Monitoring Settings")
        sensitivity_descriptions = {
            "strict": "Strict (Most sensitive - flags minor issues)",
            "moderate": "Moderate (Balanced detection)",
            "relaxed": "Relaxed (Only severe violations)",
            "off": "Off (Monitoring disabled)"
        }
        lines.append(f"- **Sensitivity Level:** {sensitivity_descriptions.get(session.aria_sensitivity_level, session.aria_sensitivity_level)}")
        lines.append(f"- **Base Threshold:** {session.aria_sensitivity_threshold:.2f}")
        lines.append(f"- **Video Monitoring:** Active")
        lines.append(f"- **3-Strike System:** Enabled")
        lines.append("")

        lines.append("## Overall Assessment")
        lines.append(f"- **Audio Toxicity Score:** {report.overall_toxicity_score:.2f}/1.0")
        lines.append(f"- **Transcript Chunks Analyzed:** {report.total_chunks}")
        lines.append(f"- **Audio Flags Raised:** {report.flags_count}")
        lines.append(f"- **Video Frames Analyzed:** {report.video_frames_analyzed}")
        lines.append(f"- **Video Flags Raised:** {report.video_flags_count}")
        lines.append(f"- **Total ARIA Interventions:** {sum(report.intervention_summary.values())}")
        lines.append("")

        if session.aria_terminated_call:
            lines.append("**CALL TERMINATED BY ARIA**")
            lines.append(f"- **Termination Reason:** {session.aria_termination_reason or 'Severe violation threshold exceeded'}")
            lines.append("")

        # Intervention breakdown
        lines.append("## Intervention Summary")
        lines.append(f"- **Warnings Issued:** {report.intervention_summary.get('warnings', 0)}")
        lines.append(f"- **Audio Mute Interventions:** {report.intervention_summary.get('audio_mutes', 0)}")
        lines.append(f"- **Video Block Interventions:** {report.intervention_summary.get('video_blocks', 0)}")
        lines.append(f"- **Termination Actions:** {report.intervention_summary.get('terminations', 0)}")
        lines.append("")

        # Speaker-specific breakdown
        if speaker_summary:
            lines.append("## Violations by Speaker")
            for speaker_id, stats in speaker_summary.items():
                if speaker_id == "unknown":
                    speaker_label = "Unknown Speaker"
                elif speaker_id == session.parent_a_id:
                    speaker_label = f"Parent A (ID: {speaker_id[:8]}...)"
                elif speaker_id == session.parent_b_id:
                    speaker_label = f"Parent B (ID: {speaker_id[:8]}...)"
                else:
                    speaker_label = f"Speaker (ID: {speaker_id[:8]}...)"

                lines.append(f"### {speaker_label}")
                lines.append(f"- **Total Violations:** {stats['total_violations']}")
                lines.append(f"- **Audio Violations:** {stats.get('audio_violations', 0)}")
                lines.append(f"- **Video Violations:** {stats.get('video_violations', 0)}")
                lines.append(f"- **Warnings:** {stats['warnings']}")
                lines.append(f"- **Times Muted:** {stats['mutes']}")
                lines.append(f"- **Video Blocks:** {stats.get('video_blocks', 0)}")
                lines.append(f"- **Violations Acknowledged:** {stats.get('acknowledged_count', 0)}")
                lines.append(f"- **Highest Toxicity Score:** {stats['highest_score']:.2f}")
                if stats['categories']:
                    cats = ", ".join([f"{k.replace('_', ' ').title()} ({v})" for k, v in stats['categories'].items()])
                    lines.append(f"- **Categories:** {cats}")
                lines.append("")

        lines.append("## Audio Category Breakdown")
        if report.category_breakdown:
            for category, count in sorted(report.category_breakdown.items(), key=lambda x: x[1], reverse=True):
                lines.append(f"- {category.replace('_', ' ').title()}: {count} occurrence(s)")
        else:
            lines.append("No toxic categories detected in audio.")
        lines.append("")

        # Video violations section
        lines.append("## Video Frame Analysis Summary")
        lines.append(f"- **Frames Analyzed:** {report.video_frames_analyzed}")
        lines.append(f"- **Violations Detected:** {report.video_flags_count}")
        lines.append("")

        if report.video_violations:
            lines.append("## Video Violations")
            for i, violation in enumerate(report.video_violations, 1):
                lines.append(f"### Video Violation {i}")
                lines.append(f"- **Time:** {violation['timestamp']}")
                lines.append(f"- **Participant:** {violation['participant_id'][:8]}...")
                lines.append(f"- **Call Time:** {violation['call_time_seconds']:.1f}s")
                lines.append(f"- **Type:** {(violation.get('violation_type') or 'unknown').replace('_', ' ').title()}")
                lines.append(f"- **Score:** {violation.get('violation_score', 0):.2f}")
                lines.append(f"- **Description:** {violation.get('violation_description', 'N/A')}")
                lines.append(f"- **Frame Hash (SHA-256):** {violation.get('frame_hash', 'N/A')}")
                if violation.get("frame_storage_path"):
                    lines.append(f"- **Evidence Path:** {violation['frame_storage_path']}")
                lines.append("")
        lines.append("")

        lines.append("## Severe Audio Violations")
        if report.severe_violations:
            for i, violation in enumerate(report.severe_violations, 1):
                lines.append(f"### Violation {i}")
                lines.append(f"- **Time:** {violation['timestamp']}")
                lines.append(f"- **Speaker:** {violation['speaker_name']}")
                lines.append(f"- **Severity:** {violation['level'].upper()}")
                lines.append(f"- **Score:** {violation['score']:.2f}")
                lines.append(f"- **Categories:** {', '.join(violation['categories'])}")
                lines.append(f"- **Content:** \"{violation['content']}\"")
                lines.append("")
        else:
            lines.append("No severe audio violations detected.")
        lines.append("")

        lines.append("## Recommendations")
        for rec in report.recommendations:
            lines.append(f"- {rec}")
        lines.append("")

        lines.append("---")
        lines.append(f"*Report generated by ARIA on {report.generated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}*")

        return "\n".join(lines)

    # ------------------------------------------------------------------
    # KidComs post-call analysis (reliability batch 1 — child-safety gap)
    # ------------------------------------------------------------------

    async def analyze_full_kidcoms_session(
        self,
        db: AsyncSession,
        session_id: str,
        force: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Post-call comprehensive analysis of a KidComs session transcript.

        Mirrors analyze_full_call_transcript (parent calls) but reads
        KidComsSession + KidComsMessage rows — KidComs transcript chunks
        are stored as KidComsMessage with per-chunk aria_* fields.

        The report dict is persisted to kidcoms_sessions.aria_report and
        the run is idempotent: an already-analyzed session returns its
        stored report unless force=True.
        """
        from app.models.kidcoms import KidComsMessage, KidComsSession

        result = await db.execute(
            select(KidComsSession).where(KidComsSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"KidComs session {session_id} not found")

        if session.aria_analyzed_at and not force:
            return session.aria_report

        messages_result = await db.execute(
            select(KidComsMessage)
            .where(KidComsMessage.session_id == session_id)
            .order_by(KidComsMessage.sent_at)
        )
        messages = list(messages_result.scalars().all())

        category_breakdown: Dict[str, int] = {}
        severe_violations: List[Dict[str, Any]] = []
        timeline: List[Dict[str, Any]] = []
        total_score = 0.0
        scored_count = 0
        flagged_count = 0

        for msg in messages:
            if not (msg.content or "").strip():
                continue

            if msg.aria_analyzed and msg.aria_score is not None:
                # Reuse the realtime per-chunk analysis
                score = float(msg.aria_score)
                flagged = bool(msg.aria_flagged)
                categories = [msg.aria_category] if msg.aria_category else []
                level = (
                    "severe" if score >= 0.8
                    else "high" if score >= 0.6
                    else "medium" if score >= 0.4
                    else "low" if score > 0.0
                    else "none"
                )
            else:
                analysis = self.aria_service.analyze_message(msg.content)
                score = analysis.toxicity_score
                flagged = analysis.is_flagged
                categories = [c.value for c in analysis.categories]
                level = analysis.toxicity_level.value
                msg.aria_analyzed = True
                msg.aria_flagged = flagged
                msg.aria_score = score
                if categories and not msg.aria_category:
                    msg.aria_category = categories[0]

            for cat in categories:
                category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

            if level in ("high", "severe"):
                severe_violations.append({
                    "timestamp": msg.sent_at.isoformat() if msg.sent_at else None,
                    "speaker_id": msg.sender_id,
                    "speaker_name": msg.sender_name,
                    "speaker_type": msg.sender_type,
                    "content": msg.content,
                    "score": score,
                    "level": level,
                    "categories": categories,
                    "source": "audio",
                })

            timeline.append({
                "time": msg.sent_at.isoformat() if msg.sent_at else None,
                "speaker": msg.sender_name,
                "speaker_type": msg.sender_type,
                "flagged": flagged,
                "score": score,
                "source": "audio",
            })

            total_score += score
            scored_count += 1
            if flagged:
                flagged_count += 1

        overall_score = total_score / scored_count if scored_count else 0.0

        intervention_summary = {
            "warnings": flagged_count,
            "mutes": 0,
            "terminations": 0,
        }
        recommendations = self._generate_recommendations(
            overall_score, category_breakdown, severe_violations,
            intervention_summary, video_violations=None,
        )

        report = {
            "session_id": session_id,
            "session_type": session.session_type,
            "child_id": session.child_id,
            "duration_seconds": session.duration_seconds or 0,
            "total_chunks": len(messages),
            "flags_count": flagged_count,
            "overall_toxicity_score": round(overall_score, 4),
            "category_breakdown": category_breakdown,
            "severe_violations": severe_violations,
            "severe_violations_count": len(severe_violations),
            "timeline": timeline,
            "intervention_summary": intervention_summary,
            "recommendations": recommendations,
            "generated_at": datetime.utcnow().isoformat(),
        }

        session.aria_report = report
        session.aria_analyzed_at = datetime.utcnow()
        await db.commit()

        logger.info(
            "KidComs post-call analysis for session %s: %d chunks, %d flagged, "
            "%d severe, overall=%.2f",
            session_id, len(messages), flagged_count,
            len(severe_violations), overall_score,
        )
        return report


async def analyze_and_report_kidcoms_session(session_id: str) -> None:
    """Background entry point: analyze a finished KidComs session and, when
    severe violations are present, notify BOTH parents (websocket + durable
    email). Opens its own DB session — callers schedule this via FastAPI
    BackgroundTasks or call it from scheduler sweeps. Never raises.
    """
    from app.core.database import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as db:
            report = await aria_call_monitor.analyze_full_kidcoms_session(db, session_id)
            if not report or not report.get("severe_violations"):
                return

            # Severe content found — notify both parents (per product
            # decision: severe-only; moderate flags stay report-only).
            from app.models.family_file import FamilyFile
            from app.models.kidcoms import KidComsSession
            from app.models.user import User

            session = (await db.execute(
                select(KidComsSession).where(KidComsSession.id == session_id)
            )).scalar_one()
            family_file = (await db.execute(
                select(FamilyFile).where(FamilyFile.id == session.family_file_id)
            )).scalar_one_or_none()
            if not family_file:
                return

            categories = sorted(report.get("category_breakdown", {}).keys())
            payload = {
                "type": "aria_kidcoms_call_report",
                "session_id": session_id,
                "severity": "severe",
                "severe_violations_count": report.get("severe_violations_count", 0),
                "categories": categories,
                "message": (
                    "ARIA flagged serious content in your child's recent call. "
                    "Please review the call report."
                ),
            }

            from app.core.websocket import manager
            from app.services.email import email_service

            for parent_id in (family_file.parent_a_id, family_file.parent_b_id):
                if not parent_id:
                    continue
                try:
                    await manager.send_personal_message(
                        message=payload, user_id=str(parent_id)
                    )
                except Exception:
                    pass
                try:
                    parent = (await db.execute(
                        select(User).where(User.id == parent_id)
                    )).scalar_one_or_none()
                    if parent and parent.email:
                        await email_service.send_aria_intervention(
                            to_email=parent.email,
                            to_name=getattr(parent, "first_name", None) or "there",
                            category=", ".join(categories) or "severe content",
                            suggestion=(
                                "ARIA detected serious content during your child's "
                                "call. Open the call report in CommonGround to review."
                            ),
                        )
                except Exception as email_exc:
                    logger.warning(
                        "KidComs severe-call email to parent %s failed: %s",
                        parent_id, email_exc,
                    )
    except Exception as exc:  # noqa: BLE001 — background task, never raise
        logger.error("KidComs post-call analysis failed for %s: %s", session_id, exc)
        capture_error(exc, tags={"service": "aria_kidcoms_postcall"})


# Global instance for convenience
aria_call_monitor = ARIACallMonitor()

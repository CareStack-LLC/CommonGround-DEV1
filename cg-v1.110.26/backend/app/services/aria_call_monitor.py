"""
ARIA Call Monitor Service - Real-time and post-call analysis for parent calls.

Provides:
1. Real-time transcript chunk analysis (SEVERE violations only)
2. Post-call comprehensive transcript analysis
3. Intervention logic (warning, mute, terminate)
4. Court-ready call reports
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
import anthropic
from openai import OpenAI

from app.core.config import settings
from app.models.parent_call import (
    ParentCallSession,
    CallTranscriptChunk,
    CallFlag,
    CallStatus,
    CallSeverity,
)
from app.services.aria import ARIAService, ToxicityLevel, ToxicityCategory
from app.services.daily_video import DailyVideoService

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
    speaker_id: Optional[str] = None  # Speaker who triggered the violation
    mute_duration_seconds: Optional[float] = None  # Duration to mute if MUTE intervention


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


class ARIACallMonitor:
    """
    ARIA Call Monitoring Service.

    Hybrid approach:
    - Real-time: Quick check for SEVERE violations only (regex + fast Claude)
    - Post-call: Full analysis of entire transcript with all tiers
    """

    # Severe violation patterns (real-time detection)
    SEVERE_PATTERNS = {
        ToxicityCategory.THREATENING: [
            r'\bkill\s+you\b', r'\bhurt\s+you\b', r'\bharm\s+you\b',
            r'\bdestroy\s+you\b', r'\bcome\s+after\s+you\b',
            r'\bmake\s+you\s+suffer\b', r'\bruin\s+your\s+life\b',
            r'\bbeat\s+(you|your\s+ass)\b', r'\bsmash\s+your\s+face\b',
            r'\bstab\b', r'\bshoot\b', r'\bgun\b', r'\bknife\b',
        ],
        ToxicityCategory.HATE_SPEECH: [
            r'\bnigger\w*\b', r'\bnigga\w*\b', r'\bfaggot\b', r'\bfag\b',
            r'\bcunt\b', r'\bkike\b', r'\bspic\b', r'\bwetback\b',
            r'\bchink\b', r'\bgook\b', r'\bdyke\b', r'\btranny\b',
        ],
        ToxicityCategory.SEXUAL_HARASSMENT: [
            r'\bsend\s+(me\s+)?nudes?\b', r'\bshow\s+(me\s+)?(your\s+)?(tits|boobs|pussy|dick|cock)\b',
            r'\bwanna\s+fuck\b', r'\blet\'?s\s+fuck\b',
            r'\bmolest\b', r'\brape\b', r'\brapist\b',
        ],
        ToxicityCategory.PROFANITY: [
            # Strong profanity - triggers warnings in calls
            r'\bfuck(ing|ed|er|ers|s)?\b', r'\bshit(ty|s|ting|ted)?\b',
            r'\bass\s*hole\w*\b', r'\bbitch(es|y|ing)?\b',
            r'\bdamn(ed|it)?\b', r'\bhell\b',
            r'\bbastard\w*\b', r'\bprick\b', r'\bdick(head)?\b',
            r'\bwh[o0]re\b', r'\bslut\b',
        ],
    }

    # Default intervention thresholds (overridden by sensitivity level)
    SEVERE_THRESHOLD = 0.7  # Score >= 0.7 triggers intervention
    TERMINATION_THRESHOLD = 0.85  # Score >= 0.85 triggers immediate termination
    WARNING_DURATION = 10  # Seconds before termination
    MUTE_DURATION = 2.0  # Seconds to mute offending speaker

    # Sensitivity level thresholds - configurable per call
    SENSITIVITY_THRESHOLDS = {
        "strict": {"warning": 0.3, "mute": 0.5, "terminate": 0.7},
        "moderate": {"warning": 0.5, "mute": 0.65, "terminate": 0.85},
        "relaxed": {"warning": 0.7, "mute": 0.8, "terminate": 0.9},
        "off": {"warning": 1.1, "mute": 1.1, "terminate": 1.1},  # Never trigger
    }

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
        self.compiled_severe_patterns = self._compile_severe_patterns()

        # Initialize AI clients
        self.claude_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    def _compile_severe_patterns(self) -> Dict[ToxicityCategory, List[re.Pattern]]:
        """Compile severe violation patterns for real-time detection"""
        return {
            category: [re.compile(p, re.IGNORECASE) for p in patterns]
            for category, patterns in self.SEVERE_PATTERNS.items()
        }

    async def analyze_transcript_chunk_realtime(
        self,
        db: AsyncSession,
        chunk: CallTranscriptChunk,
        sensitivity_level: str = "moderate"
    ) -> Optional[RealtimeFlag]:
        """
        Real-time analysis of transcript chunk.

        ONLY checks for SEVERE violations (threats, hate speech, harassment).
        Returns intervention recommendation if needed.

        Args:
            db: Database session
            chunk: Transcript chunk to analyze
            sensitivity_level: ARIA sensitivity level (strict/moderate/relaxed/off)

        Returns:
            RealtimeFlag if severe violation detected, None otherwise
        """
        # If ARIA is off, no analysis
        if sensitivity_level.lower() == "off":
            return None

        content = chunk.content.lower()

        # Step 1: Quick regex check for severe patterns
        detected_categories = []
        for category, patterns in self.compiled_severe_patterns.items():
            for pattern in patterns:
                if pattern.search(content):
                    detected_categories.append(category)
                    break

        # No severe patterns found - skip AI analysis
        if not detected_categories:
            return None

        # Step 2: Fast Claude analysis for context
        try:
            toxicity_score = await self._quick_claude_analysis(chunk.content)
        except Exception as e:
            logger.error(f"Claude analysis failed: {e}")
            # Fallback: Use regex match count as proxy
            toxicity_score = min(len(detected_categories) * 0.3, 1.0)

        # Step 3: Get dynamic thresholds based on sensitivity
        thresholds = self.get_thresholds(sensitivity_level)

        # Step 4: Determine intervention
        intervention_type = None
        intervention_needed = False
        warning_message = ""
        mute_duration = None
        is_flagged = toxicity_score >= thresholds["warning"]

        if not is_flagged:
            return None

        # Determine intervention type based on thresholds
        if toxicity_score >= thresholds["terminate"]:
            intervention_type = InterventionType.TERMINATE
            intervention_needed = True
            warning_message = "SEVERE VIOLATION DETECTED: This call will be terminated in 10 seconds. Please change your communication immediately."
        elif toxicity_score >= thresholds["mute"]:
            intervention_type = InterventionType.MUTE
            intervention_needed = True
            mute_duration = self.MUTE_DURATION
            warning_message = "Your microphone has been temporarily muted due to inappropriate language. Please take a moment to calm down."
        elif toxicity_score >= thresholds["warning"]:
            intervention_type = InterventionType.WARNING
            intervention_needed = True
            warning_message = "WARNING: Your language is inappropriate and violates communication standards. Please remain respectful."

        return RealtimeFlag(
            chunk_id=chunk.id,
            is_severe=toxicity_score >= thresholds["mute"],  # Severe if at mute threshold or higher
            toxicity_score=toxicity_score,
            categories=[cat.value for cat in detected_categories],
            intervention_needed=intervention_needed,
            intervention_type=intervention_type,
            warning_message=warning_message,
            speaker_id=chunk.speaker_id,
            mute_duration_seconds=mute_duration,
        )

    async def _quick_claude_analysis(self, content: str) -> float:
        """
        Quick Claude analysis for severe violation scoring.

        Args:
            content: Text to analyze

        Returns:
            Toxicity score from 0.0 to 1.0
        """
        prompt = f"""Analyze this co-parenting communication for SEVERE violations only.

Categories to check:
- Direct threats of violence or harm
- Hate speech (racial, homophobic, misogynistic slurs)
- Sexual harassment

Text: "{content}"

Respond with ONLY a number from 0.0 to 1.0:
- 0.0-0.6: Not severe
- 0.7-0.84: Severe (warning needed)
- 0.85-1.0: Extremely severe (terminate call)

Score:"""

        try:
            message = self.claude_client.messages.create(
                model="claude-3-haiku-20240307",  # Fast model
                max_tokens=10,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )

            score_text = message.content[0].text.strip()
            score = float(score_text)
            return max(0.0, min(1.0, score))  # Clamp to 0-1

        except Exception as e:
            logger.error(f"Claude quick analysis error: {e}")
            raise

    async def handle_severe_violation(
        self,
        db: AsyncSession,
        session: ParentCallSession,
        flag: RealtimeFlag,
        chunk: CallTranscriptChunk
    ) -> Dict[str, Any]:
        """
        Handle severe violation during call.

        Flow:
        1. Create CallFlag record
        2. Send warning via WebSocket (handled by endpoint)
        3. If MUTE level: Mute speaker for configured duration
        4. If TERMINATE level: Wait 10s, then end call

        Args:
            db: Database session
            session: Active call session
            flag: Real-time flag with intervention details
            chunk: Transcript chunk that triggered violation

        Returns:
            Action details for WebSocket broadcast
        """
        # Get thresholds for severity assessment
        thresholds = self.get_thresholds(session.aria_sensitivity_level)

        # Determine severity based on configured thresholds
        if flag.toxicity_score >= thresholds["terminate"]:
            severity = CallSeverity.SEVERE.value
        elif flag.toxicity_score >= thresholds["mute"]:
            severity = CallSeverity.HIGH.value
        else:
            severity = CallSeverity.MEDIUM.value

        # Create flag record with speaker and mute tracking
        call_flag = CallFlag(
            session_id=session.id,
            transcript_chunk_id=chunk.id,
            flag_type="real_time",
            toxicity_score=flag.toxicity_score,
            severity=severity,
            categories=flag.categories,
            triggers=[],  # TODO: Extract specific trigger phrases
            intervention_taken=flag.intervention_needed,
            intervention_type=flag.intervention_type.value if flag.intervention_type else None,
            intervention_message=flag.warning_message,
            flagged_at=datetime.utcnow(),
            call_time_seconds=chunk.start_time,  # Exact timestamp in call
            offending_speaker_id=flag.speaker_id,
            mute_duration_seconds=flag.mute_duration_seconds,
        )

        db.add(call_flag)

        # Update session intervention count
        session.aria_intervention_count += 1

        # Check if termination needed
        should_terminate = flag.intervention_type == InterventionType.TERMINATE
        should_mute = flag.intervention_type == InterventionType.MUTE

        if should_terminate:
            session.aria_terminated_call = True

        await db.commit()
        await db.refresh(call_flag)

        logger.warning(
            f"ARIA intervention in session {session.id}: "
            f"score={flag.toxicity_score:.2f}, "
            f"action={flag.intervention_type.value if flag.intervention_type else 'none'}, "
            f"speaker={flag.speaker_id}"
        )

        return {
            "type": "aria_intervention",
            "flag_id": call_flag.id,
            "severity": call_flag.severity,
            "intervention_type": flag.intervention_type.value if flag.intervention_type else None,
            "warning_message": flag.warning_message,
            "should_terminate": should_terminate,
            "termination_delay": self.WARNING_DURATION if should_terminate else None,
            "should_mute": should_mute,
            "mute_speaker_id": flag.speaker_id if should_mute else None,
            "mute_duration_seconds": flag.mute_duration_seconds if should_mute else None,
            "call_time_seconds": chunk.start_time,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def analyze_full_call_transcript(
        self,
        db: AsyncSession,
        session_id: str
    ) -> CallReport:
        """
        Post-call comprehensive analysis of entire transcript.

        Uses full ARIA pipeline with all categories and AI tiers.
        Generates court-ready report.

        Args:
            db: Database session
            session_id: Call session ID

        Returns:
            CallReport with comprehensive analysis
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

        # Get all flags
        flags_result = await db.execute(
            select(CallFlag)
            .where(CallFlag.session_id == session_id)
            .order_by(CallFlag.flagged_at)
        )
        flags = list(flags_result.scalars().all())

        # Analyze each chunk with full ARIA
        category_breakdown: Dict[str, int] = {}
        severe_violations = []
        timeline = []
        total_score = 0.0
        analyzed_count = 0

        for chunk in chunks:
            # Skip if already analyzed in real-time
            if chunk.analyzed:
                continue

            # Full ARIA analysis
            analysis = self.aria_service.analyze_message(chunk.content)

            # Update chunk
            chunk.analyzed = True
            chunk.flagged = analysis.is_flagged
            chunk.toxicity_score = analysis.toxicity_score

            # Track categories
            for category in analysis.categories:
                cat_name = category.value
                category_breakdown[cat_name] = category_breakdown.get(cat_name, 0) + 1

            # Track severe violations
            if analysis.toxicity_level in [ToxicityLevel.HIGH, ToxicityLevel.SEVERE]:
                severe_violations.append({
                    "timestamp": chunk.timestamp.isoformat(),
                    "speaker_id": chunk.speaker_id,
                    "speaker_name": chunk.speaker_name,
                    "content": chunk.content,
                    "score": analysis.toxicity_score,
                    "level": analysis.toxicity_level.value,
                    "categories": [c.value for c in analysis.categories],
                })

            # Add to timeline
            timeline.append({
                "time": chunk.start_time,
                "speaker": chunk.speaker_name,
                "flagged": analysis.is_flagged,
                "score": analysis.toxicity_score,
            })

            total_score += analysis.toxicity_score
            analyzed_count += 1

        await db.commit()

        # Calculate overall score
        overall_score = total_score / analyzed_count if analyzed_count > 0 else 0.0

        # Intervention summary
        intervention_summary = {
            "warnings": sum(1 for f in flags if f.intervention_type == "warning"),
            "mutes": sum(1 for f in flags if f.intervention_type == "mute"),
            "terminations": sum(1 for f in flags if f.intervention_type == "terminate"),
        }

        # Generate recommendations
        recommendations = self._generate_recommendations(
            overall_score,
            category_breakdown,
            severe_violations,
            intervention_summary
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
        )

    def _generate_recommendations(
        self,
        overall_score: float,
        categories: Dict[str, int],
        severe_violations: List[Dict],
        interventions: Dict[str, int]
    ) -> List[str]:
        """Generate court recommendations based on call analysis"""
        recommendations = []

        # Overall assessment
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

        # Category-specific
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

        # Intervention assessment
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

        return recommendations

    async def get_speaker_violation_summary(
        self,
        db: AsyncSession,
        session_id: str
    ) -> Dict[str, Dict[str, Any]]:
        """
        Get violation stats grouped by speaker for court reporting.

        Args:
            db: Database session
            session_id: Call session ID

        Returns:
            Dict mapping speaker_id to their violation stats
        """
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
                    "warnings": 0,
                    "mutes": 0,
                    "terminates": 0,
                    "categories": {},
                    "total_mute_duration": 0.0,
                    "highest_score": 0.0,
                }

            stats = speaker_stats[speaker_id]
            stats["total_violations"] += 1

            if flag.intervention_type == "warning":
                stats["warnings"] += 1
            elif flag.intervention_type == "mute":
                stats["mutes"] += 1
                if flag.mute_duration_seconds:
                    stats["total_mute_duration"] += flag.mute_duration_seconds
            elif flag.intervention_type == "terminate":
                stats["terminates"] += 1

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
        """
        Generate formatted text report for court export.

        Args:
            report: CallReport dataclass
            session: ParentCallSession model
            speaker_summary: Optional speaker violation breakdown

        Returns:
            Formatted markdown report
        """
        lines = []
        lines.append("# ARIA Call Analysis Report")
        lines.append("")
        lines.append(f"**Session ID:** {report.session_id}")
        lines.append(f"**Date:** {session.initiated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        lines.append(f"**Duration:** {report.duration_seconds // 60} minutes {report.duration_seconds % 60} seconds")
        lines.append(f"**Call Type:** {session.call_type.upper()}")
        lines.append(f"**Participants:** Parent A (ID: {session.parent_a_id}), Parent B (ID: {session.parent_b_id or 'N/A'})")
        lines.append("")

        # ARIA Settings used
        lines.append("## ARIA Monitoring Settings")
        sensitivity_descriptions = {
            "strict": "Strict (Most sensitive - flags minor issues)",
            "moderate": "Moderate (Balanced detection)",
            "relaxed": "Relaxed (Only severe violations)",
            "off": "Off (Monitoring disabled)"
        }
        lines.append(f"- **Sensitivity Level:** {sensitivity_descriptions.get(session.aria_sensitivity_level, session.aria_sensitivity_level)}")
        lines.append(f"- **Base Threshold:** {session.aria_sensitivity_threshold:.2f}")
        lines.append("")

        lines.append("## Overall Assessment")
        lines.append(f"- **Toxicity Score:** {report.overall_toxicity_score:.2f}/1.0")
        lines.append(f"- **Transcript Chunks:** {report.total_chunks}")
        lines.append(f"- **Flags Raised:** {report.flags_count}")
        lines.append(f"- **ARIA Interventions:** {sum(report.intervention_summary.values())}")
        lines.append("")

        if session.aria_terminated_call:
            lines.append("⚠️ **CALL TERMINATED BY ARIA** ⚠️")
            lines.append(f"- **Termination Reason:** {session.aria_termination_reason or 'Severe violation threshold exceeded'}")
            lines.append("")

        # Intervention breakdown
        lines.append("## Intervention Summary")
        lines.append(f"- **Warnings Issued:** {report.intervention_summary.get('warnings', 0)}")
        lines.append(f"- **Mute Interventions:** {report.intervention_summary.get('mutes', 0)}")
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
                lines.append(f"- **Warnings:** {stats['warnings']}")
                lines.append(f"- **Times Muted:** {stats['mutes']}")
                if stats['total_mute_duration'] > 0:
                    lines.append(f"- **Total Mute Duration:** {stats['total_mute_duration']:.1f} seconds")
                lines.append(f"- **Highest Toxicity Score:** {stats['highest_score']:.2f}")
                if stats['categories']:
                    cats = ", ".join([f"{k.replace('_', ' ').title()} ({v})" for k, v in stats['categories'].items()])
                    lines.append(f"- **Categories:** {cats}")
                lines.append("")

        lines.append("## Category Breakdown")
        if report.category_breakdown:
            for category, count in sorted(report.category_breakdown.items(), key=lambda x: x[1], reverse=True):
                lines.append(f"- {category.replace('_', ' ').title()}: {count} occurrence(s)")
        else:
            lines.append("No toxic categories detected.")
        lines.append("")

        lines.append("## Severe Violations")
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
            lines.append("No severe violations detected.")
        lines.append("")

        lines.append("## Recommendations")
        for rec in report.recommendations:
            lines.append(f"- {rec}")
        lines.append("")

        lines.append("---")
        lines.append(f"*Report generated by ARIA on {report.generated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}*")

        return "\n".join(lines)


# Global instance for convenience
aria_call_monitor = ARIACallMonitor()

"""
ARIA Vision Monitor Service - Video frame analysis for call safety monitoring.

Uses Claude Vision API to analyze video frames during calls for PG-13 level
content violations: nudity, hate symbols, violence, inappropriate gestures,
and unsafe child environments.

Frames are captured client-side and sent as base64 JPEG. Only flagged frames
are stored in Supabase Storage for court evidence.
"""

import base64
import hashlib
import json
import logging
import time
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.call_video_flag import VideoFrameAnalysis, VideoViolationType
from app.services.storage import StorageBucket

from app.utils.sentry_helpers import capture_error
logger = logging.getLogger(__name__)


# Frame capture intervals by sensitivity level (seconds)
FRAME_INTERVALS = {
    "strict": 5,
    "moderate": 10,
    "relaxed": 15,
    "off": 0,  # No capture
}

# Adaptive interval after violation (seconds)
ADAPTIVE_INTERVAL = 3
ADAPTIVE_DURATION = 30  # How long to use adaptive interval after a violation


@dataclass
class FrameAnalysisResult:
    """Result of analyzing a single video frame."""
    is_flagged: bool
    violation_type: Optional[str] = None  # nudity, hate_symbol, violence, gesture, unsafe_environment
    violation_score: float = 0.0
    violation_description: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None
    processing_time_ms: int = 0


class ARIAVisionMonitor:
    """
    ARIA service for analyzing video frames during calls.

    Uses Claude Vision API to detect PG-13 level violations.
    Implements frame similarity detection to avoid re-analyzing unchanged scenes.
    """

    # Vision analysis prompt for parent calls
    PARENT_CALL_PROMPT = """You are ARIA, an AI safety monitor observing a video call between co-parents.
Analyze this video frame for safety violations. Check for:

1. **NUDITY** - Any state of undress beyond normal (shirtless is borderline, undergarments or less is a violation)
2. **HATE_SYMBOL** - Swastikas, KKK imagery, Confederate flags used threateningly, white supremacy symbols, any hate group imagery
3. **VIOLENCE** - Visible weapons (guns, knives), physical altercation in progress, aggressive physical posturing, throwing objects
4. **GESTURE** - Middle finger, other obscene gestures directed at camera
5. **UNSAFE_ENVIRONMENT** - Visible drugs or paraphernalia, dangerous settings for children

Respond with ONLY valid JSON:
{
  "flagged": true/false,
  "violation_type": "nudity"|"hate_symbol"|"violence"|"gesture"|"unsafe_environment"|null,
  "score": 0.0-1.0,
  "description": "Brief description of what was detected" or null
}

Be conservative - only flag clear violations. Normal home environments, casual clothing, and standard video call behavior are NOT violations. Score thresholds:
- 0.0-0.3: No concern
- 0.4-0.6: Borderline (flag for review but don't intervene)
- 0.7-0.85: Clear violation (trigger mute/warning)
- 0.9-1.0: Severe (trigger immediate termination)"""

    # Stricter prompt for child-involved calls
    CHILD_CALL_PROMPT = """You are ARIA, an AI child safety monitor observing a video call involving a child.
Analyze this video frame for child safety concerns. Be MORE sensitive than for adult-only calls.

Check for:
1. **NUDITY** - Any inappropriate exposure. Even partial undress that would be concerning in a child context.
2. **HATE_SYMBOL** - Any hate imagery or symbols visible anywhere in frame
3. **VIOLENCE** - Any weapons, aggressive behavior, threatening postures, physical intimidation
4. **GESTURE** - Any obscene or threatening gestures
5. **UNSAFE_ENVIRONMENT** - Drugs, alcohol prominently displayed, dangerous items accessible, unsanitary/unsafe conditions for a child

Respond with ONLY valid JSON:
{
  "flagged": true/false,
  "violation_type": "nudity"|"hate_symbol"|"violence"|"gesture"|"unsafe_environment"|null,
  "score": 0.0-1.0,
  "description": "Brief description of what was detected" or null
}

Child safety threshold is LOWER - flag anything that would be concerning for a child to witness. Score thresholds:
- 0.0-0.2: Safe
- 0.3-0.5: Mild concern (log for parent review)
- 0.6-0.8: Moderate concern (alert parents)
- 0.9-1.0: SEVERE (immediate termination)"""

    def __init__(self):
        """Initialize with Claude API client."""
        self.client = anthropic.AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=30.0
        ) if settings.ANTHROPIC_API_KEY else None
        # Track last frame hashes per participant for similarity detection
        self._last_frame_hashes: Dict[str, str] = {}
        # Cache previous analysis result per participant to return on skip
        self._last_results: Dict[str, FrameAnalysisResult] = {}

    def _compute_frame_hash(self, frame_b64: str) -> str:
        """Compute SHA-256 hash of the frame data."""
        frame_bytes = base64.b64decode(frame_b64)
        return hashlib.sha256(frame_bytes).hexdigest()

    def _compute_simple_hash(self, frame_b64: str) -> str:
        """
        Compute a simple perceptual hash for similarity detection.
        Uses first 1KB of frame data as a quick fingerprint.
        """
        frame_bytes = base64.b64decode(frame_b64)
        # Use a sample of the frame for quick comparison
        sample = frame_bytes[:1024]
        return hashlib.md5(sample).hexdigest()

    def is_frame_similar(self, participant_id: str, frame_b64: str) -> bool:
        """
        Check if the current frame is similar to the last analyzed frame
        for this participant. Used to skip re-analysis of unchanged scenes.
        """
        current_hash = self._compute_simple_hash(frame_b64)
        last_hash = self._last_frame_hashes.get(participant_id)

        if last_hash == current_hash:
            return True

        self._last_frame_hashes[participant_id] = current_hash
        return False

    async def analyze_frame(
        self,
        frame_b64: str,
        participant_id: str,
        call_type: str = "parent",  # "parent" or "child"
        session_context: Optional[Dict[str, Any]] = None,
    ) -> FrameAnalysisResult:
        """
        Analyze a video frame using Claude Vision API.

        Args:
            frame_b64: Base64-encoded JPEG frame
            participant_id: ID of the participant in the frame
            call_type: "parent" for parent-to-parent, "child" for child-involved calls
            session_context: Optional context about the call session

        Returns:
            FrameAnalysisResult with violation details
        """
        if not self.client:
            logger.warning("Anthropic API key not configured - skipping vision analysis")
            return FrameAnalysisResult(is_flagged=False)

        # Skip if frame is similar to last analyzed frame — return cached result
        if self.is_frame_similar(participant_id, frame_b64):
            cached = self._last_results.get(participant_id)
            if cached:
                logger.debug(f"Frame similar to previous for participant {participant_id[:8]}... - returning cached result")
                return cached
            logger.debug(f"Frame similar to previous for participant {participant_id[:8]}... - skipping")
            return FrameAnalysisResult(is_flagged=False)

        start_time = time.time()

        # Select prompt based on call type
        prompt = self.CHILD_CALL_PROMPT if call_type == "child" else self.PARENT_CALL_PROMPT

        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-5-20250514",
                max_tokens=300,
                system=[{"type": "text", "text": prompt, "cache_control": {"type": "ephemeral"}}],
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": frame_b64,
                                },
                            },
                            {
                                "type": "text",
                                "text": "Analyze this video frame for safety violations.",
                            },
                        ],
                    }
                ],
            )

            processing_time = int((time.time() - start_time) * 1000)

            # Parse JSON response
            result_text = response.content[0].text
            start_idx = result_text.find("{")
            end_idx = result_text.rfind("}") + 1

            if start_idx == -1 or end_idx == 0:
                logger.error(f"No JSON found in vision response: {result_text[:100]}")
                return FrameAnalysisResult(
                    is_flagged=False,
                    processing_time_ms=processing_time,
                )

            analysis = json.loads(result_text[start_idx:end_idx])

            is_flagged = analysis.get("flagged", False)
            score = float(analysis.get("score", 0.0))

            # Only flag if score exceeds threshold
            # For child calls, lower threshold (0.3 vs 0.6)
            threshold = 0.3 if call_type == "child" else 0.6
            if score < threshold:
                is_flagged = False

            result = FrameAnalysisResult(
                is_flagged=is_flagged,
                violation_type=analysis.get("violation_type") if is_flagged else None,
                violation_score=score,
                violation_description=analysis.get("description") if is_flagged else None,
                raw_response=analysis,
                processing_time_ms=processing_time,
            )

            if is_flagged:
                logger.warning(
                    f"ARIA Vision flagged frame: participant={participant_id[:8]}... "
                    f"type={result.violation_type} score={score:.2f} "
                    f"desc={result.violation_description}"
                )

            # Cache result for this participant so duplicate frames reuse it
            self._last_results[participant_id] = result

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse vision response JSON: {e}")
            capture_error(e)
            return FrameAnalysisResult(
                is_flagged=False,
                processing_time_ms=int((time.time() - start_time) * 1000),
            )
        except Exception as e:
            logger.error(f"Claude Vision API error: {e}")
            capture_error(e)
            return FrameAnalysisResult(
                is_flagged=False,
                processing_time_ms=int((time.time() - start_time) * 1000),
            )

    async def store_flagged_frame(
        self,
        db: AsyncSession,
        frame_b64: str,
        frame_analysis: VideoFrameAnalysis,
        family_file_id: str,
    ) -> Optional[str]:
        """
        Store a flagged frame in Supabase Storage for court evidence.

        Args:
            db: Database session
            frame_b64: Base64-encoded frame data
            frame_analysis: The VideoFrameAnalysis record
            family_file_id: Family file ID for storage path

        Returns:
            Storage path if successful, None otherwise
        """
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

            session_id = frame_analysis.session_id or frame_analysis.circle_session_id
            path = f"{family_file_id}/frames/{session_id}/{frame_analysis.frame_number}.jpg"

            frame_bytes = base64.b64decode(frame_b64)

            supabase.storage.from_(StorageBucket.ARIA_FRAME_EVIDENCE).upload(
                path=path,
                file=frame_bytes,
                file_options={"content-type": "image/jpeg"},
            )

            frame_analysis.frame_storage_path = path
            await db.flush()

            logger.info(f"Stored flagged frame at: {StorageBucket.ARIA_FRAME_EVIDENCE}/{path}")
            return path

        except Exception as e:
            logger.error(f"Failed to store flagged frame: {e}")
            capture_error(e)
            return None

    async def create_frame_analysis_record(
        self,
        db: AsyncSession,
        frame_b64: str,
        result: FrameAnalysisResult,
        participant_id: str,
        frame_number: int,
        call_time_seconds: float,
        session_id: Optional[str] = None,
        circle_session_id: Optional[str] = None,
    ) -> VideoFrameAnalysis:
        """
        Create a VideoFrameAnalysis database record.

        Args:
            db: Database session
            frame_b64: Base64-encoded frame
            result: Analysis result from analyze_frame()
            participant_id: Participant ID
            frame_number: Sequential frame number
            call_time_seconds: Seconds since call start
            session_id: Parent call session ID (or None)
            circle_session_id: Circle call session ID (or None)

        Returns:
            Created VideoFrameAnalysis record
        """
        frame_hash = self._compute_frame_hash(frame_b64)

        analysis = VideoFrameAnalysis(
            session_id=session_id,
            circle_session_id=circle_session_id,
            participant_id=participant_id,
            frame_number=frame_number,
            captured_at=datetime.utcnow(),
            call_time_seconds=call_time_seconds,
            frame_hash=frame_hash,
            analysis_model="claude-sonnet-4-5-20250514",
            analysis_result=result.raw_response,
            is_flagged=result.is_flagged,
            violation_type=result.violation_type,
            violation_score=result.violation_score,
            violation_description=result.violation_description,
            processing_time_ms=result.processing_time_ms,
        )

        db.add(analysis)
        await db.flush()
        return analysis

    def get_frame_interval(self, sensitivity_level: str = "moderate") -> int:
        """Get the frame capture interval for the given sensitivity level."""
        return FRAME_INTERVALS.get(sensitivity_level.lower(), FRAME_INTERVALS["moderate"])


# Global instance
aria_vision_monitor = ARIAVisionMonitor()

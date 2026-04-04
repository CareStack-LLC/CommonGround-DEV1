"""
OpenAI Whisper Transcription Service.

Provides speech-to-text using OpenAI's Whisper API for ARIA call monitoring.

Audio buffering: accumulates short chunks per session/speaker and flushes
to Whisper in batches (8+ seconds) to reduce API calls ~5-8x and improve
transcription quality from longer context.
"""

import logging
import io
import tempfile
import os
import time
from collections import defaultdict
from typing import Optional, Tuple, Dict, List
from datetime import datetime

from app.core.config import settings
from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)

# Buffer config
BUFFER_FLUSH_SECONDS = 8.0  # Accumulate audio for this long before flushing
BUFFER_MIN_SIZE = 16_000    # Minimum buffer size in bytes before considering flush
BUFFER_MAX_SIZE = 500_000   # Force flush if buffer exceeds this (avoid memory bloat)


class AudioBuffer:
    """Accumulates audio chunks for a single speaker in a session."""

    def __init__(self):
        self.chunks: List[bytes] = []
        self.total_size: int = 0
        self.first_chunk_time: float = time.time()

    def add(self, audio_data: bytes):
        self.chunks.append(audio_data)
        self.total_size += len(audio_data)

    def should_flush(self) -> bool:
        elapsed = time.time() - self.first_chunk_time
        return (
            (elapsed >= BUFFER_FLUSH_SECONDS and self.total_size >= BUFFER_MIN_SIZE)
            or self.total_size >= BUFFER_MAX_SIZE
        )

    def drain(self) -> bytes:
        """Return all buffered audio and reset."""
        combined = b"".join(self.chunks)
        self.chunks.clear()
        self.total_size = 0
        self.first_chunk_time = time.time()
        return combined


class WhisperTranscriptionService:
    """Service for transcribing audio using OpenAI Whisper with buffering."""

    def __init__(self):
        self.client = None
        self._initialize_client()
        # Per-session, per-speaker audio buffers
        self._buffers: Dict[str, AudioBuffer] = defaultdict(AudioBuffer)

    def _initialize_client(self):
        """Initialize the OpenAI client."""
        if settings.OPENAI_API_KEY:
            from app.core.ai_clients import get_async_openai
            self.client = get_async_openai()
            logger.info("WhisperTranscriptionService initialized")
        else:
            logger.warning("OPENAI_API_KEY not configured - Whisper transcription unavailable")

    async def transcribe_audio(
        self,
        audio_data: bytes,
        audio_format: str = "webm",
        language: str = "en"
    ) -> Tuple[Optional[str], float]:
        """
        Transcribe audio data using OpenAI Whisper.

        Returns:
            Tuple of (transcribed text, confidence score)
            Returns (None, 0.0) if transcription fails
        """
        if not self.client:
            logger.error("Whisper client not initialized - missing API key")
            return None, 0.0

        if not audio_data or len(audio_data) < 100:
            logger.debug("Audio data too small to transcribe")
            return None, 0.0

        try:
            suffix = f".{audio_format}"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name

            try:
                with open(temp_file_path, "rb") as audio_file:
                    response = await self.client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language=language,
                        response_format="verbose_json",
                    )

                text = response.text.strip() if hasattr(response, 'text') else ""
                confidence = 0.9 if text else 0.0

                if text:
                    logger.info(f"Whisper transcribed: '{text[:50]}...' (confidence: {confidence})")

                return text, confidence

            finally:
                try:
                    os.unlink(temp_file_path)
                except Exception:
                    pass

        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")
            capture_error(e)
            return None, 0.0

    async def transcribe_audio_stream(
        self,
        audio_data: bytes,
        session_id: str,
        speaker_id: str,
        chunk_index: int,
        audio_format: str = "webm"
    ) -> dict:
        """
        Buffer audio chunks and transcribe in batches for cost efficiency.

        Short chunks are accumulated until 8+ seconds of audio is buffered,
        then flushed to Whisper in a single API call.

        Returns:
            Dict with transcription data. has_speech=False if still buffering.
        """
        buffer_key = f"{session_id}:{speaker_id}"
        buf = self._buffers[buffer_key]
        buf.add(audio_data)

        # Check if we should flush the buffer
        if not buf.should_flush():
            return {
                "session_id": session_id,
                "speaker_id": speaker_id,
                "chunk_index": chunk_index,
                "content": "",
                "confidence": 0.0,
                "timestamp": datetime.utcnow().isoformat(),
                "has_speech": False,
                "buffered": True,
            }

        # Flush: combine buffered audio and transcribe
        combined_audio = buf.drain()
        text, confidence = await self.transcribe_audio(combined_audio, audio_format)

        return {
            "session_id": session_id,
            "speaker_id": speaker_id,
            "chunk_index": chunk_index,
            "content": text or "",
            "confidence": confidence,
            "timestamp": datetime.utcnow().isoformat(),
            "has_speech": bool(text and text.strip()),
        }

    async def flush_session(self, session_id: str, audio_format: str = "webm") -> List[dict]:
        """
        Flush all remaining buffers for a session (call this when a call ends).

        Returns list of transcription results for any remaining buffered audio.
        """
        results = []
        keys_to_remove = [k for k in self._buffers if k.startswith(f"{session_id}:")]

        for key in keys_to_remove:
            buf = self._buffers.pop(key)
            if buf.total_size > 0:
                combined_audio = buf.drain()
                speaker_id = key.split(":", 1)[1]
                text, confidence = await self.transcribe_audio(combined_audio, audio_format)
                if text:
                    results.append({
                        "session_id": session_id,
                        "speaker_id": speaker_id,
                        "chunk_index": -1,  # Final flush
                        "content": text,
                        "confidence": confidence,
                        "timestamp": datetime.utcnow().isoformat(),
                        "has_speech": True,
                    })

        return results


# Global singleton instance
whisper_service = WhisperTranscriptionService()

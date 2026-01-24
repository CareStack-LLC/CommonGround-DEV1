"""
OpenAI Whisper Transcription Service.

Provides real-time speech-to-text using OpenAI's Whisper API
for ARIA call monitoring.
"""

import logging
import io
import tempfile
import os
from typing import Optional, Tuple
from datetime import datetime

from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


class WhisperTranscriptionService:
    """Service for transcribing audio using OpenAI Whisper."""

    def __init__(self):
        self.client: Optional[AsyncOpenAI] = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the OpenAI client."""
        api_key = settings.OPENAI_API_KEY
        if api_key:
            self.client = AsyncOpenAI(api_key=api_key)
            logger.info("WhisperTranscriptionService initialized with OpenAI API key")
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

        Args:
            audio_data: Raw audio bytes
            audio_format: Audio format (webm, mp3, wav, etc.)
            language: Language code (default: en)

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
            # Create a temporary file for the audio
            # Whisper API requires a file-like object with a name
            suffix = f".{audio_format}"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name

            try:
                # Open and send to Whisper
                with open(temp_file_path, "rb") as audio_file:
                    response = await self.client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language=language,
                        response_format="verbose_json",  # Get confidence info
                    )

                # Extract transcription
                text = response.text.strip() if hasattr(response, 'text') else ""

                # Whisper doesn't return confidence per-se, but we can estimate
                # based on whether we got a result
                confidence = 0.9 if text else 0.0

                if text:
                    logger.info(f"Whisper transcribed: '{text[:50]}...' (confidence: {confidence})")

                return text, confidence

            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_file_path)
                except Exception:
                    pass

        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")
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
        Transcribe an audio chunk and return structured data for ARIA processing.

        Args:
            audio_data: Raw audio bytes
            session_id: Call session ID
            speaker_id: ID of the speaker
            chunk_index: Index of this chunk in the stream
            audio_format: Audio format

        Returns:
            Dict with transcription data ready for ARIA analysis
        """
        text, confidence = await self.transcribe_audio(audio_data, audio_format)

        return {
            "session_id": session_id,
            "speaker_id": speaker_id,
            "chunk_index": chunk_index,
            "content": text or "",
            "confidence": confidence,
            "timestamp": datetime.utcnow().isoformat(),
            "has_speech": bool(text and text.strip()),
        }


# Global singleton instance
whisper_service = WhisperTranscriptionService()

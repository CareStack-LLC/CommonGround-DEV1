"""
In-house cryptographic signing service (Ed25519).

Provides non-repudiable, independently verifiable signatures over canonical
payloads (agreement approvals) and document bytes (court reports) — no
third-party / DocuSign dependency, no per-signature cost.

The private key is loaded from settings.SIGNING_PRIVATE_KEY_PEM (production
secret). If unset, an ephemeral key is generated at process start so the rest
of the app keeps working in dev — but those signatures won't verify across
restarts, so production MUST set the key.

The public key is published at GET /.well-known/commonground-signing-key so a
court / opposing counsel can fetch it and verify a signature themselves.
"""

import base64
import hashlib
import logging

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.exceptions import InvalidSignature

from app.core.config import settings

logger = logging.getLogger(__name__)

ALG = "Ed25519"


class SigningService:
    """Singleton-style signing service."""

    def __init__(self) -> None:
        self._private_key = self._load_or_generate_key()
        self._public_pem = self._private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        # Stable identifier for this key so signatures can be matched to it.
        self.key_id = hashlib.sha256(self._public_pem).hexdigest()[:16]

    @staticmethod
    def _load_or_generate_key() -> Ed25519PrivateKey:
        pem = (settings.SIGNING_PRIVATE_KEY_PEM or "").strip()
        if pem:
            try:
                key = serialization.load_pem_private_key(pem.encode(), password=None)
                if isinstance(key, Ed25519PrivateKey):
                    return key
                logger.error("SIGNING_PRIVATE_KEY_PEM is not an Ed25519 key — generating ephemeral key")
            except Exception as e:
                logger.error(f"Failed to load SIGNING_PRIVATE_KEY_PEM ({e}) — generating ephemeral key")
        else:
            logger.warning(
                "SIGNING_PRIVATE_KEY_PEM not set — using an EPHEMERAL signing key. "
                "Signatures will not verify across restarts. Set this in production."
            )
        return Ed25519PrivateKey.generate()

    def public_key_pem(self) -> str:
        return self._public_pem.decode()

    def sign(self, payload: bytes) -> dict:
        """Sign payload bytes; returns {signature, key_id, alg}."""
        sig = self._private_key.sign(payload)
        return {
            "signature": base64.b64encode(sig).decode(),
            "key_id": self.key_id,
            "alg": ALG,
        }

    def verify(self, payload: bytes, signature_b64: str, key_id: str | None = None) -> bool:
        """Verify a signature against the current public key."""
        if key_id is not None and key_id != self.key_id:
            # A different key signed it; this service can't verify it.
            return False
        try:
            self._private_key.public_key().verify(
                base64.b64decode(signature_b64), payload
            )
            return True
        except (InvalidSignature, Exception):
            return False

    @staticmethod
    def verify_with_pem(public_pem: str, payload: bytes, signature_b64: str) -> bool:
        """Stateless verification against an explicitly provided public key PEM."""
        try:
            pub = serialization.load_pem_public_key(public_pem.encode())
            if not isinstance(pub, Ed25519PublicKey):
                return False
            pub.verify(base64.b64decode(signature_b64), payload)
            return True
        except Exception:
            return False


signing_service = SigningService()

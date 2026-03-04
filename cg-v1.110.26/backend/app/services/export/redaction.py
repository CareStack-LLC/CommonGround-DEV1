"""
RedactionService for PII removal from export packages.

Supports three redaction levels:
- none: No redaction
- standard: SSN, addresses redacted
- enhanced: All PII including phone/email redacted
"""

import re
from typing import Optional
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.export import RedactionRule


@dataclass
class RedactionPattern:
    """A pattern for redacting sensitive information."""
    name: str
    pattern: str
    replacement: str
    level: str  # Minimum level required: "standard" or "enhanced"


# Built-in redaction patterns
BUILTIN_PATTERNS = [
    # Standard level patterns
    RedactionPattern(
        name="ssn",
        pattern=r"\b\d{3}-\d{2}-\d{4}\b",
        replacement="[SSN REDACTED]",
        level="standard"
    ),
    RedactionPattern(
        name="ssn_no_dash",
        pattern=r"\b\d{9}\b",
        replacement="[SSN REDACTED]",
        level="standard"
    ),
    RedactionPattern(
        name="street_address",
        pattern=r"\b\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Circle|Cir|Place|Pl)\b\.?",
        replacement="[ADDRESS REDACTED]",
        level="standard"
    ),
    RedactionPattern(
        name="zip_code",
        pattern=r"\b\d{5}(?:-\d{4})?\b",
        replacement="[ZIP REDACTED]",
        level="standard"
    ),

    # Enhanced level patterns
    RedactionPattern(
        name="phone",
        pattern=r"(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
        replacement="[PHONE REDACTED]",
        level="enhanced"
    ),
    RedactionPattern(
        name="email",
        pattern=r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        replacement="[EMAIL REDACTED]",
        level="enhanced"
    ),
    RedactionPattern(
        name="date_of_birth",
        pattern=r"\b(?:DOB|D\.O\.B\.|Date of Birth|Born)\s*:?\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b",
        replacement="[DOB REDACTED]",
        level="enhanced"
    ),
    RedactionPattern(
        name="drivers_license",
        pattern=r"\b(?:DL|Driver['']?s?\s*License)\s*(?:#|:)?\s*[A-Z0-9]{5,15}\b",
        replacement="[DL REDACTED]",
        level="enhanced"
    ),
    RedactionPattern(
        name="credit_card",
        pattern=r"\b(?:\d{4}[-\s]?){3}\d{4}\b",
        replacement="[CARD REDACTED]",
        level="enhanced"
    ),
    RedactionPattern(
        name="bank_account",
        pattern=r"\b(?:Account\s*(?:#|:)?\s*|Acct\s*(?:#|:)?\s*)\d{8,17}\b",
        replacement="[ACCOUNT REDACTED]",
        level="enhanced"
    ),
]


class RedactionService:
    """
    Service for redacting sensitive information from text.

    Usage:
        service = RedactionService(db, level="standard")
        redacted = await service.redact_text("Call me at 555-123-4567")
        # Returns: "Call me at [PHONE REDACTED]"
    """

    def __init__(
        self,
        db: Optional[AsyncSession] = None,
        level: str = "standard"
    ):
        """
        Initialize the redaction service.

        Args:
            db: Database session for loading custom rules
            level: Redaction level - "none", "standard", or "enhanced"
        """
        self.db = db
        self.level = level
        self._patterns: list[RedactionPattern] = []
        self._compiled_patterns: dict[str, re.Pattern] = {}
        self._initialized = False

    async def initialize(self) -> None:
        """Load redaction patterns based on level."""
        if self._initialized:
            return

        # Start with built-in patterns
        self._patterns = []

        if self.level == "none":
            self._initialized = True
            return

        # Add patterns based on level
        for pattern in BUILTIN_PATTERNS:
            if self.level == "enhanced":
                # Enhanced includes all patterns
                self._patterns.append(pattern)
            elif self.level == "standard" and pattern.level == "standard":
                # Standard only includes standard-level patterns
                self._patterns.append(pattern)

        # Load custom patterns from database if available
        if self.db:
            await self._load_custom_rules()

        # Pre-compile regex patterns for performance
        for pattern in self._patterns:
            try:
                self._compiled_patterns[pattern.name] = re.compile(
                    pattern.pattern,
                    re.IGNORECASE
                )
            except re.error as e:
                # Skip invalid patterns
                print(f"Warning: Invalid regex pattern '{pattern.name}': {e}")

        self._initialized = True

    async def _load_custom_rules(self) -> None:
        """Load custom redaction rules from database."""
        result = await self.db.execute(
            select(RedactionRule).where(
                RedactionRule.is_active == True
            ).order_by(RedactionRule.priority.desc())
        )
        rules = list(result.scalars().all())

        for rule in rules:
            # Check if this rule applies at current level
            if self.level == "standard" and rule.redaction_level == "enhanced":
                continue

            self._patterns.append(RedactionPattern(
                name=rule.rule_name,
                pattern=rule.pattern,
                replacement=rule.replacement,
                level=rule.redaction_level
            ))

    async def redact_text(self, text: str) -> str:
        """
        Redact sensitive information from text.

        Args:
            text: The text to redact

        Returns:
            Text with sensitive information replaced
        """
        if not text:
            return text

        if not self._initialized:
            await self.initialize()

        if self.level == "none":
            return text

        result = text
        for pattern in self._patterns:
            if pattern.name in self._compiled_patterns:
                compiled = self._compiled_patterns[pattern.name]
                result = compiled.sub(pattern.replacement, result)

        return result

    async def redact_dict(self, data: dict, fields: Optional[list[str]] = None) -> dict:
        """
        Redact sensitive information from dictionary values.

        Args:
            data: Dictionary with potentially sensitive values
            fields: Specific fields to redact (if None, redact all string values)

        Returns:
            Dictionary with redacted values
        """
        if not data:
            return data

        result = {}
        for key, value in data.items():
            if fields and key not in fields:
                result[key] = value
            elif isinstance(value, str):
                result[key] = await self.redact_text(value)
            elif isinstance(value, dict):
                result[key] = await self.redact_dict(value, fields)
            elif isinstance(value, list):
                result[key] = await self.redact_list(value, fields)
            else:
                result[key] = value

        return result

    async def redact_list(self, items: list, fields: Optional[list[str]] = None) -> list:
        """
        Redact sensitive information from list items.

        Args:
            items: List of items to redact
            fields: Specific fields to redact (for dict items)

        Returns:
            List with redacted values
        """
        if not items:
            return items

        result = []
        for item in items:
            if isinstance(item, str):
                result.append(await self.redact_text(item))
            elif isinstance(item, dict):
                result.append(await self.redact_dict(item, fields))
            else:
                result.append(item)

        return result

    def get_applied_patterns(self) -> list[str]:
        """Get list of pattern names that will be applied."""
        return [p.name for p in self._patterns]

    async def preview_redactions(self, text: str) -> dict:
        """
        Preview what would be redacted without actually redacting.

        Args:
            text: Text to analyze

        Returns:
            Dictionary with matches found for each pattern
        """
        if not self._initialized:
            await self.initialize()

        matches = {}
        for pattern in self._patterns:
            if pattern.name in self._compiled_patterns:
                compiled = self._compiled_patterns[pattern.name]
                found = compiled.findall(text)
                if found:
                    matches[pattern.name] = found

        return matches


# Convenience functions for common operations
async def redact(
    text: str,
    level: str = "standard",
    db: Optional[AsyncSession] = None
) -> str:
    """
    Quick redaction function.

    Args:
        text: Text to redact
        level: Redaction level
        db: Optional database session for custom rules

    Returns:
        Redacted text
    """
    service = RedactionService(db=db, level=level)
    return await service.redact_text(text)


async def redact_message_content(
    content: str,
    level: str = "standard",
    message_redacted: bool = False
) -> str:
    """
    Redact message content for export.

    If message_redacted is True, returns a placeholder instead of content.

    Args:
        content: Message content
        level: Redaction level
        message_redacted: Whether to fully redact message content

    Returns:
        Redacted or placeholder text
    """
    if message_redacted:
        return "[Message content redacted for privacy]"

    return await redact(content, level=level)

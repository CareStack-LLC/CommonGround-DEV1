"""
Base classes for section generators.

All section generators inherit from BaseSectionGenerator and implement
the generate() method to produce structured content data.
"""

from abc import ABC, abstractmethod
from datetime import date, datetime
from typing import Optional, Any
from dataclasses import dataclass, field
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.export.redaction import RedactionService


@dataclass
class GeneratorContext:
    """
    Context passed to all section generators.

    Contains everything a generator needs to produce content.
    """
    db: AsyncSession
    case_id: str
    date_start: date
    date_end: date
    redaction_service: RedactionService
    message_content_redacted: bool = False

    # Optional claim context for investigation packages
    claim_type: Optional[str] = None
    claim_description: Optional[str] = None

    # Cached data to avoid repeated queries
    _cache: dict = field(default_factory=dict)

    async def get_cached(self, key: str, loader):
        """
        Get a cached value or load it.

        Args:
            key: Cache key
            loader: Async function to load the value if not cached

        Returns:
            The cached or loaded value
        """
        if key not in self._cache:
            self._cache[key] = await loader()
        return self._cache[key]


@dataclass
class SectionContent:
    """
    Content produced by a section generator.
    """
    section_type: str
    section_title: str
    section_order: int
    content_data: dict
    evidence_count: int = 0
    data_sources: list[str] = field(default_factory=list)
    generation_time_ms: Optional[int] = None


class BaseSectionGenerator(ABC):
    """
    Abstract base class for all section generators.

    Each section generator:
    1. Has a unique section_type matching SectionType enum
    2. Has a section_order for PDF ordering
    3. Implements generate() to produce structured content
    """

    # Override in subclasses
    section_type: str = ""
    section_title: str = ""
    section_order: int = 0

    @abstractmethod
    async def generate(self, context: GeneratorContext) -> SectionContent:
        """
        Generate the section content.

        Args:
            context: Generator context with database, date range, etc.

        Returns:
            SectionContent with structured data
        """
        pass

    async def _redact(self, text: str, context: GeneratorContext) -> str:
        """Helper to redact text using context's redaction service."""
        return await context.redaction_service.redact_text(text)

    async def _redact_dict(
        self,
        data: dict,
        context: GeneratorContext,
        fields: Optional[list[str]] = None
    ) -> dict:
        """Helper to redact dict values using context's redaction service."""
        return await context.redaction_service.redact_dict(data, fields)

    def _format_date(self, d: date) -> str:
        """Format a date for display."""
        return d.strftime("%B %d, %Y")

    def _format_datetime(self, dt: datetime) -> str:
        """Format a datetime for display."""
        return dt.strftime("%B %d, %Y at %I:%M %p")

    def _calculate_percentage(self, numerator: int, denominator: int) -> float:
        """Calculate percentage with zero-division safety."""
        if denominator == 0:
            return 0.0
        return round((numerator / denominator) * 100, 1)


class SectionGeneratorRegistry:
    """
    Registry for section generators.

    Provides factory methods to get generators by type and
    generates all sections for a package.
    """

    def __init__(self):
        self._generators: dict[str, BaseSectionGenerator] = {}

    def register(self, generator: BaseSectionGenerator) -> None:
        """Register a section generator."""
        self._generators[generator.section_type] = generator

    def get(self, section_type: str) -> Optional[BaseSectionGenerator]:
        """Get a generator by section type."""
        return self._generators.get(section_type)

    def get_all(self) -> list[BaseSectionGenerator]:
        """Get all registered generators in order."""
        return sorted(
            self._generators.values(),
            key=lambda g: g.section_order
        )

    def get_by_types(self, section_types: list[str]) -> list[BaseSectionGenerator]:
        """Get generators for specific section types in order."""
        generators = [
            self._generators[t]
            for t in section_types
            if t in self._generators
        ]
        return sorted(generators, key=lambda g: g.section_order)

    def get_default_sections(self, package_type: str) -> list[str]:
        """
        Get default section types for a package type.

        Args:
            package_type: "investigation" or "court"

        Returns:
            List of section type strings
        """
        if package_type == "court":
            # Court packages include all sections
            return [g.section_type for g in self.get_all()]
        elif package_type == "investigation":
            # Investigation packages focus on relevant sections
            return [
                "agreement_overview",
                "compliance_summary",
                "parenting_time",
                "exchange_gps_verification",
                "communication_compliance",
                "intervention_log",
                "chain_of_custody",
            ]
        else:
            return []

    async def generate_sections(
        self,
        context: GeneratorContext,
        section_types: Optional[list[str]] = None,
        package_type: str = "court"
    ) -> list[SectionContent]:
        """
        Generate all sections for a package.

        Args:
            context: Generator context
            section_types: Specific sections to generate (or None for defaults)
            package_type: Package type for default section selection

        Returns:
            List of generated section contents in order
        """
        import time

        if section_types:
            generators = self.get_by_types(section_types)
        else:
            default_types = self.get_default_sections(package_type)
            generators = self.get_by_types(default_types)

        sections = []
        for generator in generators:
            start_time = time.time()

            content = await generator.generate(context)

            # Record generation time
            content.generation_time_ms = int((time.time() - start_time) * 1000)

            sections.append(content)

        return sections

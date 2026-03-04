"""
Section generators for CaseExport packages.

Each generator produces structured content for a specific section
of the export package.
"""

from app.services.export.generators.base import (
    BaseSectionGenerator,
    SectionGeneratorRegistry,
    GeneratorContext,
)
from app.services.export.generators.agreement_overview import AgreementOverviewGenerator
from app.services.export.generators.compliance_summary import ComplianceSummaryGenerator
from app.services.export.generators.parenting_time import ParentingTimeGenerator
from app.services.export.generators.financial_compliance import FinancialComplianceGenerator
from app.services.export.generators.communication_compliance import CommunicationComplianceGenerator
from app.services.export.generators.intervention_log import InterventionLogGenerator
from app.services.export.generators.parent_impact import ParentImpactGenerator
from app.services.export.generators.chain_of_custody import ChainOfCustodyGenerator
from app.services.export.generators.item_tracking import ItemTrackingGenerator
from app.services.export.generators.exchange_gps_verification import ExchangeGPSVerificationGenerator

# Create and populate the default registry
registry = SectionGeneratorRegistry()

# Register all generators
registry.register(AgreementOverviewGenerator())
registry.register(ComplianceSummaryGenerator())
registry.register(ParentingTimeGenerator())
registry.register(FinancialComplianceGenerator())
registry.register(CommunicationComplianceGenerator())
registry.register(InterventionLogGenerator())
registry.register(ParentImpactGenerator())
registry.register(ChainOfCustodyGenerator())
registry.register(ItemTrackingGenerator())
registry.register(ExchangeGPSVerificationGenerator())


def get_registry() -> SectionGeneratorRegistry:
    """Get the default section generator registry."""
    return registry


__all__ = [
    "BaseSectionGenerator",
    "SectionGeneratorRegistry",
    "GeneratorContext",
    "get_registry",
    # Individual generators
    "AgreementOverviewGenerator",
    "ComplianceSummaryGenerator",
    "ParentingTimeGenerator",
    "FinancialComplianceGenerator",
    "CommunicationComplianceGenerator",
    "InterventionLogGenerator",
    "ParentImpactGenerator",
    "ChainOfCustodyGenerator",
    "ItemTrackingGenerator",
    "ExchangeGPSVerificationGenerator",
]

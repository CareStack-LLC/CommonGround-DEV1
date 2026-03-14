"""
Report Registry - Maps GTM spec report codes to implementations.

The GTM spec defines 15 reports:
- P-1 through P-7: Parent self-service reports
- A-1 through A-8: Attorney/professional reports

This registry maps each code to its implementation details,
tier requirements, and capabilities.
"""

from typing import Optional


# =============================================================================
# Parent Reports (P-1 through P-7)
# =============================================================================

PARENT_REPORTS = {
    "P-1": {
        "code": "P-1",
        "name": "30-Day Activity Snapshot",
        "description": "Quick overview of recent co-parenting activity including messages, exchanges, and expenses.",
        "internal_type": "schedule",  # Maps to existing report generator
        "tier_required": "starter",  # Free tier
        "sha256_verified": False,
        "court_ready": False,
        "pdf_export": True,
        "available": True,
    },
    "P-2": {
        "code": "P-2",
        "name": "Monthly Parent Insight",
        "description": "Co-parenting health score with communication patterns, response times, and key metrics.",
        "internal_type": "communication",
        "tier_required": "plus",
        "sha256_verified": False,
        "court_ready": False,
        "pdf_export": True,
        "available": True,
    },
    "P-3": {
        "code": "P-3",
        "name": "Expense Summary",
        "description": "ClearFund obligations, payment history, and financial compliance overview.",
        "internal_type": "expense",
        "tier_required": "plus",
        "sha256_verified": False,
        "court_ready": False,
        "pdf_export": True,
        "available": True,
    },
    "P-4": {
        "code": "P-4",
        "name": "Custody Analytics",
        "description": "Parenting time split analysis with actual vs. agreed comparison and exchange compliance.",
        "internal_type": "custody_time",
        "tier_required": "plus",
        "sha256_verified": False,  # Optional at Complete tier
        "court_ready": True,
        "pdf_export": True,
        "available": True,
    },
    "P-5": {
        "code": "P-5",
        "name": "ARIA Communication Report",
        "description": "Detailed message patterns, intervention analysis, and toxicity categorization with SHA-256 verification.",
        "internal_type": "communication",
        "tier_required": "complete",
        "sha256_verified": True,
        "court_ready": True,
        "pdf_export": True,
        "available": True,
    },
    "P-6": {
        "code": "P-6",
        "name": "Court Evidence Package",
        "description": "Comprehensive court-ready documentation package with SHA-256 verification. FRE 902(14) compliant.",
        "internal_type": "court_investigation_package",
        "tier_required": "complete",
        "sha256_verified": True,
        "court_ready": True,
        "pdf_export": True,
        "paid": True,  # Requires Stripe checkout
        "base_price_cents": 14900,
        "available": True,
    },
    "P-7": {
        "code": "P-7",
        "name": "Agreement Status Report",
        "description": "Ordered vs. actual comparison for custody arrangements and exchange compliance.",
        "internal_type": "agreement_status",
        "tier_required": "plus",
        "sha256_verified": False,
        "court_ready": True,
        "pdf_export": True,
        "available": False,  # Not yet implemented
    },
}

# =============================================================================
# Attorney/Professional Reports (A-1 through A-8)
# =============================================================================

ATTORNEY_REPORTS = {
    "A-1": {
        "code": "A-1",
        "name": "Case Compliance Report",
        "description": "Per-case compliance overview with exchange, communication, and financial metrics.",
        "internal_type": "custody_compliance_report",
        "tier_required": "solo",  # All Pro tiers
        "sha256_verified": True,
        "court_ready": True,
        "pdf_export": True,
        "available": True,
    },
    "A-2": {
        "code": "A-2",
        "name": "Exchange Verification",
        "description": "GPS-verified custody exchange records with timestamps and location data.",
        "internal_type": "exchange_compliance",
        "tier_required": "solo",
        "sha256_verified": True,
        "court_ready": True,
        "pdf_export": True,
        "available": True,
    },
    "A-3": {
        "code": "A-3",
        "name": "ARIA Intervention Log",
        "description": "Red-flag intervention log with message metadata and toxicity analysis.",
        "internal_type": "communication_analysis",
        "tier_required": "solo",
        "sha256_verified": True,
        "court_ready": True,
        "pdf_export": True,
        "available": True,
    },
    "A-4": {
        "code": "A-4",
        "name": "Firm Analytics",
        "description": "Aggregate practice metrics across multiple cases for firm-level insights.",
        "internal_type": "firm_analytics",
        "tier_required": "small_firm",
        "sha256_verified": False,
        "court_ready": False,
        "pdf_export": True,
        "available": False,  # Not yet implemented
    },
    "A-5": {
        "code": "A-5",
        "name": "Risk Assessment",
        "description": "Child safety and conflict exposure indicators with risk scoring.",
        "internal_type": "risk_assessment",
        "tier_required": "solo",
        "sha256_verified": False,
        "court_ready": False,
        "pdf_export": True,
        "available": False,  # Not yet implemented
    },
    "A-6": {
        "code": "A-6",
        "name": "Court Submission Package",
        "description": "Complete SHA-256 verified court filing package. FRE 902(14) compliant.",
        "internal_type": "court_investigation_package",
        "tier_required": "solo",
        "sha256_verified": True,
        "court_ready": True,
        "pdf_export": True,
        "paid": True,
        "base_price_cents": 14900,
        "available": True,
    },
    "A-7": {
        "code": "A-7",
        "name": "Client Progress Summary",
        "description": "Attorney-branded one-page summary for client communication with key metrics.",
        "internal_type": "client_progress",
        "tier_required": "solo",
        "sha256_verified": False,
        "court_ready": False,
        "pdf_export": True,
        "available": False,  # Not yet implemented
    },
    "A-8": {
        "code": "A-8",
        "name": "GAL Child Welfare View",
        "description": "Child-centered welfare indicators for Guardian ad Litem filings. Requires dual-parent consent.",
        "internal_type": "gal_welfare",
        "tier_required": "solo",
        "sha256_verified": True,
        "court_ready": True,
        "pdf_export": True,
        "requires_dual_consent": True,
        "available": False,  # Not yet implemented
    },
}

# Combined registry
ALL_REPORTS = {**PARENT_REPORTS, **ATTORNEY_REPORTS}

# Mapping from internal type to spec code(s)
INTERNAL_TO_SPEC_CODE = {}
for code, report in ALL_REPORTS.items():
    internal = report["internal_type"]
    if internal not in INTERNAL_TO_SPEC_CODE:
        INTERNAL_TO_SPEC_CODE[internal] = []
    INTERNAL_TO_SPEC_CODE[internal].append(code)


def get_report_by_code(code: str) -> Optional[dict]:
    """Get report definition by spec code (P-1, A-3, etc.)."""
    return ALL_REPORTS.get(code.upper())


def get_parent_reports() -> list[dict]:
    """Get all parent report definitions."""
    return list(PARENT_REPORTS.values())


def get_attorney_reports() -> list[dict]:
    """Get all attorney report definitions."""
    return list(ATTORNEY_REPORTS.values())


def get_available_reports(category: str = "all") -> list[dict]:
    """Get reports that are currently implemented and available."""
    if category == "parent":
        reports = PARENT_REPORTS.values()
    elif category == "attorney":
        reports = ATTORNEY_REPORTS.values()
    else:
        reports = ALL_REPORTS.values()
    return [r for r in reports if r.get("available", False)]

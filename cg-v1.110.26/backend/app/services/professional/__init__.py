"""
Professional Portal services.

Business logic for professional profiles, firms, memberships,
case assignments, and related features.
"""

from app.services.professional.firm_service import FirmService
from app.services.professional.profile_service import ProfessionalProfileService
from app.services.professional.access_service import ProfessionalAccessService
from app.services.professional.assignment_service import CaseAssignmentService
from app.services.professional.dashboard_service import ProfessionalDashboardService
from app.services.professional.timeline_service import CaseTimelineService
from app.services.professional.aria_control_service import ARIAControlService
from app.services.professional.messaging_service import ProfessionalMessagingService
from app.services.professional.intake_service import ProfessionalIntakeService
from app.services.professional.communications_service import CommunicationsService
from app.services.professional.compliance_service import ProfessionalComplianceService
from app.services.professional.case_summary_service import ProfessionalCaseSummaryService
from app.services.professional.call_log_service import ProfessionalCallLogService
from app.services.professional.report_service import ComplianceReportService
from app.services.professional.ocr_service import OCRDocumentService
from app.services.professional.field_lock_service import FieldLockService
from app.services.professional.tier_gate import (
    require_tier,
    enforce_case_limit,
    enforce_team_limit,
    get_tier_features,
)

__all__ = [
    "FirmService",
    "ProfessionalProfileService",
    "ProfessionalAccessService",
    "CaseAssignmentService",
    "ProfessionalDashboardService",
    "CaseTimelineService",
    "ARIAControlService",
    "ProfessionalMessagingService",
    "ProfessionalIntakeService",
    "CommunicationsService",
    "ProfessionalComplianceService",
    "ProfessionalCaseSummaryService",
    "ProfessionalCallLogService",
    "ComplianceReportService",
    # Phase 2 additions
    "OCRDocumentService",
    "FieldLockService",
    "require_tier",
    "enforce_case_limit",
    "enforce_team_limit",
    "get_tier_features",
]


"""
Reports Service

Beautiful, branded PDF reports for CommonGround parents and professionals.
Includes the GTM report registry (P-1..P-7, A-1..A-8).
"""

from .chart_builder import ChartBuilder
from .parent_report_service import ParentReportService
from .report_registry import (
    ALL_REPORTS,
    PARENT_REPORTS,
    ATTORNEY_REPORTS,
    get_report_by_code,
    get_parent_reports,
    get_attorney_reports,
    get_available_reports,
)

__all__ = [
    "ChartBuilder",
    "ParentReportService",
    "ALL_REPORTS",
    "PARENT_REPORTS",
    "ATTORNEY_REPORTS",
    "get_report_by_code",
    "get_parent_reports",
    "get_attorney_reports",
    "get_available_reports",
]

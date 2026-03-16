"""
Verification schemas for the public report verification endpoint.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class VerificationResponse(BaseModel):
    """Response from the public verification endpoint."""

    is_valid: bool
    report_id: Optional[str] = None
    report_type: str  # Human-readable: "Custody Time Report"
    report_category: str  # "Parent Report", "Court Export", etc.
    sha256_hash: Optional[str] = None
    generated_at: Optional[datetime] = None
    date_range: Optional[str] = None  # "Jan 01 – Jan 31, 2026"
    family_file_ref: Optional[str] = None  # Redacted: "FF-••••3A7"
    verified_at: datetime  # Timestamp of this verification check
    message: str  # "This report is authentic and unaltered."

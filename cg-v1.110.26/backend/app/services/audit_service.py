"""
Audit logging service for security and compliance tracking.

Provides a simple interface to log security-critical events:
- Authentication (login, logout, registration, password changes)
- Data access (family file access, export generation)
- Data modification (agreement activation, message sends)
"""

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

from app.utils.sentry_helpers import capture_error
logger = logging.getLogger(__name__)


async def log_audit_event(
    db: AsyncSession,
    action: str,
    resource_type: str,
    status: str = "success",
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    resource_id: Optional[str] = None,
    case_id: Optional[str] = None,
    method: str = "POST",
    endpoint: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    description: Optional[str] = None,
    status_code: Optional[int] = None,
    extra_metadata: Optional[dict] = None,
    is_suspicious: bool = False,
) -> None:
    """
    Log an audit event to the database.

    Args:
        db: Database session
        action: Action performed (e.g., "user.login", "message.send")
        resource_type: Type of resource (e.g., "user", "message", "agreement")
        status: "success", "failure", or "error"
        user_id: ID of the user performing the action
        user_email: Email of the user
        resource_id: ID of the affected resource
        case_id: Associated case ID (if applicable)
        method: HTTP method
        endpoint: API endpoint path
        ip_address: Client IP address
        user_agent: Client user agent string
        description: Human-readable description
        status_code: HTTP response status code
        extra_metadata: Additional context data
        is_suspicious: Flag for security review
    """
    try:
        audit_log = AuditLog(
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            case_id=case_id,
            method=method,
            endpoint=endpoint,
            status=status,
            status_code=status_code,
            description=description,
            extra_metadata=extra_metadata,
            is_suspicious=is_suspicious,
        )
        db.add(audit_log)
        # Don't flush here — let it commit with the parent transaction.
        # Flushing can corrupt the session if the audit_logs table doesn't exist yet.
    except Exception as e:
        # Never let audit logging failure break the main flow
        logger.error(f"Failed to write audit log: {e}")
        capture_error(e)
        try:
            await db.rollback()
        except Exception:
            pass


def get_client_ip(request) -> Optional[str]:
    """Extract client IP from a FastAPI Request object."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None

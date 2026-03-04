"""
Court Access Mode service layer.

Business logic for court professional access, settings, events, and reports.
"""

import hashlib
import secrets
from datetime import datetime, date, timedelta
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.court import (
    CourtProfessional,
    CourtAccessGrant,
    CourtAccessLog,
    CourtCaseSettings,
    CourtEvent,
    CourtMessage,
    InvestigationReport,
    CourtRole,
    AccessScope,
    GrantStatus,
    CourtEventType,
    CourtMessageType,
    ReportType,
    DEFAULT_ACCESS_DURATION,
)
from app.models.case import Case, CaseParticipant
from app.models.message import Message, MessageFlag
from app.models.schedule import ScheduleEvent, ExchangeCheckIn
from app.schemas.court import (
    CourtProfessionalCreate,
    CourtProfessionalUpdate,
    AccessGrantRequest,
    CourtSettingsCreate,
    CourtSettingsUpdate,
    CourtEventCreate,
    CourtEventUpdate,
    CourtEventAttendance,
    CourtMessageCreate,
    ReportRequest,
)


# =============================================================================
# Court Professional Service
# =============================================================================

class CourtProfessionalService:
    """Service for managing court professionals."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_professional(
        self, data: CourtProfessionalCreate
    ) -> CourtProfessional:
        """Create a new court professional."""
        professional = CourtProfessional(
            id=str(uuid4()),
            email=data.email,
            full_name=data.full_name,
            phone=data.phone,
            role=data.role.value,
            organization=data.organization,
            title=data.title,
            credentials=data.credentials,
        )
        self.db.add(professional)
        await self.db.commit()
        await self.db.refresh(professional)
        return professional

    async def get_professional(self, professional_id: str) -> Optional[CourtProfessional]:
        """Get a court professional by ID."""
        result = await self.db.execute(
            select(CourtProfessional).where(CourtProfessional.id == professional_id)
        )
        return result.scalar_one_or_none()

    async def get_professional_by_email(self, email: str) -> Optional[CourtProfessional]:
        """Get a court professional by email."""
        result = await self.db.execute(
            select(CourtProfessional).where(CourtProfessional.email == email)
        )
        return result.scalar_one_or_none()

    async def update_professional(
        self, professional_id: str, data: CourtProfessionalUpdate
    ) -> Optional[CourtProfessional]:
        """Update a court professional."""
        professional = await self.get_professional(professional_id)
        if not professional:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(professional, key, value)

        professional.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(professional)
        return professional

    async def verify_professional(
        self,
        professional_id: str,
        verification_method: str,
        verified_by: Optional[str] = None,
        credentials: Optional[dict] = None,
    ) -> Optional[CourtProfessional]:
        """Mark a professional as verified."""
        professional = await self.get_professional(professional_id)
        if not professional:
            return None

        professional.is_verified = True
        professional.verified_at = datetime.utcnow()
        professional.verified_by = verified_by
        professional.verification_method = verification_method
        if credentials:
            professional.credentials = {
                **(professional.credentials or {}),
                **credentials,
            }

        await self.db.commit()
        await self.db.refresh(professional)
        return professional

    async def enable_mfa(
        self, professional_id: str, mfa_secret: str
    ) -> Optional[CourtProfessional]:
        """Enable MFA for a professional (simulated for MVP)."""
        professional = await self.get_professional(professional_id)
        if not professional:
            return None

        professional.mfa_enabled = True
        professional.mfa_secret = mfa_secret
        professional.mfa_verified_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(professional)
        return professional

    async def record_login(self, professional_id: str) -> None:
        """Record a professional login."""
        professional = await self.get_professional(professional_id)
        if professional:
            professional.last_login_at = datetime.utcnow()
            await self.db.commit()


# =============================================================================
# Access Grant Service
# =============================================================================

class AccessGrantService:
    """Service for managing court access grants."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_grant(
        self,
        data: AccessGrantRequest,
        professional_id: str,
    ) -> CourtAccessGrant:
        """Create a new access grant."""
        # Calculate duration
        role = CourtRole(data.role)
        duration_days = data.duration_days or DEFAULT_ACCESS_DURATION.get(role, 30)
        expires_at = datetime.utcnow() + timedelta(days=duration_days)

        # Generate access code
        access_code = secrets.token_urlsafe(32)

        grant = CourtAccessGrant(
            id=str(uuid4()),
            case_id=data.case_id,
            professional_id=professional_id,
            role=data.role.value,
            access_scope=[s.value for s in data.access_scope],
            data_start_date=data.data_start_date,
            data_end_date=data.data_end_date or date.today(),
            authorization_type=data.authorization_type,
            authorization_reference=data.authorization_reference,
            expires_at=expires_at,
            access_code=access_code,
            access_link_expires_at=datetime.utcnow() + timedelta(days=7),
            notes=data.notes,
        )

        self.db.add(grant)
        await self.db.commit()
        await self.db.refresh(grant)
        return grant

    async def get_grant(self, grant_id: str) -> Optional[CourtAccessGrant]:
        """Get an access grant by ID."""
        result = await self.db.execute(
            select(CourtAccessGrant)
            .options(selectinload(CourtAccessGrant.professional))
            .where(CourtAccessGrant.id == grant_id)
        )
        return result.scalar_one_or_none()

    async def get_grant_by_access_code(self, access_code: str) -> Optional[CourtAccessGrant]:
        """Get an access grant by access code."""
        result = await self.db.execute(
            select(CourtAccessGrant)
            .options(selectinload(CourtAccessGrant.professional))
            .where(CourtAccessGrant.access_code == access_code)
        )
        return result.scalar_one_or_none()

    async def get_grants_for_case(
        self, case_id: str, active_only: bool = True
    ) -> list[CourtAccessGrant]:
        """Get all access grants for a case."""
        query = select(CourtAccessGrant).options(
            selectinload(CourtAccessGrant.professional)
        ).where(CourtAccessGrant.case_id == case_id)

        if active_only:
            query = query.where(
                and_(
                    CourtAccessGrant.status == "active",
                    CourtAccessGrant.expires_at > datetime.utcnow(),
                    CourtAccessGrant.revoked_at.is_(None),
                )
            )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_grants_for_professional(
        self, professional_id: str, active_only: bool = True
    ) -> list[CourtAccessGrant]:
        """Get all access grants for a professional."""
        query = select(CourtAccessGrant).where(
            CourtAccessGrant.professional_id == professional_id
        )

        if active_only:
            query = query.where(
                and_(
                    CourtAccessGrant.status == "active",
                    CourtAccessGrant.expires_at > datetime.utcnow(),
                    CourtAccessGrant.revoked_at.is_(None),
                )
            )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def approve_grant(
        self,
        grant_id: str,
        approver_role: str,  # "petitioner" or "respondent"
        approved: bool,
        notes: Optional[str] = None,
    ) -> Optional[CourtAccessGrant]:
        """Record parent approval for a grant."""
        grant = await self.get_grant(grant_id)
        if not grant:
            return None

        now = datetime.utcnow()

        if approver_role == "petitioner":
            grant.petitioner_approved = approved
            grant.petitioner_approved_at = now
        elif approver_role == "respondent":
            grant.respondent_approved = approved
            grant.respondent_approved_at = now

        # Check if grant should be activated
        if grant.requires_joint_consent:
            if grant.has_joint_consent:
                grant.status = "active"
                grant.activated_at = now
        else:
            # Single parent consent is enough for attorneys
            if grant.petitioner_approved or grant.respondent_approved:
                grant.status = "active"
                grant.activated_at = now

        if notes:
            grant.notes = f"{grant.notes or ''}\n[{approver_role}]: {notes}".strip()

        await self.db.commit()
        await self.db.refresh(grant)
        return grant

    async def activate_grant(self, grant_id: str) -> Optional[CourtAccessGrant]:
        """Activate an access grant after verification."""
        grant = await self.get_grant(grant_id)
        if not grant:
            return None

        grant.status = "active"
        grant.activated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(grant)
        return grant

    async def revoke_grant(
        self, grant_id: str, revoked_by: str, reason: str
    ) -> Optional[CourtAccessGrant]:
        """Revoke an access grant."""
        grant = await self.get_grant(grant_id)
        if not grant:
            return None

        grant.status = "revoked"
        grant.revoked_at = datetime.utcnow()
        grant.revoked_by = revoked_by
        grant.revocation_reason = reason

        await self.db.commit()
        await self.db.refresh(grant)
        return grant

    async def record_access(self, grant_id: str) -> None:
        """Record that a grant was used."""
        grant = await self.get_grant(grant_id)
        if grant:
            grant.last_accessed_at = datetime.utcnow()
            grant.access_count += 1
            await self.db.commit()

    async def check_expiring_grants(self, days: int = 7) -> list[CourtAccessGrant]:
        """Get grants expiring within specified days."""
        cutoff = datetime.utcnow() + timedelta(days=days)
        result = await self.db.execute(
            select(CourtAccessGrant)
            .options(selectinload(CourtAccessGrant.professional))
            .where(
                and_(
                    CourtAccessGrant.status == "active",
                    CourtAccessGrant.expires_at <= cutoff,
                    CourtAccessGrant.expires_at > datetime.utcnow(),
                )
            )
        )
        return list(result.scalars().all())


# =============================================================================
# Access Log Service
# =============================================================================

class AccessLogService:
    """Service for logging court access actions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_action(
        self,
        grant_id: str,
        professional_id: str,
        case_id: str,
        action: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> CourtAccessLog:
        """Log an access action."""
        log = CourtAccessLog(
            id=str(uuid4()),
            grant_id=grant_id,
            professional_id=professional_id,
            case_id=case_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log

    async def get_logs_for_grant(
        self, grant_id: str, limit: int = 100, offset: int = 0
    ) -> tuple[list[CourtAccessLog], int]:
        """Get access logs for a grant."""
        # Get total count
        count_result = await self.db.execute(
            select(func.count()).where(CourtAccessLog.grant_id == grant_id)
        )
        total = count_result.scalar()

        # Get logs
        result = await self.db.execute(
            select(CourtAccessLog)
            .where(CourtAccessLog.grant_id == grant_id)
            .order_by(CourtAccessLog.logged_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all()), total

    async def get_logs_for_case(
        self, case_id: str, limit: int = 100, offset: int = 0
    ) -> tuple[list[CourtAccessLog], int]:
        """Get access logs for a case."""
        count_result = await self.db.execute(
            select(func.count()).where(CourtAccessLog.case_id == case_id)
        )
        total = count_result.scalar()

        result = await self.db.execute(
            select(CourtAccessLog)
            .where(CourtAccessLog.case_id == case_id)
            .order_by(CourtAccessLog.logged_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all()), total


# =============================================================================
# Court Settings Service
# =============================================================================

class CourtSettingsService:
    """Service for managing court-controlled case settings."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_settings(self, case_id: str) -> Optional[CourtCaseSettings]:
        """Get court settings for a case."""
        result = await self.db.execute(
            select(CourtCaseSettings).where(CourtCaseSettings.case_id == case_id)
        )
        return result.scalar_one_or_none()

    async def create_settings(
        self, data: CourtSettingsCreate, set_by: str
    ) -> CourtCaseSettings:
        """Create court settings for a case."""
        settings = CourtCaseSettings(
            id=str(uuid4()),
            case_id=data.case_id,
            gps_checkins_required=data.gps_checkins_required,
            supervised_exchange_required=data.supervised_exchange_required,
            aria_enforcement_locked=data.aria_enforcement_locked,
            in_app_communication_only=data.in_app_communication_only,
            agreement_edits_locked=data.agreement_edits_locked,
            investigation_mode=data.investigation_mode,
            child_safety_tracking=data.child_safety_tracking,
            financial_verification_required=data.financial_verification_required,
            set_by_professional_id=set_by,
            set_at=datetime.utcnow(),
            court_order_reference=data.court_order_reference,
            notes=data.notes,
            settings_history=[
                {
                    "action": "created",
                    "by": set_by,
                    "at": datetime.utcnow().isoformat(),
                    "settings": data.model_dump(),
                }
            ],
        )
        self.db.add(settings)
        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    async def update_settings(
        self, case_id: str, data: CourtSettingsUpdate, updated_by: str
    ) -> Optional[CourtCaseSettings]:
        """Update court settings for a case."""
        settings = await self.get_settings(case_id)
        if not settings:
            return None

        update_data = data.model_dump(exclude_unset=True)
        changes = []

        for key, new_value in update_data.items():
            old_value = getattr(settings, key, None)
            if old_value != new_value:
                changes.append(
                    {
                        "setting": key,
                        "old": old_value,
                        "new": new_value,
                    }
                )
                setattr(settings, key, new_value)

        if changes:
            # Add to history
            history = settings.settings_history or []
            history.append(
                {
                    "action": "updated",
                    "by": updated_by,
                    "at": datetime.utcnow().isoformat(),
                    "changes": changes,
                }
            )
            settings.settings_history = history
            settings.set_by_professional_id = updated_by
            settings.set_at = datetime.utcnow()
            settings.updated_at = datetime.utcnow()

            await self.db.commit()
            await self.db.refresh(settings)

        return settings

    async def get_or_create_settings(
        self, case_id: str, created_by: Optional[str] = None
    ) -> CourtCaseSettings:
        """Get existing settings or create default ones."""
        settings = await self.get_settings(case_id)
        if settings:
            return settings

        # Create default settings
        settings = CourtCaseSettings(
            id=str(uuid4()),
            case_id=case_id,
            set_by_professional_id=created_by,
            set_at=datetime.utcnow() if created_by else None,
        )
        self.db.add(settings)
        await self.db.commit()
        await self.db.refresh(settings)
        return settings


# =============================================================================
# Court Event Service
# =============================================================================

class CourtEventService:
    """Service for managing court events."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_event(
        self, data: CourtEventCreate, created_by: str
    ) -> CourtEvent:
        """Create a court event."""
        from datetime import time

        # Parse time strings to time objects if provided
        start_time = None
        end_time = None
        if data.start_time:
            try:
                parts = data.start_time.split(":")
                start_time = time(int(parts[0]), int(parts[1]))
            except (ValueError, IndexError):
                pass

        if data.end_time:
            try:
                parts = data.end_time.split(":")
                end_time = time(int(parts[0]), int(parts[1]))
            except (ValueError, IndexError):
                pass

        event = CourtEvent(
            id=str(uuid4()),
            case_id=data.case_id,
            created_by=created_by,
            event_type=data.event_type.value,
            title=data.title,
            description=data.description,
            event_date=data.event_date,
            start_time=start_time,
            end_time=end_time,
            location=data.location,
            virtual_link=data.virtual_link,
            petitioner_required=data.petitioner_required,
            respondent_required=data.respondent_required,
            is_mandatory=data.is_mandatory,
            internal_notes=data.internal_notes,
            shared_notes=data.shared_notes,
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def get_event(self, event_id: str) -> Optional[CourtEvent]:
        """Get a court event by ID."""
        result = await self.db.execute(
            select(CourtEvent).where(CourtEvent.id == event_id)
        )
        return result.scalar_one_or_none()

    async def get_events_for_case(
        self,
        case_id: str,
        include_past: bool = False,
        limit: int = 50,
    ) -> list[CourtEvent]:
        """Get court events for a case."""
        query = select(CourtEvent).where(CourtEvent.case_id == case_id)

        if not include_past:
            query = query.where(CourtEvent.event_date >= date.today())

        query = query.order_by(CourtEvent.event_date).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_event(
        self, event_id: str, data: CourtEventUpdate
    ) -> Optional[CourtEvent]:
        """Update a court event."""
        event = await self.get_event(event_id)
        if not event:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key == "event_type" and value:
                value = value.value
            setattr(event, key, value)

        event.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def record_attendance(
        self, event_id: str, data: CourtEventAttendance
    ) -> Optional[CourtEvent]:
        """Record attendance for a court event."""
        event = await self.get_event(event_id)
        if not event:
            return None

        if data.petitioner_attended is not None:
            event.petitioner_attended = data.petitioner_attended
        if data.respondent_attended is not None:
            event.respondent_attended = data.respondent_attended
        if data.petitioner_attendance_notes:
            event.petitioner_attendance_notes = data.petitioner_attendance_notes
        if data.respondent_attendance_notes:
            event.respondent_attendance_notes = data.respondent_attendance_notes

        event.status = "completed"
        event.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def cancel_event(
        self, event_id: str, reason: Optional[str] = None
    ) -> Optional[CourtEvent]:
        """Cancel a court event."""
        event = await self.get_event(event_id)
        if not event:
            return None

        event.status = "cancelled"
        if reason:
            event.internal_notes = f"{event.internal_notes or ''}\nCancelled: {reason}".strip()
        event.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(event)
        return event


# =============================================================================
# Court Message Service
# =============================================================================

class CourtMessageService:
    """Service for managing court messages."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_message(
        self, data: CourtMessageCreate, sent_by: str
    ) -> CourtMessage:
        """Send a court message."""
        message = CourtMessage(
            id=str(uuid4()),
            case_id=data.case_id,
            sent_by=sent_by,
            message_type=data.message_type.value,
            subject=data.subject,
            content=data.content,
            to_petitioner=data.to_petitioner,
            to_respondent=data.to_respondent,
            replies_allowed=data.replies_allowed,
            is_urgent=data.is_urgent,
            attachments=data.attachments,
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def get_message(self, message_id: str) -> Optional[CourtMessage]:
        """Get a court message by ID."""
        result = await self.db.execute(
            select(CourtMessage).where(CourtMessage.id == message_id)
        )
        return result.scalar_one_or_none()

    async def get_messages_for_case(
        self, case_id: str, limit: int = 50
    ) -> list[CourtMessage]:
        """Get court messages for a case."""
        result = await self.db.execute(
            select(CourtMessage)
            .where(CourtMessage.case_id == case_id)
            .order_by(CourtMessage.sent_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def mark_read(
        self, message_id: str, reader_role: str
    ) -> Optional[CourtMessage]:
        """Mark a message as read by a parent."""
        message = await self.get_message(message_id)
        if not message:
            return None

        now = datetime.utcnow()
        if reader_role == "petitioner" and not message.petitioner_read_at:
            message.petitioner_read_at = now
        elif reader_role == "respondent" and not message.respondent_read_at:
            message.respondent_read_at = now

        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def get_unread_count(self, case_id: str, for_role: str) -> int:
        """Get count of unread messages for a parent."""
        if for_role == "petitioner":
            condition = and_(
                CourtMessage.case_id == case_id,
                CourtMessage.to_petitioner == True,
                CourtMessage.petitioner_read_at.is_(None),
            )
        else:
            condition = and_(
                CourtMessage.case_id == case_id,
                CourtMessage.to_respondent == True,
                CourtMessage.respondent_read_at.is_(None),
            )

        result = await self.db.execute(select(func.count()).where(condition))
        return result.scalar()


# =============================================================================
# Investigation Report Service
# =============================================================================

class ReportService:
    """Service for generating investigation reports."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_report(
        self, data: ReportRequest, generated_by: str, professional_name: str
    ) -> InvestigationReport:
        """Generate an investigation report."""
        # Generate report number
        report_number = f"RPT-{datetime.utcnow().strftime('%Y%m%d')}-{secrets.token_hex(2).upper()}"

        # Generate title if not provided
        title = data.title or f"{data.report_type.value.replace('_', ' ').title()} Report"

        # Calculate content hash (would include actual content in production)
        content_data = f"{data.case_id}:{data.date_range_start}:{data.date_range_end}:{data.sections_included}"
        content_hash = hashlib.sha256(content_data.encode()).hexdigest()

        # Generate watermark
        watermark_text = f"Generated for: {professional_name} - {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"

        # Generate verification URL
        verification_url = f"https://verify.commonground.family/{report_number}"

        # Get evidence counts (simplified for MVP)
        evidence_counts = await self._get_evidence_counts(
            data.case_id, data.date_range_start, data.date_range_end
        )

        report = InvestigationReport(
            id=str(uuid4()),
            case_id=data.case_id,
            generated_by=generated_by,
            report_number=report_number,
            report_type=data.report_type.value,
            title=title,
            date_range_start=data.date_range_start,
            date_range_end=data.date_range_end,
            sections_included=data.sections_included,
            content_hash=content_hash,
            watermark_text=watermark_text,
            verification_url=verification_url,
            evidence_counts=evidence_counts,
            purpose=data.purpose,
            is_permanent=data.is_permanent,
            expires_at=None if data.is_permanent else datetime.utcnow() + timedelta(days=30),
        )

        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def _get_evidence_counts(
        self, case_id: str, start_date: date, end_date: date
    ) -> dict:
        """Get counts of evidence items in date range."""
        counts = {}

        # Count messages
        msg_result = await self.db.execute(
            select(func.count()).where(
                and_(
                    Message.case_id == case_id,
                    func.date(Message.sent_at) >= start_date,
                    func.date(Message.sent_at) <= end_date,
                )
            )
        )
        counts["messages"] = msg_result.scalar() or 0

        # Count ARIA interventions
        flag_result = await self.db.execute(
            select(func.count()).where(
                and_(
                    MessageFlag.flagged_at >= datetime.combine(start_date, datetime.min.time()),
                    MessageFlag.flagged_at <= datetime.combine(end_date, datetime.max.time()),
                )
            )
        )
        counts["interventions"] = flag_result.scalar() or 0

        # Count schedule events
        event_result = await self.db.execute(
            select(func.count()).where(
                and_(
                    ScheduleEvent.case_id == case_id,
                    ScheduleEvent.start_time >= datetime.combine(start_date, datetime.min.time()),
                    ScheduleEvent.start_time <= datetime.combine(end_date, datetime.max.time()),
                )
            )
        )
        counts["exchanges"] = event_result.scalar() or 0

        return counts

    async def get_report(self, report_id: str) -> Optional[InvestigationReport]:
        """Get a report by ID."""
        result = await self.db.execute(
            select(InvestigationReport).where(InvestigationReport.id == report_id)
        )
        return result.scalar_one_or_none()

    async def get_report_by_number(self, report_number: str) -> Optional[InvestigationReport]:
        """Get a report by report number."""
        result = await self.db.execute(
            select(InvestigationReport).where(
                InvestigationReport.report_number == report_number
            )
        )
        return result.scalar_one_or_none()

    async def get_reports_for_case(
        self, case_id: str, limit: int = 20
    ) -> list[InvestigationReport]:
        """Get reports for a case."""
        result = await self.db.execute(
            select(InvestigationReport)
            .where(InvestigationReport.case_id == case_id)
            .order_by(InvestigationReport.generated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def record_download(self, report_id: str) -> Optional[InvestigationReport]:
        """Record a report download."""
        report = await self.get_report(report_id)
        if not report:
            return None

        report.download_count += 1
        report.last_downloaded_at = datetime.utcnow()
        if report.status == "generated":
            report.status = "downloaded"

        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def verify_report(self, report_number: str) -> Optional[dict]:
        """Verify a report's authenticity."""
        report = await self.get_report_by_number(report_number)
        if not report:
            return None

        # Get professional name
        prof_result = await self.db.execute(
            select(CourtProfessional).where(
                CourtProfessional.id == report.generated_by
            )
        )
        professional = prof_result.scalar_one_or_none()

        return {
            "report_number": report.report_number,
            "is_valid": True,
            "content_hash": report.content_hash,
            "generated_at": report.generated_at,
            "generated_by": professional.full_name if professional else "Unknown",
            "case_id": report.case_id,
            "verification_timestamp": datetime.utcnow(),
        }


# =============================================================================
# ARIA Court Query Service
# =============================================================================

class ARIACourtService:
    """Service for ARIA court queries (facts only, no recommendations)."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def query(self, case_id: str, query: str) -> dict:
        """
        Answer a court query about a case.

        Returns facts only - no recommendations, interpretations, or judgments.
        """
        query_lower = query.lower()
        response = ""
        data = {}
        sources = []

        # Pattern matching for common queries
        if "schedule" in query_lower or "custody" in query_lower:
            response, data, sources = await self._get_schedule_info(case_id)

        elif "exchange" in query_lower or "pickup" in query_lower or "dropoff" in query_lower:
            response, data, sources = await self._get_exchange_info(case_id)

        elif "missed" in query_lower or "no-show" in query_lower:
            response, data, sources = await self._get_missed_events(case_id)

        elif "court event" in query_lower or "hearing" in query_lower:
            response, data, sources = await self._get_court_events(case_id)

        elif "setting" in query_lower or "control" in query_lower or "locked" in query_lower:
            response, data, sources = await self._get_settings_info(case_id)

        elif "message" in query_lower or "communication" in query_lower:
            response, data, sources = await self._get_communication_stats(case_id)

        else:
            response = "I can provide factual information about schedules, exchanges, court events, settings, and communications. Please ask a specific question about one of these topics."

        return {
            "query": query,
            "response": response,
            "data": data,
            "sources": sources,
            "disclaimer": "This response contains factual information only. No recommendations or interpretations are provided.",
        }

    async def _get_schedule_info(self, case_id: str) -> tuple[str, dict, list]:
        """Get schedule information."""
        result = await self.db.execute(
            select(ScheduleEvent)
            .where(
                and_(
                    ScheduleEvent.case_id == case_id,
                    ScheduleEvent.start_time >= datetime.utcnow(),
                )
            )
            .order_by(ScheduleEvent.start_time)
            .limit(10)
        )
        events = result.scalars().all()

        if not events:
            return "No upcoming schedule events found.", {}, ["schedule_events"]

        response = f"There are {len(events)} upcoming schedule events."
        data = {
            "upcoming_count": len(events),
            "next_event": events[0].start_time.isoformat() if events else None,
        }
        return response, data, ["schedule_events"]

    async def _get_exchange_info(self, case_id: str) -> tuple[str, dict, list]:
        """Get exchange information."""
        # Get recent check-ins
        result = await self.db.execute(
            select(ExchangeCheckIn)
            .where(ExchangeCheckIn.case_id == case_id)
            .order_by(ExchangeCheckIn.scheduled_time.desc())
            .limit(20)
        )
        checkins = result.scalars().all()

        total = len(checkins)
        on_time = sum(1 for c in checkins if c.is_on_time)
        late = sum(1 for c in checkins if not c.is_on_time and c.actual_time)
        missed = sum(1 for c in checkins if not c.actual_time)

        response = f"In the last {total} exchanges: {on_time} on-time, {late} late, {missed} missed."
        data = {
            "total": total,
            "on_time": on_time,
            "late": late,
            "missed": missed,
            "on_time_rate": round(on_time / total * 100, 1) if total > 0 else 0,
        }
        return response, data, ["exchange_check_ins"]

    async def _get_missed_events(self, case_id: str) -> tuple[str, dict, list]:
        """Get missed event count."""
        # Check for missed court events
        result = await self.db.execute(
            select(CourtEvent)
            .where(
                and_(
                    CourtEvent.case_id == case_id,
                    CourtEvent.status == "completed",
                    or_(
                        CourtEvent.petitioner_attended == False,
                        CourtEvent.respondent_attended == False,
                    ),
                )
            )
        )
        missed_events = result.scalars().all()

        petitioner_missed = sum(1 for e in missed_events if e.petitioner_attended == False)
        respondent_missed = sum(1 for e in missed_events if e.respondent_attended == False)

        response = f"Court events with absences: Petitioner missed {petitioner_missed}, Respondent missed {respondent_missed}."
        data = {
            "petitioner_missed": petitioner_missed,
            "respondent_missed": respondent_missed,
        }
        return response, data, ["court_events"]

    async def _get_court_events(self, case_id: str) -> tuple[str, dict, list]:
        """Get court event information."""
        result = await self.db.execute(
            select(CourtEvent)
            .where(
                and_(
                    CourtEvent.case_id == case_id,
                    CourtEvent.event_date >= date.today(),
                )
            )
            .order_by(CourtEvent.event_date)
        )
        events = result.scalars().all()

        if not events:
            return "No upcoming court events.", {}, ["court_events"]

        next_event = events[0]
        response = f"There are {len(events)} upcoming court events. Next: {next_event.title} on {next_event.event_date}."
        data = {
            "upcoming_count": len(events),
            "next_event": {
                "title": next_event.title,
                "date": next_event.event_date.isoformat(),
                "type": next_event.event_type,
            },
        }
        return response, data, ["court_events"]

    async def _get_settings_info(self, case_id: str) -> tuple[str, dict, list]:
        """Get court settings information."""
        settings_service = CourtSettingsService(self.db)
        settings = await settings_service.get_settings(case_id)

        if not settings:
            return "No court-controlled settings are active for this case.", {}, ["court_case_settings"]

        active = settings.get_active_controls()
        if not active:
            return "Court settings exist but no controls are currently enabled.", {}, ["court_case_settings"]

        response = f"Court-controlled settings: {', '.join(active)}."
        data = {
            "active_controls": active,
            "investigation_mode": settings.investigation_mode,
        }
        return response, data, ["court_case_settings"]

    async def _get_communication_stats(self, case_id: str) -> tuple[str, dict, list]:
        """Get communication statistics."""
        # Count messages in last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        msg_result = await self.db.execute(
            select(func.count()).where(
                and_(
                    Message.case_id == case_id,
                    Message.sent_at >= thirty_days_ago,
                )
            )
        )
        message_count = msg_result.scalar() or 0

        # Count flagged messages
        flag_result = await self.db.execute(
            select(func.count()).where(
                and_(
                    Message.case_id == case_id,
                    Message.is_flagged == True,
                    Message.sent_at >= thirty_days_ago,
                )
            )
        )
        flagged_count = flag_result.scalar() or 0

        response = f"In the last 30 days: {message_count} messages sent, {flagged_count} flagged by ARIA."
        data = {
            "messages_30d": message_count,
            "flagged_30d": flagged_count,
            "flag_rate": round(flagged_count / message_count * 100, 1) if message_count > 0 else 0,
        }
        return response, data, ["messages", "message_flags"]

    async def get_suggested_queries(self) -> list[dict]:
        """Get suggested queries for court staff."""
        return [
            {
                "category": "Schedule",
                "queries": [
                    "What is the current custody schedule?",
                    "When was the last exchange?",
                    "How many exchanges in the last 90 days?",
                ],
            },
            {
                "category": "Compliance",
                "queries": [
                    "Have there been missed pickups?",
                    "What is the on-time rate for exchanges?",
                    "How many court events had no-shows?",
                ],
            },
            {
                "category": "Settings",
                "queries": [
                    "What settings are court-locked?",
                    "Is investigation mode enabled?",
                    "Is GPS required for check-ins?",
                ],
            },
            {
                "category": "Communication",
                "queries": [
                    "How many messages in the last 30 days?",
                    "What is the ARIA flag rate?",
                    "How many court messages are unread?",
                ],
            },
        ]

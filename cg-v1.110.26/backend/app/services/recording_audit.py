"""
Recording Audit Service - Court-admissible chain of custody tracking.

Provides:
- Immutable access logging for all recording interactions
- Chain of custody verification with cryptographic hashing
- Legal hold management
- Integrity verification
- Export tracking for court submissions
"""

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.recording import (
    Recording,
    RecordingAccessLog,
    RecordingExportLog,
    RecordingAccessAction,
    RecordingStatus,
)

logger = logging.getLogger(__name__)


class RecordingAuditService:
    """Service for tracking recording access and maintaining chain of custody."""

    # =========================================================================
    # Access Logging
    # =========================================================================

    async def log_access(
        self,
        db: AsyncSession,
        recording_id: str,
        user_id: str,
        action: RecordingAccessAction,
        user_email: Optional[str] = None,
        user_role: str = "parent",
        professional_id: Optional[str] = None,
        action_detail: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_type: Optional[str] = None,
        request_id: Optional[str] = None,
        session_id: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        export_id: Optional[str] = None,
        case_number: Optional[str] = None,
        court_order_reference: Optional[str] = None,
    ) -> RecordingAccessLog:
        """
        Log an access event to a recording.

        This creates an immutable audit trail entry with chain linking.

        Args:
            db: Database session
            recording_id: Recording being accessed
            user_id: User who accessed
            action: Type of access action
            user_email: User's email
            user_role: Role (parent, professional, court)
            professional_id: Professional ID if applicable
            action_detail: Additional detail about the action
            ip_address: Client IP
            user_agent: Client user agent
            device_type: Device type (mobile, desktop, etc.)
            request_id: HTTP request ID for correlation
            session_id: User session ID
            success: Whether access was successful
            error_message: Error if access failed
            export_id: Export ID if this is part of an export
            case_number: Court case number if applicable
            court_order_reference: Court order authorizing access

        Returns:
            Created access log entry
        """
        # Get recording for family_file_id and current hash
        recording = await db.get(Recording, recording_id)
        if not recording:
            raise ValueError(f"Recording {recording_id} not found")

        # Get previous log entry for chain linking
        prev_log = await self._get_latest_access_log(db, recording_id)
        previous_hash = prev_log.content_hash if prev_log else None
        sequence_number = (prev_log.sequence_number + 1) if prev_log else 1

        # Build log data for hashing
        log_data = {
            "recording_id": recording_id,
            "user_id": user_id,
            "action": action.value,
            "accessed_at": datetime.utcnow().isoformat(),
            "previous_hash": previous_hash,
            "sequence_number": sequence_number,
        }
        content_hash = RecordingAccessLog.compute_content_hash(log_data)

        # Create the log entry
        access_log = RecordingAccessLog(
            recording_id=recording_id,
            family_file_id=recording.family_file_id,
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            professional_id=professional_id,
            action=action.value,
            action_detail=action_detail,
            ip_address=ip_address,
            user_agent=user_agent,
            device_type=device_type,
            request_id=request_id,
            session_id=session_id,
            success=success,
            error_message=error_message,
            file_hash_at_access=recording.file_hash,
            integrity_verified=recording.integrity_status == "verified",
            content_hash=content_hash,
            previous_log_hash=previous_hash,
            sequence_number=sequence_number,
            export_id=export_id,
            case_number=case_number,
            court_order_reference=court_order_reference,
        )

        db.add(access_log)
        await db.commit()
        await db.refresh(access_log)

        logger.info(
            f"Recording access logged: {action.value} on {recording_id} "
            f"by user {user_id} (seq: {sequence_number})"
        )

        return access_log

    async def _get_latest_access_log(
        self,
        db: AsyncSession,
        recording_id: str
    ) -> Optional[RecordingAccessLog]:
        """Get the most recent access log for chain linking."""
        result = await db.execute(
            select(RecordingAccessLog)
            .where(RecordingAccessLog.recording_id == recording_id)
            .order_by(desc(RecordingAccessLog.sequence_number))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_access_history(
        self,
        db: AsyncSession,
        recording_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[RecordingAccessLog]:
        """Get access history for a recording."""
        result = await db.execute(
            select(RecordingAccessLog)
            .where(RecordingAccessLog.recording_id == recording_id)
            .order_by(desc(RecordingAccessLog.accessed_at))
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_user_access_history(
        self,
        db: AsyncSession,
        user_id: str,
        family_file_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[RecordingAccessLog]:
        """Get all recording access by a specific user."""
        query = select(RecordingAccessLog).where(
            RecordingAccessLog.user_id == user_id
        )

        if family_file_id:
            query = query.where(RecordingAccessLog.family_file_id == family_file_id)

        result = await db.execute(
            query.order_by(desc(RecordingAccessLog.accessed_at))
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    # =========================================================================
    # Chain of Custody Verification
    # =========================================================================

    async def verify_access_chain(
        self,
        db: AsyncSession,
        recording_id: str
    ) -> Dict[str, Any]:
        """
        Verify the chain of custody for a recording.

        Validates that the chain of access logs is intact and unmodified.

        Returns:
            Dict with verification status and details
        """
        logs = await db.execute(
            select(RecordingAccessLog)
            .where(RecordingAccessLog.recording_id == recording_id)
            .order_by(RecordingAccessLog.sequence_number)
        )
        access_logs = list(logs.scalars().all())

        if not access_logs:
            return {
                "verified": True,
                "status": "no_access_recorded",
                "message": "No access has been logged for this recording",
                "total_entries": 0,
            }

        # Verify each link in the chain
        broken_links = []
        expected_sequence = 1
        previous_hash = None

        for log in access_logs:
            # Check sequence number
            if log.sequence_number != expected_sequence:
                broken_links.append({
                    "type": "sequence_gap",
                    "expected": expected_sequence,
                    "actual": log.sequence_number,
                    "log_id": log.id,
                })

            # Check previous hash link
            if log.previous_log_hash != previous_hash:
                broken_links.append({
                    "type": "hash_mismatch",
                    "expected_previous": previous_hash,
                    "actual_previous": log.previous_log_hash,
                    "log_id": log.id,
                    "sequence": log.sequence_number,
                })

            # Recompute and verify content hash
            log_data = {
                "recording_id": log.recording_id,
                "user_id": log.user_id,
                "action": log.action,
                "accessed_at": log.accessed_at.isoformat(),
                "previous_hash": log.previous_log_hash,
                "sequence_number": log.sequence_number,
            }
            computed_hash = RecordingAccessLog.compute_content_hash(log_data)

            if computed_hash != log.content_hash:
                broken_links.append({
                    "type": "content_hash_invalid",
                    "log_id": log.id,
                    "sequence": log.sequence_number,
                    "message": "Log entry may have been tampered with",
                })

            previous_hash = log.content_hash
            expected_sequence += 1

        return {
            "verified": len(broken_links) == 0,
            "status": "verified" if len(broken_links) == 0 else "chain_broken",
            "total_entries": len(access_logs),
            "first_access": access_logs[0].accessed_at.isoformat() if access_logs else None,
            "last_access": access_logs[-1].accessed_at.isoformat() if access_logs else None,
            "broken_links": broken_links,
            "verification_timestamp": datetime.utcnow().isoformat(),
        }

    # =========================================================================
    # Legal Hold Management
    # =========================================================================

    async def set_legal_hold(
        self,
        db: AsyncSession,
        recording_id: str,
        user_id: str,
        reason: str,
        case_number: Optional[str] = None,
        retain_years: int = 10,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        court_order_reference: Optional[str] = None,
    ) -> Recording:
        """
        Place a recording under legal hold.

        Legal hold prevents deletion and extends retention.

        Args:
            db: Database session
            recording_id: Recording to protect
            user_id: User setting the hold
            reason: Reason for legal hold
            case_number: Court case number
            retain_years: Years to retain (default 10)
            user_email: User's email
            ip_address: Client IP
            court_order_reference: Court order reference

        Returns:
            Updated recording
        """
        recording = await db.get(Recording, recording_id)
        if not recording:
            raise ValueError(f"Recording {recording_id} not found")

        if recording.is_protected:
            raise ValueError("Recording is already under legal hold")

        # Set the legal hold
        recording.set_legal_hold(
            user_id=user_id,
            reason=reason,
            case_number=case_number,
            retain_years=retain_years
        )

        await db.commit()
        await db.refresh(recording)

        # Log the legal hold action
        await self.log_access(
            db=db,
            recording_id=recording_id,
            user_id=user_id,
            action=RecordingAccessAction.LEGAL_HOLD_SET,
            user_email=user_email,
            user_role="parent",  # Could be professional/court
            action_detail=f"Legal hold set: {reason}",
            ip_address=ip_address,
            case_number=case_number,
            court_order_reference=court_order_reference,
        )

        logger.info(
            f"Legal hold set on recording {recording_id} by {user_id}: {reason}"
        )

        return recording

    async def release_legal_hold(
        self,
        db: AsyncSession,
        recording_id: str,
        user_id: str,
        reason: str,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Recording:
        """
        Release legal hold on a recording.

        Args:
            db: Database session
            recording_id: Recording to release
            user_id: User releasing the hold
            reason: Reason for release
            user_email: User's email
            ip_address: Client IP

        Returns:
            Updated recording
        """
        recording = await db.get(Recording, recording_id)
        if not recording:
            raise ValueError(f"Recording {recording_id} not found")

        if not recording.is_protected:
            raise ValueError("Recording is not under legal hold")

        recording.release_legal_hold()

        await db.commit()
        await db.refresh(recording)

        # Log the release action
        await self.log_access(
            db=db,
            recording_id=recording_id,
            user_id=user_id,
            action=RecordingAccessAction.LEGAL_HOLD_RELEASE,
            user_email=user_email,
            user_role="parent",
            action_detail=f"Legal hold released: {reason}",
            ip_address=ip_address,
        )

        logger.info(
            f"Legal hold released on recording {recording_id} by {user_id}: {reason}"
        )

        return recording

    async def get_recordings_under_hold(
        self,
        db: AsyncSession,
        family_file_id: Optional[str] = None,
        case_number: Optional[str] = None
    ) -> List[Recording]:
        """Get all recordings currently under legal hold."""
        query = select(Recording).where(Recording.is_protected == True)

        if family_file_id:
            query = query.where(Recording.family_file_id == family_file_id)

        if case_number:
            query = query.where(Recording.legal_hold_case_number == case_number)

        result = await db.execute(query.order_by(Recording.legal_hold_set_at))
        return list(result.scalars().all())

    # =========================================================================
    # Integrity Verification
    # =========================================================================

    async def verify_recording_integrity(
        self,
        db: AsyncSession,
        recording_id: str,
        computed_hash: str,
        user_id: str,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Verify integrity of a recording file.

        Compares the provided hash against the stored hash.

        Args:
            db: Database session
            recording_id: Recording to verify
            computed_hash: SHA-256 hash computed from the file
            user_id: User performing verification
            user_email: User's email
            ip_address: Client IP

        Returns:
            Verification result dict
        """
        recording = await db.get(Recording, recording_id)
        if not recording:
            raise ValueError(f"Recording {recording_id} not found")

        is_valid = recording.verify_integrity(computed_hash)
        await db.commit()

        # Log the verification attempt
        await self.log_access(
            db=db,
            recording_id=recording_id,
            user_id=user_id,
            action=RecordingAccessAction.VERIFY_INTEGRITY,
            user_email=user_email,
            user_role="parent",
            action_detail=f"Integrity verification: {'passed' if is_valid else 'failed'}",
            ip_address=ip_address,
            success=is_valid,
            error_message=None if is_valid else "Hash mismatch - file may be corrupted or tampered",
        )

        return {
            "verified": is_valid,
            "status": "verified" if is_valid else "failed",
            "recording_id": recording_id,
            "stored_hash": recording.file_hash,
            "computed_hash": computed_hash,
            "hash_algorithm": recording.file_hash_algorithm,
            "verification_timestamp": recording.integrity_verified_at.isoformat() if recording.integrity_verified_at else None,
            "message": "File integrity verified" if is_valid else "File integrity check failed - hash mismatch",
        }

    # =========================================================================
    # Export Tracking
    # =========================================================================

    async def log_export(
        self,
        db: AsyncSession,
        recording_id: str,
        export_id: str,
        export_type: str,
        requested_by_user_id: str,
        requested_by_role: str,
        exported_file_hash: str,
        exported_file_size: int,
        includes_transcription: bool = False,
        transcription_hash: Optional[str] = None,
        professional_id: Optional[str] = None,
        case_number: Optional[str] = None,
        court_name: Optional[str] = None,
        court_order_reference: Optional[str] = None,
        discovery_request_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> RecordingExportLog:
        """
        Log a recording export for court or legal purposes.

        Creates a chain of custody certificate for the export.

        Args:
            db: Database session
            recording_id: Recording being exported
            export_id: Export package ID
            export_type: Type of export (court_package, investigation, discovery)
            requested_by_user_id: User who requested export
            requested_by_role: Role of requester
            exported_file_hash: SHA-256 of exported file
            exported_file_size: Size of exported file
            includes_transcription: Whether transcription is included
            transcription_hash: Hash of transcription if included
            professional_id: Professional ID if applicable
            case_number: Court case number
            court_name: Name of court
            court_order_reference: Court order reference
            discovery_request_id: Discovery request ID
            ip_address: Client IP
            request_id: HTTP request ID

        Returns:
            Created export log with certificate number
        """
        recording = await db.get(Recording, recording_id)
        if not recording:
            raise ValueError(f"Recording {recording_id} not found")

        # Generate certificate number
        timestamp = datetime.utcnow()
        certificate_number = f"COC-{timestamp.strftime('%Y%m%d%H%M%S')}-{recording_id[:8].upper()}"

        # Build certificate content for hashing
        certificate_data = {
            "certificate_number": certificate_number,
            "recording_id": recording_id,
            "export_id": export_id,
            "original_file_hash": recording.file_hash,
            "exported_file_hash": exported_file_hash,
            "exported_at": timestamp.isoformat(),
            "requested_by": requested_by_user_id,
            "case_number": case_number,
        }
        certificate_hash = hashlib.sha256(
            str(certificate_data).encode()
        ).hexdigest()

        export_log = RecordingExportLog(
            recording_id=recording_id,
            export_id=export_id,
            export_type=export_type,
            requested_by_user_id=requested_by_user_id,
            requested_by_role=requested_by_role,
            professional_id=professional_id,
            case_number=case_number,
            court_name=court_name,
            court_order_reference=court_order_reference,
            discovery_request_id=discovery_request_id,
            exported_format=recording.format or "mp4",
            exported_file_hash=exported_file_hash,
            exported_file_size=exported_file_size,
            includes_transcription=includes_transcription,
            transcription_hash=transcription_hash,
            exported_at=timestamp,
            export_started_at=timestamp,  # Should be passed in for accuracy
            export_completed_at=timestamp,
            certificate_number=certificate_number,
            certificate_hash=certificate_hash,
            ip_address=ip_address,
            request_id=request_id,
        )

        db.add(export_log)
        await db.commit()
        await db.refresh(export_log)

        # Also log in access log
        await self.log_access(
            db=db,
            recording_id=recording_id,
            user_id=requested_by_user_id,
            action=RecordingAccessAction.EXPORT,
            user_role=requested_by_role,
            professional_id=professional_id,
            action_detail=f"Exported for {export_type}. Certificate: {certificate_number}",
            ip_address=ip_address,
            request_id=request_id,
            export_id=export_id,
            case_number=case_number,
            court_order_reference=court_order_reference,
        )

        logger.info(
            f"Recording export logged: {recording_id} for {export_type}. "
            f"Certificate: {certificate_number}"
        )

        return export_log

    async def get_export_certificate(
        self,
        db: AsyncSession,
        certificate_number: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get export certificate details.

        Returns a formatted certificate suitable for court submission.
        """
        result = await db.execute(
            select(RecordingExportLog)
            .where(RecordingExportLog.certificate_number == certificate_number)
        )
        export_log = result.scalar_one_or_none()

        if not export_log:
            return None

        recording = await db.get(Recording, export_log.recording_id)

        # Verify access chain
        chain_verification = await self.verify_access_chain(db, export_log.recording_id)

        return {
            "certificate_number": export_log.certificate_number,
            "certificate_hash": export_log.certificate_hash,
            "issued_at": export_log.exported_at.isoformat(),
            "recording": {
                "id": export_log.recording_id,
                "original_hash": recording.file_hash if recording else None,
                "hash_algorithm": recording.file_hash_algorithm if recording else None,
                "duration_seconds": recording.duration_seconds if recording else None,
                "recorded_at": recording.started_at.isoformat() if recording and recording.started_at else None,
            },
            "export": {
                "type": export_log.export_type,
                "file_hash": export_log.exported_file_hash,
                "file_size": export_log.exported_file_size,
                "format": export_log.exported_format,
                "includes_transcription": export_log.includes_transcription,
                "transcription_hash": export_log.transcription_hash,
            },
            "legal_context": {
                "case_number": export_log.case_number,
                "court_name": export_log.court_name,
                "court_order_reference": export_log.court_order_reference,
                "discovery_request_id": export_log.discovery_request_id,
            },
            "requester": {
                "user_id": export_log.requested_by_user_id,
                "role": export_log.requested_by_role,
                "professional_id": export_log.professional_id,
            },
            "chain_of_custody": chain_verification,
            "certification_statement": (
                f"This certifies that the recording file with SHA-256 hash "
                f"{export_log.exported_file_hash} is a true and complete copy of the "
                f"original recording stored in the CommonGround system. The chain of "
                f"custody has been {'verified intact' if chain_verification['verified'] else 'flagged for review'}. "
                f"This certificate was generated on {export_log.exported_at.isoformat()} UTC."
            ),
        }

    # =========================================================================
    # Compliance Reporting
    # =========================================================================

    async def generate_access_report(
        self,
        db: AsyncSession,
        recording_id: str,
        include_chain_verification: bool = True
    ) -> Dict[str, Any]:
        """
        Generate a compliance report for a recording.

        Suitable for court submission as evidence of chain of custody.
        """
        recording = await db.get(Recording, recording_id)
        if not recording:
            raise ValueError(f"Recording {recording_id} not found")

        # Get all access logs
        access_logs = await self.get_access_history(db, recording_id, limit=1000)

        # Get export logs
        export_result = await db.execute(
            select(RecordingExportLog)
            .where(RecordingExportLog.recording_id == recording_id)
            .order_by(RecordingExportLog.exported_at)
        )
        export_logs = list(export_result.scalars().all())

        # Build access summary
        access_by_user = {}
        access_by_action = {}
        for log in access_logs:
            # By user
            if log.user_id not in access_by_user:
                access_by_user[log.user_id] = {
                    "email": log.user_email,
                    "role": log.user_role,
                    "access_count": 0,
                    "first_access": log.accessed_at.isoformat(),
                    "last_access": log.accessed_at.isoformat(),
                }
            access_by_user[log.user_id]["access_count"] += 1
            access_by_user[log.user_id]["last_access"] = log.accessed_at.isoformat()

            # By action
            if log.action not in access_by_action:
                access_by_action[log.action] = 0
            access_by_action[log.action] += 1

        report = {
            "report_type": "recording_access_compliance",
            "generated_at": datetime.utcnow().isoformat(),
            "recording": {
                "id": recording.id,
                "family_file_id": recording.family_file_id,
                "type": recording.recording_type,
                "status": recording.status,
                "duration_seconds": recording.duration_seconds,
                "file_size_bytes": recording.file_size_bytes,
                "format": recording.format,
                "recorded_at": recording.started_at.isoformat() if recording.started_at else None,
                "file_hash": recording.file_hash,
                "hash_algorithm": recording.file_hash_algorithm,
                "integrity_status": recording.integrity_status,
                "integrity_verified_at": recording.integrity_verified_at.isoformat() if recording.integrity_verified_at else None,
            },
            "legal_hold": {
                "is_protected": recording.is_protected,
                "set_by": recording.legal_hold_set_by,
                "set_at": recording.legal_hold_set_at.isoformat() if recording.legal_hold_set_at else None,
                "reason": recording.legal_hold_reason,
                "case_number": recording.legal_hold_case_number,
                "retain_until": recording.retain_until.isoformat() if recording.retain_until else None,
            },
            "access_summary": {
                "total_access_events": len(access_logs),
                "unique_users": len(access_by_user),
                "by_user": access_by_user,
                "by_action": access_by_action,
            },
            "export_summary": {
                "total_exports": len(export_logs),
                "exports": [
                    {
                        "certificate_number": e.certificate_number,
                        "type": e.export_type,
                        "exported_at": e.exported_at.isoformat(),
                        "case_number": e.case_number,
                        "file_hash": e.exported_file_hash,
                    }
                    for e in export_logs
                ],
            },
            "access_timeline": [
                {
                    "timestamp": log.accessed_at.isoformat(),
                    "user_id": log.user_id,
                    "user_role": log.user_role,
                    "action": log.action,
                    "success": log.success,
                    "ip_address": log.ip_address,
                    "sequence": log.sequence_number,
                }
                for log in access_logs[:100]  # Last 100 for report
            ],
        }

        if include_chain_verification:
            report["chain_verification"] = await self.verify_access_chain(db, recording_id)

        return report


# Global service instance
recording_audit_service = RecordingAuditService()

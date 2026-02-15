"""
Field Lock Service.

Manages court-order-locked fields that prevent parent editing.
Fields display: 🔒 Locked by Case-[case-number]

Lock lifecycle:
1. OCR document approved → batch-create locks for all populated fields
2. Parents can VIEW but cannot EDIT locked content
3. Professionals can unlock specific fields (requires confirmation + reason)
4. Unlock action logged in case timeline
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.professional import (
    FieldLock,
    OCRDocument,
    ProfessionalAccessLog,
)


class FieldLockService:
    """Service for managing court-order field locks."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # Lock Creation
    # =========================================================================

    async def create_locks_from_ocr(
        self,
        *,
        ocr_document_id: str,
        family_file_id: str,
        agreement_id: str,
        professional_id: str,
        case_number: str,
        extracted_data: dict,
    ) -> list[FieldLock]:
        """
        Batch-create field locks for all populated fields from an approved OCR.

        Called after OCR extraction is approved and an agreement is created.
        Creates one FieldLock per non-null field in the extracted data.

        Args:
            ocr_document_id: The approved OCR document
            family_file_id: The case
            agreement_id: The newly created agreement
            professional_id: The approving professional
            case_number: For display: "🔒 Locked by Case-[case_number]"
            extracted_data: The final extracted data (with corrections applied)
        """
        locks = []
        now = datetime.utcnow()

        def _flatten_fields(data: dict, prefix: str = "") -> list[str]:
            """Recursively flatten nested dict keys into JSONPath-style paths."""
            paths = []
            for key, value in data.items():
                path = f"{prefix}.{key}" if prefix else key
                if isinstance(value, dict):
                    paths.extend(_flatten_fields(value, path))
                elif value is not None and value != "" and value != []:
                    paths.append(path)
            return paths

        field_paths = _flatten_fields(extracted_data)

        for field_path in field_paths:
            lock = FieldLock(
                id=str(uuid4()),
                family_file_id=family_file_id,
                agreement_id=agreement_id,
                ocr_document_id=ocr_document_id,
                locked_by_professional_id=professional_id,
                field_path=field_path,
                case_number=case_number,
                locked_at=now,
                is_locked=True,
            )
            self.db.add(lock)
            locks.append(lock)

        await self.db.flush()

        # Log the lock creation
        await self._log_action(
            professional_id=professional_id,
            family_file_id=family_file_id,
            action="create_field_locks",
            resource_type="field_lock",
            details={
                "agreement_id": agreement_id,
                "case_number": case_number,
                "locked_fields_count": len(locks),
                "locked_fields": field_paths[:20],  # Cap log detail
            },
        )

        return locks

    async def create_single_lock(
        self,
        *,
        family_file_id: str,
        agreement_id: str,
        professional_id: str,
        field_path: str,
        case_number: str,
        ocr_document_id: Optional[str] = None,
    ) -> FieldLock:
        """Create a single field lock (for manual locking by professionals)."""
        lock = FieldLock(
            id=str(uuid4()),
            family_file_id=family_file_id,
            agreement_id=agreement_id,
            ocr_document_id=ocr_document_id,
            locked_by_professional_id=professional_id,
            field_path=field_path,
            case_number=case_number,
            locked_at=datetime.utcnow(),
            is_locked=True,
        )
        self.db.add(lock)
        await self.db.flush()
        return lock

    # =========================================================================
    # Lock Queries
    # =========================================================================

    async def get_locks_for_case(
        self,
        family_file_id: str,
        active_only: bool = True,
    ) -> list[FieldLock]:
        """
        List all field locks for a family file.

        Args:
            family_file_id: The case
            active_only: If True, only return currently locked fields
        """
        query = select(FieldLock).where(
            FieldLock.family_file_id == family_file_id
        )
        if active_only:
            query = query.where(FieldLock.is_locked == True)

        query = query.order_by(FieldLock.locked_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_locks_for_agreement(
        self,
        agreement_id: str,
        active_only: bool = True,
    ) -> list[FieldLock]:
        """List all field locks for a specific agreement."""
        query = select(FieldLock).where(
            FieldLock.agreement_id == agreement_id
        )
        if active_only:
            query = query.where(FieldLock.is_locked == True)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def check_field_locked(
        self,
        agreement_id: str,
        field_path: str,
    ) -> Optional[FieldLock]:
        """
        Check if a specific field is locked for a given agreement.

        Returns the FieldLock if locked, None if unlocked or no lock exists.
        Used by agreement edit endpoints to enforce lock restrictions.
        """
        result = await self.db.execute(
            select(FieldLock).where(
                and_(
                    FieldLock.agreement_id == agreement_id,
                    FieldLock.field_path == field_path,
                    FieldLock.is_locked == True,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_locked_field_paths(
        self,
        agreement_id: str,
    ) -> list[str]:
        """
        Get a list of all currently locked field paths for an agreement.

        Efficient query for bulk checking (e.g., form rendering).
        """
        result = await self.db.execute(
            select(FieldLock.field_path).where(
                and_(
                    FieldLock.agreement_id == agreement_id,
                    FieldLock.is_locked == True,
                )
            )
        )
        return [row[0] for row in result.all()]

    # =========================================================================
    # Unlock
    # =========================================================================

    async def unlock_field(
        self,
        lock_id: str,
        professional_id: str,
        reason: str,
    ) -> FieldLock:
        """
        Unlock a specific field.

        Per spec:
        - Requires confirmation (handled by frontend)
        - Reason is required
        - Action is logged in case timeline
        - Unlocked fields remain unlocked until new court order

        Args:
            lock_id: The FieldLock ID
            professional_id: Who is unlocking
            reason: Required reason for unlocking
        """
        result = await self.db.execute(
            select(FieldLock).where(FieldLock.id == lock_id)
        )
        lock = result.scalar_one_or_none()

        if not lock:
            raise ValueError(f"Field lock {lock_id} not found")

        if not lock.is_locked:
            raise ValueError(f"Field '{lock.field_path}' is already unlocked")

        lock.is_locked = False
        lock.unlocked_at = datetime.utcnow()
        lock.unlocked_by_id = professional_id
        lock.unlock_reason = reason

        await self.db.flush()

        # Log the unlock action (per spec: logged in case timeline)
        await self._log_action(
            professional_id=professional_id,
            family_file_id=lock.family_file_id,
            action="unlock_field",
            resource_type="field_lock",
            resource_id=lock.id,
            details={
                "field_path": lock.field_path,
                "case_number": lock.case_number,
                "reason": reason,
            },
        )

        return lock

    async def bulk_unlock(
        self,
        agreement_id: str,
        professional_id: str,
        reason: str,
    ) -> int:
        """
        Unlock ALL fields for an agreement (e.g., when a new court order supersedes).

        Returns the count of unlocked fields.
        """
        locks = await self.get_locks_for_agreement(agreement_id, active_only=True)
        now = datetime.utcnow()
        count = 0

        for lock in locks:
            lock.is_locked = False
            lock.unlocked_at = now
            lock.unlocked_by_id = professional_id
            lock.unlock_reason = reason
            count += 1

        if count > 0:
            await self.db.flush()

            # Log bulk unlock
            family_file_id = locks[0].family_file_id if locks else None
            if family_file_id:
                await self._log_action(
                    professional_id=professional_id,
                    family_file_id=family_file_id,
                    action="bulk_unlock_fields",
                    resource_type="field_lock",
                    details={
                        "agreement_id": agreement_id,
                        "unlocked_count": count,
                        "reason": reason,
                    },
                )

        return count

    # =========================================================================
    # Internal helpers
    # =========================================================================

    async def _log_action(
        self,
        professional_id: str,
        family_file_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> None:
        """Log a professional access action."""
        log = ProfessionalAccessLog(
            id=str(uuid4()),
            professional_id=professional_id,
            family_file_id=family_file_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            logged_at=datetime.utcnow(),
        )
        self.db.add(log)

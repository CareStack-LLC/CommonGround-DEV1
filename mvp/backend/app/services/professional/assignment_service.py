"""
Case assignment service layer.

Business logic for managing professional case assignments,
including listing, filtering, and accessing case data.
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import (
    ProfessionalProfile,
    CaseAssignment,
    ProfessionalAccessLog,
    Firm,
    FirmMembership,
    MembershipStatus,
    AssignmentStatus,
    AssignmentRole,
)
from app.models.family_file import FamilyFile
from app.models.user import User
from app.schemas.professional import (
    CaseAssignmentCreate,
    CaseAssignmentUpdate,
)


# =============================================================================
# Case Assignment Service
# =============================================================================

class CaseAssignmentService:
    """Service for managing professional case assignments."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # Assignment CRUD
    # -------------------------------------------------------------------------

    async def create_assignment(
        self,
        professional_id: str,
        family_file_id: str,
        data: CaseAssignmentCreate,
        assigned_by: Optional[str] = None,
    ) -> CaseAssignment:
        """
        Create a new case assignment.

        This is typically called after an access request is approved.
        """
        # Check for existing assignment
        existing = await self.get_assignment_for_professional(
            professional_id, family_file_id
        )
        if existing:
            if existing.status == AssignmentStatus.ACTIVE.value:
                raise ValueError("Professional already has an active assignment to this case")
            # Reactivate existing assignment
            existing.status = AssignmentStatus.ACTIVE.value
            existing.access_scopes = data.access_scopes
            existing.assignment_role = data.assignment_role.value
            existing.representing = data.representing
            existing.can_control_aria = data.can_control_aria
            existing.can_message_client = data.can_message_client
            existing.assigned_at = datetime.utcnow()
            existing.assigned_by = assigned_by
            existing.completed_at = None
            existing.updated_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        # Get professional's firm if applicable
        firm_id = await self._get_professional_primary_firm(professional_id)

        assignment = CaseAssignment(
            id=str(uuid4()),
            professional_id=professional_id,
            firm_id=firm_id,
            family_file_id=family_file_id,
            assignment_role=data.assignment_role.value,
            representing=data.representing,
            access_scopes=data.access_scopes,
            can_control_aria=data.can_control_aria,
            can_message_client=data.can_message_client,
            status=AssignmentStatus.ACTIVE.value,
            assigned_at=datetime.utcnow(),
            assigned_by=assigned_by,
            internal_notes=data.internal_notes,
        )

        self.db.add(assignment)
        await self.db.commit()
        await self.db.refresh(assignment)

        return assignment

    async def get_assignment(self, assignment_id: str) -> Optional[CaseAssignment]:
        """Get an assignment by ID."""
        result = await self.db.execute(
            select(CaseAssignment)
            .options(
                selectinload(CaseAssignment.professional),
                selectinload(CaseAssignment.family_file),
                selectinload(CaseAssignment.firm),
            )
            .where(CaseAssignment.id == assignment_id)
        )
        return result.scalar_one_or_none()

    async def get_assignment_for_professional(
        self,
        professional_id: str,
        family_file_id: str,
    ) -> Optional[CaseAssignment]:
        """Get a professional's assignment to a specific case."""
        result = await self.db.execute(
            select(CaseAssignment)
            .options(
                selectinload(CaseAssignment.family_file),
                selectinload(CaseAssignment.firm),
            )
            .where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.family_file_id == family_file_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def update_assignment(
        self,
        assignment_id: str,
        data: CaseAssignmentUpdate,
    ) -> Optional[CaseAssignment]:
        """Update an assignment."""
        assignment = await self.get_assignment(assignment_id)
        if not assignment:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key == "assignment_role" and value:
                value = value.value
            if key == "status" and value:
                value = value.value
            setattr(assignment, key, value)

        assignment.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(assignment)

        return assignment

    async def withdraw_assignment(
        self,
        assignment_id: str,
        reason: Optional[str] = None,
    ) -> Optional[CaseAssignment]:
        """Withdraw from a case assignment."""
        assignment = await self.get_assignment(assignment_id)
        if not assignment:
            return None

        assignment.status = AssignmentStatus.WITHDRAWN.value
        assignment.completed_at = datetime.utcnow()
        assignment.updated_at = datetime.utcnow()
        if reason:
            assignment.internal_notes = f"{assignment.internal_notes or ''}\nWithdrawal reason: {reason}".strip()

        await self.db.commit()
        await self.db.refresh(assignment)

        return assignment

    async def complete_assignment(
        self,
        assignment_id: str,
        notes: Optional[str] = None,
    ) -> Optional[CaseAssignment]:
        """Mark an assignment as completed."""
        assignment = await self.get_assignment(assignment_id)
        if not assignment:
            return None

        assignment.status = AssignmentStatus.COMPLETED.value
        assignment.completed_at = datetime.utcnow()
        assignment.updated_at = datetime.utcnow()
        if notes:
            assignment.internal_notes = f"{assignment.internal_notes or ''}\n{notes}".strip()

        await self.db.commit()
        await self.db.refresh(assignment)

        return assignment

    # -------------------------------------------------------------------------
    # List Assignments
    # -------------------------------------------------------------------------

    async def list_assignments_for_professional(
        self,
        professional_id: str,
        status: Optional[AssignmentStatus] = None,
        firm_id: Optional[str] = None,
        include_inactive: bool = False,
    ) -> list[CaseAssignment]:
        """List all case assignments for a professional."""
        query = (
            select(CaseAssignment)
            .options(
                selectinload(CaseAssignment.family_file),
                selectinload(CaseAssignment.firm),
            )
            .where(CaseAssignment.professional_id == professional_id)
        )

        if status:
            query = query.where(CaseAssignment.status == status.value)
        elif not include_inactive:
            query = query.where(CaseAssignment.status == AssignmentStatus.ACTIVE.value)

        if firm_id:
            query = query.where(CaseAssignment.firm_id == firm_id)

        query = query.order_by(CaseAssignment.assigned_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_assignments_for_family_file(
        self,
        family_file_id: str,
        active_only: bool = True,
    ) -> list[CaseAssignment]:
        """List all professional assignments for a family file."""
        query = (
            select(CaseAssignment)
            .options(
                selectinload(CaseAssignment.professional)
                .selectinload(ProfessionalProfile.user),
                selectinload(CaseAssignment.firm),
            )
            .where(CaseAssignment.family_file_id == family_file_id)
        )

        if active_only:
            query = query.where(CaseAssignment.status == AssignmentStatus.ACTIVE.value)

        query = query.order_by(CaseAssignment.assigned_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_assignments_for_firm(
        self,
        firm_id: str,
        status: Optional[AssignmentStatus] = None,
    ) -> list[CaseAssignment]:
        """List all case assignments for a firm."""
        query = (
            select(CaseAssignment)
            .options(
                selectinload(CaseAssignment.professional)
                .selectinload(ProfessionalProfile.user),
                selectinload(CaseAssignment.family_file),
            )
            .where(CaseAssignment.firm_id == firm_id)
        )

        if status:
            query = query.where(CaseAssignment.status == status.value)
        else:
            query = query.where(CaseAssignment.status == AssignmentStatus.ACTIVE.value)

        query = query.order_by(CaseAssignment.assigned_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    # -------------------------------------------------------------------------
    # Access Verification
    # -------------------------------------------------------------------------

    async def can_access_case(
        self,
        professional_id: str,
        family_file_id: str,
    ) -> bool:
        """Check if a professional can access a case."""
        assignment = await self.get_assignment_for_professional(
            professional_id, family_file_id
        )
        return assignment is not None and assignment.is_active

    async def has_scope(
        self,
        professional_id: str,
        family_file_id: str,
        scope: str,
    ) -> bool:
        """Check if a professional has a specific scope for a case."""
        assignment = await self.get_assignment_for_professional(
            professional_id, family_file_id
        )
        if not assignment or not assignment.is_active:
            return False
        return assignment.has_scope(scope)

    async def can_control_aria(
        self,
        professional_id: str,
        family_file_id: str,
    ) -> bool:
        """Check if a professional can control ARIA for a case."""
        assignment = await self.get_assignment_for_professional(
            professional_id, family_file_id
        )
        return (
            assignment is not None
            and assignment.is_active
            and assignment.can_control_aria
        )

    async def can_message_client(
        self,
        professional_id: str,
        family_file_id: str,
    ) -> bool:
        """Check if a professional can message clients for a case."""
        assignment = await self.get_assignment_for_professional(
            professional_id, family_file_id
        )
        return (
            assignment is not None
            and assignment.is_active
            and assignment.can_message_client
        )

    # -------------------------------------------------------------------------
    # Statistics
    # -------------------------------------------------------------------------

    async def count_active_assignments(
        self,
        professional_id: str,
    ) -> int:
        """Count active case assignments for a professional."""
        result = await self.db.execute(
            select(func.count(CaseAssignment.id)).where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.status == AssignmentStatus.ACTIVE.value,
                )
            )
        )
        return result.scalar() or 0

    async def count_firm_assignments(
        self,
        firm_id: str,
    ) -> int:
        """Count active case assignments for a firm."""
        result = await self.db.execute(
            select(func.count(CaseAssignment.id)).where(
                and_(
                    CaseAssignment.firm_id == firm_id,
                    CaseAssignment.status == AssignmentStatus.ACTIVE.value,
                )
            )
        )
        return result.scalar() or 0

    # -------------------------------------------------------------------------
    # Access Logging
    # -------------------------------------------------------------------------

    async def log_access(
        self,
        professional_id: str,
        family_file_id: str,
        action: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> ProfessionalAccessLog:
        """
        Log a professional's access to case data.

        Actions: view_messages, export_report, control_aria, send_intake, message_client
        """
        assignment = await self.get_assignment_for_professional(
            professional_id, family_file_id
        )

        log = ProfessionalAccessLog(
            id=str(uuid4()),
            professional_id=professional_id,
            firm_id=assignment.firm_id if assignment else None,
            family_file_id=family_file_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
            logged_at=datetime.utcnow(),
        )

        self.db.add(log)
        await self.db.commit()

        return log

    # -------------------------------------------------------------------------
    # Private Helpers
    # -------------------------------------------------------------------------

    async def _get_professional_primary_firm(
        self,
        professional_id: str,
    ) -> Optional[str]:
        """Get the professional's primary firm (first active membership)."""
        result = await self.db.execute(
            select(FirmMembership.firm_id).where(
                and_(
                    FirmMembership.professional_id == professional_id,
                    FirmMembership.status == MembershipStatus.ACTIVE.value,
                )
            )
            .order_by(FirmMembership.joined_at.asc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        return row if row else None

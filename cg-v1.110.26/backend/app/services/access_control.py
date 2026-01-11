"""
Centralized access control for Case and Family File lookups.

This module provides a unified way to check user access to Cases and Family Files,
returning the effective case_id for database queries.

Pattern:
1. Try Case Participant lookup first (legacy path)
2. If not found, try Family File lookup (new path)
3. Return effective_case_id: legacy_case_id if available, otherwise the original ID
"""

from typing import Tuple, Optional, NamedTuple
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.case import Case, CaseParticipant
from app.models.family_file import FamilyFile


class AccessResult(NamedTuple):
    """Result of an access check."""
    has_access: bool
    effective_case_id: str  # Use this for database queries
    is_family_file: bool
    family_file: Optional[FamilyFile] = None
    case: Optional[Case] = None


async def check_case_or_family_file_access(
    db: AsyncSession,
    case_id: str,
    user_id: str,
    load_case: bool = False,
    load_family_file: bool = False
) -> AccessResult:
    """
    Check if user has access via Case Participant or Family File.

    This is the primary access control function for all endpoints that accept
    a case_id parameter (which may actually be a Family File ID).

    Args:
        db: Database session
        case_id: Can be either Case.id or FamilyFile.id
        user_id: User to check access for
        load_case: If True, load the Case object when access is via Case
        load_family_file: If True, load the FamilyFile object when access is via FF

    Returns:
        AccessResult with:
        - has_access: Whether the user can access this case/family file
        - effective_case_id: The ID to use for database queries
          (legacy_case_id if Family File has one, otherwise original ID)
        - is_family_file: Whether access was granted via Family File
        - family_file: The FamilyFile object (if load_family_file=True)
        - case: The Case object (if load_case=True)

    Usage:
        access = await check_case_or_family_file_access(db, case_id, user.id)
        if not access.has_access:
            raise HTTPException(403, "No access to this case")

        # Use effective_case_id for queries
        events = await db.execute(
            select(Event).where(Event.case_id == access.effective_case_id)
        )
    """
    # Convert IDs to strings for consistent comparison
    case_id_str = str(case_id)
    user_id_str = str(user_id)

    # FIRST: Try Case Participant lookup (legacy path)
    participant_query = select(CaseParticipant).where(
        and_(
            CaseParticipant.case_id == case_id_str,
            CaseParticipant.user_id == user_id_str,
            CaseParticipant.is_active == True
        )
    )
    participant_result = await db.execute(participant_query)
    participant = participant_result.scalar_one_or_none()

    if participant:
        # Access via Case Participant
        case_obj = None
        if load_case:
            case_result = await db.execute(
                select(Case).where(Case.id == case_id)
            )
            case_obj = case_result.scalar_one_or_none()

        return AccessResult(
            has_access=True,
            effective_case_id=case_id_str,
            is_family_file=False,
            family_file=None,
            case=case_obj
        )

    # SECOND: Try Family File lookup (new path)
    family_file_query = select(FamilyFile).where(
        FamilyFile.id == case_id_str,
        or_(
            FamilyFile.parent_a_id == user_id_str,
            FamilyFile.parent_b_id == user_id_str
        )
    )
    family_file_result = await db.execute(family_file_query)
    family_file = family_file_result.scalar_one_or_none()

    if family_file:
        # Access via Family File
        # Use legacy_case_id for backward compatibility with existing data
        effective_case_id = str(family_file.legacy_case_id) if family_file.legacy_case_id else case_id_str

        return AccessResult(
            has_access=True,
            effective_case_id=effective_case_id,
            is_family_file=True,
            family_file=family_file if load_family_file else None,
            case=None
        )

    # No access
    return AccessResult(
        has_access=False,
        effective_case_id=case_id_str,
        is_family_file=False,
        family_file=None,
        case=None
    )


async def get_case_participants_for_access(
    db: AsyncSession,
    case_id: str,
    user_id: str
) -> Tuple[bool, list, Optional[str], Optional[str]]:
    """
    Get case participants for a case or family file.

    Returns:
        (has_access, participant_user_ids, parent_a_id, parent_b_id)
    """
    # Convert IDs to strings for consistent comparison
    case_id_str = str(case_id)
    user_id_str = str(user_id)

    # First check Case
    case_result = await db.execute(
        select(Case)
        .options(selectinload(Case.participants))
        .where(Case.id == case_id_str)
    )
    case = case_result.scalar_one_or_none()

    if case:
        # Verify user is a participant (convert all to strings for comparison)
        participant_ids = [str(p.user_id) for p in case.participants if p.is_active]
        if user_id_str in participant_ids:
            # For Case, we don't have parent_a/b directly, but we can get from participants
            return True, participant_ids, None, None

    # Check Family File
    family_file_result = await db.execute(
        select(FamilyFile).where(
            FamilyFile.id == case_id_str,
            or_(
                FamilyFile.parent_a_id == user_id_str,
                FamilyFile.parent_b_id == user_id_str
            )
        )
    )
    family_file = family_file_result.scalar_one_or_none()

    if family_file:
        participant_ids = [str(family_file.parent_a_id)]
        if family_file.parent_b_id:
            participant_ids.append(str(family_file.parent_b_id))
        return True, participant_ids, str(family_file.parent_a_id), str(family_file.parent_b_id) if family_file.parent_b_id else None

    return False, [], None, None


async def get_other_parent_id(
    db: AsyncSession,
    case_id: str,
    user_id: str
) -> Optional[str]:
    """
    Get the other parent's ID for a case or family file.

    Args:
        db: Database session
        case_id: Case ID or Family File ID
        user_id: Current user's ID

    Returns:
        The other parent's user ID, or None if not found
    """
    # Convert user_id to string for consistent comparison
    user_id_str = str(user_id)

    has_access, participant_ids, parent_a_id, parent_b_id = await get_case_participants_for_access(
        db, case_id, user_id
    )

    if not has_access:
        return None

    # If we have explicit parent_a/b (from Family File)
    if parent_a_id and parent_b_id:
        if user_id_str == parent_a_id:
            return parent_b_id
        elif user_id_str == parent_b_id:
            return parent_a_id

    # Otherwise use participant list
    for pid in participant_ids:
        if pid != user_id_str:
            return pid

    return None

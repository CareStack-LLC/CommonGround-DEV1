"""Conflict-of-interest checks for professional case assignments.

A family-law professional must not end up on both sides of the same people.
This service detects, before an assignment is created, whether a professional
would be:

  - adverse to a party they already represent elsewhere,
  - representing a party they are currently adverse to elsewhere,
  - representing the opposing party in a case they're already on, or
  - serving as a neutral (mediator/parenting coordinator/GAL) over someone they
    represent in another active matter.

Professional-level conflicts are BLOCKING. Firm-level imputed conflicts (a
colleague at the same firm is adverse to the proposed client) are returned as
non-blocking WARNINGS, since resolving them needs a waiver/ethical-wall process
the platform doesn't model.
"""

import logging
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import CaseAssignment, AssignmentStatus
from app.models.family_file import FamilyFile
from app.models.user import UserProfile

logger = logging.getLogger(__name__)

# Roles that advocate for one side.
REPRESENTATION_ROLES = {"lead_attorney", "associate"}
# Roles that must stay neutral between the parties.
NEUTRAL_ROLES = {"mediator", "parenting_coordinator", "intake_coordinator"}


class ConflictError(ValueError):
    """Raised when a blocking conflict of interest prevents an assignment."""


class ConflictCheckService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def check(
        self,
        *,
        professional_id: str,
        family_file_id: str,
        representing: Optional[str],
        assignment_role: Optional[str] = None,
        firm_id: Optional[str] = None,
        include_firm: bool = True,
    ) -> list[dict]:
        """Return a list of conflict dicts (possibly empty).

        Each conflict: {type, severity ('block'|'warning'), message,
        other_family_file_id, other_family_file_title, party_user_id}.
        """
        target = await self._get_family_file(family_file_id)
        if not target:
            return []

        new_client, new_adverse = self._sides(representing, target)
        new_parties = self._parties(target)
        is_neutral = (assignment_role in NEUTRAL_ROLES) or representing == "court"

        conflicts: list[dict] = []

        # --- professional-level (blocking) -------------------------------- #
        existing = await self._active_assignments(
            professional_id=professional_id
        )
        for a in existing:
            ff = a.family_file
            if not ff:
                continue
            ex_client, ex_adverse = self._sides(a.representing, ff)
            ex_parties = self._parties(ff)
            ex_neutral = (a.assignment_role in NEUTRAL_ROLES) or a.representing == "court"

            if a.family_file_id == family_file_id:
                # Same matter: only opposite-side / adverse overlap is a conflict;
                # an exact duplicate is handled by the caller's existing-assignment
                # check, not here.
                if (new_adverse & ex_client) or (new_client & ex_adverse):
                    conflicts.append(self._mk(
                        "same_case_opposing_side", "block", ff,
                        party=None,
                        message="You are already assigned to the opposing party in this case.",
                    ))
                continue

            # Would oppose someone we represent elsewhere.
            for uid in (new_adverse & ex_client):
                conflicts.append(self._mk(
                    "adverse_to_existing_client", "block", ff, party=uid,
                ))
            # Would represent someone we currently oppose elsewhere.
            for uid in (new_client & ex_adverse):
                conflicts.append(self._mk(
                    "represent_party_you_oppose", "block", ff, party=uid,
                ))
            # New neutral role over a party we represent/oppose elsewhere.
            if is_neutral:
                for uid in (new_parties & (ex_client | ex_adverse)):
                    conflicts.append(self._mk(
                        "neutral_over_known_party", "block", ff, party=uid,
                    ))
            # Existing neutral over a party we'd now represent/oppose.
            if ex_neutral:
                for uid in ((new_client | new_adverse) & ex_parties):
                    conflicts.append(self._mk(
                        "party_in_your_neutral_case", "block", ff, party=uid,
                    ))

        # --- firm-level imputed (warning) --------------------------------- #
        if include_firm and firm_id and (new_client or new_adverse):
            colleague = await self._firm_assignments(
                firm_id=firm_id, exclude_professional_id=professional_id
            )
            for a in colleague:
                ff = a.family_file
                if not ff or a.family_file_id == family_file_id:
                    continue
                ex_client, ex_adverse = self._sides(a.representing, ff)
                for uid in ((new_adverse & ex_client) | (new_client & ex_adverse)):
                    conflicts.append(self._mk(
                        "firm_imputed", "warning", ff, party=uid,
                    ))

        return await self._resolve_names(self._dedupe(conflicts))

    async def assert_no_blocking_conflicts(
        self,
        *,
        professional_id: str,
        family_file_id: str,
        representing: Optional[str],
        assignment_role: Optional[str] = None,
        firm_id: Optional[str] = None,
    ) -> None:
        """Raise ConflictError if any BLOCKING conflict exists."""
        conflicts = await self.check(
            professional_id=professional_id,
            family_file_id=family_file_id,
            representing=representing,
            assignment_role=assignment_role,
            firm_id=firm_id,
            include_firm=False,  # only professional-level conflicts block
        )
        blocking = [c for c in conflicts if c["severity"] == "block"]
        if blocking:
            raise ConflictError(
                "Conflict of interest: "
                + " ".join(c["message"] for c in blocking)
            )

    # ----------------------------- helpers ----------------------------- #

    @staticmethod
    def _sides(representing: Optional[str], ff: FamilyFile) -> tuple[set, set]:
        """Return (clients, adversaries) as sets of user_ids for an assignment."""
        pa, pb = ff.parent_a_id, ff.parent_b_id
        if representing == "parent_a":
            return ({pa} if pa else set(), {pb} if pb else set())
        if representing == "parent_b":
            return ({pb} if pb else set(), {pa} if pa else set())
        if representing == "both":
            return ({p for p in (pa, pb) if p}, set())
        # court / neutral / unknown → represents nobody, opposes nobody
        return (set(), set())

    @staticmethod
    def _parties(ff: FamilyFile) -> set:
        return {p for p in (ff.parent_a_id, ff.parent_b_id) if p}

    def _mk(self, ctype: str, severity: str, other_ff: FamilyFile,
            party: Optional[str], message: Optional[str] = None) -> dict:
        return {
            "type": ctype,
            "severity": severity,
            "other_family_file_id": other_ff.id,
            "other_family_file_title": other_ff.title or other_ff.family_file_number,
            "party_user_id": party,
            "message": message,  # filled in by _resolve_names when None
        }

    async def _get_family_file(self, family_file_id: str) -> Optional[FamilyFile]:
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        return result.scalar_one_or_none()

    async def _active_assignments(self, professional_id: str) -> list[CaseAssignment]:
        result = await self.db.execute(
            select(CaseAssignment)
            .options(selectinload(CaseAssignment.family_file))
            .where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.status == AssignmentStatus.ACTIVE.value,
                )
            )
        )
        return list(result.scalars().all())

    async def _firm_assignments(
        self, firm_id: str, exclude_professional_id: str
    ) -> list[CaseAssignment]:
        result = await self.db.execute(
            select(CaseAssignment)
            .options(selectinload(CaseAssignment.family_file))
            .where(
                and_(
                    CaseAssignment.firm_id == firm_id,
                    CaseAssignment.professional_id != exclude_professional_id,
                    CaseAssignment.status == AssignmentStatus.ACTIVE.value,
                )
            )
        )
        return list(result.scalars().all())

    @staticmethod
    def _dedupe(conflicts: list[dict]) -> list[dict]:
        seen = set()
        out = []
        for c in conflicts:
            key = (c["type"], c["other_family_file_id"], c["party_user_id"])
            if key in seen:
                continue
            seen.add(key)
            out.append(c)
        return out

    async def _resolve_names(self, conflicts: list[dict]) -> list[dict]:
        """Fill in party names + any message templates that need them."""
        uids = {c["party_user_id"] for c in conflicts if c["party_user_id"]}
        names: dict[str, str] = {}
        if uids:
            result = await self.db.execute(
                select(UserProfile).where(UserProfile.user_id.in_(uids))
            )
            for p in result.scalars().all():
                names[p.user_id] = f"{p.first_name} {p.last_name}".strip()

        templates = {
            "adverse_to_existing_client":
                "You represent {name} in “{case}.” Taking this assignment would put you adverse to them.",
            "represent_party_you_oppose":
                "You are adverse to {name} in “{case}.” You cannot represent them in this case.",
            "neutral_over_known_party":
                "You are engaged for {name} in “{case},” so you cannot serve as a neutral in their case.",
            "party_in_your_neutral_case":
                "You serve as a neutral over {name} in “{case},” so you cannot take a side involving them.",
            "firm_imputed":
                "A colleague at your firm represents {name} in “{case}” (firm conflict).",
        }
        for c in conflicts:
            if c["message"]:
                continue
            name = names.get(c["party_user_id"], "the other party")
            case = c["other_family_file_title"] or "another case"
            c["message"] = templates.get(c["type"], "Potential conflict of interest.").format(
                name=name, case=case
            )
            c["party_name"] = name
        return conflicts

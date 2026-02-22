"""
Phase 3: Intake-to-Case Conversion endpoint.
Route: POST /api/v1/professional/intake/sessions/{session_id}/convert-to-case

Creates a CaseAssignment (professional_case_assignments row) from a
completed intake session, effectively "converting" a prospect into a case.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.models.professional import ProfessionalProfile
from app.api.v1.endpoints.professional import get_current_professional

router = APIRouter(
    prefix="/professional/intake/sessions",
    tags=["professional-intake-convert"],
)


class ConvertToCaseBody(BaseModel):
    assignment_role: str = "lead_attorney"
    representing: str = "parent_a"
    firm_id: Optional[str] = None


@router.post(
    "/{session_id}/convert-to-case",
    summary="Convert a completed intake session into an active case",
)
async def convert_intake_to_case(
    session_id: str,
    body: ConvertToCaseBody,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Converts a completed ARIA intake session into a professional case assignment.
    Steps:
      1. Validate the session exists and belongs to this professional.
      2. Resolve or create a family_file for the client.
      3. Create a professional_case_assignment linking this professional to the family_file.
      4. Mark the intake session as converted.
    """

    # 1. Validate session ownership
    session_row = await db.execute(
        text("""
            SELECT s.id, s.status, s.family_file_id, s.client_name, s.client_email,
                   s.professional_id
            FROM intake_sessions s
            WHERE s.id = :session_id AND s.professional_id = :pid
        """),
        {"session_id": session_id, "pid": str(profile.id)},
    )
    session = session_row.fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found or access denied.")

    session_dict = dict(session._mapping)

    # 2. Check if already converted
    if session_dict.get("status") == "converted":
        raise HTTPException(status_code=409, detail="This intake has already been converted to a case.")

    # 3. Get or resolve family_file_id
    family_file_id = session_dict.get("family_file_id")

    if not family_file_id:
        raise HTTPException(
            status_code=422,
            detail="No family file linked to this intake session. "
                   "Ensure the intake is completed and a family file has been created.",
        )

    # 4. Check if assignment already exists
    existing = await db.execute(
        text("""
            SELECT id FROM professional_case_assignments
            WHERE professional_id = :pid AND family_file_id = :ffid AND status = 'active'
        """),
        {"pid": str(profile.id), "ffid": family_file_id},
    )
    if existing.fetchone():
        raise HTTPException(status_code=409, detail="You are already assigned to this case.")

    # 5. Create the case assignment
    access_scopes = ["messages", "documents", "timeline", "schedule", "compliance", "aria"]

    result = await db.execute(
        text("""
            INSERT INTO professional_case_assignments
              (professional_id, firm_id, family_file_id, assignment_role, representing,
               access_scopes, can_control_aria, can_message_client, status)
            VALUES (:pid, :firm_id, :ffid, :role, :representing,
                    :scopes, true, true, 'active')
            RETURNING id, family_file_id, assignment_role, representing, status
        """),
        {
            "pid": str(profile.id),
            "firm_id": body.firm_id,
            "ffid": family_file_id,
            "role": body.assignment_role,
            "representing": body.representing,
            "scopes": access_scopes,
        },
    )
    assignment = result.fetchone()

    # 6. Mark the intake session as converted
    await db.execute(
        text("""
            UPDATE intake_sessions
            SET status = 'converted', updated_at = NOW()
            WHERE id = :session_id
        """),
        {"session_id": session_id},
    )
    await db.commit()

    return {
        "success": True,
        "case_assignment_id": str(assignment._mapping["id"]),
        "family_file_id": str(assignment._mapping["family_file_id"]),
        "assignment_role": assignment._mapping["assignment_role"],
        "representing": assignment._mapping["representing"],
        "status": assignment._mapping["status"],
        "message": f"Intake successfully converted to active case.",
    }

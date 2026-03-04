"""
Court Form Workflow Service.

Implements the California family court form workflow:
FL-300 -> FL-311 -> FL-320 -> Hearing -> FL-340 -> Case Active

Key workflows:
1. Petitioner submits FL-300 (Request for Order)
2. Court approves FL-300
3. Petitioner submits FL-311 (Custody Application)
4. Respondent notified (platform or proof of service)
5. Respondent submits FL-320 (Response)
6. Hearing scheduled
7. Judge issues FL-340 with FL-341/FL-342 attachments
8. Case becomes active
"""

import hashlib
import secrets
from datetime import datetime, timedelta, date
from typing import Optional, Tuple, List
from uuid import uuid4

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.court_form import (
    CourtFormSubmission,
    CaseFormRequirement,
    ProofOfService,
    CourtHearing,
    RespondentAccessCode,
    CourtFormType,
    CourtFormStatus,
    FormSubmissionSource,
    CaseActivationStatus,
    ServiceType,
    HearingType,
    HearingOutcome,
)
from app.models.case import Case
from app.models.user import User
from app.schemas.court_form import (
    FL300FormData,
    FL311FormData,
    FL320FormData,
    FL340FormData,
    FL341FormData,
    FL342FormData,
    CaseFormProgress,
)


class CourtFormService:
    """Service for managing court form workflow."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # Form Creation
    # =========================================================================

    async def create_form_submission(
        self,
        case_id: str,
        form_type: CourtFormType,
        parent_id: Optional[str] = None,
        form_data: Optional[dict] = None,
        submission_source: FormSubmissionSource = FormSubmissionSource.PARENT_PLATFORM,
        aria_assisted: bool = False,
        responds_to_form_id: Optional[str] = None,
        parent_form_id: Optional[str] = None,
    ) -> CourtFormSubmission:
        """Create a new form submission."""
        submission = CourtFormSubmission(
            id=str(uuid4()),
            case_id=case_id,
            parent_id=parent_id,
            form_type=form_type.value,
            form_state="CA",
            status=CourtFormStatus.DRAFT.value,
            status_history=[],
            submission_source=submission_source.value,
            form_data=form_data,
            aria_assisted=aria_assisted,
            responds_to_form_id=responds_to_form_id,
            parent_form_id=parent_form_id,
            requires_review=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(submission)
        await self.db.flush()

        # Update case workflow status if this is the first form
        await self._update_case_workflow_status(case_id)

        return submission

    async def update_form_data(
        self,
        submission_id: str,
        form_data: dict,
        aria_conversation_id: Optional[str] = None,
    ) -> CourtFormSubmission:
        """Update form data (only allowed in draft status)."""
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")
        if submission.status != CourtFormStatus.DRAFT.value:
            raise ValueError("Can only update forms in draft status")

        submission.form_data = form_data
        if aria_conversation_id:
            submission.aria_conversation_id = aria_conversation_id
        submission.updated_at = datetime.utcnow()

        await self.db.flush()
        return submission

    async def court_update_form_data(
        self,
        submission_id: str,
        form_data: dict,
        professional_id: str,
        notes: Optional[str] = None,
    ) -> CourtFormSubmission:
        """Court staff update form data (allowed for non-finalized forms)."""
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")

        # Court staff can edit forms that aren't finalized
        finalized_statuses = [
            CourtFormStatus.APPROVED.value,
            CourtFormStatus.ENTERED.value,
            CourtFormStatus.REJECTED.value,
            CourtFormStatus.WITHDRAWN.value,
        ]
        if submission.status in finalized_statuses:
            raise ValueError(f"Cannot edit form with status: {submission.status}")

        # Store the update in status history for audit
        submission.add_status_change(
            submission.status,  # Keep same status
            changed_by=professional_id,
            notes=notes or "Form data updated by court staff"
        )
        submission.form_data = form_data
        submission.updated_at = datetime.utcnow()

        await self.db.flush()
        return submission

    async def allow_parent_edits(
        self,
        submission_id: str,
        professional_id: str,
        notes: str,
        sections: Optional[List[str]] = None,
    ) -> CourtFormSubmission:
        """
        Court clerk allows parent to make edits to a submitted form.

        Clerks cannot edit forms themselves - they can only allow/revoke
        edit permissions to prevent fabrication of court documents.
        """
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")

        # Can only allow edits for submitted, under review, or resubmit_required forms
        allowed_statuses = [
            CourtFormStatus.SUBMITTED.value,
            CourtFormStatus.UNDER_COURT_REVIEW.value,
            CourtFormStatus.RESUBMIT_REQUIRED.value,
        ]
        if submission.status not in allowed_statuses:
            raise ValueError(f"Cannot allow edits for form with status: {submission.status}")

        # Cannot allow edits on already approved/entered forms
        if submission.status in [CourtFormStatus.APPROVED.value, CourtFormStatus.ENTERED.value]:
            raise ValueError("Cannot allow edits on approved or entered forms")

        submission.edits_allowed = True
        submission.edits_allowed_by = professional_id
        submission.edits_allowed_at = datetime.utcnow()
        submission.edits_allowed_notes = notes
        submission.edits_allowed_sections = sections
        submission.updated_at = datetime.utcnow()

        # Log in status history
        submission.add_status_change(
            submission.status,  # Keep same status
            changed_by=professional_id,
            notes=f"Edits allowed: {notes}"
        )

        await self.db.flush()
        return submission

    async def revoke_parent_edits(
        self,
        submission_id: str,
        professional_id: str,
        notes: Optional[str] = None,
    ) -> CourtFormSubmission:
        """Court clerk revokes parent edit permission."""
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")

        if not submission.edits_allowed:
            raise ValueError("Edits are not currently allowed for this form")

        submission.edits_allowed = False
        submission.edits_allowed_by = None
        submission.edits_allowed_at = None
        submission.edits_allowed_notes = None
        submission.edits_allowed_sections = None
        submission.updated_at = datetime.utcnow()

        # Log in status history
        submission.add_status_change(
            submission.status,  # Keep same status
            changed_by=professional_id,
            notes=notes or "Edit permission revoked"
        )

        await self.db.flush()
        return submission

    async def parent_update_form_data(
        self,
        submission_id: str,
        form_data: dict,
        parent_id: str,
    ) -> CourtFormSubmission:
        """
        Parent updates form data when edits are allowed.

        This is used after a clerk has allowed edits for corrections.
        """
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")

        # Verify this is the parent who submitted the form
        if submission.parent_id and submission.parent_id != parent_id:
            raise ValueError("Not authorized to edit this form")

        # Check if form is in draft (always editable by parent)
        if submission.status == CourtFormStatus.DRAFT.value:
            submission.form_data = form_data
            submission.updated_at = datetime.utcnow()
            await self.db.flush()
            return submission

        # For submitted forms, must have edits_allowed
        if not submission.edits_allowed:
            raise ValueError("This form is locked. Contact the court to request edit permission.")

        # Update form data
        submission.form_data = form_data
        submission.updated_at = datetime.utcnow()

        # Log the update
        submission.add_status_change(
            submission.status,  # Keep same status
            changed_by=parent_id,
            notes="Form data updated by parent (edits allowed)"
        )

        await self.db.flush()
        return submission

    async def parent_resubmit_form(
        self,
        submission_id: str,
        parent_id: str,
    ) -> CourtFormSubmission:
        """
        Parent resubmits form after making allowed edits.

        This clears the edits_allowed flag and notifies the court.
        """
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")

        if submission.parent_id and submission.parent_id != parent_id:
            raise ValueError("Not authorized to submit this form")

        if not submission.edits_allowed:
            raise ValueError("Form is not in edit mode")

        # Clear edit permission
        submission.edits_allowed = False
        submission.edits_allowed_by = None
        submission.edits_allowed_at = None
        submission.edits_allowed_notes = None
        submission.edits_allowed_sections = None

        # Update status back to submitted
        submission.add_status_change(
            CourtFormStatus.SUBMITTED.value,
            changed_by=parent_id,
            notes="Resubmitted after corrections"
        )
        submission.submitted_at = datetime.utcnow()
        submission.updated_at = datetime.utcnow()

        await self.db.flush()
        return submission

    async def submit_form_for_review(
        self,
        submission_id: str,
        parent_id: str,
    ) -> CourtFormSubmission:
        """Submit a form for court review."""
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")
        if submission.status != CourtFormStatus.DRAFT.value:
            raise ValueError("Form is not in draft status")
        if submission.parent_id and submission.parent_id != parent_id:
            raise ValueError("Not authorized to submit this form")

        submission.add_status_change(
            CourtFormStatus.SUBMITTED.value,
            changed_by=parent_id,
            notes="Submitted for court review"
        )
        submission.submitted_at = datetime.utcnow()
        submission.updated_at = datetime.utcnow()

        await self.db.flush()

        # Update case workflow status
        await self._update_case_workflow_status(submission.case_id)

        return submission

    # =========================================================================
    # Form Retrieval
    # =========================================================================

    async def get_submission(self, submission_id: str) -> Optional[CourtFormSubmission]:
        """Get a form submission by ID."""
        result = await self.db.execute(
            select(CourtFormSubmission).where(CourtFormSubmission.id == submission_id)
        )
        return result.scalar_one_or_none()

    async def get_case_forms(
        self,
        case_id: str,
        form_type: Optional[CourtFormType] = None,
    ) -> List[CourtFormSubmission]:
        """Get all forms for a case, optionally filtered by type."""
        query = select(CourtFormSubmission).where(
            CourtFormSubmission.case_id == case_id
        )
        if form_type:
            query = query.where(CourtFormSubmission.form_type == form_type.value)
        query = query.order_by(CourtFormSubmission.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_latest_form_by_type(
        self,
        case_id: str,
        form_type: CourtFormType,
    ) -> Optional[CourtFormSubmission]:
        """Get the most recent form of a specific type for a case."""
        result = await self.db.execute(
            select(CourtFormSubmission)
            .where(
                and_(
                    CourtFormSubmission.case_id == case_id,
                    CourtFormSubmission.form_type == form_type.value,
                )
            )
            .order_by(CourtFormSubmission.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    # =========================================================================
    # Court Review Actions
    # =========================================================================

    async def approve_form(
        self,
        submission_id: str,
        professional_id: str,
        notes: Optional[str] = None,
    ) -> CourtFormSubmission:
        """Court professional approves a form."""
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")
        if submission.status not in [
            CourtFormStatus.SUBMITTED.value,
            CourtFormStatus.UNDER_COURT_REVIEW.value,
        ]:
            raise ValueError("Form is not pending review")

        submission.add_status_change(
            CourtFormStatus.APPROVED.value,
            changed_by=professional_id,
            notes=notes or "Approved by court staff"
        )
        submission.reviewed_by = professional_id
        submission.reviewed_at = datetime.utcnow()
        submission.review_notes = notes
        submission.updated_at = datetime.utcnow()

        await self.db.flush()

        # Trigger next workflow step based on form type
        await self._handle_form_approval(submission, professional_id)

        return submission

    async def reject_form(
        self,
        submission_id: str,
        professional_id: str,
        reason: str,
    ) -> CourtFormSubmission:
        """Court professional rejects a form."""
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")
        if submission.status not in [
            CourtFormStatus.SUBMITTED.value,
            CourtFormStatus.UNDER_COURT_REVIEW.value,
        ]:
            raise ValueError("Form is not pending review")

        submission.add_status_change(
            CourtFormStatus.REJECTED.value,
            changed_by=professional_id,
            notes=reason
        )
        submission.reviewed_by = professional_id
        submission.reviewed_at = datetime.utcnow()
        submission.rejection_reason = reason
        submission.updated_at = datetime.utcnow()

        await self.db.flush()
        return submission

    async def request_resubmission(
        self,
        submission_id: str,
        professional_id: str,
        issues: List[str],
        notes: Optional[str] = None,
    ) -> CourtFormSubmission:
        """Court requests form resubmission with corrections."""
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")

        submission.add_status_change(
            CourtFormStatus.RESUBMIT_REQUIRED.value,
            changed_by=professional_id,
            notes=f"Issues: {', '.join(issues)}. {notes or ''}"
        )
        submission.reviewed_by = professional_id
        submission.reviewed_at = datetime.utcnow()
        submission.review_notes = f"Resubmission required: {', '.join(issues)}"
        submission.updated_at = datetime.utcnow()

        await self.db.flush()
        return submission

    # =========================================================================
    # FL-300 Workflow
    # =========================================================================

    async def _handle_fl300_approval(
        self,
        submission: CourtFormSubmission,
        professional_id: str,
    ) -> None:
        """Handle FL-300 approval - notify respondent."""
        case_id = submission.case_id

        # Check if respondent is on platform
        case = await self._get_case(case_id)
        if not case:
            return

        # Get respondent from case participants
        respondent = await self._get_respondent(case_id)

        if respondent:
            # Respondent is on platform - create access code and notify
            await self.create_respondent_access_code(
                case_id=case_id,
                respondent_email=respondent.email,
                respondent_name=f"{respondent.first_name} {respondent.last_name}",
                fl300_submission_id=submission.id,
            )
            # Update case status
            await self._set_case_activation_status(
                case_id, CaseActivationStatus.RESPONDENT_NOTIFIED
            )
        else:
            # Respondent not on platform - require proof of service
            await self._set_case_activation_status(
                case_id, CaseActivationStatus.RESPONDENT_SERVICE_PENDING
            )

    async def mark_form_as_served(
        self,
        submission_id: str,
        professional_id: str,
        service_type: ServiceType,
        served_on_date: date,
        notes: Optional[str] = None,
    ) -> CourtFormSubmission:
        """Mark FL-300 as served to respondent."""
        submission = await self.get_submission(submission_id)
        if not submission:
            raise ValueError("Submission not found")
        if submission.form_type != CourtFormType.FL_300.value:
            raise ValueError("Only FL-300 can be marked as served")

        submission.add_status_change(
            CourtFormStatus.SERVED.value,
            changed_by=professional_id,
            notes=f"Served via {service_type.value} on {served_on_date}. {notes or ''}"
        )
        submission.updated_at = datetime.utcnow()

        await self.db.flush()

        # Update case status to FL320_REQUIRED
        await self._set_case_activation_status(
            submission.case_id, CaseActivationStatus.FL320_REQUIRED
        )

        return submission

    # =========================================================================
    # Respondent Notification
    # =========================================================================

    async def create_respondent_access_code(
        self,
        case_id: str,
        respondent_email: str,
        respondent_name: Optional[str],
        fl300_submission_id: str,
    ) -> RespondentAccessCode:
        """Create access code for respondent notification."""
        # Generate 6-digit code
        access_code = "".join(secrets.choice("0123456789") for _ in range(6))
        code_hash = hashlib.sha256(access_code.encode()).hexdigest()

        access = RespondentAccessCode(
            id=str(uuid4()),
            case_id=case_id,
            respondent_email=respondent_email,
            respondent_name=respondent_name,
            access_code=access_code,
            code_hash=code_hash,
            expires_at=datetime.utcnow() + timedelta(days=30),
            is_used=False,
            failed_attempts=0,
            fl300_submission_id=fl300_submission_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(access)
        await self.db.flush()

        # TODO: Send notification email with access code
        # await self._send_respondent_notification(access)

        return access

    async def verify_respondent_access(
        self,
        case_id: str,
        access_code: str,
        user_id: str,
    ) -> Tuple[bool, str]:
        """Verify respondent access code."""
        code_hash = hashlib.sha256(access_code.encode()).hexdigest()

        result = await self.db.execute(
            select(RespondentAccessCode).where(
                and_(
                    RespondentAccessCode.case_id == case_id,
                    RespondentAccessCode.code_hash == code_hash,
                    RespondentAccessCode.is_used == False,
                    RespondentAccessCode.expires_at > datetime.utcnow(),
                )
            )
        )
        access = result.scalar_one_or_none()

        if not access:
            # Check for locked or expired
            result = await self.db.execute(
                select(RespondentAccessCode).where(
                    RespondentAccessCode.case_id == case_id
                ).order_by(RespondentAccessCode.created_at.desc())
            )
            latest = result.scalar_one_or_none()

            if latest:
                if latest.is_used:
                    return False, "Access code already used"
                if latest.expires_at <= datetime.utcnow():
                    return False, "Access code expired"
                if latest.locked_until and latest.locked_until > datetime.utcnow():
                    return False, "Account temporarily locked due to failed attempts"

                # Increment failed attempts
                latest.failed_attempts += 1
                if latest.failed_attempts >= 5:
                    latest.locked_until = datetime.utcnow() + timedelta(hours=1)
                await self.db.flush()

            return False, "Invalid access code"

        # Mark as used
        access.is_used = True
        access.used_at = datetime.utcnow()
        access.used_by_user_id = user_id
        await self.db.flush()

        # Update case status
        await self._set_case_activation_status(
            case_id, CaseActivationStatus.FL320_REQUIRED
        )

        return True, "Verification successful"

    # =========================================================================
    # Proof of Service
    # =========================================================================

    async def file_proof_of_service(
        self,
        case_id: str,
        served_form_id: str,
        service_type: ServiceType,
        served_to_name: str,
        served_on_date: date,
        served_by_name: str,
        served_at_address: Optional[str] = None,
        served_by_relationship: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> ProofOfService:
        """File proof of service for a form."""
        proof = ProofOfService(
            id=str(uuid4()),
            case_id=case_id,
            served_form_id=served_form_id,
            service_type=service_type.value,
            served_to_name=served_to_name,
            served_at_address=served_at_address,
            served_on_date=served_on_date,
            served_by_name=served_by_name,
            served_by_relationship=served_by_relationship,
            filed_with_court=False,
            accepted_by_court=False,
            notes=notes,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(proof)
        await self.db.flush()

        # Update case status to FL320_REQUIRED
        await self._set_case_activation_status(
            case_id, CaseActivationStatus.FL320_REQUIRED
        )

        return proof

    async def accept_proof_of_service(
        self,
        proof_id: str,
        professional_id: str,
    ) -> ProofOfService:
        """Court accepts proof of service."""
        result = await self.db.execute(
            select(ProofOfService).where(ProofOfService.id == proof_id)
        )
        proof = result.scalar_one_or_none()
        if not proof:
            raise ValueError("Proof of service not found")

        proof.filed_with_court = True
        proof.filed_at = datetime.utcnow()
        proof.accepted_by_court = True
        proof.updated_at = datetime.utcnow()

        await self.db.flush()
        return proof

    # =========================================================================
    # FL-320 Workflow
    # =========================================================================

    async def create_fl320_response(
        self,
        case_id: str,
        parent_id: str,
        responds_to_form_id: str,
        form_data: dict,
        aria_assisted: bool = False,
    ) -> CourtFormSubmission:
        """Create FL-320 (Responsive Declaration)."""
        # Verify the FL-300 exists and is approved
        fl300 = await self.get_submission(responds_to_form_id)
        if not fl300 or fl300.form_type != CourtFormType.FL_300.value:
            raise ValueError("Invalid FL-300 reference")
        if fl300.status not in [CourtFormStatus.APPROVED.value, CourtFormStatus.SERVED.value]:
            raise ValueError("FL-300 is not yet approved/served")

        return await self.create_form_submission(
            case_id=case_id,
            form_type=CourtFormType.FL_320,
            parent_id=parent_id,
            form_data=form_data,
            submission_source=FormSubmissionSource.PARENT_PLATFORM,
            aria_assisted=aria_assisted,
            responds_to_form_id=responds_to_form_id,
        )

    # =========================================================================
    # Hearing Management
    # =========================================================================

    async def schedule_hearing(
        self,
        case_id: str,
        hearing_type: HearingType,
        title: str,
        scheduled_date: date,
        scheduled_time: Optional[str] = None,
        court_name: Optional[str] = None,
        department: Optional[str] = None,
        courtroom: Optional[str] = None,
        judge_name: Optional[str] = None,
        related_fl300_id: Optional[str] = None,
        description: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> CourtHearing:
        """Schedule a court hearing."""
        hearing = CourtHearing(
            id=str(uuid4()),
            case_id=case_id,
            hearing_type=hearing_type.value,
            title=title,
            description=description,
            scheduled_date=scheduled_date,
            scheduled_time=scheduled_time,
            court_name=court_name,
            department=department,
            courtroom=courtroom,
            judge_name=judge_name,
            outcome=HearingOutcome.PENDING.value,
            related_fl300_id=related_fl300_id,
            notifications_sent=False,
            reminder_sent=False,
            is_continuation=False,
            notes=notes,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(hearing)
        await self.db.flush()

        # Update case status
        await self._set_case_activation_status(
            case_id, CaseActivationStatus.AWAITING_HEARING
        )

        return hearing

    async def get_hearing(self, hearing_id: str) -> Optional[CourtHearing]:
        """Get a hearing by ID."""
        result = await self.db.execute(
            select(CourtHearing).where(CourtHearing.id == hearing_id)
        )
        return result.scalar_one_or_none()

    async def record_hearing_outcome(
        self,
        hearing_id: str,
        professional_id: str,
        outcome: HearingOutcome,
        petitioner_attended: bool,
        respondent_attended: bool,
        outcome_notes: Optional[str] = None,
    ) -> CourtHearing:
        """Record the outcome of a hearing."""
        hearing = await self.get_hearing(hearing_id)
        if not hearing:
            raise ValueError("Hearing not found")

        hearing.outcome = outcome.value
        hearing.outcome_notes = outcome_notes
        hearing.petitioner_attended = petitioner_attended
        hearing.respondent_attended = respondent_attended
        hearing.updated_at = datetime.utcnow()

        await self.db.flush()

        # Update case status
        if outcome == HearingOutcome.ORDER_ISSUED:
            await self._set_case_activation_status(
                hearing.case_id, CaseActivationStatus.HEARING_COMPLETED
            )

        return hearing

    async def continue_hearing(
        self,
        hearing_id: str,
        new_date: date,
        new_time: Optional[str],
        reason: str,
    ) -> CourtHearing:
        """Continue a hearing to a new date."""
        original = await self.get_hearing(hearing_id)
        if not original:
            raise ValueError("Hearing not found")

        # Mark original as continued
        original.outcome = HearingOutcome.CONTINUED.value
        original.outcome_notes = f"Continued to {new_date}: {reason}"
        original.updated_at = datetime.utcnow()

        # Create new hearing
        new_hearing = CourtHearing(
            id=str(uuid4()),
            case_id=original.case_id,
            hearing_type=original.hearing_type,
            title=f"{original.title} (Continued)",
            description=original.description,
            scheduled_date=new_date,
            scheduled_time=new_time or original.scheduled_time,
            court_name=original.court_name,
            department=original.department,
            courtroom=original.courtroom,
            judge_name=original.judge_name,
            outcome=HearingOutcome.PENDING.value,
            related_fl300_id=original.related_fl300_id,
            notifications_sent=False,
            reminder_sent=False,
            is_continuation=True,
            continued_from_id=hearing_id,
            notes=f"Continued from {original.scheduled_date}: {reason}",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(new_hearing)

        # Update original to link to new hearing
        original.continued_to_id = new_hearing.id

        await self.db.flush()
        return new_hearing

    # =========================================================================
    # FL-340 Court Order Entry
    # =========================================================================

    async def enter_fl340_order(
        self,
        case_id: str,
        hearing_id: str,
        professional_id: str,
        form_data: dict,
    ) -> CourtFormSubmission:
        """Enter FL-340 (Findings and Order After Hearing)."""
        submission = await self.create_form_submission(
            case_id=case_id,
            form_type=CourtFormType.FL_340,
            parent_id=None,  # Court-created
            form_data=form_data,
            submission_source=FormSubmissionSource.COURT_MANUAL,
        )
        submission.hearing_id = hearing_id
        submission.reviewed_by = professional_id
        submission.reviewed_at = datetime.utcnow()

        # Update hearing with resulting order
        hearing = await self.get_hearing(hearing_id)
        if hearing:
            hearing.resulting_fl340_id = submission.id

        await self.db.flush()
        return submission

    async def attach_fl341(
        self,
        fl340_id: str,
        professional_id: str,
        form_data: dict,
    ) -> CourtFormSubmission:
        """Attach FL-341 (Custody Order) to FL-340."""
        fl340 = await self.get_submission(fl340_id)
        if not fl340 or fl340.form_type != CourtFormType.FL_340.value:
            raise ValueError("Invalid FL-340 reference")

        submission = await self.create_form_submission(
            case_id=fl340.case_id,
            form_type=CourtFormType.FL_341,
            form_data=form_data,
            submission_source=FormSubmissionSource.COURT_MANUAL,
            parent_form_id=fl340_id,
        )
        submission.reviewed_by = professional_id
        submission.reviewed_at = datetime.utcnow()

        await self.db.flush()
        return submission

    async def attach_fl342(
        self,
        fl340_id: str,
        professional_id: str,
        form_data: dict,
    ) -> CourtFormSubmission:
        """Attach FL-342 (Child Support Order) to FL-340."""
        fl340 = await self.get_submission(fl340_id)
        if not fl340 or fl340.form_type != CourtFormType.FL_340.value:
            raise ValueError("Invalid FL-340 reference")

        submission = await self.create_form_submission(
            case_id=fl340.case_id,
            form_type=CourtFormType.FL_342,
            form_data=form_data,
            submission_source=FormSubmissionSource.COURT_MANUAL,
            parent_form_id=fl340_id,
        )
        submission.reviewed_by = professional_id
        submission.reviewed_at = datetime.utcnow()

        await self.db.flush()
        return submission

    async def finalize_fl340_order(
        self,
        fl340_id: str,
        professional_id: str,
    ) -> CourtFormSubmission:
        """Finalize FL-340 and activate case."""
        fl340 = await self.get_submission(fl340_id)
        if not fl340 or fl340.form_type != CourtFormType.FL_340.value:
            raise ValueError("Invalid FL-340 reference")

        fl340.add_status_change(
            CourtFormStatus.ENTERED.value,
            changed_by=professional_id,
            notes="Order entered and finalized"
        )
        fl340.updated_at = datetime.utcnow()

        await self.db.flush()

        # Activate the case
        await self.activate_case(fl340.case_id, professional_id)

        return fl340

    # =========================================================================
    # Case Activation
    # =========================================================================

    async def activate_case(
        self,
        case_id: str,
        professional_id: Optional[str] = None,
    ) -> Case:
        """Activate a case after FL-340 is entered."""
        case = await self._get_case(case_id)
        if not case:
            raise ValueError("Case not found")

        case.activation_status = CaseActivationStatus.ACTIVE.value
        case.status = "active"
        case.forms_workflow_completed_at = datetime.utcnow()
        case.updated_at = datetime.utcnow()

        await self.db.flush()
        return case

    # =========================================================================
    # Case Progress
    # =========================================================================

    async def get_case_form_progress(self, case_id: str) -> CaseFormProgress:
        """Get overall workflow progress for a case."""
        case = await self._get_case(case_id)
        if not case:
            raise ValueError("Case not found")

        forms = await self.get_case_forms(case_id)

        # Find status for each form type
        fl300 = next((f for f in forms if f.form_type == CourtFormType.FL_300.value), None)
        fl311 = next((f for f in forms if f.form_type == CourtFormType.FL_311.value), None)
        fl320 = next((f for f in forms if f.form_type == CourtFormType.FL_320.value), None)
        fl340 = next((f for f in forms if f.form_type == CourtFormType.FL_340.value), None)

        # Check respondent status
        result = await self.db.execute(
            select(RespondentAccessCode).where(
                and_(
                    RespondentAccessCode.case_id == case_id,
                    RespondentAccessCode.is_used == True,
                )
            )
        )
        respondent_verified = result.scalar_one_or_none() is not None

        # Check proof of service
        result = await self.db.execute(
            select(ProofOfService).where(
                and_(
                    ProofOfService.case_id == case_id,
                    ProofOfService.accepted_by_court == True,
                )
            )
        )
        proof_filed = result.scalar_one_or_none() is not None

        # Check hearing
        result = await self.db.execute(
            select(CourtHearing).where(CourtHearing.case_id == case_id)
            .order_by(CourtHearing.scheduled_date.desc())
            .limit(1)
        )
        hearing = result.scalar_one_or_none()

        # Calculate progress
        progress = 0.0
        steps = 0
        if fl300:
            steps += 1
            if fl300.status == CourtFormStatus.APPROVED.value:
                progress += 15
            elif fl300.status == CourtFormStatus.SERVED.value:
                progress += 20
        if fl311:
            steps += 1
            if fl311.status == CourtFormStatus.APPROVED.value:
                progress += 15
        if respondent_verified or proof_filed:
            progress += 10
        if fl320:
            steps += 1
            if fl320.status == CourtFormStatus.APPROVED.value:
                progress += 15
        if hearing and hearing.outcome == HearingOutcome.ORDER_ISSUED.value:
            progress += 15
        if fl340:
            steps += 1
            if fl340.status == CourtFormStatus.ENTERED.value:
                progress += 20

        # Determine next action
        next_action = None
        next_action_by = None
        if not fl300:
            next_action = "Submit FL-300 (Request for Order)"
            next_action_by = "petitioner"
        elif fl300.status == CourtFormStatus.DRAFT.value:
            next_action = "Complete and submit FL-300"
            next_action_by = "petitioner"
        elif fl300.status == CourtFormStatus.SUBMITTED.value:
            next_action = "Awaiting court review of FL-300"
            next_action_by = "court"
        elif fl300.status == CourtFormStatus.APPROVED.value and not (respondent_verified or proof_filed):
            next_action = "Notify respondent or file proof of service"
            next_action_by = "petitioner"
        elif not fl320 and (respondent_verified or proof_filed):
            next_action = "Submit FL-320 (Response)"
            next_action_by = "respondent"
        elif fl320 and fl320.status == CourtFormStatus.SUBMITTED.value:
            next_action = "Review FL-320 and schedule hearing"
            next_action_by = "court"
        elif hearing and hearing.outcome == HearingOutcome.PENDING.value:
            next_action = f"Attend hearing on {hearing.scheduled_date}"
            next_action_by = "both"
        elif hearing and hearing.outcome == HearingOutcome.ORDER_ISSUED.value and not fl340:
            next_action = "Enter FL-340 order"
            next_action_by = "court"
        elif fl340 and fl340.status != CourtFormStatus.ENTERED.value:
            next_action = "Finalize FL-340 order"
            next_action_by = "court"

        return CaseFormProgress(
            case_id=case_id,
            activation_status=case.activation_status,
            forms_workflow_started_at=case.forms_workflow_started_at,
            forms_workflow_completed_at=case.forms_workflow_completed_at,
            fl300_status=fl300.status if fl300 else None,
            fl300_submission_id=fl300.id if fl300 else None,
            fl311_status=fl311.status if fl311 else None,
            fl311_submission_id=fl311.id if fl311 else None,
            fl320_status=fl320.status if fl320 else None,
            fl320_submission_id=fl320.id if fl320 else None,
            fl340_status=fl340.status if fl340 else None,
            fl340_submission_id=fl340.id if fl340 else None,
            respondent_notified=respondent_verified,
            respondent_on_platform=respondent_verified,
            proof_of_service_filed=proof_filed,
            hearing_scheduled=hearing is not None,
            hearing_id=hearing.id if hearing else None,
            hearing_date=hearing.scheduled_date if hearing else None,
            progress_percent=min(progress, 100.0),
            next_action=next_action,
            next_action_by=next_action_by,
        )

    # =========================================================================
    # Helper Methods
    # =========================================================================

    async def _get_case(self, case_id: str) -> Optional[Case]:
        """Get a case by ID."""
        result = await self.db.execute(
            select(Case).where(Case.id == case_id)
        )
        return result.scalar_one_or_none()

    async def _get_respondent(self, case_id: str) -> Optional[User]:
        """Get the respondent user for a case."""
        from app.models.case import CaseParticipant

        result = await self.db.execute(
            select(User)
            .join(CaseParticipant, CaseParticipant.user_id == User.id)
            .where(
                and_(
                    CaseParticipant.case_id == case_id,
                    CaseParticipant.role == "respondent",
                )
            )
        )
        return result.scalar_one_or_none()

    async def _set_case_activation_status(
        self,
        case_id: str,
        status: CaseActivationStatus,
    ) -> None:
        """Update case activation status."""
        case = await self._get_case(case_id)
        if case:
            case.activation_status = status.value
            if status == CaseActivationStatus.FL300_REQUIRED and not case.forms_workflow_started_at:
                case.forms_workflow_started_at = datetime.utcnow()
            case.updated_at = datetime.utcnow()
            await self.db.flush()

    async def _update_case_workflow_status(self, case_id: str) -> None:
        """Update case workflow status based on current forms."""
        # This is called after form submissions to update the case status
        progress = await self.get_case_form_progress(case_id)
        # Status is already set by individual workflow methods

    async def _handle_form_approval(
        self,
        submission: CourtFormSubmission,
        professional_id: str,
    ) -> None:
        """Handle actions after a form is approved."""
        if submission.form_type == CourtFormType.FL_300.value:
            await self._handle_fl300_approval(submission, professional_id)
        elif submission.form_type == CourtFormType.FL_311.value:
            # FL-311 approved - wait for FL-320
            await self._set_case_activation_status(
                submission.case_id, CaseActivationStatus.FL320_REQUIRED
            )
        elif submission.form_type == CourtFormType.FL_320.value:
            # FL-320 approved - ready for hearing
            await self._set_case_activation_status(
                submission.case_id, CaseActivationStatus.AWAITING_HEARING
            )

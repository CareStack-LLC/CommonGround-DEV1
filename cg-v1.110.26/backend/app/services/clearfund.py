"""
ClearFund service - Business logic for purpose-locked financial obligations.

Key Invariants:
1. Platform never holds money (Stripe handles all funds)
2. All obligations have immutable purpose
3. All payments applied FIFO
4. No obligation closed without verification
5. All state transitions logged
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.clearfund import (
    Obligation,
    ObligationFunding,
    Attestation,
    VerificationArtifact,
    VirtualCardAuthorization,
    OBLIGATION_STATUSES,
)
from app.models.payment import PaymentLedger, ExpenseRequest
from app.models.case import Case, CaseParticipant
from app.models.family_file import FamilyFile
from app.models.user import User
from app.services.access_control import check_case_or_family_file_access, AccessResult
from app.schemas.clearfund import (
    ObligationCreate,
    ObligationUpdate,
    ObligationFilters,
    FundingCreate,
    AttestationCreate,
    VerificationCreate,
    BalanceSummary,
    ObligationMetrics,
)


class ClearFundService:
    """Service for ClearFund obligation management."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    # ========================================================================
    # Access Control Helpers
    # ========================================================================

    async def _verify_case_access(self, case_id: str, user: User) -> AccessResult:
        """
        Verify user has access to the case or family file.

        Args:
            case_id: Can be Case ID or Family File ID
            user: User to verify

        Returns:
            AccessResult with has_access, effective_case_id, is_family_file
        """
        access = await check_case_or_family_file_access(
            self.db, case_id, user.id, load_case=True, load_family_file=True
        )

        if not access.has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this case"
            )

        return access

    async def _get_case_participants(self, case_id: str, is_family_file: bool = False) -> Tuple[str, str]:
        """
        Get parent IDs for a case or family file.

        For cases: returns (petitioner_id, respondent_id)
        For family files: returns (parent_a_id, parent_b_id)
        """
        if is_family_file:
            # For family files, get parents directly
            result = await self.db.execute(
                select(FamilyFile).where(FamilyFile.id == case_id)
            )
            family_file = result.scalar_one_or_none()
            if family_file:
                return family_file.parent_a_id, family_file.parent_b_id
            return None, None
        else:
            # For cases, get from participants
            result = await self.db.execute(
                select(CaseParticipant)
                .where(
                    and_(
                        CaseParticipant.case_id == case_id,
                        CaseParticipant.is_active == True
                    )
                )
            )
            participants = result.scalars().all()

            petitioner_id = None
            respondent_id = None

            for p in participants:
                if p.role == "petitioner":
                    petitioner_id = p.user_id
                elif p.role == "respondent":
                    respondent_id = p.user_id

            return petitioner_id, respondent_id

    # ========================================================================
    # Obligation CRUD
    # ========================================================================

    async def create_obligation(
        self,
        data: ObligationCreate,
        user: User
    ) -> Obligation:
        """
        Create a new obligation.

        Args:
            data: Obligation creation data (case_id can be Case or Family File ID)
            user: User creating the obligation

        Returns:
            Created obligation

        Raises:
            HTTPException: If creation fails
        """
        # Verify case access (supports both Case and Family File)
        access = await self._verify_case_access(data.case_id, user)

        try:
            # Calculate shares from percentage
            petitioner_share = data.total_amount * Decimal(data.petitioner_percentage) / 100
            respondent_share = data.total_amount - petitioner_share

            # Create the obligation - set case_id or family_file_id based on access type
            obligation = Obligation(
                case_id=access.effective_case_id if not access.is_family_file else None,
                family_file_id=data.case_id if access.is_family_file else None,
                source_type=data.source_type,
                source_id=data.source_id,
                purpose_category=data.purpose_category,
                title=data.title,
                description=data.description,
                child_ids=data.child_ids,
                total_amount=data.total_amount,
                petitioner_share=petitioner_share,
                respondent_share=respondent_share,
                petitioner_percentage=data.petitioner_percentage,
                due_date=data.due_date,
                status="open",
                verification_required=data.verification_required,
                receipt_required=data.receipt_required,
                notes=data.notes,
                created_by=user.id,
            )
            self.db.add(obligation)
            await self.db.flush()

            # Create funding records for each parent
            # For family files, use parent_a/b; for cases, use petitioner/respondent
            petitioner_id, respondent_id = await self._get_case_participants(
                data.case_id, is_family_file=access.is_family_file
            )

            if petitioner_id:
                petitioner_funding = ObligationFunding(
                    obligation_id=obligation.id,
                    parent_id=petitioner_id,
                    amount_required=petitioner_share,
                    amount_funded=Decimal("0"),
                )
                self.db.add(petitioner_funding)

            if respondent_id:
                respondent_funding = ObligationFunding(
                    obligation_id=obligation.id,
                    parent_id=respondent_id,
                    amount_required=respondent_share,
                    amount_funded=Decimal("0"),
                )
                self.db.add(respondent_funding)

            await self.db.commit()
            await self.db.refresh(obligation)

            return obligation

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create obligation: {str(e)}"
            ) from e

    async def create_from_expense_request(
        self,
        expense_request_id: str,
        user: User
    ) -> Obligation:
        """
        Create an obligation from an approved expense request.

        Args:
            expense_request_id: ID of approved expense request
            user: User creating the obligation

        Returns:
            Created obligation
        """
        # Get the expense request
        result = await self.db.execute(
            select(ExpenseRequest).where(ExpenseRequest.id == expense_request_id)
        )
        request = result.scalar_one_or_none()

        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense request not found"
            )

        if request.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expense request must be approved before creating obligation"
            )

        # Create obligation from request
        data = ObligationCreate(
            case_id=request.case_id,
            source_type="request",
            source_id=expense_request_id,
            purpose_category=request.category,
            title=request.title,
            description=request.description,
            child_ids=request.child_ids,
            total_amount=request.total_amount,
            petitioner_percentage=100 - request.split_percentage,  # Inverse of split
            due_date=request.due_date,
            verification_required=True,
            receipt_required=True,
        )

        return await self.create_obligation(data, user)

    async def get_obligation(
        self,
        obligation_id: str,
        user: User
    ) -> Obligation:
        """Get an obligation by ID."""
        result = await self.db.execute(
            select(Obligation)
            .options(
                selectinload(Obligation.funding_records),
                selectinload(Obligation.attestation),
                selectinload(Obligation.verification_artifacts),
            )
            .where(Obligation.id == obligation_id)
        )
        obligation = result.scalar_one_or_none()

        if not obligation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Obligation not found"
            )

        # Verify access - check case_id or family_file_id
        # Family File obligations have family_file_id set and case_id as NULL
        access_id = obligation.case_id or obligation.family_file_id
        if not access_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Obligation has no case or family file associated"
            )
        await self._verify_case_access(access_id, user)

        return obligation

    async def list_obligations(
        self,
        case_id: str,
        filters: Optional[ObligationFilters] = None,
        page: int = 1,
        page_size: int = 20,
        user: Optional[User] = None
    ) -> Tuple[list[Obligation], int]:
        """
        List obligations for a case with optional filters.

        Args:
            case_id: The case ID or Family File ID
            filters: Optional filters
            page: Page number
            page_size: Items per page
            user: Optional user for access verification. If None, skips access check
                  (for court professional access where auth is handled by endpoint).

        Returns:
            Tuple of (obligations, total_count)
        """
        # Verify case access if user provided and determine if Family File
        effective_case_id = case_id
        is_family_file = False
        if user is not None:
            access = await self._verify_case_access(case_id, user)
            effective_case_id = access.effective_case_id
            is_family_file = access.is_family_file
        else:
            # For court access, check if this looks like a family file
            # by checking if it exists as a family file
            from app.models.family_file import FamilyFile
            ff_result = await self.db.execute(
                select(FamilyFile).where(FamilyFile.id == case_id)
            )
            is_family_file = ff_result.scalar_one_or_none() is not None

        # Build query - use case_id or family_file_id based on type
        if is_family_file:
            # Check both family_file_id and case_id for backwards compatibility
            # (older obligations may have family file ID stored in case_id before migration)
            query = (
                select(Obligation)
                .options(
                    selectinload(Obligation.funding_records),
                    selectinload(Obligation.attestation),
                )
                .where(or_(
                    Obligation.family_file_id == case_id,
                    Obligation.case_id == case_id
                ))
            )
        else:
            query = (
                select(Obligation)
                .options(
                    selectinload(Obligation.funding_records),
                    selectinload(Obligation.attestation),
                )
                .where(Obligation.case_id == effective_case_id)
            )

        # Apply filters
        if filters:
            if filters.status:
                query = query.where(Obligation.status.in_(filters.status))
            if filters.purpose_category:
                query = query.where(Obligation.purpose_category.in_(filters.purpose_category))
            if filters.agreement_id:
                query = query.where(Obligation.agreement_id == filters.agreement_id)
            if filters.created_by:
                query = query.where(Obligation.created_by == filters.created_by)
            if filters.due_before:
                query = query.where(Obligation.due_date <= filters.due_before)
            if filters.due_after:
                query = query.where(Obligation.due_date >= filters.due_after)
            if filters.is_overdue:
                query = query.where(
                    and_(
                        Obligation.due_date < datetime.utcnow(),
                        Obligation.status.notin_(["completed", "cancelled", "expired"])
                    )
                )
            if filters.min_amount:
                query = query.where(Obligation.total_amount >= filters.min_amount)
            if filters.max_amount:
                query = query.where(Obligation.total_amount <= filters.max_amount)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Apply pagination
        query = query.order_by(Obligation.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        obligations = list(result.scalars().all())

        return obligations, total

    async def update_obligation(
        self,
        obligation_id: str,
        data: ObligationUpdate,
        user: User
    ) -> Obligation:
        """Update an obligation (limited fields)."""
        obligation = await self.get_obligation(obligation_id, user)

        # Only allow updates for open obligations
        if obligation.status not in ["open", "partially_funded"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot update obligation in status: {obligation.status}"
            )

        try:
            if data.due_date is not None:
                obligation.due_date = data.due_date
            if data.notes is not None:
                obligation.notes = data.notes
            if data.receipt_required is not None:
                obligation.receipt_required = data.receipt_required

            await self.db.commit()
            await self.db.refresh(obligation)
            return obligation

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update obligation: {str(e)}"
            ) from e

    async def cancel_obligation(
        self,
        obligation_id: str,
        reason: str,
        user: User
    ) -> Obligation:
        """Cancel an obligation."""
        obligation = await self.get_obligation(obligation_id, user)

        # Only allow cancellation for open/partially funded obligations
        if obligation.status not in ["open", "partially_funded"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel obligation in status: {obligation.status}"
            )

        try:
            obligation.status = "cancelled"
            obligation.cancelled_at = datetime.utcnow()
            obligation.cancellation_reason = reason

            await self.db.commit()
            await self.db.refresh(obligation)
            return obligation

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to cancel obligation: {str(e)}"
            ) from e

    # ========================================================================
    # Funding
    # ========================================================================

    async def record_funding(
        self,
        obligation_id: str,
        data: FundingCreate,
        user: User
    ) -> ObligationFunding:
        """Record a funding payment from a parent."""
        obligation = await self.get_obligation(obligation_id, user)

        if obligation.status in ["completed", "cancelled", "expired"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot fund obligation in status: {obligation.status}"
            )

        # Find user's funding record
        result = await self.db.execute(
            select(ObligationFunding).where(
                and_(
                    ObligationFunding.obligation_id == obligation_id,
                    ObligationFunding.parent_id == user.id
                )
            )
        )
        funding = result.scalar_one_or_none()

        if not funding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Funding record not found for this user"
            )

        try:
            # Update funding amount
            new_funded = funding.amount_funded + data.amount
            if new_funded > funding.amount_required:
                new_funded = funding.amount_required  # Cap at required amount

            funding.amount_funded = new_funded
            funding.stripe_payment_intent_id = data.stripe_payment_intent_id
            funding.payment_method = data.payment_method
            funding.notes = data.notes

            if new_funded >= funding.amount_required:
                funding.is_fully_funded = True
                funding.funded_at = datetime.utcnow()

            # Update obligation total funded
            obligation.amount_funded = obligation.amount_funded + data.amount

            # Check if fully funded
            if obligation.amount_funded >= obligation.total_amount:
                obligation.status = "funded"
                obligation.funded_at = datetime.utcnow()
            elif obligation.amount_funded > 0:
                obligation.status = "partially_funded"

            # Create ledger entry
            # Determine if this is a Family File obligation
            is_family_file = obligation.family_file_id is not None
            access_id = obligation.case_id or obligation.family_file_id
            petitioner_id, respondent_id = await self._get_case_participants(
                access_id, is_family_file=is_family_file
            )
            other_parent_id = respondent_id if user.id == petitioner_id else petitioner_id

            # Calculate running balance (simplified - should aggregate from all entries)
            ledger_entry = PaymentLedger(
                case_id=obligation.case_id if not is_family_file else None,
                family_file_id=obligation.family_file_id if is_family_file else None,
                entry_type="payment",
                obligor_id=user.id,
                obligee_id=other_parent_id or user.id,
                amount=data.amount,
                running_balance=Decimal("0"),  # Will be calculated
                obligation_id=obligation.id,
                credit_source="payment",
                description=f"Funding for: {obligation.title}",
                effective_date=datetime.utcnow(),
            )
            self.db.add(ledger_entry)

            await self.db.commit()
            await self.db.refresh(funding)
            return funding

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to record funding: {str(e)}"
            ) from e

    async def get_funding_status(
        self,
        obligation_id: str,
        user: User
    ) -> dict:
        """Get funding status for an obligation."""
        obligation = await self.get_obligation(obligation_id, user)

        # Determine if this is a Family File obligation
        is_family_file = obligation.family_file_id is not None
        access_id = obligation.case_id or obligation.family_file_id
        petitioner_id, respondent_id = await self._get_case_participants(
            access_id, is_family_file=is_family_file
        )

        petitioner_funding = None
        respondent_funding = None

        for funding in obligation.funding_records:
            if funding.parent_id == petitioner_id:
                petitioner_funding = funding
            elif funding.parent_id == respondent_id:
                respondent_funding = funding

        return {
            "obligation_id": obligation.id,
            "total_amount": obligation.total_amount,
            "amount_funded": obligation.amount_funded,
            "funding_percentage": obligation.funding_percentage,
            "is_fully_funded": obligation.is_fully_funded,
            "petitioner_funding": petitioner_funding,
            "respondent_funding": respondent_funding,
        }

    # ========================================================================
    # Attestation
    # ========================================================================

    async def create_attestation(
        self,
        obligation_id: str,
        data: AttestationCreate,
        user: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Attestation:
        """Create an attestation for an obligation."""
        obligation = await self.get_obligation(obligation_id, user)

        # Check if attestation already exists
        if obligation.attestation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attestation already exists for this obligation"
            )

        try:
            attestation = Attestation(
                obligation_id=obligation_id,
                attesting_parent_id=user.id,
                attestation_text=data.attestation_text,
                purpose_declaration=data.purpose_declaration,
                receipt_commitment=data.receipt_commitment,
                purpose_commitment=data.purpose_commitment,
                legal_acknowledgment=data.legal_acknowledgment,
                ip_address=ip_address,
                user_agent=user_agent,
                attested_at=datetime.utcnow(),
            )
            self.db.add(attestation)

            await self.db.commit()
            await self.db.refresh(attestation)
            return attestation

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create attestation: {str(e)}"
            ) from e

    async def get_attestation(
        self,
        obligation_id: str,
        user: User
    ) -> Optional[Attestation]:
        """Get attestation for an obligation."""
        obligation = await self.get_obligation(obligation_id, user)
        return obligation.attestation

    # ========================================================================
    # Verification
    # ========================================================================

    async def record_verification(
        self,
        obligation_id: str,
        data: VerificationCreate,
        user: User
    ) -> VerificationArtifact:
        """Record a verification artifact."""
        obligation = await self.get_obligation(obligation_id, user)

        if obligation.status not in ["funded", "pending_verification"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot verify obligation in status: {obligation.status}"
            )

        try:
            artifact = VerificationArtifact(
                obligation_id=obligation_id,
                artifact_type=data.artifact_type,
                stripe_transaction_id=data.stripe_transaction_id,
                vendor_name=data.vendor_name,
                vendor_mcc=data.vendor_mcc,
                transaction_date=data.transaction_date,
                amount_verified=data.amount_verified,
                verified_by=user.id,
                verification_method="manual",
                verification_notes=data.verification_notes,
                verified_at=datetime.utcnow(),
            )
            self.db.add(artifact)

            # Update obligation
            obligation.amount_verified += data.amount_verified
            if obligation.status == "funded":
                obligation.status = "pending_verification"

            if obligation.amount_verified >= obligation.total_amount:
                obligation.status = "verified"
                obligation.verified_at = datetime.utcnow()

            await self.db.commit()
            await self.db.refresh(artifact)
            return artifact

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to record verification: {str(e)}"
            ) from e

    async def upload_receipt(
        self,
        obligation_id: str,
        receipt_url: str,
        receipt_file_name: str,
        receipt_file_type: str,
        amount: Decimal,
        vendor_name: Optional[str],
        user: User
    ) -> VerificationArtifact:
        """Upload a receipt as verification."""
        obligation = await self.get_obligation(obligation_id, user)

        try:
            artifact = VerificationArtifact(
                obligation_id=obligation_id,
                artifact_type="receipt",
                vendor_name=vendor_name,
                amount_verified=amount,
                receipt_url=receipt_url,
                receipt_file_name=receipt_file_name,
                receipt_file_type=receipt_file_type,
                verified_by=user.id,
                verification_method="manual",
                verified_at=datetime.utcnow(),
            )
            self.db.add(artifact)

            # Update obligation
            obligation.amount_verified += amount
            if obligation.amount_verified >= obligation.total_amount:
                obligation.status = "verified"
                obligation.verified_at = datetime.utcnow()

            await self.db.commit()
            await self.db.refresh(artifact)
            return artifact

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload receipt: {str(e)}"
            ) from e

    async def complete_obligation(
        self,
        obligation_id: str,
        user: User
    ) -> Obligation:
        """Mark an obligation as completed."""
        obligation = await self.get_obligation(obligation_id, user)

        if obligation.status not in ["verified", "funded"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot complete obligation in status: {obligation.status}"
            )

        # If verification required, check it's verified
        if obligation.verification_required and obligation.status != "verified":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Obligation requires verification before completion"
            )

        try:
            obligation.status = "completed"
            obligation.completed_at = datetime.utcnow()

            await self.db.commit()
            await self.db.refresh(obligation)
            return obligation

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to complete obligation: {str(e)}"
            ) from e

    # ========================================================================
    # Analytics
    # ========================================================================

    async def get_obligation_metrics(
        self,
        case_id: str,
        user: Optional[User] = None
    ) -> ObligationMetrics:
        """Get obligation metrics for a case.

        Args:
            case_id: The case ID or Family File ID
            user: Optional user for access verification. If None, skips access check
                  (for court professional access where auth is handled by endpoint).
        """
        effective_case_id = case_id
        is_family_file = False
        if user is not None:
            access = await self._verify_case_access(case_id, user)
            effective_case_id = access.effective_case_id
            is_family_file = access.is_family_file
        else:
            # For court access, check if this is a family file
            from app.models.family_file import FamilyFile
            ff_result = await self.db.execute(
                select(FamilyFile).where(FamilyFile.id == case_id)
            )
            is_family_file = ff_result.scalar_one_or_none() is not None

        # Build query filter based on case_id or family_file_id
        if is_family_file:
            # Check both for backwards compatibility with older data
            id_filter = or_(
                Obligation.family_file_id == case_id,
                Obligation.case_id == case_id
            )
        else:
            id_filter = Obligation.case_id == effective_case_id

        result = await self.db.execute(
            select(
                Obligation.status,
                func.count(Obligation.id).label("count")
            )
            .where(id_filter)
            .group_by(Obligation.status)
        )
        counts = {row[0]: row[1] for row in result.all()}

        # Count overdue
        overdue_result = await self.db.execute(
            select(func.count(Obligation.id))
            .where(
                and_(
                    id_filter,
                    Obligation.due_date < datetime.utcnow(),
                    Obligation.status.notin_(["completed", "cancelled", "expired"])
                )
            )
        )
        overdue = overdue_result.scalar() or 0

        return ObligationMetrics(
            total_open=counts.get("open", 0),
            total_pending_funding=counts.get("partially_funded", 0),
            total_funded=counts.get("funded", 0),
            total_verified=counts.get("verified", 0),
            total_completed=counts.get("completed", 0),
            total_overdue=overdue,
            total_cancelled=counts.get("cancelled", 0),
        )

    async def get_balance_summary(
        self,
        case_id: str,
        user: Optional[User] = None
    ) -> BalanceSummary:
        """Get balance summary for a case.

        Args:
            case_id: The case ID or Family File ID
            user: Optional user for access verification. If None, skips access check
                  (for court professional access where auth is handled by endpoint).
        """
        effective_case_id = case_id
        is_family_file = False
        if user is not None:
            access = await self._verify_case_access(case_id, user)
            effective_case_id = access.effective_case_id
            is_family_file = access.is_family_file
        else:
            # For court access, check if this is a family file
            from app.models.family_file import FamilyFile
            ff_result = await self.db.execute(
                select(FamilyFile).where(FamilyFile.id == case_id)
            )
            is_family_file = ff_result.scalar_one_or_none() is not None

        petitioner_id, respondent_id = await self._get_case_participants(
            case_id, is_family_file=is_family_file
        )

        # Build obligation filter based on case_id or family_file_id
        if is_family_file:
            obligation_filter = Obligation.family_file_id == case_id
        else:
            obligation_filter = Obligation.case_id == effective_case_id

        # Calculate balances from ledger - use correct column based on type
        if is_family_file:
            ledger_filter = PaymentLedger.family_file_id == case_id
        else:
            ledger_filter = PaymentLedger.case_id == effective_case_id

        result = await self.db.execute(
            select(
                PaymentLedger.obligor_id,
                func.sum(PaymentLedger.amount).label("total")
            )
            .where(ledger_filter)
            .group_by(PaymentLedger.obligor_id)
        )
        totals = {row[0]: row[1] for row in result.all()}

        petitioner_paid = totals.get(petitioner_id, Decimal("0"))
        respondent_paid = totals.get(respondent_id, Decimal("0"))

        # Calculate what each party owes from open obligations
        # The Obligation model has petitioner_share and respondent_share fields
        open_obligations_result = await self.db.execute(
            select(
                func.sum(Obligation.petitioner_share).label("petitioner_total"),
                func.sum(Obligation.respondent_share).label("respondent_total")
            )
            .where(
                and_(
                    obligation_filter,
                    Obligation.status.notin_(["completed", "cancelled", "expired"])
                )
            )
        )
        shares_row = open_obligations_result.one_or_none()

        petitioner_owes = Decimal(str(shares_row.petitioner_total or 0)) if shares_row else Decimal("0")
        respondent_owes = Decimal(str(shares_row.respondent_total or 0)) if shares_row else Decimal("0")

        # Subtract what each party has already funded via ObligationFunding
        if petitioner_id:
            pet_funded = await self.db.execute(
                select(func.sum(ObligationFunding.amount_funded))
                .join(Obligation, ObligationFunding.obligation_id == Obligation.id)
                .where(
                    and_(
                        obligation_filter,
                        ObligationFunding.parent_id == petitioner_id,
                        Obligation.status.notin_(["completed", "cancelled", "expired"])
                    )
                )
            )
            petitioner_funded = pet_funded.scalar() or Decimal("0")
            petitioner_owes = max(Decimal("0"), petitioner_owes - petitioner_funded)

        if respondent_id:
            resp_funded = await self.db.execute(
                select(func.sum(ObligationFunding.amount_funded))
                .join(Obligation, ObligationFunding.obligation_id == Obligation.id)
                .where(
                    and_(
                        obligation_filter,
                        ObligationFunding.parent_id == respondent_id,
                        Obligation.status.notin_(["completed", "cancelled", "expired"])
                    )
                )
            )
            respondent_funded = resp_funded.scalar() or Decimal("0")
            respondent_owes = max(Decimal("0"), respondent_owes - respondent_funded)

        # Get obligation counts (pass original case_id since it handles conversion)
        metrics = await self.get_obligation_metrics(case_id, user)

        # Get totals this month
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_result = await self.db.execute(
            select(func.sum(Obligation.total_amount))
            .where(
                and_(
                    obligation_filter,
                    Obligation.created_at >= month_start
                )
            )
        )
        total_this_month = month_result.scalar() or Decimal("0")

        # Get overdue total
        overdue_result = await self.db.execute(
            select(func.sum(Obligation.total_amount - Obligation.amount_funded))
            .where(
                and_(
                    obligation_filter,
                    Obligation.due_date < datetime.utcnow(),
                    Obligation.status.notin_(["completed", "cancelled", "expired"])
                )
            )
        )
        total_overdue = overdue_result.scalar() or Decimal("0")

        return BalanceSummary(
            case_id=effective_case_id,
            petitioner_id=petitioner_id or "",
            respondent_id=respondent_id or "",
            petitioner_balance=petitioner_paid,
            respondent_balance=respondent_paid,
            petitioner_owes_respondent=petitioner_owes,
            respondent_owes_petitioner=respondent_owes,
            net_balance=respondent_owes - petitioner_owes,  # Positive = respondent owes more
            total_obligations_open=metrics.total_open,
            total_obligations_funded=metrics.total_funded,
            total_obligations_completed=metrics.total_completed,
            total_this_month=total_this_month,
            total_overdue=total_overdue,
        )


class LedgerService:
    """Service for FIFO ledger management."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def get_ledger_entries(
        self,
        case_id: str,
        user: User,
        page: int = 1,
        page_size: int = 50
    ) -> Tuple[list[PaymentLedger], int]:
        """Get paginated ledger entries for a case."""
        # Build query
        query = (
            select(PaymentLedger)
            .where(PaymentLedger.case_id == case_id)
            .order_by(PaymentLedger.effective_date.desc())
        )

        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Paginate
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        entries = list(result.scalars().all())

        return entries, total

    async def get_ledger_history(
        self,
        case_id: str,
        filters: "LedgerFilters",
        page: int = 1,
        page_size: int = 50
    ) -> dict:
        """Get paginated ledger history for court access.

        Unlike get_ledger_entries, this doesn't require user access verification
        because it's intended for court professional access where auth is
        handled by the endpoint.
        """
        # Build query
        query = (
            select(PaymentLedger)
            .where(PaymentLedger.case_id == case_id)
            .order_by(PaymentLedger.effective_date.desc())
        )

        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        entries = list(result.scalars().all())

        return {
            "items": entries,
            "total": total,
            "has_more": (page * page_size) < total
        }

    async def record_prepayment(
        self,
        case_id: str,
        amount: Decimal,
        description: str,
        user: User,
        stripe_payment_intent_id: Optional[str] = None
    ) -> PaymentLedger:
        """Record a prepayment credit."""
        try:
            # Get other parent
            result = await self.db.execute(
                select(CaseParticipant)
                .where(
                    and_(
                        CaseParticipant.case_id == case_id,
                        CaseParticipant.user_id != user.id,
                        CaseParticipant.is_active == True
                    )
                )
            )
            other_parent = result.scalar_one_or_none()
            other_parent_id = other_parent.user_id if other_parent else user.id

            entry = PaymentLedger(
                case_id=case_id,
                entry_type="credit",
                obligor_id=user.id,
                obligee_id=other_parent_id,
                amount=amount,
                running_balance=Decimal("0"),
                credit_source="prepayment",
                fifo_remaining=amount,  # Available for FIFO application
                description=description,
                effective_date=datetime.utcnow(),
            )
            self.db.add(entry)

            await self.db.commit()
            await self.db.refresh(entry)
            return entry

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to record prepayment: {str(e)}"
            ) from e

    async def get_running_balance(
        self,
        case_id: str,
        parent_id: str
    ) -> Decimal:
        """Get running balance for a parent in a case."""
        result = await self.db.execute(
            select(func.sum(PaymentLedger.amount))
            .where(
                and_(
                    PaymentLedger.case_id == case_id,
                    PaymentLedger.obligor_id == parent_id
                )
            )
        )
        return result.scalar() or Decimal("0")

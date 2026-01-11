"""
Wallet Service - Core business logic for wallet operations.

This service manages:
1. Parent wallet creation with Stripe Connect Express
2. Wallet funding (deposits via card/ACH)
3. Balance calculation from transaction ledger
4. Obligation payments from wallet or direct card
5. Payout processing when obligations are fully funded
6. Child wallet management and guest contributions
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List, Tuple
from uuid import uuid4

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.wallet import (
    Wallet,
    WalletTransaction,
    WalletFunding,
    ChildWalletContribution,
    Payout,
    WALLET_TYPES,
    OWNER_TYPES,
    TRANSACTION_TYPES,
    TRANSACTION_STATUSES,
    PAYMENT_SOURCES,
    PAYOUT_STATUSES,
)
from app.models.clearfund import Obligation
from app.models.user import User
from app.models.child import Child
from app.services.stripe_service import stripe_service


class WalletService:
    """
    Wallet service for all wallet operations.

    Handles both parent (Stripe Connect) and child (internal ledger) wallets.
    """

    # =========================================================================
    # Wallet Creation and Management
    # =========================================================================

    async def create_parent_wallet(
        self,
        db: AsyncSession,
        user_id: str,
        email: str,
        family_file_id: Optional[str] = None,
        display_name: Optional[str] = None,
    ) -> Wallet:
        """
        Create a parent wallet backed by Stripe Connect Express.

        Args:
            db: Database session
            user_id: Parent user ID
            email: User's email for Stripe
            family_file_id: Optional family file context
            display_name: Optional display name

        Returns:
            Created Wallet object

        Raises:
            ValueError: If user already has a wallet
        """
        # Check if wallet already exists
        existing = await self.get_wallet_by_owner(db, "parent", user_id)
        if existing:
            raise ValueError("User already has a wallet")

        # Create wallet record first (Stripe account created on onboarding)
        wallet = Wallet(
            id=str(uuid4()),
            owner_type="parent",
            owner_id=user_id,
            family_file_id=family_file_id,
            wallet_type="parent_connect",
            display_name=display_name,
            stripe_account_status="pending",
            is_active=True,
        )

        db.add(wallet)
        await db.flush()

        return wallet

    async def start_stripe_onboarding(
        self,
        db: AsyncSession,
        wallet: Wallet,
        email: str,
        refresh_url: Optional[str] = None,
        return_url: Optional[str] = None,
    ) -> Tuple[str, datetime]:
        """
        Start or resume Stripe Connect onboarding.

        Creates Stripe account if needed, then generates onboarding link.

        Args:
            db: Database session
            wallet: Wallet to onboard
            email: User's email
            refresh_url: URL if link expires
            return_url: URL after completion

        Returns:
            Tuple of (onboarding_url, expires_at)
        """
        # Create Stripe account if not yet created
        if not wallet.stripe_account_id:
            account_id, status = await stripe_service.create_connect_account(
                user_id=wallet.owner_id,
                email=email,
                wallet_id=wallet.id,
            )
            wallet.stripe_account_id = account_id
            wallet.stripe_account_status = "onboarding"
            wallet.onboarding_started_at = datetime.utcnow()

        # Generate onboarding link
        url, expires_at = await stripe_service.create_account_link(
            account_id=wallet.stripe_account_id,
            wallet_id=wallet.id,
            refresh_url=refresh_url,
            return_url=return_url,
        )

        await db.flush()

        return url, expires_at

    async def sync_stripe_account(
        self,
        db: AsyncSession,
        wallet: Wallet,
    ) -> Dict[str, Any]:
        """
        Sync wallet with Stripe account status.

        Updates onboarding status, charges/payouts enabled, bank info.

        Returns:
            Dict with updated account info
        """
        if not wallet.stripe_account_id:
            raise ValueError("Wallet has no Stripe account")

        account = await stripe_service.get_account(wallet.stripe_account_id)

        # Update wallet from Stripe
        wallet.charges_enabled = account["charges_enabled"]
        wallet.payouts_enabled = account["payouts_enabled"]
        wallet.bank_last_four = account.get("bank_last_four")
        wallet.bank_name = account.get("bank_name")

        # Determine status
        requirements = account.get("requirements", {})
        currently_due = requirements.get("currently_due", [])

        if wallet.charges_enabled and wallet.payouts_enabled:
            wallet.stripe_account_status = "active"
            if not wallet.onboarding_completed:
                wallet.onboarding_completed = True
                wallet.onboarding_completed_at = datetime.utcnow()
        elif currently_due:
            wallet.stripe_account_status = "restricted"
        else:
            wallet.stripe_account_status = "onboarding"

        await db.flush()

        return {
            "id": wallet.id,
            "stripe_account_id": wallet.stripe_account_id,
            "status": wallet.stripe_account_status,
            "charges_enabled": wallet.charges_enabled,
            "payouts_enabled": wallet.payouts_enabled,
            "onboarding_completed": wallet.onboarding_completed,
            "bank_last_four": wallet.bank_last_four,
            "bank_name": wallet.bank_name,
            "requirements": requirements,
        }

    async def create_child_wallet(
        self,
        db: AsyncSession,
        child_id: str,
        family_file_id: str,
        display_name: Optional[str] = None,
    ) -> Wallet:
        """
        Create a child wallet (internal ledger only).

        Child wallets don't have Stripe accounts. They track
        gifts from parents and circle members.
        """
        # Check if wallet already exists
        existing = await self.get_wallet_by_owner(db, "child", child_id)
        if existing:
            raise ValueError("Child already has a wallet")

        wallet = Wallet(
            id=str(uuid4()),
            owner_type="child",
            owner_id=child_id,
            family_file_id=family_file_id,
            wallet_type="child_ledger",
            display_name=display_name,
            # Child wallets are "ready" by default (no Stripe)
            onboarding_completed=True,
            charges_enabled=False,  # Can't charge to child wallet
            payouts_enabled=False,  # Can't payout from child wallet
            is_active=True,
        )

        db.add(wallet)
        await db.flush()

        return wallet

    async def get_wallet_by_id(
        self,
        db: AsyncSession,
        wallet_id: str,
    ) -> Optional[Wallet]:
        """Get wallet by ID."""
        result = await db.execute(
            select(Wallet).where(Wallet.id == wallet_id)
        )
        return result.scalar_one_or_none()

    async def get_wallet_by_owner(
        self,
        db: AsyncSession,
        owner_type: str,
        owner_id: str,
    ) -> Optional[Wallet]:
        """Get wallet by owner type and ID."""
        result = await db.execute(
            select(Wallet).where(
                and_(
                    Wallet.owner_type == owner_type,
                    Wallet.owner_id == owner_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_user_wallet(
        self,
        db: AsyncSession,
        user_id: str,
    ) -> Optional[Wallet]:
        """Get parent wallet for a user."""
        return await self.get_wallet_by_owner(db, "parent", user_id)

    async def get_child_wallet(
        self,
        db: AsyncSession,
        child_id: str,
    ) -> Optional[Wallet]:
        """Get child wallet."""
        return await self.get_wallet_by_owner(db, "child", child_id)

    async def get_family_wallets(
        self,
        db: AsyncSession,
        family_file_id: str,
    ) -> List[Wallet]:
        """Get all wallets in a family file."""
        result = await db.execute(
            select(Wallet).where(
                Wallet.family_file_id == family_file_id
            ).order_by(Wallet.owner_type, Wallet.created_at)
        )
        return list(result.scalars().all())

    # =========================================================================
    # Balance Calculation
    # =========================================================================

    async def calculate_balance(
        self,
        db: AsyncSession,
        wallet_id: str,
    ) -> Dict[str, Decimal]:
        """
        Calculate wallet balance from completed transactions.

        Balance = sum of credit transactions - sum of debit transactions

        Returns:
            Dict with current_balance, available_balance, pending_balance, held_balance
        """
        # Define credit and debit transaction types
        credit_types = ["deposit_card", "deposit_ach", "payout_received", "gift_received", "refund"]
        debit_types = ["payment_to_obligation", "transfer_out", "fee"]

        # Calculate completed credits
        credit_result = await db.execute(
            select(func.coalesce(func.sum(WalletTransaction.net_amount), 0)).where(
                and_(
                    WalletTransaction.wallet_id == wallet_id,
                    WalletTransaction.status == "completed",
                    WalletTransaction.transaction_type.in_(credit_types),
                )
            )
        )
        total_credits = Decimal(str(credit_result.scalar() or 0))

        # Calculate completed debits
        debit_result = await db.execute(
            select(func.coalesce(func.sum(WalletTransaction.amount), 0)).where(
                and_(
                    WalletTransaction.wallet_id == wallet_id,
                    WalletTransaction.status == "completed",
                    WalletTransaction.transaction_type.in_(debit_types),
                )
            )
        )
        total_debits = Decimal(str(debit_result.scalar() or 0))

        # Calculate pending deposits
        pending_result = await db.execute(
            select(func.coalesce(func.sum(WalletTransaction.net_amount), 0)).where(
                and_(
                    WalletTransaction.wallet_id == wallet_id,
                    WalletTransaction.status.in_(["pending", "processing"]),
                    WalletTransaction.transaction_type.in_(credit_types),
                )
            )
        )
        pending_balance = Decimal(str(pending_result.scalar() or 0))

        # Calculate held balance (payments in progress)
        held_result = await db.execute(
            select(func.coalesce(func.sum(WalletTransaction.amount), 0)).where(
                and_(
                    WalletTransaction.wallet_id == wallet_id,
                    WalletTransaction.status.in_(["pending", "processing"]),
                    WalletTransaction.transaction_type.in_(debit_types),
                )
            )
        )
        held_balance = Decimal(str(held_result.scalar() or 0))

        current_balance = total_credits - total_debits
        available_balance = current_balance - held_balance

        return {
            "current_balance": current_balance,
            "available_balance": max(available_balance, Decimal(0)),
            "pending_balance": pending_balance,
            "held_balance": held_balance,
        }

    async def get_balance_response(
        self,
        db: AsyncSession,
        wallet: Wallet,
    ) -> Dict[str, Any]:
        """Get balance with wallet details for API response."""
        balances = await self.calculate_balance(db, wallet.id)

        return {
            "wallet_id": wallet.id,
            **balances,
        }

    # =========================================================================
    # Deposits (Fund Wallet)
    # =========================================================================

    async def deposit_funds(
        self,
        db: AsyncSession,
        wallet: Wallet,
        amount: Decimal,
        payment_method: str,
        payment_method_id: str,
        customer_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> WalletTransaction:
        """
        Deposit funds to parent wallet via card or ACH.

        Args:
            wallet: Parent wallet to fund
            amount: Deposit amount
            payment_method: "card" or "ach"
            payment_method_id: Stripe payment method ID
            customer_id: Stripe customer ID (optional)
            idempotency_key: Idempotency key

        Returns:
            WalletTransaction record
        """
        if not wallet.is_parent_wallet:
            raise ValueError("Can only deposit to parent wallets")

        if not wallet.charges_enabled:
            raise ValueError("Wallet is not ready for payments. Complete onboarding first.")

        # Calculate fee
        fee_amount = stripe_service.calculate_stripe_fee(amount, payment_method)
        net_amount = amount - fee_amount

        # Create transaction record first
        transaction_type = f"deposit_{payment_method}"
        transaction = WalletTransaction(
            id=str(uuid4()),
            wallet_id=wallet.id,
            transaction_type=transaction_type,
            amount=amount,
            currency="USD",
            description=f"Deposit via {payment_method}",
            status="pending",
            fee_amount=fee_amount,
            net_amount=net_amount,
            source_type="external",
            source_id=payment_method_id,
        )
        db.add(transaction)
        await db.flush()

        # Generate idempotency key if not provided
        if not idempotency_key:
            idempotency_key = f"deposit_{transaction.id}"

        try:
            # Create Stripe Payment Intent
            payment_result = await stripe_service.create_payment_intent(
                amount=amount,
                payment_method_id=payment_method_id,
                customer_id=customer_id,
                metadata={
                    "wallet_id": wallet.id,
                    "transaction_id": transaction.id,
                    "type": "wallet_deposit",
                },
                idempotency_key=idempotency_key,
                confirm=True,
            )

            # Update transaction with Stripe details
            transaction.stripe_payment_intent_id = payment_result["payment_intent_id"]
            transaction.stripe_charge_id = payment_result.get("charge_id")

            if payment_result["status"] == "succeeded":
                transaction.mark_completed()
                # Update balance_after
                balances = await self.calculate_balance(db, wallet.id)
                transaction.balance_after = balances["current_balance"]
            elif payment_result.get("requires_action"):
                transaction.status = "processing"
                transaction.extra_data = {
                    "requires_action": True,
                    "client_secret": payment_result.get("client_secret"),
                }
            else:
                transaction.status = "processing"

            await db.flush()
            return transaction

        except Exception as e:
            transaction.mark_failed(str(e))
            await db.flush()
            raise

    async def complete_deposit(
        self,
        db: AsyncSession,
        transaction_id: str,
        payment_intent_id: str,
    ) -> WalletTransaction:
        """
        Complete a deposit after 3D Secure or async processing.

        Called by webhook handler when payment succeeds.
        """
        # Get transaction
        result = await db.execute(
            select(WalletTransaction).where(
                WalletTransaction.id == transaction_id
            )
        )
        transaction = result.scalar_one_or_none()

        if not transaction:
            raise ValueError(f"Transaction not found: {transaction_id}")

        if transaction.status == "completed":
            return transaction

        # Get payment intent status from Stripe
        pi = await stripe_service.get_payment_intent(payment_intent_id)

        if pi["status"] == "succeeded":
            transaction.mark_completed()
            transaction.stripe_charge_id = pi.get("charge_id")

            # Update balance_after
            balances = await self.calculate_balance(db, transaction.wallet_id)
            transaction.balance_after = balances["current_balance"]
        elif pi["status"] in ["canceled", "requires_payment_method"]:
            transaction.mark_failed(f"Payment {pi['status']}")

        await db.flush()
        return transaction

    # =========================================================================
    # Obligation Payments
    # =========================================================================

    async def pay_obligation(
        self,
        db: AsyncSession,
        wallet: Optional[Wallet],
        payer_id: str,
        obligation_id: str,
        amount: Decimal,
        payment_source: str,
        payment_method_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> WalletFunding:
        """
        Pay obligation from wallet balance or direct card/ACH.

        Args:
            wallet: Payer's wallet (required for wallet payment, optional for card/ach)
            payer_id: User ID of payer
            obligation_id: Obligation to pay
            amount: Payment amount
            payment_source: "wallet", "card", or "ach"
            payment_method_id: Stripe payment method (required for card/ach)
            idempotency_key: Idempotency key

        Returns:
            WalletFunding record
        """
        # Get obligation
        result = await db.execute(
            select(Obligation).where(Obligation.id == obligation_id)
        )
        obligation = result.scalar_one_or_none()

        if not obligation:
            raise ValueError(f"Obligation not found: {obligation_id}")

        if obligation.status in ["completed", "cancelled", "expired"]:
            raise ValueError(f"Obligation is {obligation.status}")

        # Validate amount
        remaining = obligation.total_amount - obligation.amount_funded
        if amount > remaining:
            raise ValueError(f"Amount ${amount} exceeds remaining ${remaining}")

        # Create funding record
        funding = WalletFunding(
            id=str(uuid4()),
            obligation_id=obligation_id,
            wallet_id=wallet.id if wallet else None,
            payer_id=payer_id,
            amount=amount,
            payment_source=payment_source,
            status="pending",
        )
        db.add(funding)

        if not idempotency_key:
            idempotency_key = f"obligation_{funding.id}"

        try:
            if payment_source == "wallet":
                # Pay from wallet balance
                await self._pay_from_wallet(
                    db, wallet, funding, obligation, amount, idempotency_key
                )
            else:
                # Direct card or ACH payment
                await self._pay_direct(
                    db, wallet, funding, obligation, amount,
                    payment_source, payment_method_id, idempotency_key
                )

            await db.flush()

            # Check if obligation is now fully funded
            await self._check_and_process_full_funding(db, obligation)

            return funding

        except Exception as e:
            funding.mark_failed(str(e))
            await db.flush()
            raise

    async def _pay_from_wallet(
        self,
        db: AsyncSession,
        wallet: Wallet,
        funding: WalletFunding,
        obligation: Obligation,
        amount: Decimal,
        idempotency_key: str,
    ) -> None:
        """Pay obligation from wallet balance."""
        if not wallet:
            raise ValueError("Wallet required for wallet payment")

        # Check balance
        balances = await self.calculate_balance(db, wallet.id)
        if balances["available_balance"] < amount:
            raise ValueError(
                f"Insufficient balance. Available: ${balances['available_balance']}, "
                f"Required: ${amount}"
            )

        # Create wallet transaction (debit)
        transaction = WalletTransaction(
            id=str(uuid4()),
            wallet_id=wallet.id,
            transaction_type="payment_to_obligation",
            amount=amount,
            currency="USD",
            description=f"Payment to {obligation.title}",
            status="completed",
            fee_amount=Decimal(0),  # No fee for wallet-to-wallet
            net_amount=amount,
            obligation_id=obligation.id,
            destination_type="obligation",
            destination_id=obligation.id,
        )
        transaction.mark_completed()
        db.add(transaction)
        await db.flush()

        # Update balance_after
        balances = await self.calculate_balance(db, wallet.id)
        transaction.balance_after = balances["current_balance"]

        # Update funding
        funding.wallet_transaction_id = transaction.id
        funding.mark_completed()

        # Update obligation
        obligation.amount_funded += amount
        if obligation.amount_funded >= obligation.total_amount:
            obligation.status = "funded"
            obligation.funded_at = datetime.utcnow()
        elif obligation.amount_funded > 0:
            obligation.status = "partially_funded"

    async def _pay_direct(
        self,
        db: AsyncSession,
        wallet: Optional[Wallet],
        funding: WalletFunding,
        obligation: Obligation,
        amount: Decimal,
        payment_source: str,
        payment_method_id: str,
        idempotency_key: str,
    ) -> None:
        """Pay obligation directly with card or ACH."""
        if not payment_method_id:
            raise ValueError(f"Payment method required for {payment_source} payment")

        # Calculate fee (paid by sender)
        fee_amount = stripe_service.calculate_stripe_fee(amount, payment_source)
        total_charge = amount + fee_amount

        # Create Stripe Payment Intent
        payment_result = await stripe_service.create_payment_intent(
            amount=total_charge,
            payment_method_id=payment_method_id,
            metadata={
                "obligation_id": obligation.id,
                "funding_id": funding.id,
                "payer_id": funding.payer_id,
                "type": "obligation_payment",
            },
            idempotency_key=idempotency_key,
            confirm=True,
        )

        # Update funding with Stripe details
        funding.stripe_payment_intent_id = payment_result["payment_intent_id"]
        funding.stripe_charge_id = payment_result.get("charge_id")

        if payment_result["status"] == "succeeded":
            funding.mark_completed()

            # Update obligation
            obligation.amount_funded += amount
            if obligation.amount_funded >= obligation.total_amount:
                obligation.status = "funded"
                obligation.funded_at = datetime.utcnow()
            elif obligation.amount_funded > 0:
                obligation.status = "partially_funded"

        elif payment_result.get("requires_action"):
            funding.status = "processing"
            funding.extra_data = {
                "requires_action": True,
                "client_secret": payment_result.get("client_secret"),
            }
        else:
            funding.status = "processing"

    async def _check_and_process_full_funding(
        self,
        db: AsyncSession,
        obligation: Obligation,
    ) -> Optional[Payout]:
        """Check if obligation is fully funded and process payout."""
        if not obligation.is_fully_funded:
            return None

        # Get requesting parent's wallet
        result = await db.execute(
            select(Wallet).where(
                and_(
                    Wallet.owner_type == "parent",
                    Wallet.owner_id == obligation.created_by,
                    Wallet.is_active == True,
                )
            )
        )
        recipient_wallet = result.scalar_one_or_none()

        if not recipient_wallet:
            # No wallet to pay out to - record error in obligation notes
            obligation.notes = (obligation.notes or "") + "\nPayout failed: No recipient wallet found."
            await db.flush()
            return None

        if not recipient_wallet.is_ready_for_payouts:
            obligation.notes = (obligation.notes or "") + "\nPayout pending: Recipient wallet not ready."
            await db.flush()
            return None

        # Create payout
        return await self.create_payout(
            db=db,
            obligation=obligation,
            recipient_wallet=recipient_wallet,
            auto_approve=True,  # Auto-approve since we're processing immediately
        )

    # =========================================================================
    # Payouts
    # =========================================================================

    async def create_payout(
        self,
        db: AsyncSession,
        obligation: Obligation,
        recipient_wallet: Wallet,
        auto_approve: bool = False,
    ) -> Payout:
        """
        Create payout for fully funded obligation.

        Args:
            obligation: Fully funded obligation
            recipient_wallet: Wallet to receive payout
            auto_approve: Whether to auto-approve and process

        Returns:
            Payout record
        """
        # Check if payout already exists
        existing = await db.execute(
            select(Payout).where(Payout.obligation_id == obligation.id)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Payout already exists for this obligation")

        if not obligation.is_fully_funded:
            raise ValueError("Obligation is not fully funded")

        if not recipient_wallet.stripe_account_id:
            raise ValueError("Recipient wallet has no Stripe account")

        # Calculate amounts (no platform fee per requirements)
        gross_amount = obligation.total_amount
        fee_amount = Decimal(0)
        net_amount = gross_amount - fee_amount

        payout = Payout(
            id=str(uuid4()),
            obligation_id=obligation.id,
            recipient_wallet_id=recipient_wallet.id,
            recipient_user_id=recipient_wallet.owner_id,
            gross_amount=gross_amount,
            fee_amount=fee_amount,
            net_amount=net_amount,
            status="pending",
            requires_approval=not auto_approve,
        )
        db.add(payout)
        await db.flush()

        if auto_approve:
            await self.process_payout(db, payout, recipient_wallet)

        return payout

    async def approve_payout(
        self,
        db: AsyncSession,
        payout_id: str,
        approved_by: str,
    ) -> Payout:
        """Approve a pending payout for processing."""
        result = await db.execute(
            select(Payout)
            .options(selectinload(Payout.recipient_wallet))
            .where(Payout.id == payout_id)
        )
        payout = result.scalar_one_or_none()

        if not payout:
            raise ValueError(f"Payout not found: {payout_id}")

        if payout.status != "pending":
            raise ValueError(f"Payout is {payout.status}, cannot approve")

        payout.approve(approved_by)
        await db.flush()

        # Process immediately after approval
        await self.process_payout(db, payout, payout.recipient_wallet)

        return payout

    async def process_payout(
        self,
        db: AsyncSession,
        payout: Payout,
        recipient_wallet: Wallet,
    ) -> None:
        """Process approved payout via Stripe Transfer."""
        if payout.status not in ["pending", "processing"]:
            raise ValueError(f"Payout cannot be processed: {payout.status}")

        payout.status = "processing"
        payout.processing_at = datetime.utcnow()

        try:
            # Create Stripe Transfer to Connect account
            transfer_result = await stripe_service.create_transfer(
                amount=payout.net_amount,
                destination_account_id=recipient_wallet.stripe_account_id,
                obligation_id=payout.obligation_id,
                metadata={
                    "payout_id": payout.id,
                    "recipient_user_id": payout.recipient_user_id,
                },
                idempotency_key=f"payout_{payout.id}",
            )

            payout.stripe_transfer_id = transfer_result["transfer_id"]
            payout.status = "in_transit"

            # Create transaction record in recipient wallet
            transaction = WalletTransaction(
                id=str(uuid4()),
                wallet_id=recipient_wallet.id,
                transaction_type="payout_received",
                amount=payout.net_amount,
                currency="USD",
                description=f"Payout for obligation",
                status="completed",
                fee_amount=Decimal(0),
                net_amount=payout.net_amount,
                obligation_id=payout.obligation_id,
                payout_id=payout.id,
                stripe_transfer_id=payout.stripe_transfer_id,
                source_type="platform",
                source_id="clearfund",
            )
            transaction.mark_completed()
            db.add(transaction)

            # Update balance_after
            await db.flush()
            balances = await self.calculate_balance(db, recipient_wallet.id)
            transaction.balance_after = balances["current_balance"]

            await db.flush()

        except Exception as e:
            payout.mark_failed(str(e))
            await db.flush()
            raise

    async def complete_payout(
        self,
        db: AsyncSession,
        payout_id: str,
        stripe_payout_id: Optional[str] = None,
    ) -> Payout:
        """
        Mark payout as completed (called by webhook).
        """
        result = await db.execute(
            select(Payout).where(Payout.id == payout_id)
        )
        payout = result.scalar_one_or_none()

        if not payout:
            raise ValueError(f"Payout not found: {payout_id}")

        payout.stripe_payout_id = stripe_payout_id
        payout.mark_completed()
        await db.flush()

        return payout

    # =========================================================================
    # Child Wallet Contributions
    # =========================================================================

    async def create_child_contribution(
        self,
        db: AsyncSession,
        child_wallet: Wallet,
        child_id: str,
        family_file_id: str,
        contributor_name: str,
        contributor_email: str,
        amount: Decimal,
        payment_method_id: str,
        purpose: Optional[str] = None,
        message: Optional[str] = None,
        contributor_user_id: Optional[str] = None,
        contributor_circle_contact_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> ChildWalletContribution:
        """
        Create a guest contribution to child wallet.

        Circle members can contribute without accounts.
        Uses Stripe guest checkout flow.
        """
        if not child_wallet.is_child_wallet:
            raise ValueError("Can only contribute to child wallets")

        # Calculate fee (sender pays)
        fee_amount = stripe_service.calculate_stripe_fee(amount, "card")
        net_amount = amount - fee_amount
        total_charge = amount  # Charge full amount, net goes to child

        # Create contribution record
        contribution = ChildWalletContribution(
            id=str(uuid4()),
            child_wallet_id=child_wallet.id,
            child_id=child_id,
            family_file_id=family_file_id,
            contributor_name=contributor_name,
            contributor_email=contributor_email,
            contributor_user_id=contributor_user_id,
            contributor_circle_contact_id=contributor_circle_contact_id,
            amount=amount,
            fee_amount=fee_amount,
            net_amount=net_amount,
            purpose=purpose,
            message=message,
            status="pending",
        )
        db.add(contribution)
        await db.flush()

        if not idempotency_key:
            idempotency_key = f"child_contrib_{contribution.id}"

        try:
            # Create Stripe Payment Intent
            payment_result = await stripe_service.create_payment_intent(
                amount=total_charge,
                payment_method_id=payment_method_id,
                metadata={
                    "contribution_id": contribution.id,
                    "child_wallet_id": child_wallet.id,
                    "child_id": child_id,
                    "contributor_name": contributor_name,
                    "type": "child_contribution",
                },
                idempotency_key=idempotency_key,
                confirm=True,
            )

            contribution.stripe_payment_intent_id = payment_result["payment_intent_id"]
            contribution.stripe_charge_id = payment_result.get("charge_id")

            if payment_result["status"] == "succeeded":
                await self._complete_child_contribution(db, contribution, child_wallet)
            elif payment_result.get("requires_action"):
                contribution.status = "processing"
                contribution.extra_data = {
                    "requires_action": True,
                    "client_secret": payment_result.get("client_secret"),
                }
            else:
                contribution.status = "processing"

            await db.flush()
            return contribution

        except Exception as e:
            contribution.status = "failed"
            contribution.failed_at = datetime.utcnow()
            contribution.failure_reason = str(e)
            await db.flush()
            raise

    async def _complete_child_contribution(
        self,
        db: AsyncSession,
        contribution: ChildWalletContribution,
        child_wallet: Wallet,
    ) -> None:
        """Complete child contribution and create wallet transaction."""
        # Create wallet transaction (credit to child wallet)
        transaction = WalletTransaction(
            id=str(uuid4()),
            wallet_id=child_wallet.id,
            transaction_type="gift_received",
            amount=contribution.amount,
            currency="USD",
            description=f"Gift from {contribution.contributor_name}",
            status="completed",
            fee_amount=contribution.fee_amount,
            net_amount=contribution.net_amount,
            stripe_payment_intent_id=contribution.stripe_payment_intent_id,
            stripe_charge_id=contribution.stripe_charge_id,
            source_type="circle_member",
            source_id=contribution.contributor_email,
        )
        transaction.mark_completed()
        db.add(transaction)
        await db.flush()

        # Update balance_after
        balances = await self.calculate_balance(db, child_wallet.id)
        transaction.balance_after = balances["current_balance"]

        # Update contribution
        contribution.wallet_transaction_id = transaction.id
        contribution.status = "completed"
        contribution.completed_at = datetime.utcnow()

    async def complete_child_contribution(
        self,
        db: AsyncSession,
        contribution_id: str,
        payment_intent_id: str,
    ) -> ChildWalletContribution:
        """Complete contribution after 3D Secure (called by webhook)."""
        result = await db.execute(
            select(ChildWalletContribution).where(
                ChildWalletContribution.id == contribution_id
            )
        )
        contribution = result.scalar_one_or_none()

        if not contribution:
            raise ValueError(f"Contribution not found: {contribution_id}")

        if contribution.status == "completed":
            return contribution

        # Get wallet
        wallet = await self.get_wallet_by_id(db, contribution.child_wallet_id)
        if not wallet:
            raise ValueError("Child wallet not found")

        # Verify payment succeeded
        pi = await stripe_service.get_payment_intent(payment_intent_id)

        if pi["status"] == "succeeded":
            contribution.stripe_charge_id = pi.get("charge_id")
            await self._complete_child_contribution(db, contribution, wallet)
        elif pi["status"] in ["canceled", "requires_payment_method"]:
            contribution.status = "failed"
            contribution.failed_at = datetime.utcnow()
            contribution.failure_reason = f"Payment {pi['status']}"

        await db.flush()
        return contribution

    # =========================================================================
    # Transaction History
    # =========================================================================

    async def get_transactions(
        self,
        db: AsyncSession,
        wallet_id: str,
        transaction_type: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[WalletTransaction], int]:
        """Get paginated transaction history for a wallet."""
        query = select(WalletTransaction).where(
            WalletTransaction.wallet_id == wallet_id
        )

        # Apply filters
        if transaction_type:
            query = query.where(WalletTransaction.transaction_type == transaction_type)
        if status:
            query = query.where(WalletTransaction.status == status)
        if start_date:
            query = query.where(WalletTransaction.created_at >= start_date)
        if end_date:
            query = query.where(WalletTransaction.created_at <= end_date)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(WalletTransaction.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await db.execute(query)
        transactions = list(result.scalars().all())

        return transactions, total

    async def get_child_contributions(
        self,
        db: AsyncSession,
        child_wallet_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[ChildWalletContribution], int]:
        """Get paginated contributions to a child wallet."""
        query = select(ChildWalletContribution).where(
            ChildWalletContribution.child_wallet_id == child_wallet_id
        )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(ChildWalletContribution.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await db.execute(query)
        contributions = list(result.scalars().all())

        return contributions, total

    # =========================================================================
    # Payouts List
    # =========================================================================

    async def get_user_payouts(
        self,
        db: AsyncSession,
        user_id: str,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Payout], int]:
        """Get paginated payout history for a user."""
        query = select(Payout).where(
            Payout.recipient_user_id == user_id
        )

        if status:
            query = query.where(Payout.status == status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(Payout.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await db.execute(query)
        payouts = list(result.scalars().all())

        return payouts, total

    # =========================================================================
    # Analytics
    # =========================================================================

    async def get_wallet_analytics(
        self,
        db: AsyncSession,
        wallet_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Get analytics for a wallet."""
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            # Default to last 30 days
            from datetime import timedelta
            start_date = end_date - timedelta(days=30)

        date_filter = and_(
            WalletTransaction.wallet_id == wallet_id,
            WalletTransaction.status == "completed",
            WalletTransaction.created_at >= start_date,
            WalletTransaction.created_at <= end_date,
        )

        # Total deposits
        deposits_result = await db.execute(
            select(
                func.count().label("count"),
                func.coalesce(func.sum(WalletTransaction.net_amount), 0).label("total"),
            ).where(
                and_(
                    date_filter,
                    WalletTransaction.transaction_type.in_(["deposit_card", "deposit_ach"]),
                )
            )
        )
        deposits = deposits_result.first()

        # Total payments
        payments_result = await db.execute(
            select(
                func.count().label("count"),
                func.coalesce(func.sum(WalletTransaction.amount), 0).label("total"),
            ).where(
                and_(
                    date_filter,
                    WalletTransaction.transaction_type == "payment_to_obligation",
                )
            )
        )
        payments = payments_result.first()

        # Total payouts received
        payouts_result = await db.execute(
            select(
                func.count().label("count"),
                func.coalesce(func.sum(WalletTransaction.net_amount), 0).label("total"),
            ).where(
                and_(
                    date_filter,
                    WalletTransaction.transaction_type == "payout_received",
                )
            )
        )
        payouts = payouts_result.first()

        # Total fees
        fees_result = await db.execute(
            select(func.coalesce(func.sum(WalletTransaction.fee_amount), 0)).where(
                date_filter
            )
        )
        total_fees = fees_result.scalar() or 0

        # Current balance
        balances = await self.calculate_balance(db, wallet_id)

        # Pending obligations
        wallet = await self.get_wallet_by_id(db, wallet_id)
        if wallet and wallet.is_parent_wallet:
            pending_oblig_result = await db.execute(
                select(
                    func.count().label("count"),
                    func.coalesce(func.sum(Obligation.total_amount - Obligation.amount_funded), 0).label("total"),
                ).where(
                    and_(
                        Obligation.created_by == wallet.owner_id,
                        Obligation.status.in_(["open", "partially_funded"]),
                    )
                )
            )
            pending = pending_oblig_result.first()
            pending_count = pending.count if pending else 0
            pending_amount = pending.total if pending else 0
        else:
            pending_count = 0
            pending_amount = 0

        return {
            "wallet_id": wallet_id,
            "period_start": start_date,
            "period_end": end_date,
            "total_deposits": Decimal(str(deposits.total)) if deposits else Decimal(0),
            "total_payments": Decimal(str(payments.total)) if payments else Decimal(0),
            "total_payouts_received": Decimal(str(payouts.total)) if payouts else Decimal(0),
            "total_fees": Decimal(str(total_fees)),
            "deposit_count": deposits.count if deposits else 0,
            "payment_count": payments.count if payments else 0,
            "payout_count": payouts.count if payouts else 0,
            "average_deposit": (
                Decimal(str(deposits.total)) / deposits.count
                if deposits and deposits.count > 0 else Decimal(0)
            ),
            "average_payment": (
                Decimal(str(payments.total)) / payments.count
                if payments and payments.count > 0 else Decimal(0)
            ),
            "current_balance": balances["current_balance"],
            "pending_obligations": pending_count,
            "pending_obligations_amount": Decimal(str(pending_amount)),
        }


# Create global service instance
wallet_service = WalletService()

"""
Stripe service - Abstracts all Stripe API interactions.

This service wraps the Stripe SDK to provide:
1. Connect account management (Express accounts for parents)
2. Payment processing (deposits, obligation payments)
3. Transfer and payout management
4. Webhook event handling

All Stripe interactions should go through this service for:
- Centralized API key management
- Consistent error handling
- Easy mocking in tests
- Audit logging
"""

import stripe
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple

from app.core.config import settings


# Initialize Stripe with the secret key
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """
    Stripe service for all Stripe API interactions.

    This service handles:
    - Connect Express account creation and onboarding
    - Payment Intent creation for deposits and payments
    - Transfers to Connect accounts (payouts)
    - Webhook event verification
    """

    def __init__(self):
        """Initialize Stripe service with API key."""
        stripe.api_key = settings.STRIPE_SECRET_KEY

    # =========================================================================
    # Connect Account Operations (Parent Wallets)
    # =========================================================================

    async def create_connect_account(
        self,
        user_id: str,
        email: str,
        wallet_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, str]:
        """
        Create a Stripe Connect Express account for a parent.

        Args:
            user_id: CommonGround user ID
            email: User's email address
            wallet_id: Wallet ID for reference
            metadata: Additional metadata to store

        Returns:
            Tuple of (account_id, account_status)

        Raises:
            stripe.error.StripeError: If account creation fails
        """
        account = stripe.Account.create(
            type="express",
            email=email,
            metadata={
                "user_id": user_id,
                "wallet_id": wallet_id,
                "platform": "commonground",
                **(metadata or {}),
            },
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            settings={
                "payouts": {
                    "schedule": {
                        "interval": "daily",  # Automatic daily payouts
                    },
                },
            },
        )

        return account.id, account.get("status", "pending")

    async def create_account_link(
        self,
        account_id: str,
        wallet_id: str,
        refresh_url: Optional[str] = None,
        return_url: Optional[str] = None,
    ) -> Tuple[str, datetime]:
        """
        Create an onboarding link for Connect account.

        Args:
            account_id: Stripe Connect account ID
            wallet_id: Wallet ID for URL construction
            refresh_url: URL if link expires (regenerate)
            return_url: URL after onboarding completes

        Returns:
            Tuple of (onboarding_url, expires_at)
        """
        base_url = settings.FRONTEND_URL

        if not refresh_url:
            refresh_url = f"{base_url}/wallet/onboarding?wallet_id={wallet_id}"
        if not return_url:
            return_url = f"{base_url}/wallet?wallet_id={wallet_id}&onboarding=complete"

        account_link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=refresh_url,
            return_url=return_url,
            type="account_onboarding",
        )

        # Account links expire in 5 minutes
        expires_at = datetime.utcnow() + timedelta(minutes=5)

        return account_link.url, expires_at

    async def get_account(self, account_id: str) -> Dict[str, Any]:
        """
        Get Connect account details.

        Returns dict with:
        - id: Account ID
        - status: Account status
        - charges_enabled: Can accept payments
        - payouts_enabled: Can receive payouts
        - requirements: Pending requirements
        - external_accounts: Linked bank accounts
        """
        account = stripe.Account.retrieve(account_id)

        # Get bank account info if available
        bank_last_four = None
        bank_name = None
        if account.external_accounts and account.external_accounts.data:
            bank = account.external_accounts.data[0]
            bank_last_four = bank.get("last4")
            bank_name = bank.get("bank_name")

        return {
            "id": account.id,
            "status": account.get("status", "pending"),
            "charges_enabled": account.charges_enabled,
            "payouts_enabled": account.payouts_enabled,
            "requirements": {
                "currently_due": account.requirements.get("currently_due", []) if account.requirements else [],
                "eventually_due": account.requirements.get("eventually_due", []) if account.requirements else [],
                "past_due": account.requirements.get("past_due", []) if account.requirements else [],
            },
            "bank_last_four": bank_last_four,
            "bank_name": bank_name,
        }

    async def create_login_link(self, account_id: str) -> str:
        """
        Create a login link for the Express dashboard.

        Returns:
            URL to the Express dashboard
        """
        login_link = stripe.Account.create_login_link(account_id)
        return login_link.url

    # =========================================================================
    # Payment Intent Operations (Deposits and Payments)
    # =========================================================================

    async def create_payment_intent(
        self,
        amount: Decimal,
        payment_method_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        capture_method: str = "automatic",
        confirm: bool = True,
    ) -> Dict[str, Any]:
        """
        Create a Payment Intent for deposits or direct payments.

        Args:
            amount: Amount in dollars (will be converted to cents)
            payment_method_id: Stripe payment method ID
            customer_id: Stripe customer ID (optional)
            metadata: Additional metadata
            idempotency_key: Idempotency key to prevent duplicates
            capture_method: "automatic" or "manual"
            confirm: Whether to confirm immediately

        Returns:
            Dict with payment_intent_id, client_secret, status, etc.
        """
        amount_cents = int(amount * 100)

        params = {
            "amount": amount_cents,
            "currency": "usd",
            "metadata": metadata or {},
            "capture_method": capture_method,
        }

        if payment_method_id:
            params["payment_method"] = payment_method_id

        if customer_id:
            params["customer"] = customer_id

        if confirm and payment_method_id:
            params["confirm"] = True
            params["return_url"] = f"{settings.FRONTEND_URL}/payments?payment=complete"

        # Add idempotency key to prevent duplicate charges
        stripe_params = {}
        if idempotency_key:
            stripe_params["idempotency_key"] = idempotency_key

        payment_intent = stripe.PaymentIntent.create(**params, **stripe_params)

        return {
            "payment_intent_id": payment_intent.id,
            "client_secret": payment_intent.client_secret,
            "status": payment_intent.status,
            "amount": amount,
            "amount_received": Decimal(payment_intent.amount_received) / 100 if payment_intent.amount_received else Decimal(0),
            "charge_id": payment_intent.latest_charge,
            "requires_action": payment_intent.status == "requires_action",
        }

    async def confirm_payment_intent(
        self,
        payment_intent_id: str,
        payment_method_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Confirm a Payment Intent.

        Returns updated payment intent status.
        """
        params = {}
        if payment_method_id:
            params["payment_method"] = payment_method_id

        payment_intent = stripe.PaymentIntent.confirm(payment_intent_id, **params)

        return {
            "payment_intent_id": payment_intent.id,
            "status": payment_intent.status,
            "charge_id": payment_intent.latest_charge,
            "requires_action": payment_intent.status == "requires_action",
        }

    async def get_payment_intent(self, payment_intent_id: str) -> Dict[str, Any]:
        """
        Get Payment Intent details.
        """
        pi = stripe.PaymentIntent.retrieve(payment_intent_id)

        return {
            "payment_intent_id": pi.id,
            "status": pi.status,
            "amount": Decimal(pi.amount) / 100,
            "amount_received": Decimal(pi.amount_received) / 100 if pi.amount_received else Decimal(0),
            "charge_id": pi.latest_charge,
            "metadata": pi.metadata,
        }

    async def cancel_payment_intent(self, payment_intent_id: str) -> bool:
        """
        Cancel a Payment Intent.

        Returns True if cancelled successfully.
        """
        try:
            stripe.PaymentIntent.cancel(payment_intent_id)
            return True
        except stripe.error.InvalidRequestError:
            return False

    # =========================================================================
    # Transfer Operations (Payouts to Connect Accounts)
    # =========================================================================

    async def create_transfer(
        self,
        amount: Decimal,
        destination_account_id: str,
        obligation_id: str,
        metadata: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a transfer to a Connect account (payout).

        This transfers funds from the platform to a parent's Connect account.

        Args:
            amount: Amount in dollars
            destination_account_id: Stripe Connect account ID
            obligation_id: Obligation ID for reference
            metadata: Additional metadata
            idempotency_key: Idempotency key

        Returns:
            Dict with transfer_id, status, etc.
        """
        amount_cents = int(amount * 100)

        stripe_params = {}
        if idempotency_key:
            stripe_params["idempotency_key"] = idempotency_key

        transfer = stripe.Transfer.create(
            amount=amount_cents,
            currency="usd",
            destination=destination_account_id,
            metadata={
                "obligation_id": obligation_id,
                "platform": "commonground",
                **(metadata or {}),
            },
            **stripe_params,
        )

        return {
            "transfer_id": transfer.id,
            "amount": amount,
            "status": transfer.get("status", "pending"),
            "destination_account_id": destination_account_id,
        }

    async def get_transfer(self, transfer_id: str) -> Dict[str, Any]:
        """
        Get transfer details.
        """
        transfer = stripe.Transfer.retrieve(transfer_id)

        return {
            "transfer_id": transfer.id,
            "amount": Decimal(transfer.amount) / 100,
            "status": transfer.get("status", "pending"),
            "destination_account_id": transfer.destination,
            "metadata": transfer.metadata,
        }

    # =========================================================================
    # Balance Operations
    # =========================================================================

    async def get_connect_balance(self, account_id: str) -> Dict[str, Any]:
        """
        Get balance for a Connect account.

        Returns available and pending balances.
        """
        balance = stripe.Balance.retrieve(stripe_account=account_id)

        available = Decimal(0)
        pending = Decimal(0)

        for bal in balance.available:
            if bal.currency == "usd":
                available += Decimal(bal.amount) / 100

        for bal in balance.pending:
            if bal.currency == "usd":
                pending += Decimal(bal.amount) / 100

        return {
            "available_balance": available,
            "pending_balance": pending,
        }

    # =========================================================================
    # Customer Operations
    # =========================================================================

    async def create_customer(
        self,
        email: str,
        name: Optional[str] = None,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create a Stripe Customer.

        Returns dict with customer details.
        """
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={
                "user_id": user_id or "",
                "platform": "commonground",
                **(metadata or {}),
            },
        )

        return {
            "id": customer.id,
            "email": customer.email,
            "name": customer.name,
        }

    async def attach_payment_method(
        self,
        payment_method_id: str,
        customer_id: str,
    ) -> bool:
        """
        Attach a payment method to a customer.

        Returns True if attached successfully.
        """
        try:
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id,
            )
            return True
        except stripe.error.StripeError:
            return False

    async def list_payment_methods(
        self,
        customer_id: str,
        type: str = "card",
    ) -> list:
        """
        List payment methods for a customer.
        """
        methods = stripe.PaymentMethod.list(
            customer=customer_id,
            type=type,
        )

        return [
            {
                "id": pm.id,
                "type": pm.type,
                "card": {
                    "brand": pm.card.brand if pm.card else None,
                    "last4": pm.card.last4 if pm.card else None,
                    "exp_month": pm.card.exp_month if pm.card else None,
                    "exp_year": pm.card.exp_year if pm.card else None,
                } if pm.card else None,
            }
            for pm in methods.data
        ]

    # =========================================================================
    # Subscription Operations
    # =========================================================================

    async def create_subscription_checkout(
        self,
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        trial_days: int = 0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session for subscription.

        Args:
            customer_id: Stripe Customer ID
            price_id: Stripe Price ID for the subscription
            success_url: Redirect URL after successful payment
            cancel_url: Redirect URL if user cancels
            trial_days: Number of trial days (0 for no trial)
            metadata: Additional metadata

        Returns:
            Dict with checkout session ID and URL
        """
        params = {
            "customer": customer_id,
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {
                "platform": "commonground",
                **(metadata or {}),
            },
            "subscription_data": {
                "metadata": {
                    "platform": "commonground",
                    **(metadata or {}),
                },
            },
        }

        if trial_days > 0:
            params["subscription_data"]["trial_period_days"] = trial_days

        session = stripe.checkout.Session.create(**params)

        return {
            "id": session.id,
            "url": session.url,
            "customer": customer_id,
        }

    async def create_customer_portal_session(
        self,
        customer_id: str,
        return_url: str,
    ) -> str:
        """
        Create a Stripe Customer Portal session.

        Allows users to manage their subscription, update payment methods, etc.

        Args:
            customer_id: Stripe Customer ID
            return_url: URL to return to after portal session

        Returns:
            Portal session URL
        """
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )

        return session.url

    async def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True,
    ) -> Dict[str, Any]:
        """
        Cancel a subscription.

        Args:
            subscription_id: Stripe Subscription ID
            at_period_end: If True, cancel at end of period. If False, cancel immediately.

        Returns:
            Dict with subscription status and cancel_at date
        """
        if at_period_end:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True,
            )
        else:
            subscription = stripe.Subscription.cancel(subscription_id)

        return {
            "id": subscription.id,
            "status": subscription.status,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "cancel_at": datetime.fromtimestamp(subscription.cancel_at) if subscription.cancel_at else None,
            "canceled_at": datetime.fromtimestamp(subscription.canceled_at) if subscription.canceled_at else None,
        }

    async def reactivate_subscription(
        self,
        subscription_id: str,
    ) -> Dict[str, Any]:
        """
        Reactivate a subscription that was cancelled but hasn't ended yet.

        Args:
            subscription_id: Stripe Subscription ID

        Returns:
            Dict with subscription status
        """
        subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=False,
        )

        return {
            "id": subscription.id,
            "status": subscription.status,
            "cancel_at_period_end": subscription.cancel_at_period_end,
        }

    async def get_subscription(
        self,
        subscription_id: str,
    ) -> Dict[str, Any]:
        """
        Get subscription details.

        Args:
            subscription_id: Stripe Subscription ID

        Returns:
            Dict with subscription details
        """
        subscription = stripe.Subscription.retrieve(subscription_id)

        # Access items via dict-style (sub["items"]) not attribute (sub.items)
        items_data = subscription.get("items", {}).get("data", [])

        return {
            "id": subscription.id,
            "status": subscription.status,
            "current_period_start": datetime.fromtimestamp(subscription.current_period_start),
            "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "cancel_at": datetime.fromtimestamp(subscription.cancel_at) if subscription.cancel_at else None,
            "canceled_at": datetime.fromtimestamp(subscription.canceled_at) if subscription.canceled_at else None,
            "trial_start": datetime.fromtimestamp(subscription.trial_start) if subscription.trial_start else None,
            "trial_end": datetime.fromtimestamp(subscription.trial_end) if subscription.trial_end else None,
            "items": [
                {
                    "price_id": item["price"]["id"],
                    "product_id": item["price"]["product"],
                }
                for item in items_data
            ],
        }

    async def get_customer_subscriptions(
        self,
        customer_id: str,
    ) -> list[Dict[str, Any]]:
        """
        Get all subscriptions for a customer.

        Args:
            customer_id: Stripe Customer ID

        Returns:
            List of subscription details
        """
        subscriptions = stripe.Subscription.list(customer=customer_id, limit=10)

        result = []
        for sub in subscriptions.data:
            # Access items via dict-style access (sub["items"]) not attribute (sub.items)
            items_data = sub.get("items", {}).get("data", [])
            price_id = items_data[0]["price"]["id"] if items_data else None

            result.append({
                "id": sub.id,
                "status": sub.status,
                "current_period_start": sub.current_period_start,
                "current_period_end": sub.current_period_end,
                "cancel_at_period_end": sub.cancel_at_period_end,
                "price_id": price_id,
            })

        return result

    async def update_subscription_price(
        self,
        subscription_id: str,
        new_price_id: str,
        proration_behavior: str = "create_prorations",
    ) -> Dict[str, Any]:
        """
        Update a subscription to a new price (plan change).

        This is used for upgrades/downgrades where the user already has
        an active subscription and payment method on file.

        Args:
            subscription_id: Stripe Subscription ID
            new_price_id: New Stripe Price ID to switch to
            proration_behavior: How to handle prorations
                - "create_prorations" (default): Charge/credit the difference
                - "none": No proration, new price starts next billing cycle
                - "always_invoice": Invoice immediately

        Returns:
            Dict with updated subscription details
        """
        # Get current subscription to find the item ID
        subscription = stripe.Subscription.retrieve(subscription_id)

        # Access items via dict-style (sub["items"]) not attribute (sub.items)
        items_data = subscription.get("items", {}).get("data", [])
        if not items_data:
            raise ValueError("Subscription has no items")

        # Get the subscription item ID (there's typically one item per subscription)
        item_id = items_data[0]["id"]

        # Update the subscription with the new price
        updated_subscription = stripe.Subscription.modify(
            subscription_id,
            items=[{
                "id": item_id,
                "price": new_price_id,
            }],
            proration_behavior=proration_behavior,
        )

        # Get updated items
        updated_items = updated_subscription.get("items", {}).get("data", [])
        updated_price_id = updated_items[0]["price"]["id"] if updated_items else None

        return {
            "id": updated_subscription.id,
            "status": updated_subscription.status,
            "current_period_start": updated_subscription.current_period_start,
            "current_period_end": updated_subscription.current_period_end,
            "price_id": updated_price_id,
        }

    # =========================================================================
    # Webhook Operations
    # =========================================================================

    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        webhook_secret: Optional[str] = None,
    ) -> stripe.Event:
        """
        Verify webhook signature and construct event.

        Args:
            payload: Raw request body
            signature: Stripe-Signature header
            webhook_secret: Webhook secret (defaults to settings)

        Returns:
            Verified Stripe Event

        Raises:
            stripe.error.SignatureVerificationError: If signature is invalid
            ValueError: If payload is invalid
        """
        secret = webhook_secret or settings.STRIPE_WEBHOOK_SECRET

        event = stripe.Webhook.construct_event(
            payload, signature, secret
        )

        return event

    def handle_webhook_event(self, event: stripe.Event) -> Dict[str, Any]:
        """
        Parse webhook event into standard format.

        Returns dict with event type and relevant data.
        """
        event_type = event.type
        data = event.data.object

        result = {
            "event_id": event.id,
            "event_type": event_type,
            "livemode": event.livemode,
            "created": event.created,
        }

        # Handle specific event types
        if event_type == "payment_intent.succeeded":
            result.update({
                "payment_intent_id": data.id,
                "amount": Decimal(data.amount) / 100,
                "charge_id": data.latest_charge,
                "metadata": data.metadata,
            })

        elif event_type == "payment_intent.payment_failed":
            result.update({
                "payment_intent_id": data.id,
                "failure_message": data.last_payment_error.message if data.last_payment_error else None,
                "failure_code": data.last_payment_error.code if data.last_payment_error else None,
                "metadata": data.metadata,
            })

        elif event_type == "account.updated":
            result.update({
                "account_id": data.id,
                "charges_enabled": data.charges_enabled,
                "payouts_enabled": data.payouts_enabled,
                "requirements_due": data.requirements.currently_due if data.requirements else [],
            })

        elif event_type == "transfer.created":
            result.update({
                "transfer_id": data.id,
                "amount": Decimal(data.amount) / 100,
                "destination": data.destination,
                "metadata": data.metadata,
            })

        elif event_type == "transfer.paid":
            result.update({
                "transfer_id": data.id,
                "metadata": data.metadata,
            })

        elif event_type == "payout.paid":
            result.update({
                "payout_id": data.id,
                "amount": Decimal(data.amount) / 100,
                "arrival_date": data.arrival_date,
            })

        elif event_type == "payout.failed":
            result.update({
                "payout_id": data.id,
                "failure_message": data.failure_message,
                "failure_code": data.failure_code,
            })

        # Subscription Events
        elif event_type in ("customer.subscription.created", "customer.subscription.updated"):
            # Access items via dict-style (data["items"]) not attribute (data.items)
            items_data = data.get("items", {}).get("data", [])
            price_id = items_data[0]["price"]["id"] if items_data else None
            product_id = items_data[0]["price"]["product"] if items_data else None

            result.update({
                "subscription_id": data.id,
                "customer_id": data.customer,
                "status": data.status,
                "current_period_start": data.current_period_start,
                "current_period_end": data.current_period_end,
                "cancel_at_period_end": data.cancel_at_period_end,
                "cancel_at": data.cancel_at,
                "canceled_at": data.canceled_at,
                "price_id": price_id,
                "product_id": product_id,
                "metadata": dict(data.metadata) if data.metadata else {},
            })

        elif event_type == "customer.subscription.deleted":
            result.update({
                "subscription_id": data.id,
                "customer_id": data.customer,
                "status": data.status,
                "canceled_at": data.canceled_at,
                "metadata": dict(data.metadata) if data.metadata else {},
            })

        elif event_type == "invoice.paid":
            result.update({
                "invoice_id": data.id,
                "customer_id": data.customer,
                "subscription_id": data.subscription,
                "amount_paid": Decimal(data.amount_paid) / 100 if data.amount_paid else Decimal(0),
                "status": data.status,
                "billing_reason": data.billing_reason,
            })

        elif event_type == "invoice.payment_failed":
            result.update({
                "invoice_id": data.id,
                "customer_id": data.customer,
                "subscription_id": data.subscription,
                "amount_due": Decimal(data.amount_due) / 100 if data.amount_due else Decimal(0),
                "attempt_count": data.attempt_count,
                "next_payment_attempt": data.next_payment_attempt,
            })

        elif event_type == "checkout.session.completed":
            result.update({
                "session_id": data.id,
                "customer_id": data.customer,
                "subscription_id": data.subscription,
                "mode": data.mode,
                "payment_status": data.payment_status,
                "metadata": dict(data.metadata) if data.metadata else {},
            })

        return result

    # =========================================================================
    # Fee Calculation
    # =========================================================================

    def calculate_stripe_fee(
        self,
        amount: Decimal,
        payment_method: str = "card",
    ) -> Decimal:
        """
        Calculate estimated Stripe fee for a payment.

        Stripe fees (as of 2024):
        - Card: 2.9% + $0.30
        - ACH: 0.8% (capped at $5)

        Args:
            amount: Payment amount in dollars
            payment_method: "card" or "ach"

        Returns:
            Estimated fee amount
        """
        if payment_method == "ach":
            fee = amount * Decimal("0.008")  # 0.8%
            return min(fee, Decimal("5.00"))  # Capped at $5
        else:
            # Card: 2.9% + $0.30
            return (amount * Decimal("0.029")) + Decimal("0.30")


# Create global service instance
stripe_service = StripeService()

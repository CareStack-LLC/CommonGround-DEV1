'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { walletAPI, Obligation, WalletWithBalance } from '@/lib/api';
import {
  Wallet,
  CreditCard,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  ArrowRight,
  Receipt,
  Lock,
  Info
} from 'lucide-react';

// Load Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

interface PayObligationModalProps {
  obligation: Obligation;
  wallet: WalletWithBalance | null;
  userShare: number; // Amount this user owes
  onSuccess?: () => void;
  onClose: () => void;
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num);
}

// Card element styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      '::placeholder': {
        color: '#9ca3af',
      },
    },
    invalid: {
      color: '#dc2626',
      iconColor: '#dc2626',
    },
  },
  hidePostalCode: false,
};

function PayObligationModalInner({
  obligation,
  wallet,
  userShare,
  onSuccess,
  onClose
}: PayObligationModalProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [paymentSource, setPaymentSource] = useState<'wallet' | 'card'>(
    wallet?.onboarding_completed ? 'wallet' : 'card'
  );
  const [amount, setAmount] = useState<string>(userShare.toFixed(2));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const walletBalance = wallet ? parseFloat(wallet.available_balance || wallet.balance?.available || '0') : 0;
  const paymentAmount = parseFloat(amount) || 0;
  const canPayFromWallet = wallet?.onboarding_completed && walletBalance >= paymentAmount;

  // Calculate card fee
  const cardFee = paymentAmount > 0 ? paymentAmount * 0.029 + 0.30 : 0;

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
    setError(null);
  };

  const handleCardChange = (event: any) => {
    setCardComplete(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (paymentAmount > userShare) {
      setError('Amount exceeds your share');
      return;
    }

    if (paymentSource === 'wallet' && !canPayFromWallet) {
      setError('Insufficient wallet balance');
      return;
    }

    if (paymentSource === 'card') {
      if (!stripe || !elements) {
        setError('Payment system not ready. Please try again.');
        return;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError('Card input not found');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      let paymentMethodId: string | undefined;

      // For card payments, create PaymentMethod first
      if (paymentSource === 'card' && stripe && elements) {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card input not found');
        }

        const { error: stripeError, paymentMethod: pm } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
        });

        if (stripeError) {
          setError(stripeError.message || 'Card verification failed');
          setIsLoading(false);
          return;
        }

        if (!pm) {
          setError('Could not process card');
          setIsLoading(false);
          return;
        }

        paymentMethodId = pm.id;
      }

      // Call backend to process payment
      const result = await walletAPI.payObligation({
        obligation_id: obligation.id,
        amount: paymentAmount,
        payment_source: paymentSource,
        payment_method_id: paymentMethodId,
      });

      // Handle 3D Secure if required
      if (result.requires_action && result.client_secret && stripe) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          result.client_secret
        );

        if (confirmError) {
          setError(confirmError.message || 'Payment confirmation failed');
          setIsLoading(false);
          return;
        }
      }

      setSuccess(true);
      if (onSuccess) {
        // Wait for database to propagate, then trigger success callback
        setTimeout(onSuccess, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if submit should be disabled
  const isSubmitDisabled = isLoading ||
    paymentAmount <= 0 ||
    (paymentSource === 'card' && (!stripe || !cardComplete));

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-cg-success-subtle flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-cg-success" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Payment Successful!</h3>
          <p className="text-muted-foreground mb-4">
            {formatCurrency(paymentAmount)} has been applied to this obligation.
          </p>
          <button onClick={onClose} className="cg-btn-primary">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cg-sage-subtle flex items-center justify-center">
                <Receipt className="h-5 w-5 text-cg-sage" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Pay Obligation</h2>
                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {obligation.description}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Amount Summary */}
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Your Share</span>
              <span className="font-mono font-medium">{formatCurrency(userShare)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Already Paid</span>
              <span className="font-mono text-muted-foreground">
                {formatCurrency(0)} {/* TODO: Calculate from funding records */}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Payment Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 text-xl font-mono bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-cg-sage/20 focus:border-cg-sage"
              />
            </div>
            <button
              type="button"
              onClick={() => setAmount(userShare.toFixed(2))}
              className="text-sm text-cg-sage mt-2 hover:underline"
            >
              Pay full share
            </button>
          </div>

          {/* Payment Source */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Pay From
            </label>
            <div className="space-y-2">
              {/* Wallet Option */}
              <button
                type="button"
                onClick={() => setPaymentSource('wallet')}
                disabled={!wallet?.onboarding_completed}
                className={`w-full p-4 rounded-xl border-2 transition-colors flex items-center gap-3 ${
                  paymentSource === 'wallet'
                    ? 'border-cg-sage bg-cg-sage-subtle'
                    : 'border-border hover:border-border/80'
                } ${!wallet?.onboarding_completed ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Wallet className={`h-5 w-5 ${paymentSource === 'wallet' ? 'text-cg-sage' : 'text-muted-foreground'}`} />
                <div className="text-left flex-1">
                  <p className="font-medium text-foreground">Wallet Balance</p>
                  <p className="text-sm text-muted-foreground">
                    {wallet?.onboarding_completed
                      ? `Available: ${formatCurrency(walletBalance)} - No fees`
                      : 'Set up wallet to use'
                    }
                  </p>
                </div>
                {wallet?.onboarding_completed && paymentAmount > walletBalance && (
                  <span className="text-xs text-cg-error">Insufficient</span>
                )}
              </button>

              {/* Card Option */}
              <button
                type="button"
                onClick={() => setPaymentSource('card')}
                className={`w-full p-4 rounded-xl border-2 transition-colors flex items-center gap-3 ${
                  paymentSource === 'card'
                    ? 'border-cg-sage bg-cg-sage-subtle'
                    : 'border-border hover:border-border/80'
                }`}
              >
                <CreditCard className={`h-5 w-5 ${paymentSource === 'card' ? 'text-cg-sage' : 'text-muted-foreground'}`} />
                <div className="text-left flex-1">
                  <p className="font-medium text-foreground">Credit/Debit Card</p>
                  <p className="text-sm text-muted-foreground">2.9% + $0.30 processing fee</p>
                </div>
              </button>
            </div>
          </div>

          {/* Card Input - Only show when card is selected */}
          {paymentSource === 'card' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Card Details
              </label>
              <div className="p-4 bg-card border border-border rounded-xl">
                <CardElement
                  options={cardElementOptions}
                  onChange={handleCardChange}
                />
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Secured by Stripe</span>
              </div>
            </div>
          )}

          {/* Fee Info - Only show for card payments with amount */}
          {paymentSource === 'card' && paymentAmount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
              <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p>Card payments incur a processing fee.</p>
                <p className="mt-1 text-foreground font-medium">
                  Fee: {formatCurrency(cardFee)} | Total: {formatCurrency(paymentAmount + cardFee)}
                </p>
              </div>
            </div>
          )}

          {/* No fee info for wallet */}
          {paymentSource === 'wallet' && paymentAmount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-cg-sage-subtle rounded-xl">
              <CheckCircle className="h-5 w-5 text-cg-sage flex-shrink-0 mt-0.5" />
              <div className="text-sm text-cg-sage">
                <p className="font-medium">No processing fees</p>
                <p className="text-cg-sage/80">Pay directly from your wallet balance.</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
              <AlertCircle className="h-5 w-5 text-cg-error flex-shrink-0" />
              <p className="text-sm text-cg-error">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cg-btn-secondary flex-1"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cg-btn-primary flex-1 inline-flex items-center justify-center gap-2"
              disabled={isSubmitDisabled}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay {formatCurrency(paymentAmount)}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Wrapper with Stripe Elements
export default function PayObligationModal(props: PayObligationModalProps) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-cg-warning-subtle flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-cg-warning" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Payment Not Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Stripe is not configured. Please contact support.
          </p>
          <button onClick={props.onClose} className="cg-btn-secondary">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PayObligationModalInner {...props} />
    </Elements>
  );
}

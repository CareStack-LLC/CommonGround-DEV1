'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { walletAPI } from '@/lib/api';
import {
  CreditCard,
  Building2,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Lock
} from 'lucide-react';

// Load Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

interface DepositFormProps {
  walletId: string;
  onSuccess?: (amount: number) => void;
  onCancel?: () => void;
}

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

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

function DepositFormInner({
  walletId,
  onSuccess,
  onCancel
}: DepositFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ach'>('card');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
    setError(null);
  };

  const handlePresetClick = (presetAmount: number) => {
    setAmount(presetAmount.toString());
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

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount < 5) {
      setError('Minimum deposit is $5.00');
      return;
    }

    if (numAmount > 10000) {
      setError('Maximum deposit is $10,000.00');
      return;
    }

    if (!stripe || !elements) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card input not found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create PaymentMethod
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

      // Call backend to create deposit
      const result = await walletAPI.deposit(walletId, {
        amount: numAmount,
        payment_method_id: pm.id,
        payment_method: 'card'
      });

      // Check if additional action required (3D Secure)
      if (result.requires_action && result.client_secret) {
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
        setTimeout(() => onSuccess(numAmount), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process deposit');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-cg-success-subtle flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-cg-success" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Deposit Successful!</h3>
        <p className="text-muted-foreground">
          ${parseFloat(amount).toFixed(2)} has been added to your wallet.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Deposit Amount
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            className="w-full pl-10 pr-4 py-3 text-2xl font-mono bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-cg-sage/20 focus:border-cg-sage transition-colors"
          />
        </div>

        {/* Preset Amounts */}
        <div className="flex flex-wrap gap-2 mt-3">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                amount === preset.toString()
                  ? 'bg-cg-sage text-white'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Method Toggle */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Payment Method
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`p-4 rounded-xl border-2 transition-colors flex items-center gap-3 ${
              paymentMethod === 'card'
                ? 'border-cg-sage bg-cg-sage-subtle'
                : 'border-border hover:border-border/80'
            }`}
          >
            <CreditCard className={`h-5 w-5 ${paymentMethod === 'card' ? 'text-cg-sage' : 'text-muted-foreground'}`} />
            <div className="text-left">
              <p className="font-medium text-foreground">Card</p>
              <p className="text-xs text-muted-foreground">Instant</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('ach')}
            disabled
            className="p-4 rounded-xl border-2 border-border opacity-50 cursor-not-allowed flex items-center gap-3"
          >
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium text-foreground">Bank</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </button>
        </div>
      </div>

      {/* Card Input */}
      {paymentMethod === 'card' && (
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

      {/* Fee Info */}
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p>
            Card deposits incur a 2.9% + $0.30 processing fee.
          </p>
          {amount && parseFloat(amount) >= 5 && (
            <p className="mt-1 text-foreground font-medium">
              Fee: ${(parseFloat(amount) * 0.029 + 0.30).toFixed(2)} |
              Net: ${(parseFloat(amount) - (parseFloat(amount) * 0.029 + 0.30)).toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
          <AlertCircle className="h-5 w-5 text-cg-error flex-shrink-0" />
          <p className="text-sm text-cg-error">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="cg-btn-secondary flex-1"
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="cg-btn-primary flex-1 inline-flex items-center justify-center gap-2"
          disabled={isLoading || !amount || !stripe || !cardComplete}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Add ${amount || '0.00'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// Wrapper with Stripe Elements
export default function DepositForm(props: DepositFormProps) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-cg-warning-subtle flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-cg-warning" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Payment Not Configured</h3>
        <p className="text-sm text-muted-foreground">
          Stripe is not configured. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <DepositFormInner {...props} />
    </Elements>
  );
}

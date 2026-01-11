'use client';

import { useState } from 'react';
import { walletAPI } from '@/lib/api';
import {
  CreditCard,
  Building2,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

interface DepositFormProps {
  walletId: string;
  onSuccess?: (amount: number) => void;
  onCancel?: () => void;
}

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export default function DepositForm({
  walletId,
  onSuccess,
  onCancel
}: DepositFormProps) {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ach'>('card');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAmountChange = (value: string) => {
    // Only allow valid currency input
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

    setIsLoading(true);
    setError(null);

    try {
      // Note: In production, you would use Stripe Elements to collect payment method
      // For now, we'll show a placeholder message
      // const result = await walletAPI.deposit(walletId, {
      //   amount: numAmount,
      //   payment_method_id: 'pm_xxx', // From Stripe Elements
      //   payment_method_type: paymentMethod === 'ach' ? 'us_bank_account' : 'card'
      // });

      // Simulate success for UI demo
      await new Promise(resolve => setTimeout(resolve, 1500));
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

      {/* Payment Method */}
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
            className={`p-4 rounded-xl border-2 transition-colors flex items-center gap-3 ${
              paymentMethod === 'ach'
                ? 'border-cg-sage bg-cg-sage-subtle'
                : 'border-border hover:border-border/80'
            }`}
          >
            <Building2 className={`h-5 w-5 ${paymentMethod === 'ach' ? 'text-cg-sage' : 'text-muted-foreground'}`} />
            <div className="text-left">
              <p className="font-medium text-foreground">Bank</p>
              <p className="text-xs text-muted-foreground">3-5 days</p>
            </div>
          </button>
        </div>
      </div>

      {/* Fee Info */}
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p>
            {paymentMethod === 'card'
              ? 'Card deposits incur a 2.9% + $0.30 processing fee.'
              : 'Bank transfers have a $0.80 flat fee (max $5).'
            }
          </p>
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
          disabled={isLoading || !amount}
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

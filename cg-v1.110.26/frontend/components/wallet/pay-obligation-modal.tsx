'use client';

import { useState } from 'react';
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
  Receipt
} from 'lucide-react';

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

export default function PayObligationModal({
  obligation,
  wallet,
  userShare,
  onSuccess,
  onClose
}: PayObligationModalProps) {
  const [paymentSource, setPaymentSource] = useState<'wallet' | 'card'>(
    wallet?.onboarding_completed ? 'wallet' : 'card'
  );
  const [amount, setAmount] = useState<string>(userShare.toFixed(2));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const walletBalance = wallet ? parseFloat(wallet.balance.available) : 0;
  const paymentAmount = parseFloat(amount) || 0;
  const canPayFromWallet = wallet?.onboarding_completed && walletBalance >= paymentAmount;

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
    setError(null);
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

    setIsLoading(true);
    setError(null);

    try {
      await walletAPI.payObligation({
        obligation_id: obligation.id,
        amount: paymentAmount,
        payment_source: paymentSource,
        // payment_method_id would come from Stripe Elements for card payments
      });

      setSuccess(true);
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

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
                      ? `Available: ${formatCurrency(walletBalance)}`
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
                  <p className="text-sm text-muted-foreground">2.9% + $0.30 fee</p>
                </div>
              </button>
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
              disabled={isLoading || paymentAmount <= 0}
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

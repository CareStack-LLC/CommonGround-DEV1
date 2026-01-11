'use client';

import { useState } from 'react';
import { walletAPI, ChildWallet } from '@/lib/api';
import {
  Gift,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Heart,
  MessageSquare,
  User,
  Mail
} from 'lucide-react';

interface ContributeModalProps {
  childWallet: ChildWallet;
  isGuest?: boolean; // True for circle members without accounts
  onSuccess?: () => void;
  onClose: () => void;
}

const PRESET_AMOUNTS = [10, 25, 50, 100];
const PURPOSES = [
  { value: 'birthday', label: 'Birthday Gift' },
  { value: 'holiday', label: 'Holiday Gift' },
  { value: 'savings', label: 'Savings' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

export default function ContributeModal({
  childWallet,
  isGuest = false,
  onSuccess,
  onClose
}: ContributeModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [contributorName, setContributorName] = useState<string>('');
  const [contributorEmail, setContributorEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount < 1) {
      setError('Minimum contribution is $1.00');
      return;
    }

    if (isGuest) {
      if (!contributorName.trim()) {
        setError('Please enter your name');
        return;
      }
      if (!contributorEmail.trim() || !contributorEmail.includes('@')) {
        setError('Please enter a valid email');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      await walletAPI.contributeToChild(childWallet.child_id, {
        amount: numAmount,
        payment_method_id: 'pm_xxx', // Would come from Stripe Elements
        contributor_name: contributorName || 'Anonymous',
        contributor_email: contributorEmail,
        purpose: purpose || undefined,
        message: message || undefined,
      });

      setSuccess(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Contribution failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <Heart className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Thank You!</h3>
          <p className="text-muted-foreground mb-2">
            Your gift of {formatCurrency(parseFloat(amount))} to {childWallet.child_name} is on its way!
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            A receipt will be sent to your email.
          </p>
          <button onClick={onClose} className="cg-btn-primary">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-card rounded-2xl shadow-xl max-w-md w-full overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-border bg-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Gift className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Send Money</h2>
                <p className="text-sm text-muted-foreground">
                  To {childWallet.child_name}'s Savings
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Guest Info */}
          {isGuest && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <User className="h-4 w-4 inline mr-1" />
                  Your Name
                </label>
                <input
                  type="text"
                  value={contributorName}
                  onChange={(e) => setContributorName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Your Email
                </label>
                <input
                  type="email"
                  value={contributorEmail}
                  onChange={(e) => setContributorEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Gift Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 text-xl font-mono bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
            <div className="flex gap-2 mt-3">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    amount === preset.toString()
                      ? 'bg-purple-600 text-white'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Purpose (Optional)
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 appearance-none"
            >
              <option value="">Select a purpose...</option>
              {PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <MessageSquare className="h-4 w-4 inline mr-1" />
              Personal Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message for the child..."
              rows={3}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
            />
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
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              disabled={isLoading || !amount}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4" />
                  Send {amount ? formatCurrency(parseFloat(amount)) : 'Gift'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

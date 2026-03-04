'use client';

import { WalletWithBalance, WalletBalance } from '@/lib/api';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

interface WalletBalanceCardProps {
  wallet: WalletWithBalance | null;
  isLoading?: boolean;
  onSetupWallet?: () => void;
  onAddFunds?: () => void;
  onViewTransactions?: () => void;
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num);
}

export default function WalletBalanceCard({
  wallet,
  isLoading = false,
  onSetupWallet,
  onAddFunds,
  onViewTransactions
}: WalletBalanceCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin" />
          <p className="mt-4 text-muted-foreground font-medium">Loading wallet...</p>
        </div>
      </div>
    );
  }

  // No wallet yet - show setup prompt
  if (!wallet) {
    return (
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
              <Wallet className="h-6 w-6 text-[var(--portal-primary)]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Set Up Your Wallet</h3>
              <p className="text-sm text-muted-foreground mb-4 font-medium">
                Connect your bank account to send and receive payments through ClearFund.
              </p>
              {onSetupWallet && (
                <button
                  onClick={onSetupWallet}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644] text-white rounded-xl font-bold shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <CreditCard className="h-4 w-4" />
                  Connect Bank Account
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Wallet exists but onboarding not complete
  if (!wallet.onboarding_completed) {
    return (
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Complete Wallet Setup</h3>
              <p className="text-sm text-muted-foreground mb-4 font-medium">
                Finish connecting your bank account to start using ClearFund payments.
              </p>
              {onSetupWallet && (
                <button
                  onClick={onSetupWallet}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644] text-white rounded-xl font-bold shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Continue Setup
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="border-t-2 border-amber-200 bg-amber-50 px-6 py-3">
          <p className="text-xs text-amber-700 flex items-center gap-2 font-bold">
            <AlertCircle className="h-4 w-4" />
            Bank verification pending
          </p>
        </div>
      </div>
    );
  }

  // Backend returns current_balance and available_balance directly on wallet
  const availableBalance = parseFloat(wallet.available_balance || wallet.balance?.available || '0');
  const currentBalance = parseFloat(wallet.current_balance || wallet.balance?.total || '0');
  const pendingBalance = currentBalance - availableBalance;

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
      {/* Main Balance Section */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl flex items-center justify-center shadow-md">
              <Wallet className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Available Balance</p>
              <p className="text-3xl font-bold text-foreground font-mono tabular-nums" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                {formatCurrency(availableBalance)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {wallet.charges_enabled && wallet.payouts_enabled && (
              <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border-2 border-emerald-200 px-2.5 py-1 rounded-full font-bold">
                <CheckCircle className="h-3 w-3" />
                Active
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          {onAddFunds && (
            <button
              onClick={onAddFunds}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644] text-white rounded-xl font-bold shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <TrendingUp className="h-4 w-4" />
              Add Funds
            </button>
          )}
          {onViewTransactions && (
            <button
              onClick={onViewTransactions}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-slate-200 text-foreground rounded-xl font-bold hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300"
            >
              View History
            </button>
          )}
        </div>
      </div>

      {/* Balance Breakdown */}
      <div className="border-t-2 border-slate-200 bg-slate-50 px-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">Pending</p>
            <p className="font-mono text-sm tabular-nums font-bold">
              {formatCurrency(pendingBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">Bank Account</p>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium">
                {wallet.bank_name ? `${wallet.bank_name} ` : ''}
                {wallet.bank_last_four ? `****${wallet.bank_last_four}` : 'Connected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

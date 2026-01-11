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
      <div className="cg-card-elevated p-6">
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-muted rounded-xl" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-muted rounded mb-2" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          </div>
          <div className="h-10 w-40 bg-muted rounded mt-4" />
        </div>
      </div>
    );
  }

  // No wallet yet - show setup prompt
  if (!wallet) {
    return (
      <div className="cg-card-elevated overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cg-sage-subtle flex items-center justify-center flex-shrink-0">
              <Wallet className="h-6 w-6 text-cg-sage" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Set Up Your Wallet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your bank account to send and receive payments through ClearFund.
              </p>
              {onSetupWallet && (
                <button
                  onClick={onSetupWallet}
                  className="cg-btn-primary inline-flex items-center gap-2"
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
      <div className="cg-card-elevated overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cg-warning-subtle flex items-center justify-center flex-shrink-0">
              <Clock className="h-6 w-6 text-cg-warning" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Complete Wallet Setup</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Finish connecting your bank account to start using ClearFund payments.
              </p>
              {onSetupWallet && (
                <button
                  onClick={onSetupWallet}
                  className="cg-btn-primary inline-flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Continue Setup
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-border bg-cg-warning-subtle/30 px-6 py-3">
          <p className="text-xs text-cg-warning flex items-center gap-2">
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
    <div className="cg-card-elevated overflow-hidden">
      {/* Main Balance Section */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cg-success-subtle flex items-center justify-center">
              <Wallet className="h-6 w-6 text-cg-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-3xl font-bold text-foreground font-mono tabular-nums">
                {formatCurrency(availableBalance)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {wallet.charges_enabled && wallet.payouts_enabled && (
              <span className="flex items-center gap-1 text-xs text-cg-success bg-cg-success-subtle px-2 py-1 rounded-full">
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
              className="cg-btn-primary flex-1 inline-flex items-center justify-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Add Funds
            </button>
          )}
          {onViewTransactions && (
            <button
              onClick={onViewTransactions}
              className="cg-btn-secondary flex-1 inline-flex items-center justify-center gap-2"
            >
              View History
            </button>
          )}
        </div>
      </div>

      {/* Balance Breakdown */}
      <div className="border-t border-border bg-muted/30 px-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Pending</p>
            <p className="font-mono text-sm tabular-nums">
              {formatCurrency(pendingBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Bank Account</p>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
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

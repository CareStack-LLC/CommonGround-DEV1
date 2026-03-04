'use client';

import { ChildWallet } from '@/lib/api';
import { Gift, PiggyBank, TrendingUp, Users } from 'lucide-react';

interface ChildWalletCardProps {
  childWallet: ChildWallet;
  onContribute?: () => void;
  onViewDetails?: () => void;
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num);
}

export default function ChildWalletCard({
  childWallet,
  onContribute,
  onViewDetails
}: ChildWalletCardProps) {
  const balance = parseFloat(childWallet.balance);
  const totalReceived = parseFloat(childWallet.total_received);

  return (
    <div className="cg-card overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <PiggyBank className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{childWallet.child_name}'s Savings</h3>
              <p className="text-sm text-muted-foreground">Child Wallet</p>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="mt-4 p-4 bg-purple-50 rounded-xl">
          <p className="text-sm text-purple-600 mb-1">Current Balance</p>
          <p className="text-2xl font-bold text-purple-700 font-mono tabular-nums">
            {formatCurrency(balance)}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Total Received</span>
            </div>
            <p className="font-mono text-sm font-medium">{formatCurrency(totalReceived)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Contributors</span>
            </div>
            <p className="font-mono text-sm font-medium">{childWallet.contribution_count}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          {onContribute && (
            <button
              onClick={onContribute}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              <Gift className="h-4 w-4" />
              Send Money
            </button>
          )}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="cg-btn-secondary flex-1"
            >
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

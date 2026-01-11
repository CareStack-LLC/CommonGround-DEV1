'use client';

import { WalletTransaction } from '@/lib/api';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  Receipt,
  Gift,
  RefreshCw,
  CreditCard,
  Building2
} from 'lucide-react';

interface TransactionListProps {
  transactions: WalletTransaction[];
  isLoading?: boolean;
  emptyMessage?: string;
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(Math.abs(num));
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getTransactionIcon(type: string) {
  // Handle backend transaction types (deposit_card, deposit_ach, payout_received, etc.)
  if (type.startsWith('deposit')) {
    return ArrowDownLeft;
  }
  switch (type) {
    case 'transfer_out':
      return ArrowUpRight;
    case 'payment_to_obligation':
      return Receipt;
    case 'payout_received':
      return Building2;
    case 'gift_received':
      return Gift;
    case 'refund':
      return RefreshCw;
    default:
      return CreditCard;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return { icon: CheckCircle, color: 'text-cg-success' };
    case 'pending':
      return { icon: Clock, color: 'text-cg-warning' };
    case 'failed':
    case 'cancelled':
      return { icon: XCircle, color: 'text-cg-error' };
    default:
      return { icon: Clock, color: 'text-muted-foreground' };
  }
}

function getTransactionColor(type: string): { bg: string; text: string } {
  // Handle backend transaction types (deposit_card, deposit_ach, payout_received, etc.)
  if (type.startsWith('deposit') || type === 'payout_received') {
    return { bg: 'bg-cg-success-subtle', text: 'text-cg-success' };
  }
  switch (type) {
    case 'payment_to_obligation':
    case 'transfer_out':
    case 'fee':
      return { bg: 'bg-cg-error-subtle', text: 'text-cg-error' };
    case 'gift_received':
      return { bg: 'bg-purple-100', text: 'text-purple-600' };
    case 'refund':
      return { bg: 'bg-blue-100', text: 'text-blue-600' };
    default:
      return { bg: 'bg-muted', text: 'text-muted-foreground' };
  }
}

function isCredit(type: string): boolean {
  // Credit types: deposits, payouts received, gifts, refunds
  // Backend sends: deposit_card, deposit_ach, payout_received, gift_received, refund
  const creditTypes = ['payout_received', 'gift_received', 'refund'];
  return type.startsWith('deposit') || creditTypes.includes(type);
}

export default function TransactionList({
  transactions,
  isLoading = false,
  emptyMessage = 'No transactions yet'
}: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-card rounded-xl border border-border animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-muted rounded-lg" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-muted rounded mb-2" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
              <div className="h-5 w-20 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Receipt className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  // Group transactions by date
  const groupedTransactions: Record<string, WalletTransaction[]> = {};
  transactions.forEach((tx) => {
    const date = formatDate(tx.created_at);
    if (!groupedTransactions[date]) {
      groupedTransactions[date] = [];
    }
    groupedTransactions[date].push(tx);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groupedTransactions).map(([date, txs]) => (
        <div key={date}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">{date}</h4>
          <div className="space-y-2">
            {txs.map((tx) => {
              const Icon = getTransactionIcon(tx.transaction_type);
              const colors = getTransactionColor(tx.transaction_type);
              const statusInfo = getStatusIcon(tx.status);
              const StatusIcon = statusInfo.icon;
              const credit = isCredit(tx.transaction_type);

              return (
                <div
                  key={tx.id}
                  className="p-4 bg-card rounded-xl border border-border hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${colors.text}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {tx.description}
                        </p>
                        <StatusIcon className={`h-4 w-4 ${statusInfo.color} flex-shrink-0`} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(tx.created_at)}
                        {tx.fee_amount && parseFloat(tx.fee_amount) > 0 && (
                          <span className="ml-2">
                            Fee: {formatCurrency(tx.fee_amount)}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`font-mono text-lg tabular-nums font-medium ${
                        credit ? 'text-cg-success' : 'text-foreground'
                      }`}>
                        {credit ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      {tx.balance_after && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Bal: {formatCurrency(tx.balance_after)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

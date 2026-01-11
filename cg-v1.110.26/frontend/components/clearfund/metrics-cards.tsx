'use client';

import { ObligationMetrics, BalanceSummary } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { DollarSign, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface MetricsCardsProps {
  metrics: ObligationMetrics | null;
  balanceSummary: BalanceSummary | null;
  isLoading: boolean;
}

function formatCurrency(amount: string | number | undefined): string {
  if (!amount) return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

export default function MetricsCards({ metrics, balanceSummary, isLoading }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </Card>
        ))}
      </div>
    );
  }

  // Calculate net balance for display
  const netBalance = balanceSummary
    ? parseFloat(balanceSummary.petitioner_owes_respondent) - parseFloat(balanceSummary.respondent_owes_petitioner)
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {/* Balance Card */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="text-sm text-gray-600">Balance</span>
        </div>
        <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {netBalance >= 0 ? '+' : ''}{formatCurrency(Math.abs(netBalance))}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {netBalance > 0 ? 'Owed to you' : netBalance < 0 ? 'You owe' : 'All balanced'}
        </p>
      </Card>

      {/* Pending Card */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-gray-600">Pending</span>
        </div>
        <p className="text-2xl font-bold text-amber-600">
          {metrics?.total_pending_funding || 0}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Awaiting funding
        </p>
      </Card>

      {/* This Month Card */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-gray-600">This Month</span>
        </div>
        <p className="text-2xl font-bold text-blue-600">
          {formatCurrency(balanceSummary?.total_this_month)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Total obligations
        </p>
      </Card>

      {/* Overdue Card */}
      <Card className={`p-4 ${metrics && metrics.total_overdue > 0 ? 'bg-red-50 border-red-200' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className={`h-4 w-4 ${metrics && metrics.total_overdue > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          <span className="text-sm text-gray-600">Overdue</span>
        </div>
        <p className={`text-2xl font-bold ${metrics && metrics.total_overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          {metrics?.total_overdue || 0}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {metrics && metrics.total_overdue > 0
            ? formatCurrency(balanceSummary?.total_overdue)
            : 'None overdue'}
        </p>
      </Card>
    </div>
  );
}

'use client';

import { BalanceSummary } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { ArrowRight, TrendingUp, TrendingDown, Scale } from 'lucide-react';

interface BalanceSummaryCardProps {
  balance: BalanceSummary;
  className?: string;
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

export default function BalanceSummaryCard({ balance, className = '' }: BalanceSummaryCardProps) {
  const netBalance = parseFloat(balance.net_balance);
  const petitionerOwes = parseFloat(balance.petitioner_owes_respondent);
  const respondentOwes = parseFloat(balance.respondent_owes_petitioner);

  // Determine who owes whom
  const netOwed = petitionerOwes - respondentOwes;

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Scale className="h-5 w-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Balance Summary</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Petitioner Balance */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Petitioner Balance</p>
          <p className={`text-xl font-bold ${parseFloat(balance.petitioner_balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(balance.petitioner_balance)}
          </p>
          {petitionerOwes > 0 && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              Owes {formatCurrency(petitionerOwes)}
            </p>
          )}
        </div>

        {/* Net Balance */}
        <div className="p-4 bg-gray-50 rounded-lg flex flex-col items-center justify-center">
          <p className="text-sm text-gray-600 mb-1">Net Balance</p>
          <div className={`flex items-center gap-2 ${netOwed > 0 ? 'text-amber-600' : netOwed < 0 ? 'text-blue-600' : 'text-green-600'}`}>
            {netOwed > 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : netOwed < 0 ? (
              <TrendingDown className="h-5 w-5" />
            ) : (
              <Scale className="h-5 w-5" />
            )}
            <span className="text-xl font-bold">{formatCurrency(Math.abs(netOwed))}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {netOwed > 0 ? 'Petitioner owes Respondent' : netOwed < 0 ? 'Respondent owes Petitioner' : 'All balanced'}
          </p>
        </div>

        {/* Respondent Balance */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Respondent Balance</p>
          <p className={`text-xl font-bold ${parseFloat(balance.respondent_balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(balance.respondent_balance)}
          </p>
          {respondentOwes > 0 && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              Owes {formatCurrency(respondentOwes)}
            </p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full" />
          <span className="text-sm text-gray-600">{balance.total_obligations_open} Open</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full" />
          <span className="text-sm text-gray-600">{balance.total_obligations_funded} Funded</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-gray-600">{balance.total_obligations_completed} Completed</span>
        </div>
        {parseFloat(balance.total_this_month) > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600">This month:</span>
            <span className="text-sm font-medium text-gray-900">{formatCurrency(balance.total_this_month)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

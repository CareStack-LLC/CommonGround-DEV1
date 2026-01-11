'use client';

import { Obligation, ObligationCategory, ObligationStatus } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FundingProgress from './funding-progress';
import {
  Stethoscope,
  GraduationCap,
  Volleyball,
  Smartphone,
  Tent,
  Shirt,
  Car,
  Heart,
  Music,
  Baby,
  MoreHorizontal,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface ObligationCardProps {
  obligation: Obligation;
  onClick?: () => void;
  showActions?: boolean;
  onFund?: () => void;
  onVerify?: () => void;
}

const categoryIcons: Record<ObligationCategory, React.ReactNode> = {
  medical: <Stethoscope className="h-5 w-5" />,
  education: <GraduationCap className="h-5 w-5" />,
  sports: <Volleyball className="h-5 w-5" />,
  device: <Smartphone className="h-5 w-5" />,
  camp: <Tent className="h-5 w-5" />,
  clothing: <Shirt className="h-5 w-5" />,
  transportation: <Car className="h-5 w-5" />,
  child_support: <Heart className="h-5 w-5" />,
  extracurricular: <Music className="h-5 w-5" />,
  childcare: <Baby className="h-5 w-5" />,
  other: <MoreHorizontal className="h-5 w-5" />,
};

const categoryColors: Record<ObligationCategory, string> = {
  medical: 'bg-red-100 text-red-700 border-red-200',
  education: 'bg-blue-100 text-blue-700 border-blue-200',
  sports: 'bg-green-100 text-green-700 border-green-200',
  device: 'bg-purple-100 text-purple-700 border-purple-200',
  camp: 'bg-orange-100 text-orange-700 border-orange-200',
  clothing: 'bg-pink-100 text-pink-700 border-pink-200',
  transportation: 'bg-gray-100 text-gray-700 border-gray-200',
  child_support: 'bg-rose-100 text-rose-700 border-rose-200',
  extracurricular: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  childcare: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
};

const statusConfig: Record<ObligationStatus, { label: string; className: string; icon: React.ReactNode }> = {
  open: { label: 'Open', className: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3 w-3" /> },
  partially_funded: { label: 'Partially Funded', className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
  funded: { label: 'Funded', className: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3" /> },
  pending_verification: { label: 'Pending Verification', className: 'bg-purple-100 text-purple-800', icon: <Clock className="h-3 w-3" /> },
  verified: { label: 'Verified', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="h-3 w-3" /> },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
};

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'No due date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

export default function ObligationCard({
  obligation,
  onClick,
  showActions = false,
  onFund,
  onVerify
}: ObligationCardProps) {
  const category = obligation.purpose_category;
  const status = statusConfig[obligation.status];
  const categoryColor = categoryColors[category];
  const categoryIcon = categoryIcons[category];

  const needsFunding = ['open', 'partially_funded'].includes(obligation.status);
  const needsVerification = ['funded', 'pending_verification'].includes(obligation.status) && obligation.verification_required;

  return (
    <Card
      className={`p-4 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} ${obligation.is_overdue ? 'border-red-300 bg-red-50/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Category Icon */}
        <div className={`p-3 rounded-lg ${categoryColor} border flex-shrink-0`}>
          {categoryIcon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 truncate">{obligation.title}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
                  {status.icon}
                  {status.label}
                </span>
                <span className="text-sm text-gray-500">
                  {capitalizeFirst(category)}
                </span>
                {obligation.is_overdue && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    Overdue
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(obligation.total_amount)}
              </p>
              <p className="text-xs text-gray-500">
                {obligation.petitioner_percentage}/{100 - obligation.petitioner_percentage} split
              </p>
            </div>
          </div>

          {obligation.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{obligation.description}</p>
          )}

          {/* Funding Progress */}
          {needsFunding && (
            <FundingProgress
              funded={parseFloat(obligation.amount_funded)}
              total={parseFloat(obligation.total_amount)}
              className="mt-3"
            />
          )}

          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
            <div className="text-sm text-gray-500">
              {obligation.due_date ? (
                <span className={obligation.is_overdue ? 'text-red-600 font-medium' : ''}>
                  Due: {formatDate(obligation.due_date)}
                </span>
              ) : (
                <span>No due date</span>
              )}
            </div>

            {showActions && (
              <div className="flex gap-2">
                {needsFunding && onFund && (
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onFund(); }}
                  >
                    Fund
                  </Button>
                )}
                {needsVerification && onVerify && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); onVerify(); }}
                  >
                    Verify
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

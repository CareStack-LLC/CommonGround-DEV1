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
  medical: 'bg-[#FEE2E2] text-[#9B2C2C] border-[#FEE2E2]',
  education: 'bg-[#E0EFF8] text-[#1E4E6B] border-[#E0EFF8]',
  sports: 'bg-[#E8F4F0] text-[#2D8A70] border-[#E8F4F0]',
  device: 'bg-[#E0EFF8] text-[#1E4E6B] border-[#E0EFF8]',
  camp: 'bg-[#FEF7ED] text-[#E09520] border-[#FEF7ED]',
  clothing: 'bg-[#FEF7ED] text-[#E09520] border-[#FEF7ED]',
  transportation: 'bg-muted text-foreground border-border',
  child_support: 'bg-[#FEF7ED] text-[#E09520] border-[#FEF7ED]',
  extracurricular: 'bg-[#E0EFF8] text-[#1E4E6B] border-[#E0EFF8]',
  childcare: 'bg-[#E0EFF8] text-[#1E4E6B] border-[#E0EFF8]',
  other: 'bg-muted text-foreground border-border',
};

const statusConfig: Record<ObligationStatus, { label: string; className: string; icon: React.ReactNode }> = {
  open: { label: 'Open', className: 'bg-[#FEF7ED] text-[#E09520]', icon: <Clock className="h-3 w-3" /> },
  partially_funded: { label: 'Partially Funded', className: 'bg-[#FEF7ED] text-[#E09520]', icon: <Clock className="h-3 w-3" /> },
  funded: { label: 'Funded', className: 'bg-[#E0EFF8] text-[#1E4E6B]', icon: <CheckCircle className="h-3 w-3" /> },
  pending_verification: { label: 'Pending Verification', className: 'bg-[#E0EFF8] text-[#1E4E6B]', icon: <Clock className="h-3 w-3" /> },
  verified: { label: 'Verified', className: 'bg-[#E8F4F0] text-[#1E3A4A]', icon: <CheckCircle className="h-3 w-3" /> },
  completed: { label: 'Completed', className: 'bg-[#E8F4F0] text-[#1E3A4A]', icon: <CheckCircle className="h-3 w-3" /> },
  expired: { label: 'Expired', className: 'bg-muted text-foreground', icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', className: 'bg-[#FEE2E2] text-[#9B2C2C]', icon: <XCircle className="h-3 w-3" /> },
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
      className={`p-4 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} ${obligation.is_overdue ? 'border-[#FCA5A5] bg-[#FEE2E2]/50' : ''}`}
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
              <h3 className="font-semibold text-foreground truncate">{obligation.title}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
                  {status.icon}
                  {status.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {capitalizeFirst(category)}
                </span>
                {obligation.is_overdue && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#FEE2E2] text-[#9B2C2C]">
                    <AlertTriangle className="h-3 w-3" />
                    Overdue
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(obligation.total_amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {obligation.petitioner_percentage}/{100 - obligation.petitioner_percentage} split
              </p>
            </div>
          </div>

          {obligation.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{obligation.description}</p>
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
            <div className="text-sm text-muted-foreground">
              {obligation.due_date ? (
                <span className={obligation.is_overdue ? 'text-[#C53030] font-medium' : ''}>
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

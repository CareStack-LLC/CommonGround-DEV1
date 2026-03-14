'use client';

import { cn } from '@/lib/utils';

interface TierBadgeProps {
  /** The tier to display */
  tier: 'plus' | 'complete' | string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional class names */
  className?: string;
}

/**
 * Small badge showing subscription tier
 *
 * @example
 * ```tsx
 * <TierBadge tier="plus" />     // Teal "Plus" badge
 * <TierBadge tier="complete" /> // Coral "Complete" badge
 * ```
 */
export function TierBadge({ tier, size = 'sm', className }: TierBadgeProps) {
  const displayName = tier === 'plus' ? 'Plus' : tier === 'complete' ? 'Complete' : tier;

  const baseClasses = 'font-semibold rounded-full inline-flex items-center justify-center';

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const tierClasses = {
    plus: 'bg-[var(--portal-primary)]/10 text-[var(--portal-primary)]',
    complete: 'bg-[#F5A623]/10 text-[#F5A623]',
  };

  const colorClass = tierClasses[tier as keyof typeof tierClasses] || tierClasses.plus;

  return (
    <span className={cn(baseClasses, sizeClasses[size], colorClass, className)}>
      {displayName}
    </span>
  );
}

/**
 * Lock icon with tier badge inline
 * Shows "🔒 Plus" or "🔒 Complete"
 */
export function LockedBadge({
  tier,
  size = 'sm',
  className,
}: TierBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <svg
        className={cn(
          'text-slate-400',
          size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
        )}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <TierBadge tier={tier} size={size} />
    </span>
  );
}

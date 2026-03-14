'use client';

import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TierBadge } from './tier-badge';
import { FEATURE_DISPLAY_NAMES } from '@/contexts/subscription-context';

interface LockedFeatureCardProps {
  /** Feature code (e.g., 'kidcoms_access', 'quick_accords') */
  feature: string;
  /** Display title (defaults to FEATURE_DISPLAY_NAMES lookup) */
  title?: string;
  /** Description of what this feature does */
  description: string;
  /** Icon component to display */
  icon?: LucideIcon;
  /** Required tier to unlock */
  requiredTier: 'plus' | 'complete';
  /** Compact mode for inline use */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Card displayed when user doesn't have access to a feature
 *
 * Shows the feature with a lock overlay and upgrade CTA
 *
 * @example
 * ```tsx
 * <LockedFeatureCard
 *   feature="kidcoms_access"
 *   description="Connect with your children through secure video calls with ARIA monitoring."
 *   requiredTier="complete"
 *   icon={Video}
 * />
 * ```
 */
export function LockedFeatureCard({
  feature,
  title,
  description,
  icon: Icon,
  requiredTier,
  compact = false,
  className,
}: LockedFeatureCardProps) {
  const router = useRouter();
  const displayTitle = title || FEATURE_DISPLAY_NAMES[feature] || feature;

  const handleUpgrade = () => {
    router.push('/settings/billing');
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-xl bg-slate-50 border-2 border-slate-200',
          className
        )}
      >
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-500 truncate">{displayTitle}</p>
            <TierBadge tier={requiredTier} size="sm" />
          </div>
          <p className="text-sm text-slate-400 truncate">{description}</p>
        </div>
        <button
          onClick={handleUpgrade}
          className="text-sm font-semibold text-[var(--portal-primary)] hover:text-[#2D6A8F] transition-colors flex-shrink-0"
        >
          Upgrade
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden',
        className
      )}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
            {Icon ? (
              <Icon className="w-7 h-7 text-slate-400" />
            ) : (
              <Lock className="w-7 h-7 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-slate-400" />
              <TierBadge tier={requiredTier} size="md" />
            </div>
            <h3
              className="text-lg font-bold text-slate-500"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              {displayTitle}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-500 mb-6 leading-relaxed">
          {description}
        </p>

        {/* Upgrade CTA */}
        <button
          onClick={handleUpgrade}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group"
        >
          Upgrade to {requiredTier === 'plus' ? 'Plus' : 'Complete'}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

/**
 * Inline locked button for replacing action buttons
 */
export function LockedButton({
  feature,
  requiredTier,
  children,
  className,
}: {
  feature: string;
  requiredTier: 'plus' | 'complete';
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/settings/billing')}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
        'bg-slate-100 text-slate-400 cursor-pointer',
        'hover:bg-slate-200 transition-colors',
        className
      )}
    >
      <Lock className="w-4 h-4" />
      {children}
      <TierBadge tier={requiredTier} size="sm" />
    </button>
  );
}

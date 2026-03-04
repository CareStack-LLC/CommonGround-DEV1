'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, X, Crown, Zap, Video, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription, FEATURE_DISPLAY_NAMES } from '@/contexts/subscription-context';

interface UpgradeBannerProps {
  /** Banner style variant */
  variant?: 'inline' | 'card' | 'slim';
  /** Specific feature to highlight (optional) */
  feature?: string;
  /** Allow user to dismiss the banner */
  dismissible?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Contextual upgrade banner to promote subscription upgrades
 *
 * @example
 * ```tsx
 * // Inline banner at top of section
 * <UpgradeBanner variant="inline" />
 *
 * // Card style for dashboard
 * <UpgradeBanner variant="card" />
 *
 * // Slim style for subtle reminder
 * <UpgradeBanner variant="slim" feature="quick_accords" />
 * ```
 */
export function UpgradeBanner({
  variant = 'inline',
  feature,
  dismissible = false,
  className,
}: UpgradeBannerProps) {
  const router = useRouter();
  const { isFree, isPlus, tier } = useSubscription();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner to Complete tier users
  if (!isFree() && !isPlus()) {
    return null;
  }

  // Don't show if dismissed
  if (isDismissed) {
    return null;
  }

  const handleUpgrade = () => {
    router.push('/settings/billing');
  };

  const featureDisplayName = feature ? FEATURE_DISPLAY_NAMES[feature] : null;

  // Target tier based on current tier
  const targetTier = isFree() ? 'Plus' : 'Complete';
  const targetPrice = isFree() ? '$17.99' : '$34.99';

  if (variant === 'slim') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2 rounded-xl',
          'bg-[var(--portal-primary)]/5 border border-[var(--portal-primary)]/20',
          className
        )}
      >
        <Sparkles className="w-4 h-4 text-[var(--portal-primary)] flex-shrink-0" />
        <p className="text-sm text-slate-600 flex-1">
          {featureDisplayName ? (
            <>
              <span className="font-semibold">{featureDisplayName}</span> requires {targetTier}
            </>
          ) : (
            <>Unlock more features with <span className="font-semibold">{targetTier}</span></>
          )}
        </p>
        <button
          onClick={handleUpgrade}
          className="text-sm font-semibold text-[var(--portal-primary)] hover:text-[#1e4442] transition-colors"
        >
          Upgrade
        </button>
        {dismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl',
          'bg-gradient-to-r from-[var(--portal-primary)]/5 to-[var(--portal-primary)]/10',
          'border-2 border-[var(--portal-primary)]/20',
          className
        )}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-[var(--portal-primary)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[var(--portal-primary)]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800">
              {featureDisplayName ? (
                <>Unlock {featureDisplayName}</>
              ) : (
                <>Upgrade to {targetTier}</>
              )}
            </p>
            <p className="text-sm text-slate-600">
              {isFree()
                ? 'Get auto-scheduling, PDF exports, QuickAccords & more'
                : 'Get KidsCom video calls, court exports & theater mode'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpgrade}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--portal-primary)] text-white font-semibold rounded-xl hover:bg-[#1e4442] transition-colors group"
          >
            Upgrade Now
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Card variant - for dashboard
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden',
        className
      )}
    >
      {/* Accent bar */}
      <div className="h-2 bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644]" />

      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
            <Crown className="w-7 h-7 text-[var(--portal-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="text-lg font-bold text-slate-900 mb-1"
              style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
            >
              Upgrade to {targetTier}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Just {targetPrice}/month
            </p>

            {/* Feature highlights */}
            <div className="space-y-2 mb-6">
              {isFree() ? (
                <>
                  <FeatureHighlight icon={Zap} text="QuickAccords for one-time agreements" />
                  <FeatureHighlight icon={FileText} text="PDF exports & reports" />
                  <FeatureHighlight icon={Sparkles} text="Auto-scheduling for exchanges" />
                </>
              ) : (
                <>
                  <FeatureHighlight icon={Video} text="KidsCom video calls with children" />
                  <FeatureHighlight icon={FileText} text="Court-ready evidence exports" />
                  <FeatureHighlight icon={Sparkles} text="Theater mode for watch parties" />
                </>
              )}
            </div>

            <button
              onClick={handleUpgrade}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644] text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group"
            >
              Upgrade to {targetTier}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureHighlight({ icon: Icon, text }: { icon: typeof Sparkles; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-700">
      <Icon className="w-4 h-4 text-[var(--portal-primary)]" />
      <span>{text}</span>
    </div>
  );
}

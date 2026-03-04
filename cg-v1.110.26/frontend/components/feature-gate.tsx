'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { useFeatureGate } from '@/hooks/use-feature-gate';
import { LockedFeatureCard } from './locked-feature-card';

interface FeatureGateProps {
  /** Feature code to check (e.g., 'kidcoms_access', 'quick_accords') */
  feature: string;
  /** Content to render when user has access */
  children: ReactNode;
  /** Custom fallback when user doesn't have access */
  fallback?: ReactNode;
  /** Title for default locked card */
  title?: string;
  /** Description for default locked card */
  description?: string;
  /** Icon for default locked card */
  icon?: LucideIcon;
  /** Show loading skeleton while checking */
  showLoading?: boolean;
  /** Use compact locked card variant */
  compact?: boolean;
}

/**
 * Wrapper component that gates content based on subscription tier
 *
 * @example
 * ```tsx
 * // Simple usage with default locked card
 * <FeatureGate feature="kidcoms_access" description="Video calls with your children">
 *   <KidComsInterface />
 * </FeatureGate>
 *
 * // With custom fallback
 * <FeatureGate
 *   feature="quick_accords"
 *   fallback={<CustomUpgradePrompt />}
 * >
 *   <QuickAccordForm />
 * </FeatureGate>
 *
 * // Compact inline style
 * <FeatureGate feature="pdf_summaries" compact description="Export PDF reports">
 *   <ExportPDFButton />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  title,
  description = 'This feature requires a higher subscription tier.',
  icon,
  showLoading = true,
  compact = false,
}: FeatureGateProps) {
  const { hasAccess, requiredTier, isLoading, featureDisplayName } = useFeatureGate(feature);

  // Show loading state if requested
  if (isLoading && showLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - render fallback or default locked card
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default locked card
  return (
    <LockedFeatureCard
      feature={feature}
      title={title || featureDisplayName}
      description={description}
      icon={icon}
      requiredTier={requiredTier || 'plus'}
      compact={compact}
    />
  );
}

/**
 * Inline feature gate for buttons and small elements
 * Renders children normally if has access, otherwise renders locked button
 */
export function InlineFeatureGate({
  feature,
  children,
  fallback,
}: {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasAccess, isLoading } = useFeatureGate(feature);

  if (isLoading) {
    return (
      <span className="inline-block animate-pulse">
        <span className="inline-block h-8 w-24 bg-slate-100 rounded-lg" />
      </span>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

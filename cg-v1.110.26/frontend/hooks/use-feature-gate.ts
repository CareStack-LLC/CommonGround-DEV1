'use client';

import { useMemo } from 'react';
import { useSubscription, TIER_DISPLAY_NAMES, FEATURE_DISPLAY_NAMES } from '@/contexts/subscription-context';

interface UseFeatureGateResult {
  /** Whether the user has access to this feature */
  hasAccess: boolean;
  /** The tier required to access this feature (null if available to all) */
  requiredTier: 'plus' | 'complete' | null;
  /** Display name of the required tier */
  requiredTierDisplayName: string;
  /** User's current tier */
  currentTier: string;
  /** Display name of user's current tier */
  currentTierDisplayName: string;
  /** Whether subscription data is still loading */
  isLoading: boolean;
  /** Display name of the feature */
  featureDisplayName: string;
}

/**
 * Hook to check if user has access to a specific feature
 *
 * @param feature - The feature code to check (e.g., 'kidcoms_access', 'quick_accords')
 * @returns Feature access information
 *
 * @example
 * ```tsx
 * function KidComsButton() {
 *   const { hasAccess, requiredTier, isLoading } = useFeatureGate('kidcoms_access');
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   if (!hasAccess) {
 *     return (
 *       <LockedFeatureCard
 *         feature="kidcoms_access"
 *         requiredTier={requiredTier}
 *       />
 *     );
 *   }
 *
 *   return <KidComsInterface />;
 * }
 * ```
 */
export function useFeatureGate(feature: string): UseFeatureGateResult {
  const {
    hasFeature,
    getRequiredTier,
    tier,
    tierDisplayName,
    isLoading,
  } = useSubscription();

  return useMemo(() => {
    const requiredTier = getRequiredTier(feature);
    const hasAccess = hasFeature(feature);

    return {
      hasAccess,
      requiredTier,
      requiredTierDisplayName: requiredTier ? TIER_DISPLAY_NAMES[requiredTier] || requiredTier : '',
      currentTier: tier,
      currentTierDisplayName: tierDisplayName,
      isLoading,
      featureDisplayName: FEATURE_DISPLAY_NAMES[feature] || feature,
    };
  }, [feature, hasFeature, getRequiredTier, tier, tierDisplayName, isLoading]);
}

interface UseLimitGateResult {
  /** Current limit for this feature */
  limit: number;
  /** Whether user can add more (currentCount < limit) */
  canAddMore: boolean;
  /** Whether user has reached the limit */
  atLimit: boolean;
  /** Whether user is over the limit (grandfathered data) */
  overLimit: boolean;
  /** Remaining capacity */
  remaining: number;
  /** Whether subscription data is still loading */
  isLoading: boolean;
  /** User's current tier */
  currentTier: string;
}

/**
 * Hook to check limits for features with numeric caps (e.g., circle_contacts_limit)
 *
 * @param feature - The feature code to check
 * @param currentCount - The user's current usage count
 * @returns Limit information
 *
 * @example
 * ```tsx
 * function MyCircle() {
 *   const contacts = useContacts();
 *   const { canAddMore, limit, remaining } = useLimitGate('circle_contacts_limit', contacts.length);
 *
 *   return (
 *     <div>
 *       <p>Contacts: {contacts.length}/{limit}</p>
 *       {canAddMore ? (
 *         <Button>Add Contact</Button>
 *       ) : (
 *         <UpgradeBanner feature="circle_contacts_limit" />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLimitGate(feature: string, currentCount: number): UseLimitGateResult {
  const { getLimit, tier, isLoading } = useSubscription();

  return useMemo(() => {
    const limit = getLimit(feature);
    const remaining = Math.max(0, limit - currentCount);

    return {
      limit,
      canAddMore: currentCount < limit,
      atLimit: currentCount >= limit && currentCount === limit,
      overLimit: currentCount > limit,
      remaining,
      isLoading,
      currentTier: tier,
    };
  }, [feature, currentCount, getLimit, tier, isLoading]);
}

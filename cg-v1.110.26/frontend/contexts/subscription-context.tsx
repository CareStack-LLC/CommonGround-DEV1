'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { subscriptionAPI, SubscriptionStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

/**
 * Feature definitions with required tiers
 * Used for determining which tier is needed to unlock a feature
 */
const FEATURE_TIERS: Record<string, 'plus' | 'complete'> = {
  // Plus tier features
  aria_advanced: 'plus',
  quick_accords: 'plus',
  auto_scheduling: 'plus',
  custody_dashboard: 'plus',
  pdf_summaries: 'plus',
  // Complete tier features
  kidcoms_access: 'complete',
  theater_mode: 'complete',
  court_reporting: 'complete',
};

/**
 * Feature display names for UI
 */
export const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  aria_advanced: 'ARIA Advanced Suggestions',
  quick_accords: 'QuickAccords',
  auto_scheduling: 'Auto Scheduling',
  custody_dashboard: 'Custody Dashboard',
  pdf_summaries: 'PDF Exports',
  circle_contacts_limit: 'My Circle Contacts',
  kidcoms_access: 'KidsCom Video Calls',
  theater_mode: 'Theater Mode',
  court_reporting: 'Court Reporting',
};

/**
 * Tier hierarchy for comparison
 */
const TIER_HIERARCHY: Record<string, number> = {
  web_starter: 0,
  starter: 0, // Legacy
  plus: 1,
  complete: 2,
  family_plus: 2, // Legacy
};

/**
 * Tier display names
 */
export const TIER_DISPLAY_NAMES: Record<string, string> = {
  web_starter: 'Web Starter',
  starter: 'Web Starter',
  plus: 'Plus',
  complete: 'Complete',
  family_plus: 'Complete',
};

interface SubscriptionContextValue {
  // Current subscription state
  tier: string;
  tierDisplayName: string;
  status: string;
  features: Record<string, boolean | number | string>;
  isLoading: boolean;

  // Subscription details
  subscription: SubscriptionStatus | null;

  // Feature access checks
  hasFeature: (feature: string) => boolean;
  getLimit: (feature: string) => number;
  getRequiredTier: (feature: string) => 'plus' | 'complete' | null;

  // Tier checks
  isPaid: () => boolean;
  isFree: () => boolean;
  isPlus: () => boolean;
  isComplete: () => boolean;

  // Actions
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [features, setFeatures] = useState<Record<string, boolean | number | string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Computed values
  const tier = subscription?.tier || 'web_starter';
  const tierDisplayName = TIER_DISPLAY_NAMES[tier] || 'Web Starter';
  const status = subscription?.status || 'active';

  /**
   * Check if user has access to a specific feature
   */
  const hasFeature = useCallback((feature: string): boolean => {
    // If we have cached features, use them
    if (features[feature] !== undefined) {
      return Boolean(features[feature]);
    }

    // Otherwise, check based on tier hierarchy
    const requiredTier = FEATURE_TIERS[feature];
    if (!requiredTier) {
      // Feature not in our list means it's available to all
      return true;
    }

    const currentTierLevel = TIER_HIERARCHY[tier] ?? 0;
    const requiredTierLevel = TIER_HIERARCHY[requiredTier] ?? 0;

    return currentTierLevel >= requiredTierLevel;
  }, [features, tier]);

  /**
   * Get numeric limit for a feature (e.g., circle_contacts_limit)
   */
  const getLimit = useCallback((feature: string): number => {
    const value = features[feature];
    if (typeof value === 'number') {
      return value;
    }

    // Default limits based on tier
    if (feature === 'circle_contacts_limit') {
      if (tier === 'complete' || tier === 'family_plus') return 5;
      if (tier === 'plus') return 1;
      return 0;
    }

    return 0;
  }, [features, tier]);

  /**
   * Get the required tier for a feature
   */
  const getRequiredTier = useCallback((feature: string): 'plus' | 'complete' | null => {
    return FEATURE_TIERS[feature] || null;
  }, []);

  /**
   * Check if user is on a paid tier
   */
  const isPaid = useCallback((): boolean => {
    return (TIER_HIERARCHY[tier] ?? 0) >= 1;
  }, [tier]);

  /**
   * Check if user is on free tier
   */
  const isFree = useCallback((): boolean => {
    return (TIER_HIERARCHY[tier] ?? 0) === 0;
  }, [tier]);

  /**
   * Check if user is on Plus tier or higher
   */
  const isPlus = useCallback((): boolean => {
    return (TIER_HIERARCHY[tier] ?? 0) >= 1;
  }, [tier]);

  /**
   * Check if user is on Complete tier
   */
  const isComplete = useCallback((): boolean => {
    return (TIER_HIERARCHY[tier] ?? 0) >= 2;
  }, [tier]);

  /**
   * Refresh subscription data from API
   */
  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      setFeatures({});
      setIsLoading(false);
      return;
    }

    try {
      const [subData, featuresData] = await Promise.all([
        subscriptionAPI.getCurrentSubscription(),
        subscriptionAPI.getFeatures(),
      ]);

      setSubscription(subData);
      setFeatures(featuresData);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      // Don't clear existing data on error - keep stale data
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load subscription data when authenticated
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      refresh();
    } else {
      setSubscription(null);
      setFeatures({});
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, refresh]);

  // Refresh on window focus (user may have upgraded in another tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && !isLoading) {
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, isLoading, refresh]);

  const value: SubscriptionContextValue = {
    tier,
    tierDisplayName,
    status,
    features,
    isLoading: isLoading || authLoading,
    subscription,
    hasFeature,
    getLimit,
    getRequiredTier,
    isPaid,
    isFree,
    isPlus,
    isComplete,
    refresh,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook to access subscription context
 */
export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

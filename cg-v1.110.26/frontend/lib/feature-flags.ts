/**
 * ARIA V3 Beta Feature Flags
 *
 * Environment-variable-based flags for experimental V3 features.
 * Separate from subscription-based useFeatureGate — these are
 * beta toggles, not tier-gated.
 */
export const FEATURE_FLAGS = {
  ARIA_V3_COACHING: process.env.NEXT_PUBLIC_ARIA_V3_COACHING === 'true',
  ARIA_V3_FORECAST: process.env.NEXT_PUBLIC_ARIA_V3_FORECAST === 'true',
} as const;

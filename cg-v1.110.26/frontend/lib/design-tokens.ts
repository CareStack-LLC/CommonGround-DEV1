/**
 * CommonGround Design Tokens
 *
 * Design Philosophy: "Quietly modern. Emotionally safe. Court-credible."
 *
 * This file documents the design system. Actual values are in globals.css
 * as CSS custom properties for Tailwind v4 compatibility.
 */

export const designTokens = {
  // ==========================================================================
  // COLOR SYSTEM
  // ==========================================================================
  // Colors are semantic, not decorative. Every color has a purpose.

  colors: {
    // Background Colors - Warm, reduces glare and stress
    background: {
      default: '#FAFAF8',      // Warm off-white - main background
      elevated: '#FFFFFF',      // Pure white - cards, elevated surfaces
      subtle: '#F5F5F3',        // Slightly darker - secondary areas
      muted: '#EEEEEB',         // Muted background for de-escalation
    },

    // Text Colors - Near-black, never pure black
    text: {
      primary: '#1C1C1A',       // Primary text - headings, important
      secondary: '#4A4A47',     // Secondary text - body, descriptions
      muted: '#6B6B66',         // Muted text - placeholders, hints
      subtle: '#8F8F8A',        // Subtle text - timestamps, meta
      inverse: '#FAFAF8',       // Text on dark backgrounds
    },

    // Primary - Muted Teal/Steel for trust, stability, care
    primary: {
      DEFAULT: '#0F766E',       // Primary actions, links
      light: '#14B8A6',         // Hover states
      dark: '#0D5D56',          // Active states
      subtle: '#CCFBF1',        // Light backgrounds
      foreground: '#FFFFFF',    // Text on primary
    },

    // Semantic Colors - Meaningful only
    semantic: {
      // Success/Verified/Compliant - Sage green
      success: {
        DEFAULT: '#059669',
        light: '#10B981',
        subtle: '#D1FAE5',
        foreground: '#FFFFFF',
      },

      // Warning/Attention Needed - Warm amber (not danger)
      warning: {
        DEFAULT: '#D97706',
        light: '#F59E0B',
        subtle: '#FEF3C7',
        foreground: '#FFFFFF',
      },

      // Error/Destructive - Only for confirmed issues
      // Never use for "emotion" - only missed, failed, overdue
      error: {
        DEFAULT: '#DC2626',
        light: '#EF4444',
        subtle: '#FEE2E2',
        foreground: '#FFFFFF',
      },

      // Info/System/Neutral
      info: {
        DEFAULT: '#0284C7',
        light: '#0EA5E9',
        subtle: '#E0F2FE',
        foreground: '#FFFFFF',
      },
    },

    // Border & Divider Colors - Soft, never harsh
    border: {
      default: '#E5E5E0',       // Standard borders
      subtle: '#EEEEEB',        // Subtle dividers
      strong: '#D4D4CF',        // Emphasized borders
    },

    // ARIA-specific colors - Calm, not intrusive
    aria: {
      background: '#F0FDFA',    // ARIA message background
      border: '#99F6E4',        // ARIA indicator border
      text: '#0F766E',          // ARIA text
      accent: '#14B8A6',        // ARIA accent
    },
  },

  // ==========================================================================
  // TYPOGRAPHY
  // ==========================================================================
  // Readable under stress - larger text, generous spacing

  typography: {
    // Font Family - Humanist, slightly rounded, excellent legibility
    fontFamily: {
      sans: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
      mono: 'var(--font-geist-mono), monospace',
    },

    // Font Sizes - Larger than typical apps
    fontSize: {
      xs: '0.8125rem',     // 13px
      sm: '0.9375rem',     // 15px
      base: '1.0625rem',   // 17px - larger base
      lg: '1.1875rem',     // 19px
      xl: '1.375rem',      // 22px
      '2xl': '1.625rem',   // 26px
      '3xl': '2rem',       // 32px
      '4xl': '2.5rem',     // 40px
    },

    // Line Heights - Generous for readability
    lineHeight: {
      tight: '1.25',
      normal: '1.6',       // More generous than default
      relaxed: '1.75',
    },

    // Font Weights
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // ==========================================================================
  // SPACING
  // ==========================================================================
  // Generous spacing - this app is for tired, anxious people

  spacing: {
    // Base spacing scale (rem)
    0: '0',
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
  },

  // ==========================================================================
  // BORDERS & RADIUS
  // ==========================================================================
  // Softer corners, subtle shadows

  borderRadius: {
    none: '0',
    sm: '0.375rem',    // 6px
    DEFAULT: '0.5rem', // 8px
    md: '0.625rem',    // 10px
    lg: '0.75rem',     // 12px
    xl: '1rem',        // 16px - preferred for cards
    '2xl': '1.25rem',  // 20px
    full: '9999px',
  },

  boxShadow: {
    // Soft, non-aggressive shadows
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.03)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.03)',
    // Card shadow - very subtle
    card: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.02)',
  },

  // ==========================================================================
  // TRANSITIONS
  // ==========================================================================
  // Motion should explain state change, slow user down on sensitive actions

  transition: {
    // Duration
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',

    // Easing - smooth, not bouncy
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
    },
  },

  // ==========================================================================
  // BREAKPOINTS
  // ==========================================================================
  // Mobile-first for parents, desktop for court

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Type exports for TypeScript consumers
export type DesignTokens = typeof designTokens;

/**
 * CommonGround Design System — Color Tokens
 *
 * Single source of truth for all colors in the parent app.
 * Import from `@/theme` instead of defining per-file constants.
 */

// ── Raw palette ─────────────────────────────────────────────────────

export const palette = {
  sage: {
    50: "#E8F0EC",
    100: "#D1E1D9",
    200: "#B3CDB9",
    300: "#8FB399",
    400: "#6B9B7A",
    500: "#4A6C58",
    600: "#3A5646",
    700: "#2D4437",
    800: "#203228",
    900: "#142019",
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  amber: {
    50: "#FEF7ED",
    100: "#FDE8D0",
    200: "#FBD1A2",
    300: "#E8C4A0",
    400: "#D4A574",
    500: "#C08B5D",
    600: "#A47246",
    700: "#7F5636",
    800: "#5A3C26",
    900: "#362316",
  },
  sand: {
    50: "#FFFCF9",
    100: "#FFF8F3",
    200: "#F5F0E8",
    300: "#E8E0D4",
    400: "#D4C9B8",
  },
  red: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#C53030",
    600: "#B91C1C",
    700: "#991B1B",
  },
  green: {
    50: "#f0fdf4",
    100: "#dcfce7",
    400: "#4ade80",
    500: "#22C55E",
    600: "#16a34a",
  },
  cream: "#FFFBF5",
  white: "#FFFFFF",
  black: "#000000",
} as const;

// ── Semantic light theme ────────────────────────────────────────────

export const lightColors = {
  // Backgrounds
  background: palette.white,
  backgroundSecondary: palette.sand[200],
  surface: palette.white,
  surfaceElevated: palette.cream,
  surfaceHover: palette.sage[50],

  // Text
  textPrimary: palette.slate[900],
  textSecondary: palette.slate[600],
  textMuted: palette.slate[400],
  textInverse: palette.white,

  // Borders & dividers
  border: palette.slate[200],
  borderLight: palette.slate[100],
  divider: palette.sand[300],

  // Brand
  primary: palette.sage[500],
  primaryLight: palette.sage[50],
  primaryDark: palette.sage[700],
  secondary: palette.slate[600],
  secondaryLight: palette.slate[100],
  accent: palette.amber[400],
  accentLight: palette.amber[50],

  // Status
  success: palette.sage[500],
  successLight: palette.sage[50],
  warning: palette.amber[400],
  warningLight: palette.amber[50],
  danger: palette.red[500],
  dangerLight: palette.red[50],

  // Custody
  custodyMom: palette.sage[500],
  custodyDad: palette.slate[600],

  // Tab bar
  tabBarBackground: palette.white,
  tabBarBorder: palette.sand[200],
  tabBarActive: palette.sage[500],
  tabBarInactive: palette.slate[400],

  // Cards
  cardBackground: palette.white,
  cardBorder: palette.slate[100],
  cardShadow: "rgba(74, 108, 88, 0.1)",

  // Input
  inputBackground: palette.white,
  inputBorder: palette.slate[300],
  inputPlaceholder: palette.slate[400],

  // Overlay
  overlay: "rgba(0, 0, 0, 0.5)",
} as const;

// ── Semantic dark theme ─────────────────────────────────────────────

export const darkColors = {
  // Backgrounds
  background: palette.slate[900],
  backgroundSecondary: palette.slate[800],
  surface: palette.slate[800],
  surfaceElevated: palette.slate[700],
  surfaceHover: palette.slate[700],

  // Text
  textPrimary: palette.slate[50],
  textSecondary: palette.slate[300],
  textMuted: palette.slate[400],
  textInverse: palette.slate[900],

  // Borders & dividers
  border: palette.slate[600],
  borderLight: palette.slate[700],
  divider: palette.slate[700],

  // Brand
  primary: palette.sage[400],
  primaryLight: palette.sage[900],
  primaryDark: palette.sage[300],
  secondary: palette.slate[400],
  secondaryLight: palette.slate[800],
  accent: palette.amber[400],
  accentLight: palette.amber[900],

  // Status
  success: palette.sage[400],
  successLight: palette.sage[900],
  warning: palette.amber[400],
  warningLight: palette.amber[900],
  danger: palette.red[400],
  dangerLight: palette.red[700],

  // Custody
  custodyMom: palette.sage[400],
  custodyDad: palette.slate[400],

  // Tab bar
  tabBarBackground: palette.slate[900],
  tabBarBorder: palette.slate[700],
  tabBarActive: palette.sage[400],
  tabBarInactive: palette.slate[500],

  // Cards
  cardBackground: palette.slate[800],
  cardBorder: palette.slate[700],
  cardShadow: "rgba(0, 0, 0, 0.3)",

  // Input
  inputBackground: palette.slate[800],
  inputBorder: palette.slate[600],
  inputPlaceholder: palette.slate[500],

  // Overlay
  overlay: "rgba(0, 0, 0, 0.7)",
} as const;

// ── Category colors (consistent across themes) ─────────────────────

export const categoryColors = {
  medical: "#EF4444",
  school: "#3B82F6",
  sports: "#22C55E",
  therapy: "#EC4899",
  extracurricular: "#8B5CF6",
  social: "#F97316",
  travel: "#06B6D4",
  exchange: palette.amber[400],
  other: "#6B7280",
} as const;

export const categoryIcons = {
  medical: "medkit",
  school: "school",
  sports: "football",
  therapy: "heart",
  extracurricular: "musical-notes",
  social: "people",
  travel: "airplane",
  exchange: "swap-horizontal",
  other: "calendar",
} as const;

// ── Status colors ──────────────────────────────────────────────────

export const statusColors = {
  draft: palette.slate[600],
  pending: palette.amber[400],
  pending_approval: palette.amber[400],
  active: palette.sage[500],
  completed: palette.green[500],
  revoked: palette.red[500],
  expired: "#9CA3AF",
} as const;

export type ThemeColors = typeof lightColors;

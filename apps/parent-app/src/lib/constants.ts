/**
 * App Constants
 *
 * Centralized constants for the parent app
 */

// API Configuration
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";

// Auth Configuration
export const TOKEN_KEY = "auth_token";
export const REFRESH_TOKEN_KEY = "refresh_token";

// Feature Flags
export const ENABLE_BIOMETRIC = process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC === "true";
export const ENABLE_OAUTH = process.env.EXPO_PUBLIC_ENABLE_OAUTH === "true";
export const ENABLE_MFA = process.env.EXPO_PUBLIC_ENABLE_MFA === "true";

// Design System Colors
export const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  sageLight: "#6B8F7A",
  slate: "#475569",
  slateDark: "#334155",
  amber: "#D4A574",
  amberLight: "#E5C4A4",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
  white: "#FFFFFF",
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
} as const;

// Status configurations
export const STATUS_COLORS: Record<string, string> = {
  draft: colors.slate,
  pending: colors.amber,
  pending_approval: colors.amber,
  active: colors.sage,
  completed: colors.success,
  revoked: colors.error,
  expired: "#9CA3AF",
} as const;

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  pending_approval: "Awaiting Approval",
  active: "Active",
  completed: "Completed",
  revoked: "Revoked",
  expired: "Expired",
} as const;

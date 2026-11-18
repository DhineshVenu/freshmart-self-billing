/**
 * Shared color palette for the Fresh Mart mobile app (dark theme).
 * Centralized so reusable components avoid copy-pasting hex values.
 */
export const colors = {
  /** App background. */
  background: "#0f172a",
  /** Card / surface background. */
  surface: "#1e293b",
  /** Border color for cards and inputs. */
  border: "#334155",
  /** Primary body text. */
  text: "#e2e8f0",
  /** Muted / secondary text. */
  textMuted: "#94a3b8",
  /** Dim text (labels, meta). */
  textDim: "#64748b",
  /** Deep green — primary action buttons. */
  primary: "#047857",
  /** Bright green — accents, totals, success. */
  primaryAccent: "#10b981",
  /** Surface-toned secondary button background. */
  secondary: "#1e293b",
  /** Red — destructive / danger actions. */
  danger: "#ef4444",
  /** Blue — info accents. */
  info: "#0284c7",
  /** Amber — pending / warning. */
  warning: "#f59e0b",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

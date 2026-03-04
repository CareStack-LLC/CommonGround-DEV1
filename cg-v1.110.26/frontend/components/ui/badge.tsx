import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * CommonGround Badge Component
 *
 * Design: Semantic colors only - success, warning, error, info.
 * Philosophy: "Colors are semantic, not decorative"
 */
const badgeVariants = cva(
  // Base styles - portal-aware rounded pill, readable text
  "inline-flex items-center rounded-[var(--portal-radius-full)] px-3 py-1 text-sm font-medium transition-smooth",
  {
    variants: {
      variant: {
        // Default - portal-aware primary background
        default:
          "bg-[var(--portal-primary)]/10 text-[var(--portal-primary)] border border-[var(--portal-primary)]/20",

        // Success - For completed, verified, compliant states
        success:
          "bg-cg-success-subtle text-cg-success border border-cg-success/20",

        // Warning - For attention needed, pending, upcoming
        warning:
          "bg-cg-warning-subtle text-cg-warning border border-cg-warning/20",

        // Error - Only for confirmed issues (missed, failed, overdue)
        error:
          "bg-cg-error-subtle text-cg-error border border-cg-error/20",

        // Secondary - Portal-aware secondary color
        secondary:
          "bg-[var(--portal-secondary)]/10 text-[var(--portal-secondary)] border border-[var(--portal-secondary)]/20",

        // Accent - Portal-aware accent color
        accent:
          "bg-[var(--portal-accent)]/10 text-[var(--portal-accent)] border border-[var(--portal-accent)]/20",

        // Outline - Portal-aware minimal styling
        outline:
          "border border-[var(--portal-border)] bg-transparent text-[var(--portal-text)]",

        // ARIA - For AI assistant indicators (amber)
        aria:
          "bg-cg-amber-subtle text-cg-amber border border-cg-amber/20",
      },
      size: {
        default: "px-3 py-1 text-sm",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-4 py-1.5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

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
  // Base styles - rounded pill, readable text
  "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-smooth",
  {
    variants: {
      variant: {
        // Default - subtle primary background
        default:
          "bg-cg-primary-subtle text-cg-primary",

        // Success - For completed, verified, compliant states
        success:
          "bg-cg-success-subtle text-cg-success",

        // Warning - For attention needed, pending, upcoming
        warning:
          "bg-cg-warning-subtle text-cg-warning",

        // Error - Only for confirmed issues (missed, failed, overdue)
        error:
          "bg-cg-error-subtle text-cg-error",

        // Secondary - Neutral, de-emphasized
        secondary:
          "bg-secondary text-secondary-foreground",

        // Outline - Minimal styling
        outline:
          "border border-border bg-transparent text-foreground",

        // ARIA - For AI assistant indicators
        aria:
          "bg-cg-aria-subtle text-cg-aria border border-cg-aria/20",
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

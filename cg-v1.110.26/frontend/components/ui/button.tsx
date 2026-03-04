import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * CommonGround Button Component
 *
 * Design: Larger touch targets, smooth transitions, muted teal primary.
 * Philosophy: "Caring tech, not emotional tech"
 */
const buttonVariants = cva(
  // Base styles - larger text, smoother transitions, portal-aware focus states
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--portal-radius-md)] text-base font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-primary)]/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - Portal-aware primary color
        default:
          "bg-[var(--portal-primary)] text-white shadow-[var(--portal-shadow-sm)] hover:bg-[var(--portal-primary-hover)] active:scale-[0.98]",

        // Destructive - Only for confirmed issues (missed, failed, overdue)
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--portal-shadow-sm)] hover:bg-destructive/90",

        // Outline - Portal-aware borders and backgrounds
        outline:
          "border-2 border-[var(--portal-border)] bg-transparent shadow-[var(--portal-shadow-sm)] hover:bg-[var(--portal-surface)] hover:border-[var(--portal-border-hover)]",

        // Secondary - Portal-aware secondary color
        secondary:
          "bg-[var(--portal-secondary)] text-white shadow-[var(--portal-shadow-sm)] hover:bg-[var(--portal-secondary-light)]",

        // Accent - Portal-aware accent color
        accent:
          "bg-[var(--portal-accent)] text-white shadow-[var(--portal-shadow-sm)] hover:bg-[var(--portal-accent-hover)]",

        // Ghost - Minimal, portal-aware hover
        ghost: "hover:bg-[var(--portal-surface)] hover:text-[var(--portal-text)]",

        // Link - Portal-aware text color
        link: "text-[var(--portal-primary)] underline-offset-4 hover:underline hover:text-[var(--portal-primary-hover)]",

        // Success - For positive confirmations
        success:
          "bg-cg-success text-white shadow-[var(--portal-shadow-sm)] hover:bg-cg-success/90",

        // Warning - For attention-needed actions (not danger)
        warning:
          "bg-cg-warning text-white shadow-[var(--portal-shadow-sm)] hover:bg-cg-warning/90",
      },
      size: {
        // Larger default size for readability
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-[var(--portal-radius-sm)] px-4 text-sm",
        lg: "h-12 rounded-[var(--portal-radius-lg)] px-8 text-lg",
        // Icon button - larger touch target
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

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
  // Base styles - larger text, smoother transitions, softer focus states
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - Muted teal for trust and stability
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/95",

        // Destructive - Only for confirmed issues (missed, failed, overdue)
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",

        // Outline - For secondary actions
        outline:
          "border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",

        // Secondary - Subtle warm gray background
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",

        // Ghost - Minimal, for inline actions
        ghost: "hover:bg-accent hover:text-accent-foreground",

        // Link - Text-only, underlined
        link: "text-primary underline-offset-4 hover:underline",

        // Success - For positive confirmations
        success:
          "bg-cg-success text-white shadow-sm hover:bg-cg-success/90",

        // Warning - For attention-needed actions (not danger)
        warning:
          "bg-cg-warning text-white shadow-sm hover:bg-cg-warning/90",
      },
      size: {
        // Larger default size for readability
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-md px-4 text-sm",
        lg: "h-12 rounded-lg px-8 text-lg",
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

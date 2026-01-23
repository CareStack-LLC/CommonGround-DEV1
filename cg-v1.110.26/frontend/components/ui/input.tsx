import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * CommonGround Input Component
 *
 * Design: Larger height, readable text, soft focus states.
 * Philosophy: "Larger text, generous spacing - this app is for tired, anxious people"
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Larger height, portal-aware border radius and colors
          "flex h-11 w-full rounded-[var(--portal-radius-md)] border border-[var(--portal-border)] bg-[var(--portal-surface)] px-4 py-2.5",
          // Larger, readable text with portal color
          "text-base text-[var(--portal-text)]",
          // Soft shadow for depth
          "shadow-[var(--portal-shadow-sm)]",
          // Smooth transitions
          "transition-smooth",
          // File inputs
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--portal-text)]",
          // Placeholder - portal-aware muted color
          "placeholder:text-[var(--portal-text-light)]",
          // Focus - portal-aware primary color ring
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-primary)]/50 focus-visible:border-[var(--portal-primary)]",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--portal-background)]",
          // Error state (applied via parent) - semantic red
          "aria-invalid:border-destructive aria-invalid:ring-destructive/50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

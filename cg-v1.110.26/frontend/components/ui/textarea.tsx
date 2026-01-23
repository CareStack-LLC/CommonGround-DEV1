import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * CommonGround Textarea Component
 *
 * Design: Larger text, generous padding, soft focus states.
 * Philosophy: "Readable under stress - users composing messages need clarity"
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Base styles - generous padding, portal-aware styling
        "flex min-h-[120px] w-full rounded-[var(--portal-radius-md)] border border-[var(--portal-border)] bg-[var(--portal-surface)] text-[var(--portal-text)] px-4 py-3",
        // Larger, readable text
        "text-base leading-relaxed",
        // Soft shadow for depth
        "shadow-[var(--portal-shadow-sm)]",
        // Smooth transitions
        "transition-smooth",
        // Placeholder - portal-aware muted color
        "placeholder:text-[var(--portal-text-light)]",
        // Focus - portal-aware primary color ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-primary)]/50 focus-visible:border-[var(--portal-primary)]",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--portal-background)]",
        // Error state (applied via parent) - semantic red
        "aria-invalid:border-destructive aria-invalid:ring-destructive/50",
        // Resize control
        "resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

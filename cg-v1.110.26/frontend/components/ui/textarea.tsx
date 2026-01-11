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
        // Base styles - generous padding
        "flex min-h-[120px] w-full rounded-lg border border-input bg-background px-4 py-3",
        // Larger, readable text
        "text-base leading-relaxed",
        // Soft shadow for depth
        "shadow-sm",
        // Smooth transitions
        "transition-smooth",
        // Placeholder - muted but readable
        "placeholder:text-muted-foreground",
        // Focus - primary color ring, visible but not harsh
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
        // Error state (applied via parent)
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

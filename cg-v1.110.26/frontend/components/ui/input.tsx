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
          // Larger height (h-9 → h-11), proper padding
          "flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2.5",
          // Larger, readable text
          "text-base",
          // Soft shadow for depth
          "shadow-sm",
          // Smooth transitions
          "transition-smooth",
          // File inputs
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Placeholder - muted but readable
          "placeholder:text-muted-foreground",
          // Focus - primary color ring, visible but not harsh
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          // Error state (applied via parent)
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

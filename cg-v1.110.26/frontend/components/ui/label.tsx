import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * CommonGround Label Component
 *
 * Design: Larger text for readability, clear visual hierarchy.
 * Philosophy: "Readable under stress"
 */
const Label = React.forwardRef<
  HTMLLabelElement,
  React.ComponentProps<"label">
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      // Slightly larger text (sm → base), medium weight
      "text-base font-medium leading-none",
      // Disabled state inherits from peer
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }

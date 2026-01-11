"use client";

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

/**
 * CommonGround Select Component
 *
 * Design: Matches Input height and styling for visual consistency.
 * Philosophy: "Consistent patterns reduce cognitive load"
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        className={cn(
          // Match Input dimensions
          "flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2.5",
          // Larger, readable text
          "text-base",
          // Appearance reset
          "appearance-none cursor-pointer",
          // Soft shadow for depth
          "shadow-sm",
          // Smooth transitions
          "transition-smooth",
          // Focus - primary color ring
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          // Error state
          "aria-invalid:border-destructive aria-invalid:ring-destructive/50",
          // Padding for chevron
          "pr-10",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  )
})
Select.displayName = "Select"

const SelectOption = React.forwardRef<
  HTMLOptionElement,
  React.ComponentProps<"option">
>(({ className, ...props }, ref) => (
  <option
    ref={ref}
    className={cn("py-2", className)}
    {...props}
  />
))
SelectOption.displayName = "SelectOption"

export { Select, SelectOption }

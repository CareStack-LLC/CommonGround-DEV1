"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * CommonGround Switch Component
 *
 * Design: Uses primary teal when active, larger touch target.
 * Philosophy: "Soft contrast, grounded colors"
 */
interface SwitchProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ id, checked = false, onCheckedChange, disabled = false, className }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          // Base styles - larger touch target
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full",
          "border-2 border-transparent",
          // Smooth transitions
          "transition-smooth",
          // Focus states
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Color states - primary teal when checked
          checked ? "bg-primary" : "bg-border",
          className
        )}
      >
        <span
          className={cn(
            // Thumb styles
            "pointer-events-none inline-block h-6 w-6 transform rounded-full",
            "bg-white shadow-sm ring-0",
            // Smooth transition
            "transition-smooth",
            // Position based on checked state
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };

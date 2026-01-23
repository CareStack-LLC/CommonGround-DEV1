import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * CommonGround Card Component
 *
 * Design: Solid backgrounds, clear boundaries, soft shadows (never harsh).
 * Philosophy: "If it doesn't serve clarity, it doesn't belong"
 */

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Portal-aware card with soft shadows
      "bg-[var(--portal-surface)] text-[var(--portal-text)] rounded-[var(--portal-radius-lg)] border border-[var(--portal-border)] shadow-[var(--portal-shadow-md)]",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

// Elevated variant for modals, popovers - higher elevation
const CardElevated = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-[var(--portal-surface-elevated)] text-[var(--portal-text)] rounded-[var(--portal-radius-lg)] border border-[var(--portal-border)] shadow-[var(--portal-shadow-lg)]",
      className
    )}
    {...props}
  />
))
CardElevated.displayName = "CardElevated"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // More generous padding (p-6 → p-7 on larger screens)
    className={cn("flex flex-col space-y-2 p-6 lg:p-7", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // Larger, clearer titles with portal-aware heading color
    className={cn(
      "text-lg font-semibold leading-tight tracking-tight lg:text-xl text-[var(--portal-text-heading)]",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // Slightly larger muted text with portal-aware color
    className={cn("text-sm text-[var(--portal-text-light)] lg:text-base", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 pt-0 lg:p-7 lg:pt-0", className)}
    {...props}
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0 lg:p-7 lg:pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardElevated,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
}

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"

/**
 * CommonGround Alert Component
 *
 * Design: Semantic colors, clear icons, readable content.
 * Philosophy: "Information hierarchy matters for stressed users"
 */
const alertVariants = cva(
  // Base styles - portal-aware rounded, padded, with icon space
  "relative w-full rounded-[var(--portal-radius-md)] border p-4 pl-12",
  {
    variants: {
      variant: {
        // Default - portal-aware primary for general info
        default:
          "bg-[var(--portal-primary)]/10 border-[var(--portal-primary)]/20 text-[var(--portal-text)]",

        // Success - for positive confirmations (semantic)
        success:
          "bg-cg-success-subtle border-cg-success/20 text-[var(--portal-text)]",

        // Warning - for attention needed (semantic)
        warning:
          "bg-cg-warning-subtle border-cg-warning/20 text-[var(--portal-text)]",

        // Error/Destructive - for issues (semantic)
        destructive:
          "bg-cg-error-subtle border-cg-error/20 text-[var(--portal-text)]",

        // ARIA - for AI assistant messages (semantic amber)
        aria:
          "bg-cg-amber-subtle border-cg-amber/20 text-[var(--portal-text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const iconMap = {
  default: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  destructive: AlertCircle,
  aria: Info,
}

const iconColorMap = {
  default: "text-[var(--portal-primary)]",
  success: "text-cg-success",
  warning: "text-cg-warning",
  destructive: "text-cg-error",
  aria: "text-cg-amber",
}

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const Icon = iconMap[variant || "default"]
    const iconColor = iconColorMap[variant || "default"]

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <Icon className={cn("absolute left-4 top-4 h-5 w-5", iconColor)} />
        {children}
      </div>
    )
  }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }

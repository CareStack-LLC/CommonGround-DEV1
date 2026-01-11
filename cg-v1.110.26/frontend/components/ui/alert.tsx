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
  // Base styles - rounded, padded, with icon space
  "relative w-full rounded-lg border p-4 pl-12",
  {
    variants: {
      variant: {
        // Default - subtle primary for general info
        default:
          "bg-cg-primary-subtle border-cg-primary/20 text-foreground",

        // Success - for positive confirmations
        success:
          "bg-cg-success-subtle border-cg-success/20 text-foreground",

        // Warning - for attention needed
        warning:
          "bg-cg-warning-subtle border-cg-warning/20 text-foreground",

        // Error/Destructive - for issues
        destructive:
          "bg-cg-error-subtle border-cg-error/20 text-foreground",

        // ARIA - for AI assistant messages
        aria:
          "bg-cg-aria-subtle border-cg-aria/20 text-foreground",
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
  default: "text-cg-primary",
  success: "text-cg-success",
  warning: "text-cg-warning",
  destructive: "text-cg-error",
  aria: "text-cg-aria",
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

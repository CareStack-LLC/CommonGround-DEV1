'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/* =============================================================================
   CGBadge - CommonGround Badge Component
   Status indicators with semantic colors
   ============================================================================= */

interface CGBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'sage' | 'slate' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const CGBadge = React.forwardRef<HTMLSpanElement, CGBadgeProps>(
  ({ className, variant = 'default', size = 'md', dot = false, children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-muted text-muted-foreground',
      success: 'bg-cg-success-subtle text-cg-success',
      warning: 'bg-cg-warning-subtle text-cg-warning',
      error: 'bg-cg-error-subtle text-cg-error',
      info: 'bg-cg-slate-subtle text-cg-slate',
      sage: 'bg-cg-sage-subtle text-cg-sage',
      slate: 'bg-cg-slate-subtle text-cg-slate',
      amber: 'bg-cg-amber-subtle text-cg-amber',
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };

    const dotColors = {
      default: 'bg-muted-foreground',
      success: 'bg-cg-success',
      warning: 'bg-cg-warning',
      error: 'bg-cg-error',
      info: 'bg-cg-slate',
      sage: 'bg-cg-sage',
      slate: 'bg-cg-slate',
      amber: 'bg-cg-amber',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
        )}
        {children}
      </span>
    );
  }
);
CGBadge.displayName = 'CGBadge';

export { CGBadge };

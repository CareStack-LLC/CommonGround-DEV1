'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/* =============================================================================
   CGCard - CommonGround Card Component
   "The Sanctuary of Truth" - Organic, elevated card surfaces
   ============================================================================= */

interface CGCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'glass';
  noPadding?: boolean;
}

const CGCard = React.forwardRef<HTMLDivElement, CGCardProps>(
  ({ className, variant = 'default', noPadding = false, ...props }, ref) => {
    const variantClasses = {
      default: 'cg-card',
      elevated: 'cg-card-elevated',
      interactive: 'cg-card-interactive',
      glass: 'cg-glass rounded-2xl border border-border/50',
    };

    return (
      <div
        ref={ref}
        className={cn(
          variantClasses[variant],
          !noPadding && 'p-6',
          className
        )}
        {...props}
      />
    );
  }
);
CGCard.displayName = 'CGCard';

/* --------------------------------------------------------------------------- */

const CGCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  />
));
CGCardHeader.displayName = 'CGCardHeader';

/* --------------------------------------------------------------------------- */

const CGCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-tight tracking-tight text-foreground',
      className
    )}
    {...props}
  />
));
CGCardTitle.displayName = 'CGCardTitle';

/* --------------------------------------------------------------------------- */

const CGCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CGCardDescription.displayName = 'CGCardDescription';

/* --------------------------------------------------------------------------- */

const CGCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-0', className)} {...props} />
));
CGCardContent.displayName = 'CGCardContent';

/* --------------------------------------------------------------------------- */

const CGCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4 border-t border-border/50 mt-4', className)}
    {...props}
  />
));
CGCardFooter.displayName = 'CGCardFooter';

export {
  CGCard,
  CGCardHeader,
  CGCardTitle,
  CGCardDescription,
  CGCardContent,
  CGCardFooter,
};

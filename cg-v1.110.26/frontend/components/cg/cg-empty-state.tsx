'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CGButton } from './cg-button';

/* =============================================================================
   CGEmptyState - Empty state placeholder
   Consistent empty states across all modules
   ============================================================================= */

interface CGEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CGEmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className,
}: CGEmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
  };

  const iconSizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-4',
        sizeClasses[size],
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-4',
          iconSizes[size]
        )}
      >
        {icon}
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <CGButton
              variant="primary"
              onClick={action.onClick}
              {...(action.href && { as: 'a', href: action.href })}
            >
              {action.label}
            </CGButton>
          )}
          {secondaryAction && (
            <CGButton
              variant="ghost"
              onClick={secondaryAction.onClick}
              {...(secondaryAction.href && { as: 'a', href: secondaryAction.href })}
            >
              {secondaryAction.label}
            </CGButton>
          )}
        </div>
      )}
    </div>
  );
}

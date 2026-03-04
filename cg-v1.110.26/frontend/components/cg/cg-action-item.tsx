'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

/* =============================================================================
   CGActionItem - Dashboard Action/Task Item
   For pending approvals, messages, upcoming exchanges
   ============================================================================= */

interface CGActionItemProps {
  icon: React.ReactNode;
  iconBg?: 'sage' | 'slate' | 'amber' | 'error' | 'muted';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'sage' | 'slate' | 'amber' | 'error';
  timestamp?: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export function CGActionItem({
  icon,
  iconBg = 'sage',
  title,
  subtitle,
  badge,
  badgeVariant = 'sage',
  timestamp,
  onClick,
  href,
  className,
}: CGActionItemProps) {
  const iconBgClasses = {
    sage: 'bg-cg-sage-subtle text-cg-sage',
    slate: 'bg-cg-slate-subtle text-cg-slate',
    amber: 'bg-cg-amber-subtle text-cg-amber',
    error: 'bg-cg-error-subtle text-cg-error',
    muted: 'bg-muted text-muted-foreground',
  };

  const badgeClasses = {
    sage: 'bg-cg-sage-subtle text-cg-sage',
    slate: 'bg-cg-slate-subtle text-cg-slate',
    amber: 'bg-cg-amber-subtle text-cg-amber',
    error: 'bg-cg-error-subtle text-cg-error',
  };

  const Component = href ? 'a' : 'button';
  const componentProps = href ? { href } : { onClick, type: 'button' as const };

  return (
    <Component
      {...componentProps}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-xl',
        'bg-card border border-border/50',
        'hover:bg-muted/50 hover:border-border',
        'transition-all duration-200',
        'group text-left',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
          iconBgClasses[iconBg]
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">{title}</p>
          {badge && (
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full',
                badgeClasses[badgeVariant]
              )}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Timestamp & Arrow */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {timestamp && (
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Component>
  );
}

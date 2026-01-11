'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CGCard } from './cg-card';

/* =============================================================================
   CGStatusCard - Custody Status Display
   "Kids are with: [You / Mom / Dad] until Tuesday at 6 PM."
   ============================================================================= */

interface CGStatusCardProps {
  custodyHolder: 'you' | 'mom' | 'dad' | string;
  custodyHolderName?: string;
  untilDateTime: string; // "Tuesday at 6 PM"
  progress?: number; // 0-100, percentage of custody period elapsed
  childrenNames?: string[];
  variant?: 'sage' | 'slate' | 'neutral';
  className?: string;
}

export function CGStatusCard({
  custodyHolder,
  custodyHolderName,
  untilDateTime,
  progress = 0,
  childrenNames,
  variant = 'sage',
  className,
}: CGStatusCardProps) {
  const displayHolder =
    custodyHolder === 'you'
      ? 'You'
      : custodyHolderName || custodyHolder.charAt(0).toUpperCase() + custodyHolder.slice(1);

  const variantClasses = {
    sage: 'border-cg-sage/30 bg-gradient-to-br from-cg-sage-subtle to-card',
    slate: 'border-cg-slate/30 bg-gradient-to-br from-cg-slate-subtle to-card',
    neutral: 'border-border bg-card',
  };

  const progressColor = {
    sage: 'bg-cg-sage',
    slate: 'bg-cg-slate',
    neutral: 'bg-muted-foreground',
  };

  return (
    <CGCard
      variant="elevated"
      className={cn('overflow-hidden', variantClasses[variant], className)}
    >
      <div className="p-6">
        {/* Status text */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">
            {childrenNames && childrenNames.length > 0
              ? `${childrenNames.join(' & ')} ${childrenNames.length > 1 ? 'are' : 'is'} with`
              : 'Kids are with'}
          </p>
          <p className="text-2xl font-bold text-foreground">
            {displayHolder}
          </p>
          <p className="text-muted-foreground mt-1">
            until <span className="font-medium text-foreground">{untilDateTime}</span>
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Custody period</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500 ease-out',
                progressColor[variant]
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </CGCard>
  );
}

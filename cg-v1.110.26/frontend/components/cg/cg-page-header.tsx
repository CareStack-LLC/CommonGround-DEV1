'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

/* =============================================================================
   CGPageHeader - CommonGround Page Header Component
   Consistent header with greeting, back button, and actions
   ============================================================================= */

interface CGPageHeaderProps {
  title: string;
  subtitle?: string;
  greeting?: string; // "Good Morning, Marcus"
  backHref?: string;
  onBack?: () => void;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode; // For child avatars or extra content
  className?: string;
}

export function CGPageHeader({
  title,
  subtitle,
  greeting,
  backHref,
  onBack,
  icon,
  actions,
  children,
  className,
}: CGPageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className={cn(
        'bg-card border-b border-border/50 sticky top-0 z-40',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        {/* Top row with greeting and children avatars */}
        {greeting && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-lg text-muted-foreground">{greeting}</p>
            {children}
          </div>
        )}

        {/* Main header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(backHref || onBack) && (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {icon && (
              <div className="p-2.5 bg-cg-sage-subtle rounded-xl text-cg-sage">
                {icon}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        {/* Children content (if no greeting) */}
        {!greeting && children && <div className="mt-4">{children}</div>}
      </div>
    </header>
  );
}

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/* =============================================================================
   CGButton - CommonGround Button Component
   Organic, rounded buttons with smooth transitions
   ============================================================================= */

interface CGButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'slate';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const CGButton = React.forwardRef<HTMLButtonElement, CGButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

    const variantClasses = {
      primary:
        'bg-cg-sage text-white hover:bg-cg-sage-light focus:ring-cg-sage/50 shadow-sm hover:shadow-md',
      secondary:
        'bg-transparent border-2 border-cg-sage text-cg-sage hover:bg-cg-sage hover:text-white focus:ring-cg-sage/50',
      ghost:
        'bg-transparent text-cg-sage hover:bg-cg-sage-subtle focus:ring-cg-sage/50',
      danger:
        'bg-cg-error text-white hover:bg-cg-error/90 focus:ring-cg-error/50',
      slate:
        'bg-cg-slate text-white hover:bg-cg-slate-light focus:ring-cg-slate/50 shadow-sm hover:shadow-md',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm rounded-lg',
      md: 'px-5 py-2.5 text-sm rounded-full',
      lg: 'px-8 py-3 text-base rounded-full',
      icon: 'p-2.5 rounded-xl',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
CGButton.displayName = 'CGButton';

export { CGButton };

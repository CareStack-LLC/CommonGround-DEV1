'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/* =============================================================================
   CGInput - CommonGround Input Component
   Clean, organic form inputs
   ============================================================================= */

interface CGInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const CGInput = React.forwardRef<HTMLInputElement, CGInputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-card border border-border rounded-xl px-4 py-3',
              'text-foreground placeholder:text-muted-foreground',
              'transition-all duration-200',
              'focus:border-cg-sage focus:ring-2 focus:ring-cg-sage/20 focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-cg-error focus:border-cg-error focus:ring-cg-error/20',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-cg-error">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);
CGInput.displayName = 'CGInput';

/* =============================================================================
   CGTextarea - CommonGround Textarea Component
   ============================================================================= */

interface CGTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const CGTextarea = React.forwardRef<HTMLTextAreaElement, CGTextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id || React.useId();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full bg-card border border-border rounded-xl px-4 py-3',
            'text-foreground placeholder:text-muted-foreground',
            'transition-all duration-200 min-h-[120px] resize-y',
            'focus:border-cg-sage focus:ring-2 focus:ring-cg-sage/20 focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-cg-error focus:border-cg-error focus:ring-cg-error/20',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-cg-error">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);
CGTextarea.displayName = 'CGTextarea';

export { CGInput, CGTextarea };

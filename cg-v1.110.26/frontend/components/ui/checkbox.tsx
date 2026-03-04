'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange?.(!checked)}
        className={cn(
          'peer h-4 w-4 shrink-0 rounded-[var(--portal-radius-sm)] border border-[var(--portal-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-primary)]/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-smooth',
          checked ? 'bg-[var(--portal-primary)] text-white' : 'bg-[var(--portal-surface)]',
          className
        )}
      >
        {checked && (
          <Check className="h-3 w-3 text-current mx-auto" strokeWidth={3} />
        )}
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          {...props}
        />
      </button>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };

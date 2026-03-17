'use client';

import { Sun, Moon } from 'lucide-react';
import { useKidSpaceTheme } from './kidspace-theme-provider';
import { cn } from '@/lib/utils';

interface KidSpaceThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function KidSpaceThemeToggle({ className, size = 'sm' }: KidSpaceThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useKidSpaceTheme();
  const isDark = resolvedTheme === 'dark';

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const buttonSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        buttonSize,
        'relative rounded-full flex items-center justify-center',
        'transition-all duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-primary)] focus-visible:ring-offset-2',
        isDark
          ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 ring-1 ring-slate-700'
          : 'bg-amber-50 hover:bg-amber-100 text-amber-600 ring-1 ring-amber-200',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{ minHeight: 'unset', minWidth: 'unset', padding: 0 }}
    >
      <div className="relative">
        {isDark ? (
          <Moon className={cn(iconSize, 'transition-transform duration-300')} strokeWidth={2} />
        ) : (
          <Sun className={cn(iconSize, 'transition-transform duration-300')} strokeWidth={2} />
        )}
      </div>
    </button>
  );
}

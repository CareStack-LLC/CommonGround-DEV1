'use client';

import { cn } from '@/lib/utils';

interface KidComsLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { container: 'w-8 h-8', svg: 'w-4 h-4', text: 'text-base' },
  md: { container: 'w-10 h-10', svg: 'w-5 h-5', text: 'text-lg' },
  lg: { container: 'w-12 h-12', svg: 'w-6 h-6', text: 'text-xl' },
};

export function KidComsLogo({ className, showText = true, size = 'md' }: KidComsLogoProps) {
  const sizeClasses = SIZES[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* CommonGround Logo Icon */}
      <div
        className={cn(
          'bg-white rounded-xl flex items-center justify-center shadow-md',
          sizeClasses.container
        )}
      >
        <svg
          className={sizeClasses.svg}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20"
            stroke="#2C5F5D"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20"
            stroke="#2C5F5D"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
          <circle cx="12" cy="12" r="2.5" fill="#2C5F5D" />
        </svg>
      </div>

      {/* KidsCom Text */}
      {showText && (
        <span
          className={cn(
            'font-bold text-gray-800 tracking-tight',
            sizeClasses.text
          )}
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          KidsCom
        </span>
      )}
    </div>
  );
}

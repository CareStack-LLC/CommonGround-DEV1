'use client';

import { cn } from '@/lib/utils';
import { useId } from 'react';

interface KidComsLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** 'dark' renders white text (for dark backgrounds), 'light' renders dark text */
  variant?: 'dark' | 'light';
}

const SIZES = {
  sm: { container: 'w-8 h-8', text: 'text-base' },
  md: { container: 'w-10 h-10', text: 'text-lg' },
  lg: { container: 'w-12 h-12', text: 'text-xl' },
};

export function KidComsLogo({ className, showText = true, size = 'md', variant = 'light' }: KidComsLogoProps) {
  const sizeClasses = SIZES[size];
  const id = useId().replace(/:/g, '');

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* CommonGround Logo — same SVG as parent navigation */}
      <div
        className={cn(
          'rounded-xl flex items-center justify-center shadow-md overflow-hidden',
          sizeClasses.container
        )}
      >
        <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E8F4F8" />
              <stop offset="100%" stopColor="#D6ECE8" />
            </linearGradient>
            <linearGradient id={`${id}-lf`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5BC4A0" />
              <stop offset="100%" stopColor="#3DAA8A" />
            </linearGradient>
            <linearGradient id={`${id}-rf`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4BA8C8" />
              <stop offset="100%" stopColor="#2D6A8F" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="120" fill={`url(#${id}-bg)`} />
          {/* Left parent */}
          <circle cx="168" cy="148" r="48" fill={`url(#${id}-lf)`} />
          <path d="M118 218 Q168 258 218 218" stroke={`url(#${id}-lf)`} strokeWidth="16" strokeLinecap="round" fill="none" />
          {/* Right parent */}
          <circle cx="344" cy="148" r="48" fill={`url(#${id}-rf)`} />
          <path d="M294 218 Q344 258 394 218" stroke={`url(#${id}-rf)`} strokeWidth="16" strokeLinecap="round" fill="none" />
          {/* Golden arch */}
          <path d="M218 168 Q256 104 294 168" stroke="#F5A623" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.95" />
          {/* Child */}
          <circle cx="256" cy="330" r="38" fill="#F5A623" />
          <path d="M218 382 Q256 414 294 382" stroke="#F5A623" strokeWidth="12" strokeLinecap="round" fill="none" />
        </svg>
      </div>

      {/* CommonGround Text */}
      {showText && (
        <span
          className={cn(
            sizeClasses.text,
            variant === 'dark' ? 'text-white' : 'text-[#2C5F5D]'
          )}
          style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
        >
          <span className="font-bold">Common</span>
          <span className={cn('font-normal', variant === 'dark' ? 'opacity-90' : 'opacity-80')}>Ground</span>
        </span>
      )}
    </div>
  );
}

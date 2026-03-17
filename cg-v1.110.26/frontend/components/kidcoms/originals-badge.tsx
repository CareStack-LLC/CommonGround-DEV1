'use client';

import { cn } from '@/lib/utils';

interface OriginalsBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function OriginalsBadge({ className, size = 'sm' }: OriginalsBadgeProps) {
  const isSmall = size === 'sm';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        'bg-gradient-to-r from-teal-500/90 to-cyan-500/90 backdrop-blur-sm',
        isSmall ? 'px-2 py-0.5' : 'px-3 py-1',
        className
      )}
    >
      {/* Mini CG logo icon */}
      <svg
        width={isSmall ? 10 : 14}
        height={isSmall ? 10 : 14}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <circle cx="168" cy="180" r="40" fill="rgba(255,255,255,0.9)" />
        <circle cx="344" cy="180" r="40" fill="rgba(255,255,255,0.7)" />
        <path d="M218 200 Q256 140 294 200" stroke="#F5A623" strokeWidth="12" strokeLinecap="round" fill="none" />
        <circle cx="256" cy="330" r="32" fill="#F5A623" />
      </svg>
      <span
        className={cn(
          'font-bold text-white tracking-wide',
          isSmall ? 'text-[8px]' : 'text-[10px]'
        )}
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        ORIGINAL
      </span>
    </div>
  );
}

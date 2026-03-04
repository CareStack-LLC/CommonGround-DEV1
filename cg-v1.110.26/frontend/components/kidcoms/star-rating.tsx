'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number; // 0-5, supports decimals
  count?: number; // Optional review count
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showCount?: boolean;
}

const SIZES = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const TEXT_SIZES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function StarRating({
  rating,
  count,
  size = 'md',
  className,
  showCount = true
}: StarRatingProps) {
  // Clamp rating between 0-5
  const clampedRating = Math.max(0, Math.min(5, rating));

  // Calculate full stars, half star, and empty stars
  const fullStars = Math.floor(clampedRating);
  const hasHalfStar = clampedRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  // Format count (e.g., 1234 → "1.2k", 1234567 → "1.2M")
  const formatCount = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Stars */}
      <div className="flex items-center gap-0.5">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn(SIZES[size], 'fill-amber-400 text-amber-400')}
            strokeWidth={0}
          />
        ))}

        {/* Half star */}
        {hasHalfStar && (
          <div className="relative">
            {/* Empty star background */}
            <Star
              className={cn(SIZES[size], 'text-amber-400')}
              fill="none"
              strokeWidth={2}
            />
            {/* Half-filled star overlay */}
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star
                className={cn(SIZES[size], 'fill-amber-400 text-amber-400')}
                strokeWidth={0}
              />
            </div>
          </div>
        )}

        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn(SIZES[size], 'text-amber-400')}
            fill="none"
            strokeWidth={2}
          />
        ))}
      </div>

      {/* Rating number */}
      <span
        className={cn(TEXT_SIZES[size], 'font-bold text-amber-500')}
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        {clampedRating.toFixed(1)}
      </span>

      {/* Review count (optional) */}
      {showCount && count !== undefined && count > 0 && (
        <span
          className={cn(TEXT_SIZES[size], 'text-slate-500')}
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          ({formatCount(count)})
        </span>
      )}
    </div>
  );
}

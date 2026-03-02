'use client';

import Image from 'next/image';
import { Play, Heart, Info, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StarRating } from './star-rating';
import { useState } from 'react';

interface FeaturedContent {
  id: string;
  title: string;
  cover?: string;
  description?: string;
  duration?: number; // minutes for videos
  pages?: number; // for books
  rating?: number; // 0-5
  ratingCount?: number;
  category?: string;
  type: 'video' | 'book';
}

interface FeaturedHeroBannerProps {
  content: FeaturedContent;
  badge?: string; // "Trending", "New", "Continue", etc.
  onPlay: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  onWatchTogether?: () => void;
  className?: string;
}

export function FeaturedHeroBanner({
  content,
  badge = 'Featured',
  onPlay,
  onFavorite,
  isFavorite: initialFavorite = false,
  onWatchTogether,
  className
}: FeaturedHeroBannerProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);

  const handleFavoriteClick = () => {
    setIsFavorite(!isFavorite);
    onFavorite?.();
  };

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  return (
    <div
      className={cn(
        'relative w-full rounded-2xl overflow-hidden',
        'bg-slate-900 shadow-2xl',
        'aspect-[3/4] sm:aspect-[16/9]',
        className
      )}
    >
      {/* Background Image */}
      {content.cover && (
        <>
          <Image
            src={content.cover}
            alt={content.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* Blur overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </>
      )}

      {/* Content Overlay - Bottom Left */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8 lg:p-10">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-2">
            <div className="px-3 py-1 bg-cyan-500 rounded-full flex items-center gap-1.5">
              <span className="text-white font-bold text-xs" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {badge}
              </span>
            </div>

            {content.category && (
              <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                <span className="text-white font-semibold text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {content.category}
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <h2
            className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-2 drop-shadow-2xl"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {content.title}
          </h2>

          {/* Metadata Row */}
          <div className="flex items-center gap-4 mb-3">
            {/* Rating */}
            {content.rating !== undefined && (
              <StarRating
                rating={content.rating}
                count={content.ratingCount}
                size="md"
                showCount={false}
              />
            )}

            {/* Duration or Pages */}
            {content.type === 'video' && content.duration && (
              <span className="text-white/90 text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                {formatDuration(content.duration)}
              </span>
            )}

            {content.type === 'book' && content.pages && (
              <span className="text-white/90 text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                {content.pages} pages
              </span>
            )}

            {/* Review Count */}
            {content.ratingCount && content.ratingCount > 0 && (
              <span className="text-white/70 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                ({content.ratingCount >= 1000 ? `${(content.ratingCount / 1000).toFixed(1)}k` : content.ratingCount} reviews)
              </span>
            )}
          </div>

          {/* Description */}
          {content.description && (
            <p
              className="text-white/90 text-sm md:text-base mb-4 line-clamp-2 max-w-xl"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {content.description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Primary CTA */}
            <button
              onClick={onPlay}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-full',
                'bg-white text-slate-900 font-bold',
                'hover:bg-slate-100 active:scale-95',
                'transition-all duration-200',
                'shadow-xl hover:shadow-2xl',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'
              )}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{content.type === 'video' ? 'Watch Now' : 'Read Now'}</span>
            </button>

            {/* Watch Together CTA */}
            {onWatchTogether && content.type === 'video' && (
              <button
                onClick={onWatchTogether}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-full',
                  'bg-cyan-500 text-white font-bold',
                  'hover:bg-cyan-400 active:scale-95',
                  'transition-all duration-200',
                  'shadow-xl hover:shadow-cyan-500/20',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'
                )}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <Users className="w-5 h-5" />
                <span>Watch Together</span>
              </button>
            )}

            {/* Info Button */}
            <button
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-full',
                'bg-white/20 backdrop-blur-sm text-white font-semibold',
                'hover:bg-white/30 active:scale-95',
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'
              )}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <Info className="w-5 h-5" />
              <span>More Info</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

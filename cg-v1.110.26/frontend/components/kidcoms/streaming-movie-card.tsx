'use client';

import Image from 'next/image';
import { Play, Heart, Clock, Info, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { OriginalsBadge } from './originals-badge';

interface StreamingMovieCardProps {
  video: {
    id: string;
    title: string;
    url: string;
    thumbnail?: string;
    duration?: string;
    description?: string;
    category?: string;
    ageRange?: string;
  };
  onClick: () => void;
  onFavoriteToggle?: () => void;
  className?: string;
  progress?: number; // 0-100 percentage
  isFavorite?: boolean;
  onWatchTogether?: () => void;
  isOriginal?: boolean;
}

export function StreamingMovieCard({
  video,
  onClick,
  onFavoriteToggle,
  className,
  progress,
  isFavorite: initialFavorite,
  onWatchTogether,
  isOriginal = true
}: StreamingMovieCardProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite ?? false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    onFavoriteToggle?.();
  };

  return (
    <div
      className={cn('group relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Card */}
      <button
        onClick={onClick}
        className={cn(
          'relative w-full rounded-lg overflow-hidden',
          'transition-all duration-300 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
          'group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-red-500/20'
        )}
      >
        {/* Poster Image - Portrait 2:3 ratio */}
        <div className="relative aspect-[2/3]" style={{ background: 'var(--portal-surface, #1E293B)' }}>
          {video.thumbnail ? (
            <Image
              src={video.thumbnail}
              alt={video.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-16 h-16 text-slate-600" />
            </div>
          )}

          {/* Originals Badge */}
          {isOriginal && (
            <div className="absolute top-2 left-2 z-20">
              <OriginalsBadge size="sm" />
            </div>
          )}

          {/* Gradient Overlay - intensifies on hover */}
          <div className={cn(
            'absolute inset-0 bg-gradient-to-t transition-opacity duration-300',
            isHovered
              ? 'from-black via-black/60 to-transparent opacity-90'
              : 'from-black/80 via-black/20 to-transparent opacity-60'
          )} />

          {/* Progress Bar - Bottom */}
          {progress !== undefined && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}

          {/* Hover Overlay - Play & Info */}
          <div className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-3',
            'transition-all duration-300',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}>
            {/* Large Play Button */}
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl transform transition-transform duration-300 group-hover:scale-110">
              <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
            </div>

            {/* Watch Together Button */}
            {onWatchTogether && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWatchTogether();
                }}
                className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold hover:bg-white/40 transition-all flex items-center gap-1.5"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <Users className="w-3.5 h-3.5" />
                Watch Together
              </button>
            )}

            {/* Quick Info */}
            <div className="text-center px-4">
              <div className="text-white font-bold text-sm mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {video.title}
              </div>
              {video.duration && (
                <div className="flex items-center justify-center gap-1.5 text-white/90 text-xs">
                  <Clock className="w-3 h-3" />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{video.duration}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Section - Below Poster */}
        <div className="p-3" style={{ background: 'var(--portal-surface, #0F172A)' }}>
          {/* Title */}
          <h3 className="font-bold text-sm line-clamp-1 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading, #fff)' }}>
            {video.title}
          </h3>

          {/* Metadata Row */}
          <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--portal-muted, #94A3B8)' }}>
            {video.duration && (
              <>
                <span className="font-mono">{video.duration}</span>
                {video.ageRange && <span>•</span>}
              </>
            )}
            {video.ageRange && (
              <span className="px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--portal-surface-elevated, #334155)', color: 'var(--portal-text, #E2E8F0)' }}>
                {video.ageRange}
              </span>
            )}
          </div>

          {/* Description */}
          {video.description && (
            <p className="text-xs line-clamp-2 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted, #94A3B8)' }}>
              {video.description}
            </p>
          )}

          {/* Progress Indicator Text */}
          {progress !== undefined && progress > 0 && (
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--portal-border, #334155)' }}>
              <div className="flex items-center justify-between text-xs">
                <span style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted, #94A3B8)' }}>
                  {progress >= 90 ? 'Watched' : 'Continue watching'}
                </span>
                <span className="text-red-400 font-bold font-mono">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { Film, Play, Clock, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleFavorite } from '@/lib/watch-progress';
import { useState } from 'react';

interface KidMovieCardProps {
  video: {
    id: string;
    title: string;
    url: string;
    thumbnail?: string;
    duration?: string;
    description?: string;
    category?: string;
  };
  onClick: () => void;
  className?: string;
  progress?: number; // 0-100 percentage
  isFavorite?: boolean;
}

export function KidMovieCard({ video, onClick, className, progress, isFavorite: initialFavorite }: KidMovieCardProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite ?? false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = toggleFavorite(video.id);
    setIsFavorite(newState);
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl overflow-hidden shadow-md border border-slate-200',
        'transition-all duration-150',
        'hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5',
        'active:scale-100 active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
        'text-left w-full relative group',
        className
      )}
      aria-label={`Watch ${video.title}`}
    >
      {/* Favorite Button */}
      <button
        onClick={handleFavoriteClick}
        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 flex items-center justify-center hover:scale-110 transition-transform duration-150"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          className={cn(
            'w-4 h-4 transition-colors duration-150',
            isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'
          )}
        />
      </button>

      {/* Poster Section */}
      <div className="relative aspect-video bg-slate-100">
        {/* Thumbnail or Placeholder */}
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Film className="w-12 h-12 text-slate-300" />
          </div>
        )}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              'w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm shadow-lg',
              'flex items-center justify-center',
              'transition-all duration-150',
              'group-hover:scale-110 group-hover:bg-white'
            )}
          >
            <Play className="w-6 h-6 text-teal-500 ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Progress Bar */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700/50">
            <div
              className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-semibold text-slate-800 text-sm line-clamp-2 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {video.title}
        </h3>

        {/* Meta Info */}
        <div className="flex items-center justify-between">
          {video.duration && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>{video.duration}</span>
            </div>
          )}

          {progress !== undefined && progress > 0 && (
            <div className="text-xs font-medium text-teal-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {Math.round(progress)}%
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

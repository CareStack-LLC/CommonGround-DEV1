'use client';

import Image from 'next/image';
import { Film, Play, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KidMovieCardProps {
  video: {
    id: string;
    title: string;
    url: string;
    thumbnail?: string;
    duration?: string;
    description?: string;
  };
  onClick: () => void;
  className?: string;
}

export function KidMovieCard({ video, onClick, className }: KidMovieCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-white rounded-3xl overflow-hidden shadow-lg',
        'transition-all duration-200',
        'hover:shadow-xl hover:scale-105 hover:-translate-y-1',
        'active:scale-100 active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300 focus-visible:ring-offset-2',
        'text-left w-full',
        className
      )}
      aria-label={`Watch ${video.title}`}
    >
      {/* Poster Section */}
      <div className="relative aspect-video bg-gray-200">
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
            <Film className="w-12 h-12 text-gray-400" />
          </div>
        )}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              'w-16 h-16 rounded-full bg-green-500 shadow-xl',
              'flex items-center justify-center',
              'transition-transform duration-200',
              'group-hover:scale-110'
            )}
          >
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-bold text-gray-800 text-sm truncate mb-1">
          {video.title}
        </h3>

        {/* Duration */}
        {video.duration && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{video.duration}</span>
          </div>
        )}
      </div>
    </button>
  );
}

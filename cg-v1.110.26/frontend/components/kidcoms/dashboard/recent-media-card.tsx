'use client';

import { Play, BookOpen, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentMediaCardProps {
  type: 'video' | 'book';
  title: string;
  thumbnail?: string;
  progress: number; // 0-100
  watchedWith?: string; // Contact name or 'alone'
  onResume: () => void;
  className?: string;
}

export function RecentMediaCard({
  type,
  title,
  thumbnail,
  progress,
  watchedWith,
  onResume,
  className
}: RecentMediaCardProps) {
  const isAlone = !watchedWith || watchedWith === 'alone';

  return (
    <div className={cn(
      'relative bg-white rounded-xl overflow-hidden shadow-md border border-slate-200',
      'transition-all duration-150 hover:shadow-lg',
      className
    )}>
      {/* Thumbnail Section */}
      <div className="relative aspect-video bg-slate-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {type === 'video' ? (
              <Play className="w-12 h-12 text-slate-300" />
            ) : (
              <BookOpen className="w-12 h-12 text-slate-300" />
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700/50">
          <div
            className={cn(
              "h-full transition-all duration-300",
              type === 'video' ? "bg-red-500" : "bg-amber-500"
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Play Overlay for Videos */}
        {type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Play className="w-6 h-6 text-red-500 ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-semibold text-slate-800 text-sm line-clamp-1 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {title}
        </h3>

        {/* Watched With Info */}
        <div className="flex items-center gap-2 mb-2">
          {isAlone ? (
            <>
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                Watched alone
              </span>
            </>
          ) : (
            <>
              <Users className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-xs text-slate-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                with {watchedWith}
              </span>
            </>
          )}
        </div>

        {/* Resume Button */}
        <button
          onClick={onResume}
          className={cn(
            'w-full py-2 px-3 rounded-lg text-sm font-medium',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            type === 'video'
              ? 'bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-500'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 focus-visible:ring-amber-500'
          )}
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Resume ({Math.round(progress)}%)
        </button>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { BookOpen, Bookmark, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface StreamingBookCardProps {
  book: {
    id: string;
    title: string;
    url: string;
    cover?: string;
    pages?: number;
    author?: string;
    category?: string;
    ageRange?: string;
  };
  onClick: () => void;
  onBookmarkToggle?: () => void;
  className?: string;
  progress?: {
    currentPage: number;
    totalPages: number;
    completed: boolean;
  } | null;
  isBookmarked?: boolean;
}

export function StreamingBookCard({
  book,
  onClick,
  onBookmarkToggle,
  className,
  progress,
  isBookmarked: initialBookmarked
}: StreamingBookCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked ?? false);
  const [isHovered, setIsHovered] = useState(false);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    onBookmarkToggle?.();
  };

  const progressPercentage = progress && book.pages
    ? (progress.currentPage / book.pages) * 100
    : 0;

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
          'relative w-full bg-slate-900 rounded-lg overflow-hidden',
          'transition-all duration-300 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
          'group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-amber-500/20'
        )}
      >
        {/* Book Cover - Portrait 2:3 ratio */}
        <div className="relative aspect-[2/3] bg-slate-800">
          {book.cover ? (
            <Image
              src={book.cover}
              alt={book.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
              <BookOpen className="w-16 h-16 text-amber-500" />
            </div>
          )}

          {/* Gradient Overlay - intensifies on hover */}
          <div className={cn(
            'absolute inset-0 bg-gradient-to-t transition-opacity duration-300',
            isHovered
              ? 'from-black via-black/60 to-transparent opacity-90'
              : 'from-black/80 via-black/20 to-transparent opacity-60'
          )} />

          {/* Bookmark Button - Top Right */}
          <button
            onClick={handleBookmarkClick}
            className={cn(
              'absolute top-2 right-2 z-20 w-9 h-9 rounded-full',
              'backdrop-blur-md border transition-all duration-200',
              'flex items-center justify-center',
              isBookmarked
                ? 'bg-amber-500/90 border-amber-400'
                : 'bg-black/40 border-white/20 hover:bg-black/60'
            )}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            <Bookmark
              className={cn(
                'w-4.5 h-4.5 transition-all duration-200',
                isBookmarked ? 'fill-white text-white scale-110' : 'text-white'
              )}
            />
          </button>

          {/* Progress Bar - Bottom */}
          {progress && progress.currentPage > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          )}

          {/* Hover Overlay - Read Button & Info */}
          <div className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-3',
            'transition-all duration-300',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}>
            {/* Large Read Button */}
            <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center shadow-xl transform transition-transform duration-300 group-hover:scale-110">
              <BookOpen className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>

            {/* Quick Info */}
            <div className="text-center px-4">
              <div className="text-white font-bold text-sm mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {book.title}
              </div>
              {book.pages && (
                <div className="flex items-center justify-center gap-1.5 text-white/90 text-xs">
                  <BookOpen className="w-3 h-3" />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{book.pages} pages</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Section - Below Cover */}
        <div className="p-3 bg-slate-900">
          {/* Title */}
          <h3 className="font-bold text-white text-sm line-clamp-1 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {book.title}
          </h3>

          {/* Metadata Row */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            {book.author && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="line-clamp-1">{book.author}</span>
              </div>
            )}
            {book.author && book.ageRange && <span>•</span>}
            {book.ageRange && (
              <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-medium">
                {book.ageRange}
              </span>
            )}
          </div>

          {/* Pages Info */}
          {book.pages && (
            <div className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              {book.pages} {book.pages === 1 ? 'page' : 'pages'}
            </div>
          )}

          {/* Progress Indicator Text */}
          {progress && progress.currentPage > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {progress.completed ? 'Finished' : `Page ${progress.currentPage} of ${book.pages}`}
                </span>
                <span className="text-amber-400 font-bold font-mono">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { BookOpen, Bookmark, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { StarRating } from '@/components/kidcoms/star-rating';
import { OriginalsBadge } from '@/components/kidcoms/originals-badge';

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
    rating?: number;
    ratingCount?: number;
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
  isOriginal?: boolean;
}

export function StreamingBookCard({
  book,
  onClick,
  onBookmarkToggle,
  className,
  progress,
  isBookmarked: initialBookmarked,
  isOriginal = true
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

  const rating = book.rating ?? 4.2;

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
          'relative w-full rounded-xl overflow-hidden',
          'transition-all duration-300 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4BA8C8] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          'group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-[#4BA8C8]/10'
        )}
        style={{ background: 'var(--portal-surface, #1E293B)', border: '1px solid var(--portal-border, #334155)', boxShadow: 'var(--portal-shadow-md)' }}
      >
        {/* Book Cover - Portrait 2:3 ratio */}
        <div className="relative aspect-[2/3]" style={{ background: 'var(--portal-surface-elevated, #334155)' }}>
          {/* Originals Badge */}
          {isOriginal && (
            <div className="absolute top-2 right-2 z-20">
              <OriginalsBadge size="sm" />
            </div>
          )}

          {book.cover ? (
            <Image
              src={book.cover}
              alt={book.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
              <BookOpen className="w-16 h-16 text-slate-500" />
            </div>
          )}

          {/* Star Rating — top left */}
          <div className="absolute top-2 left-2 z-20 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-white text-xs font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {rating.toFixed(1)}
            </span>
          </div>

          {/* Continue Reading badge */}
          {progress && progress.currentPage > 0 && !progress.completed && (
            <div className="absolute top-2 right-2 z-20 bg-amber-500/90 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-white text-[10px] font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                Continue
              </span>
            </div>
          )}

          {/* Progress Bar - Bottom */}
          {progress && progress.currentPage > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          )}

          {/* Hover Overlay */}
          <div className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-[2px]',
            'transition-all duration-300',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}>
            <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center shadow-xl transform transition-transform duration-300 group-hover:scale-110">
              <BookOpen className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            {book.pages && (
              <div className="text-white/90 text-xs font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {book.pages} pages
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="p-2.5" style={{ background: 'var(--portal-surface, #1E293B)' }}>
          <h3 className="font-bold text-xs line-clamp-1 mb-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading, #fff)' }}>
            {book.title}
          </h3>

          {book.author && (
            <div className="flex items-center gap-1 text-[10px] mb-1.5" style={{ color: 'var(--portal-muted, #94A3B8)' }}>
              <User className="w-2.5 h-2.5" />
              <span className="line-clamp-1">{book.author}</span>
            </div>
          )}

          {/* Progress Indicator */}
          {progress && progress.currentPage > 0 ? (
            <div className="text-[10px] text-[#4BA8C8] font-semibold">
              {progress.completed ? '✓ Finished' : `${Math.round(progressPercentage)}% read`}
            </div>
          ) : book.pages ? (
            <div className="text-[10px] font-medium" style={{ color: 'var(--portal-muted, #64748B)' }}>
              ~{Math.max(1, Math.round(book.pages * 0.5))} min read
            </div>
          ) : null}
        </div>
      </button>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReadingProgress } from '@/lib/reading-progress';

interface KidBookCardProps {
  book: {
    id: string;
    title: string;
    url: string;
    cover?: string;
    pages?: number;
    author?: string;
    category?: string;
  };
  onClick: () => void;
  className?: string;
  progress?: ReadingProgress | null;
}

export function KidBookCard({ book, onClick, className, progress }: KidBookCardProps) {
  const progressPercentage = progress && book.pages
    ? (progress.currentPage / book.pages) * 100
    : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative bg-white rounded-xl overflow-hidden shadow-md border border-slate-200',
        'transition-all duration-150',
        'hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5',
        'active:scale-100 active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
        'text-left w-full group',
        className
      )}
      aria-label={`Read ${book.title}`}
    >
      {/* Book Cover Section */}
      <div className="relative aspect-[3/4] bg-slate-100">
        {book.cover ? (
          <Image
            src={book.cover}
            alt={book.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="relative h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
            <BookOpen className="w-12 h-12 text-amber-500" />
          </div>
        )}

        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Page count badge */}
        {book.pages && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm">
            <div className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-amber-500" />
              <span className="text-xs font-medium text-slate-700" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {book.pages}
              </span>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {progress && progress.currentPage > 0 && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Page {progress.currentPage}
                </span>
                <span className="text-xs font-medium text-amber-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Book Info Section */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-semibold text-slate-800 text-sm line-clamp-2 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {book.title}
        </h3>

        {/* Author */}
        {book.author && (
          <p className="text-xs text-slate-500 line-clamp-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            by {book.author}
          </p>
        )}
      </div>
    </button>
  );
}

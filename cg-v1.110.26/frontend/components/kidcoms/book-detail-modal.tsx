'use client';

import Image from 'next/image';
import { BookOpen, User, Clock, Layers, Tag, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { OriginalsBadge } from '@/components/kidcoms/originals-badge';
import type { StorybookContent, BookCategory } from '@/lib/theater-content';
import { bookCategories } from '@/lib/theater-content';
import type { ReadingProgress } from '@/lib/reading-progress';

interface BookDetailModalProps {
  book: StorybookContent | null;
  onClose: () => void;
  onStartReading: (book: StorybookContent) => void;
  /**
   * Optional: if provided, the modal shows a secondary "Read with a
   * grown-up" button that hands the same book into the synced reader.
   * Pass undefined on pages where co-reading is not available.
   */
  onStartReadTogether?: (book: StorybookContent) => void;
  progress?: ReadingProgress | null;
}

export function BookDetailModal({
  book,
  onClose,
  onStartReading,
  onStartReadTogether,
  progress,
}: BookDetailModalProps) {
  if (!book) return null;

  const category = bookCategories[book.category];
  const pages = book.pages || 0;
  const estimatedMinutes = Math.max(1, Math.round(pages * 0.5));
  const progressPercent = progress && progress.totalPages > 0
    ? Math.round((progress.currentPage / progress.totalPages) * 100)
    : 0;
  const isInProgress = progress && progress.currentPage > 0 && !progress.completed;
  const isCompleted = progress?.completed;

  return (
    <Dialog open={!!book} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        {/* Cover Image Section */}
        <div className="relative w-full aspect-[16/10] overflow-hidden">
          {book.cover ? (
            <Image
              src={book.cover}
              alt={book.title}
              fill
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
            >
              <BookOpen className="w-16 h-16 text-white/50" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

          {/* Originals badge */}
          <div className="absolute top-4 left-4">
            <OriginalsBadge size="md" />
          </div>

          {/* Completed badge */}
          {isCompleted && (
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-sm">
              <span className="text-white text-xs font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                ✓ Finished
              </span>
            </div>
          )}

          {/* Title overlay at bottom */}
          <div className="absolute bottom-4 left-4 right-4">
            <DialogTitle
              className="text-2xl font-black text-white drop-shadow-lg"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {book.title}
            </DialogTitle>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 space-y-4">
          {/* Author Row */}
          {book.author && (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
              >
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-text-heading)' }}>
                  {book.author}
                </p>
                <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                  Author
                </p>
              </div>
            </div>
          )}

          {/* Metadata Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Age Range */}
            {book.ageRange && (
              <div className="px-2.5 py-1 rounded-full" style={{ background: 'var(--portal-background)' }}>
                <span className="text-xs font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-text)' }}>
                  Ages {book.ageRange}
                </span>
              </div>
            )}

            {/* Page Count */}
            {pages > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'var(--portal-background)' }}>
                <Layers className="w-3.5 h-3.5" style={{ color: 'var(--portal-muted)' }} />
                <span className="text-xs font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--portal-text)' }}>
                  {pages} pages
                </span>
              </div>
            )}

            {/* Read Time */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'var(--portal-background)' }}>
              <Clock className="w-3.5 h-3.5" style={{ color: 'var(--portal-muted)' }} />
              <span className="text-xs font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--portal-text)' }}>
                ~{estimatedMinutes} min
              </span>
            </div>

            {/* Genre */}
            {category && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'var(--portal-background)' }}>
                <Tag className="w-3.5 h-3.5" style={{ color: 'var(--portal-muted)' }} />
                <span className="text-xs font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-text)' }}>
                  {category.emoji} {category.name}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <DialogDescription
            className="text-sm leading-relaxed"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {`Dive into "${book.title}" — a ${category?.name?.toLowerCase() || 'wonderful'} book${book.author ? ` by ${book.author}` : ''} perfect for ages ${book.ageRange || '5+'}.${pages > 0 ? ` ${pages} pages of adventure await!` : ''}`}
          </DialogDescription>

          {/* Progress bar */}
          {isInProgress && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                  Reading progress
                </span>
                <span className="text-xs font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--portal-text-heading)' }}>
                  {progressPercent}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--portal-border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #F59E0B, #D97706)',
                  }}
                />
              </div>
              <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                Page {progress!.currentPage} of {progress!.totalPages}
              </p>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="pt-1 space-y-2">
            <button
              onClick={() => onStartReading(book)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
              }}
            >
              <BookOpen className="w-5 h-5" />
              {isInProgress ? 'Continue Reading' : isCompleted ? 'Read Again' : 'Start Reading'}
            </button>
            {onStartReadTogether && (
              <button
                onClick={() => onStartReadTogether(book)}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 hover:shadow active:scale-[0.98]"
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  background: 'var(--portal-background)',
                  color: 'var(--portal-text-heading)',
                  border: '2px solid var(--portal-border)',
                }}
              >
                <Users className="w-5 h-5" />
                Read with a grown-up
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import Image from 'next/image';
import { BookOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KidBookCardProps {
  book: {
    id: string;
    title: string;
    url: string;
    cover?: string;
    pages?: number;
    description?: string;
  };
  onClick: () => void;
  className?: string;
}

export function KidBookCard({ book, onClick, className }: KidBookCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative bg-white rounded-3xl overflow-hidden shadow-lg',
        'transition-all duration-300 ease-out',
        'hover:shadow-2xl hover:scale-105 hover:-translate-y-2',
        'active:scale-100 active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
        'text-left w-full group',
        className
      )}
      aria-label={`Read ${book.title}`}
    >
      {/* Book spine decoration */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-blue-400 via-purple-400 to-pink-400 opacity-60" />

      {/* Book Cover Section */}
      <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-50">
        {book.cover ? (
          <>
            <Image
              src={book.cover}
              alt={book.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            {/* Subtle overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
          </>
        ) : (
          // Magical fallback cover
          <div className="relative h-full flex items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 overflow-hidden">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-4 w-8 h-8 border-2 border-white rounded-full" />
              <div className="absolute top-12 right-8 w-6 h-6 border-2 border-white rounded-full" />
              <div className="absolute bottom-8 left-12 w-10 h-10 border-2 border-white rounded-full" />
              <div className="absolute bottom-16 right-6 w-4 h-4 border-2 border-white rounded-full" />
            </div>

            {/* Sparkle decorations */}
            <div className="absolute top-6 right-6">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            </div>
            <div className="absolute bottom-10 left-8 animate-pulse animation-delay-300">
              <Sparkles className="w-4 h-4 text-pink-300" />
            </div>

            {/* Book icon */}
            <div className="relative z-10 bg-white/40 backdrop-blur-sm rounded-full p-6 shadow-xl">
              <BookOpen className="w-12 h-12 text-indigo-600" />
            </div>

            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          </div>
        )}

        {/* Page count badge */}
        {book.pages && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-bold text-gray-700">{book.pages}</span>
            </div>
          </div>
        )}
      </div>

      {/* Book Info Section */}
      <div className="p-4 bg-gradient-to-b from-white to-slate-50/50">
        {/* Title */}
        <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2 mb-1 min-h-[2.5rem]">
          {book.title}
        </h3>

        {/* Read indicator */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:animate-pulse" />
          <span>Tap to read</span>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-3xl shadow-[inset_0_0_20px_rgba(147,197,253,0.3)]" />
      </div>
    </button>
  );
}

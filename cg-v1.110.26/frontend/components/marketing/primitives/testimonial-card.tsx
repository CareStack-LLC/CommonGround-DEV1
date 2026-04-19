/**
 * TestimonialCard
 *
 * Quote + name + role, with optional avatar and star rating.
 * Two variants:
 *   - compact:  side-by-side avatar and text, good for grids
 *   - featured: larger quote, centered, for a single hero testimonial
 */

import Image from 'next/image';
import { Quote, Star } from 'lucide-react';

export interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  avatarUrl?: string;
  initial?: string;
  rating?: number;
  variant?: 'compact' | 'featured';
  className?: string;
}

function StarRow({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${clamped} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < clamped ? 'fill-[#F5A623] text-[#F5A623]' : 'text-gray-300'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function Avatar({
  avatarUrl,
  name,
  initial,
  size,
}: {
  avatarUrl?: string;
  name: string;
  initial?: string;
  size: number;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }
  const label = initial ?? name.charAt(0).toUpperCase();
  const dim = { width: size, height: size };
  return (
    <div
      className="flex items-center justify-center rounded-full bg-[#3DAA8A]/15 text-[#3DAA8A] font-semibold"
      style={dim}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}

export function TestimonialCard({
  quote,
  name,
  role,
  avatarUrl,
  initial,
  rating,
  variant = 'compact',
  className = '',
}: TestimonialCardProps) {
  if (variant === 'featured') {
    return (
      <figure
        className={`relative mx-auto max-w-2xl rounded-3xl border border-gray-100 bg-gradient-to-br from-[#F4F8F7] to-white p-8 sm:p-10 text-center shadow-sm ${className}`.trim()}
      >
        <Quote
          className="mx-auto mb-4 h-8 w-8 text-[#3DAA8A]/60"
          aria-hidden="true"
        />
        {rating !== undefined && (
          <div className="mb-4 flex justify-center">
            <StarRow rating={rating} />
          </div>
        )}
        <blockquote className="font-serif text-xl sm:text-2xl text-[#1E3A4A] leading-snug">
          &ldquo;{quote}&rdquo;
        </blockquote>
        <figcaption className="mt-6 flex flex-col items-center gap-3">
          <Avatar
            avatarUrl={avatarUrl}
            name={name}
            initial={initial}
            size={56}
          />
          <div>
            <div className="font-semibold text-[#1E3A4A]">{name}</div>
            <div className="text-sm text-gray-500">{role}</div>
          </div>
        </figcaption>
      </figure>
    );
  }

  return (
    <figure
      className={`flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`.trim()}
    >
      {rating !== undefined && (
        <div className="mb-3">
          <StarRow rating={rating} />
        </div>
      )}
      <blockquote className="flex-1 text-gray-700 leading-relaxed">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <Avatar
          avatarUrl={avatarUrl}
          name={name}
          initial={initial}
          size={40}
        />
        <div>
          <div className="text-sm font-semibold text-[#1E3A4A]">{name}</div>
          <div className="text-xs text-gray-500">{role}</div>
        </div>
      </figcaption>
    </figure>
  );
}

/**
 * SectionHeading
 *
 * Consistent eyebrow + title + description block used across marketing
 * sections. Server component — no client-side state.
 */

import type { ReactNode } from 'react';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  children?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  as: Tag = 'h2',
  className = '',
  children,
}: SectionHeadingProps) {
  const alignment =
    align === 'center' ? 'text-center mx-auto' : 'text-left';

  // Baseline sizing: h1 gets the hero treatment, h2/h3 scale down.
  const titleSize =
    Tag === 'h1'
      ? 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'
      : Tag === 'h2'
        ? 'text-2xl sm:text-3xl md:text-4xl'
        : 'text-xl sm:text-2xl md:text-3xl';

  return (
    <div
      className={`${alignment} max-w-3xl ${align === 'center' ? '' : ''} ${className}`.trim()}
    >
      {eyebrow && (
        <p className="mb-3 text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-[#3DAA8A]">
          {eyebrow}
        </p>
      )}
      <Tag
        className={`font-serif text-[#1E3A4A] leading-tight tracking-tight ${titleSize}`}
      >
        {title}
      </Tag>
      {description && (
        <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

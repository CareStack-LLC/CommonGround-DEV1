/**
 * HeroSection
 *
 * Unified hero block with three layout variants:
 *   - default:  text on the left, media on the right (stacks on mobile)
 *   - split:    true 50/50 — same visual weight on both sides
 *   - centered: text-only, centered (no media slot)
 *
 * All copy is rendered with the existing DM Serif Display (`font-serif`)
 * headline + DM Sans body stack. Mobile-first sizing to avoid the
 * font-size-too-large audit finding.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

import { ctaPrimaryClasses, ctaSecondaryClasses } from './cta-button';

type CtaProp = { label: string; href: string };

export interface HeroSectionProps {
  eyebrow?: string;
  headline: string;
  headlineAccent?: string;
  subheadline?: string;
  primaryCta: CtaProp;
  secondaryCta?: CtaProp;
  media?: ReactNode;
  variant?: 'default' | 'split' | 'centered';
  trustItems?: string[];
  className?: string;
}

function renderHeadline(headline: string, accent?: string) {
  if (!accent || !headline.includes(accent)) {
    return headline;
  }
  const [before, ...rest] = headline.split(accent);
  const after = rest.join(accent);
  return (
    <>
      {before}
      <span className="text-cg-amber">{accent}</span>
      {after}
    </>
  );
}

export function HeroSection({
  eyebrow,
  headline,
  headlineAccent,
  subheadline,
  primaryCta,
  secondaryCta,
  media,
  variant = 'default',
  trustItems,
  className = '',
}: HeroSectionProps) {
  const isCentered = variant === 'centered';
  const isSplit = variant === 'split';

  const textBlock = (
    <div className={isCentered ? 'text-center mx-auto max-w-3xl' : ''}>
      {eyebrow && (
        <p className="mb-4 text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-cg-sage">
          {eyebrow}
        </p>
      )}
      <h1 className="font-serif text-foreground text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight">
        {renderHeadline(headline, headlineAccent)}
      </h1>
      {subheadline && (
        <p className="mt-5 text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl">
          {subheadline}
        </p>
      )}
      <div
        className={`mt-8 flex flex-col sm:flex-row gap-3 ${
          isCentered ? 'justify-center' : ''
        }`}
      >
        <Link href={primaryCta.href} className={ctaPrimaryClasses}>
          {primaryCta.label}
        </Link>
        {secondaryCta && (
          <Link href={secondaryCta.href} className={ctaSecondaryClasses}>
            {secondaryCta.label}
          </Link>
        )}
      </div>
      {trustItems && trustItems.length > 0 && (
        <ul
          className={`mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs sm:text-sm text-gray-500 ${
            isCentered ? 'justify-center' : ''
          }`}
        >
          {trustItems.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-cg-sage"
              />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section
      className={`relative overflow-hidden px-6 py-16 sm:py-20 md:py-24 ${className}`.trim()}
    >
      <div className="max-w-7xl mx-auto">
        {isCentered ? (
          textBlock
        ) : (
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center ${
              isSplit ? 'md:gap-16' : ''
            }`}
          >
            {textBlock}
            {media && (
              <div className={isSplit ? 'md:order-last' : ''}>{media}</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

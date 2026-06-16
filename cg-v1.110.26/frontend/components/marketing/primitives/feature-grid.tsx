/**
 * FeatureGrid
 *
 * Responsive 2/3/4-column grid of icon + title + description cards.
 *
 * Tailwind 4 gotcha: the content scanner only finds *literal* class
 * strings. A templated `md:grid-cols-${n}` won't be picked up, so we
 * map through a static lookup object containing the real class names.
 */

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { SectionHeading } from './section-heading';

const COLS: Record<2 | 3 | 4, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-2 lg:grid-cols-4',
};

type Accent = 'teal' | 'gold';

const ACCENT_STYLES: Record<Accent, { bg: string; icon: string }> = {
  teal: {
    bg: 'bg-cg-sage/10',
    icon: 'text-cg-sage',
  },
  gold: {
    bg: 'bg-cg-amber/10',
    icon: 'text-cg-amber',
  },
};

export interface FeatureGridItem {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  accent?: Accent;
}

export interface FeatureGridProps {
  columns?: 2 | 3 | 4;
  heading?: string;
  subheading?: string;
  features: FeatureGridItem[];
  className?: string;
}

export function FeatureGrid({
  columns = 3,
  heading,
  subheading,
  features,
  className = '',
}: FeatureGridProps) {
  const colClass = COLS[columns];

  return (
    <section className={`px-6 py-16 sm:py-20 ${className}`.trim()}>
      <div className="max-w-7xl mx-auto">
        {(heading || subheading) && (
          <div className="mb-12">
            <SectionHeading
              title={heading ?? ''}
              description={subheading}
              align="center"
            />
          </div>
        )}
        <div className={`grid grid-cols-1 ${colClass} gap-6 lg:gap-8`}>
          {features.map((feature) => {
            const Icon = feature.icon;
            const accent = ACCENT_STYLES[feature.accent ?? 'teal'];
            const cardBody = (
              <div className="cg-card-hover h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:border-cg-sage/30">
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${accent.bg}`}
                >
                  <Icon className={`h-6 w-6 ${accent.icon}`} aria-hidden="true" />
                </div>
                <h3 className="font-serif text-xl text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
                {feature.href && (
                  <span className="mt-4 inline-flex items-center text-sm font-semibold text-cg-sage">
                    Learn more
                    <span aria-hidden="true" className="ml-1">
                      &rarr;
                    </span>
                  </span>
                )}
              </div>
            );

            return feature.href ? (
              <Link
                key={feature.title}
                href={feature.href}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cg-sage focus-visible:ring-offset-2 rounded-2xl"
              >
                {cardBody}
              </Link>
            ) : (
              <div key={feature.title}>{cardBody}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

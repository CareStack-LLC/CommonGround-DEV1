/**
 * CtaBand
 *
 * Full-width conversion strip used at the bottom of landing pages
 * (or mid-page to split funnels). Three background treatments map to
 * the brand palette.
 */

import Link from 'next/link';

type CtaProp = { label: string; href: string };

export interface CtaBandProps {
  headline: string;
  subheadline?: string;
  primaryCta: CtaProp;
  secondaryCta?: CtaProp;
  background?: 'teal' | 'gold' | 'gradient';
  className?: string;
}

const BG_STYLES: Record<
  NonNullable<CtaBandProps['background']>,
  {
    section: string;
    headline: string;
    subheadline: string;
    primary: string;
    secondary: string;
  }
> = {
  teal: {
    section: 'bg-[#3DAA8A]',
    headline: 'text-white',
    subheadline: 'text-white/85',
    primary: 'bg-white text-[#1E3A4A] hover:bg-[#F4F8F7]',
    secondary:
      'border-2 border-white/40 text-white hover:border-white hover:bg-white/10',
  },
  gold: {
    section: 'bg-[#F5A623]',
    headline: 'text-[#1E3A4A]',
    subheadline: 'text-[#1E3A4A]/80',
    primary:
      'bg-[#1E3A4A] text-white hover:bg-[#13252F]',
    secondary:
      'border-2 border-[#1E3A4A]/30 text-[#1E3A4A] hover:border-[#1E3A4A] hover:bg-white/20',
  },
  gradient: {
    section: 'bg-gradient-to-br from-[#1E3A4A] via-[#2F6F63] to-[#3DAA8A]',
    headline: 'text-white',
    subheadline: 'text-white/85',
    primary:
      'bg-[#F5A623] text-[#1E3A4A] hover:bg-[#E89511]',
    secondary:
      'border-2 border-white/40 text-white hover:border-white hover:bg-white/10',
  },
};

export function CtaBand({
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
  background = 'teal',
  className = '',
}: CtaBandProps) {
  const styles = BG_STYLES[background];
  return (
    <section
      className={`${styles.section} px-6 py-16 sm:py-20 ${className}`.trim()}
    >
      <div className="max-w-4xl mx-auto text-center">
        <h2
          className={`font-serif leading-tight tracking-tight text-2xl sm:text-3xl md:text-4xl ${styles.headline}`}
        >
          {headline}
        </h2>
        {subheadline && (
          <p
            className={`mt-4 text-base sm:text-lg leading-relaxed ${styles.subheadline}`}
          >
            {subheadline}
          </p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={primaryCta.href}
            className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm sm:text-base font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${styles.primary}`}
          >
            {primaryCta.label}
          </Link>
          {secondaryCta && (
            <Link
              href={secondaryCta.href}
              className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm sm:text-base font-semibold transition-colors ${styles.secondary}`}
            >
              {secondaryCta.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

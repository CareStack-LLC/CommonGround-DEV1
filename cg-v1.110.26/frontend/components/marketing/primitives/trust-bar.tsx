/**
 * TrustBar
 *
 * Row of concrete numbers (or short labels) used under heroes to
 * establish credibility. Two visual variants:
 *   - stats: value on top, small label beneath; centered row with hairline
 *            dividers (balanced for 3 OR 4 items, unlike a fixed grid)
 *   - logos: smaller, horizontal, labels emphasized (for claim lists
 *            like "Attorney-reviewed | 256-bit AES")
 */

import { Fragment } from 'react';

export interface TrustBarItem {
  value: string;
  label: string;
}

export interface TrustBarProps {
  items: TrustBarItem[];
  variant?: 'logos' | 'stats';
  className?: string;
}

export function TrustBar({
  items,
  variant = 'stats',
  className = '',
}: TrustBarProps) {
  if (variant === 'logos') {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-3 py-6 text-sm text-gray-500 ${className}`.trim()}
      >
        {items.map((item, idx) => (
          <div
            key={`${item.value}-${item.label}`}
            className="flex items-center gap-2"
          >
            <span className="font-semibold text-foreground">{item.value}</span>
            <span>{item.label}</span>
            {idx < items.length - 1 && (
              <span
                aria-hidden="true"
                className="hidden sm:inline-block h-1 w-1 rounded-full bg-gray-300 ml-4"
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-6 py-8 sm:gap-x-12 lg:gap-x-16 ${className}`.trim()}
    >
      {items.map((item, idx) => (
        <Fragment key={`${item.value}-${item.label}`}>
          <div className="text-center">
            <div className="font-serif text-2xl sm:text-3xl md:text-[2.5rem] text-[#1E3A4A] leading-none">
              {item.value}
            </div>
            <div className="mt-2 text-xs sm:text-sm font-medium uppercase tracking-wider text-gray-500">
              {item.label}
            </div>
          </div>
          {idx < items.length - 1 && (
            <span
              aria-hidden="true"
              className="hidden sm:block h-12 w-px bg-gray-200"
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

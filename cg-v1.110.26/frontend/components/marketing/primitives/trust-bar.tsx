/**
 * TrustBar
 *
 * Row of concrete numbers (or short labels) used under heroes to
 * establish credibility. Two visual variants:
 *   - stats: big value on top, small label beneath
 *   - logos: smaller, horizontal, labels emphasized (for claim lists
 *            like "HIPAA-aligned | Attorney-reviewed | 256-bit AES")
 */

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
            <span className="font-semibold text-[#1E3A4A]">{item.value}</span>
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
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 sm:gap-8 py-8 ${className}`.trim()}
    >
      {items.map((item) => (
        <div
          key={`${item.value}-${item.label}`}
          className="text-center"
        >
          <div className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#1E3A4A] leading-none">
            {item.value}
          </div>
          <div className="mt-2 text-xs sm:text-sm font-medium uppercase tracking-wider text-gray-500">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

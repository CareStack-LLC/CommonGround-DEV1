'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HorizontalScrollRowProps<T> {
  title: string;
  items: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  onViewAll?: () => void;
  showViewAll?: boolean;
  className?: string;
  cardClassName?: string;
  titleClassName?: string;    // override title text color for light pages
  viewAllClassName?: string;  // override view-all link color for light pages
}

export function HorizontalScrollRow<T>({
  title,
  items,
  renderCard,
  onViewAll,
  showViewAll = true,
  className,
  cardClassName,
  titleClassName,
  viewAllClassName,
}: HorizontalScrollRowProps<T>) {
  return (
    <section className={cn('w-full', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className={cn('text-xl md:text-2xl font-bold', titleClassName || 'text-white')}
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {title}
        </h2>

        {/* View All Button */}
        {showViewAll && onViewAll && items.length > 0 && (
          <button
            onClick={onViewAll}
            className={cn(
              'flex items-center gap-1 text-sm font-semibold',
              viewAllClassName || 'text-cyan-400 hover:text-cyan-300',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
              'rounded-lg px-2 py-1'
            )}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Horizontal Scroll Container */}
      {items.length > 0 ? (
        <div
          className={cn(
            'overflow-x-auto overflow-y-hidden',
            'snap-x snap-mandatory',
            'pb-4',
            // Hide scrollbar while maintaining scroll functionality
            'scrollbar-hide',
            '-mx-4 px-4 md:mx-0 md:px-0'
          )}
        >
          <div className="flex gap-4 min-w-max">
            {items.map((item, index) => (
              <div
                key={index}
                className={cn(
                  'snap-start flex-shrink-0',
                  cardClassName
                )}
              >
                {renderCard(item, index)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Empty State
        <div className="flex items-center justify-center h-48 bg-slate-900 rounded-xl border border-slate-800">
          <p className="text-slate-500 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            No items to display
          </p>
        </div>
      )}

      {/* Hidden style tag for scrollbar hiding */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;  /* Chrome, Safari, Opera */
        }
      `}</style>
    </section>
  );
}

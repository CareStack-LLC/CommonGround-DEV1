'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface KidDashboardCardProps {
  title: string;
  subtitle?: string;
  illustration?: string;
  icon?: React.ReactNode;
  color?: 'purple' | 'green' | 'blue' | 'pink' | 'amber';
  badge?: number;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const colorStyles = {
  purple: {
    border: 'hover:border-purple-300',
    shadow: 'hover:shadow-purple-200/50',
    text: 'text-purple-600',
    bg: 'bg-purple-50'
  },
  green: {
    border: 'hover:border-green-300',
    shadow: 'hover:shadow-green-200/50',
    text: 'text-green-600',
    bg: 'bg-green-50'
  },
  blue: {
    border: 'hover:border-blue-300',
    shadow: 'hover:shadow-blue-200/50',
    text: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  pink: {
    border: 'hover:border-pink-300',
    shadow: 'hover:shadow-pink-200/50',
    text: 'text-pink-600',
    bg: 'bg-pink-50'
  },
  amber: {
    border: 'hover:border-amber-300',
    shadow: 'hover:shadow-amber-200/50',
    text: 'text-amber-600',
    bg: 'bg-amber-50'
  }
};

export function KidDashboardCard({
  title,
  subtitle,
  illustration,
  icon,
  color = 'purple',
  badge,
  onClick,
  disabled = false,
  className
}: KidDashboardCardProps) {
  const styles = colorStyles[color];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Base styles
        "relative bg-white rounded-3xl p-6",
        "min-h-[200px] flex flex-col items-center justify-center",
        "border-2 border-transparent",

        // Shadow and transitions
        "shadow-lg transition-all duration-200",

        // Hover effects (only when not disabled)
        !disabled && [
          "hover:shadow-xl",
          "hover:scale-105",
          "hover:-translate-y-1",
          styles.border,
          styles.shadow
        ],

        // Active/Press effect
        !disabled && "active:scale-100 active:translate-y-0",

        // Disabled state
        disabled && "opacity-50 cursor-not-allowed",

        // Focus state for accessibility
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-300 focus-visible:ring-offset-2",

        className
      )}
      aria-label={subtitle ? `${title} - ${subtitle}` : title}
    >
      {/* Notification badge */}
      {badge !== undefined && badge > 0 && (
        <div className="absolute top-3 right-3 min-w-[28px] h-7 bg-red-500 rounded-full flex items-center justify-center px-2 shadow-lg animate-bounce-subtle">
          <span className="text-white text-sm font-black">
            {badge > 99 ? '99+' : badge}
          </span>
        </div>
      )}

      {/* Illustration or Icon */}
      <div className="mb-4 flex-shrink-0">
        {illustration ? (
          <div className="relative w-[120px] h-[120px] flex items-center justify-center">
            <Image
              src={illustration}
              alt={title}
              width={120}
              height={120}
              className="object-contain drop-shadow-lg"
            />
          </div>
        ) : icon ? (
          <div className={cn(
            "w-16 h-16 flex items-center justify-center rounded-2xl transition-colors",
            styles.bg,
            styles.text
          )}>
            <div className="w-14 h-14">
              {icon}
            </div>
          </div>
        ) : null}
      </div>

      {/* Title */}
      <h3 className="text-lg md:text-xl font-black text-gray-800 text-center leading-tight mb-1">
        {title}
      </h3>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-gray-500 font-semibold text-center">
          {subtitle}
        </p>
      )}

      {/* Decorative corner accent */}
      <div className={cn(
        "absolute bottom-3 right-3 w-3 h-3 rounded-full transition-colors",
        styles.bg,
        !disabled && "group-hover:scale-150"
      )} />

      {/* Hidden style tag for custom animations */}
      <style>{`
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </button>
  );
}

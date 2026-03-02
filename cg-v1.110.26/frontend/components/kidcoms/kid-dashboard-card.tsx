'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface KidDashboardCardProps {
  title: string;
  subtitle?: string;
  illustration?: string;
  icon?: React.ReactNode;
  color?: 'cyan' | 'green' | 'blue' | 'pink' | 'amber' | 'teal' | 'red';
  badge?: number;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

// Modern color palette for pre-teens (cooler, more sophisticated)
const colorStyles = {
  cyan: {
    border: 'hover:border-cyan-500',
    shadow: 'hover:shadow-cyan-500/20',
    text: 'text-cyan-600',
    bg: 'bg-gradient-to-br from-cyan-50 to-teal-50',
    accent: 'bg-cyan-500'
  },
  green: {
    border: 'hover:border-emerald-500',
    shadow: 'hover:shadow-emerald-500/20',
    text: 'text-emerald-600',
    bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
    accent: 'bg-emerald-500'
  },
  blue: {
    border: 'hover:border-blue-500',
    shadow: 'hover:shadow-blue-500/20',
    text: 'text-blue-600',
    bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
    accent: 'bg-blue-500'
  },
  pink: {
    border: 'hover:border-pink-500',
    shadow: 'hover:shadow-pink-500/20',
    text: 'text-pink-600',
    bg: 'bg-gradient-to-br from-pink-50 to-rose-50',
    accent: 'bg-pink-500'
  },
  amber: {
    border: 'hover:border-amber-500',
    shadow: 'hover:shadow-amber-500/20',
    text: 'text-amber-600',
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
    accent: 'bg-amber-500'
  },
  teal: {
    border: 'hover:border-teal-500',
    shadow: 'hover:shadow-teal-500/20',
    text: 'text-teal-600',
    bg: 'bg-gradient-to-br from-teal-50 to-cyan-50',
    accent: 'bg-teal-500'
  },
  red: {
    border: 'hover:border-red-500',
    shadow: 'hover:shadow-red-500/20',
    text: 'text-red-600',
    bg: 'bg-gradient-to-br from-red-50 to-orange-50',
    accent: 'bg-red-500'
  }
};

export function KidDashboardCard({
  title,
  subtitle,
  illustration,
  icon,
  color = 'cyan',
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
        // Base styles - modern, sleeker
        "relative bg-white rounded-xl p-6",
        "min-h-[200px] flex flex-col items-center justify-center",
        "border border-slate-200",

        // Shadow and transitions - snappier
        "shadow-md transition-all duration-150 ease-out",

        // Hover effects (only when not disabled) - more subtle
        !disabled && [
          "hover:shadow-lg",
          "hover:scale-[1.02]",
          "hover:-translate-y-0.5",
          styles.border,
          styles.shadow
        ],

        // Active/Press effect
        !disabled && "active:scale-100 active:translate-y-0",

        // Disabled state
        disabled && "opacity-50 cursor-not-allowed",

        // Focus state for accessibility - modern teal ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",

        className
      )}
      aria-label={subtitle ? `${title} - ${subtitle}` : title}
    >
      {/* Notification badge - modern design */}
      {badge !== undefined && badge > 0 && (
        <div className="absolute top-2 right-2 min-w-[24px] h-6 bg-red-500 rounded-full flex items-center justify-center px-1.5 shadow-md animate-bounce-subtle border-2 border-white">
          <span className="text-white text-xs font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
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
              className="object-contain drop-shadow-md"
            />
          </div>
        ) : icon ? (
          <div className={cn(
            "w-16 h-16 flex items-center justify-center rounded-xl transition-all duration-150",
            styles.bg,
            styles.text,
            !disabled && "group-hover:scale-110"
          )}>
            <div className="w-12 h-12">
              {icon}
            </div>
          </div>
        ) : null}
      </div>

      {/* Title - using Space Grotesk font */}
      <h3 className="text-base md:text-lg font-bold text-slate-800 text-center leading-tight mb-1 tracking-tight" style={{ fontFamily: 'Space Grotesk, DM Sans, sans-serif' }}>
        {title}
      </h3>

      {/* Subtitle - using Inter font */}
      {subtitle && (
        <p className="text-sm text-slate-600 font-medium text-center" style={{ fontFamily: 'Inter, DM Sans, sans-serif' }}>
          {subtitle}
        </p>
      )}

      {/* Modern accent indicator */}
      <div className={cn(
        "absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full transition-all duration-150",
        styles.accent,
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

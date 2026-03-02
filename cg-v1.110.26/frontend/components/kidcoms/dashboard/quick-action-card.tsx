'use client';

import { cn } from '@/lib/utils';

interface QuickActionCardProps {
  title: string;
  icon: React.ReactNode;
  color: 'teal' | 'red' | 'amber' | 'cyan';
  onClick: () => void;
  className?: string;
}

const colorStyles = {
  teal: {
    bg: 'bg-gradient-to-br from-teal-500 to-cyan-500',
    shadow: 'shadow-teal-500/20',
  },
  red: {
    bg: 'bg-gradient-to-br from-red-500 to-orange-500',
    shadow: 'shadow-red-500/20',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/20',
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-500 to-teal-500',
    shadow: 'shadow-cyan-500/20',
  },
};

export function QuickActionCard({ title, icon, color, onClick, className }: QuickActionCardProps) {
  const styles = colorStyles[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative rounded-xl p-4 h-24',
        'flex flex-col items-center justify-center gap-2',
        'shadow-md transition-all duration-150',
        'hover:shadow-lg hover:scale-105 hover:-translate-y-0.5',
        'active:scale-100 active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
        styles.bg,
        styles.shadow,
        className
      )}
    >
      {/* Icon */}
      <div className="w-8 h-8 text-white">
        {icon}
      </div>

      {/* Title */}
      <div className="text-white text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {title}
      </div>
    </button>
  );
}

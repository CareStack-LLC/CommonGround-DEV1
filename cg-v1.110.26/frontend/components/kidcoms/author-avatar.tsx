'use client';

import Image from 'next/image';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthorAvatarProps {
  name: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  className?: string;
}

const SIZES = {
  sm: { container: 'w-16 h-16', text: 'text-xs', iconSize: 'w-6 h-6' },
  md: { container: 'w-20 h-20', text: 'text-sm', iconSize: 'w-8 h-8' },
  lg: { container: 'w-24 h-24', text: 'text-base', iconSize: 'w-10 h-10' },
  xl: { container: 'w-32 h-32', text: 'text-lg', iconSize: 'w-12 h-12' },
};

export function AuthorAvatar({
  name,
  avatar,
  size = 'md',
  onClick,
  className
}: AuthorAvatarProps) {
  const sizeConfig = SIZES[size];

  // Generate initials from name (first letter of first and last name)
  const getInitials = (fullName: string): string => {
    const words = fullName.trim().split(' ').filter(w => w.length > 0);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  // Generate consistent background color based on name
  const getBackgroundColor = (str: string): string => {
    const colors = [
      'bg-gradient-to-br from-amber-400 to-orange-500',
      'bg-gradient-to-br from-emerald-400 to-teal-500',
      'bg-gradient-to-br from-blue-400 to-cyan-500',
      'bg-gradient-to-br from-purple-400 to-pink-500',
      'bg-gradient-to-br from-rose-400 to-red-500',
      'bg-gradient-to-br from-indigo-400 to-purple-500',
    ];
    const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const bgColor = getBackgroundColor(name);

  const Container = onClick ? 'button' : 'div';

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Avatar Circle */}
      <Container
        onClick={onClick}
        className={cn(
          sizeConfig.container,
          'rounded-full overflow-hidden border-2 border-slate-700/50 aspect-square',
          'shadow-lg relative flex items-center justify-center',
          onClick && [
            'transition-all duration-200',
            'hover:scale-110 hover:shadow-xl hover:border-amber-500/50',
            'active:scale-105',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2'
          ]
        )}
        aria-label={onClick ? `View ${name}'s books` : undefined}
      >
        {avatar ? (
          // Show avatar image if available
          <Image
            src={avatar}
            alt={name}
            fill
            className="object-cover"
          />
        ) : (
          // Show initials fallback
          <div className={cn(
            'w-full h-full flex items-center justify-center',
            bgColor
          )}>
            <span
              className={cn(
                'font-black text-white drop-shadow-md'
              )}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {initials}
            </span>
          </div>
        )}
      </Container>

      {/* Author Name */}
      <div className="text-center max-w-[120px]">
        <p
          className={cn(
            sizeConfig.text,
            'font-semibold text-white truncate'
          )}
          style={{ fontFamily: 'Inter, sans-serif' }}
          title={name}
        >
          {name}
        </p>
      </div>
    </div >
  );
}

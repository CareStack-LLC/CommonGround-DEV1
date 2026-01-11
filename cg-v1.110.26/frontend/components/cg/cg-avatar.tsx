'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/* =============================================================================
   CGAvatar - CommonGround Avatar Component
   For children, parents, contacts
   ============================================================================= */

interface CGAvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circle' | 'rounded';
  color?: 'sage' | 'slate' | 'amber' | 'auto';
  className?: string;
}

export function CGAvatar({
  name,
  src,
  size = 'md',
  variant = 'circle',
  color = 'auto',
  className,
}: CGAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Auto-assign color based on first letter of name
  const autoColor = React.useMemo(() => {
    const charCode = name.charCodeAt(0);
    if (charCode % 3 === 0) return 'sage';
    if (charCode % 3 === 1) return 'slate';
    return 'amber';
  }, [name]);

  const finalColor = color === 'auto' ? autoColor : color;

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const colorClasses = {
    sage: 'bg-cg-sage-subtle text-cg-sage',
    slate: 'bg-cg-slate-subtle text-cg-slate',
    amber: 'bg-cg-amber-subtle text-cg-amber',
  };

  const variantClasses = {
    circle: 'rounded-full',
    rounded: 'rounded-xl',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          'object-cover flex-shrink-0',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center font-semibold flex-shrink-0',
        sizeClasses[size],
        colorClasses[finalColor],
        variantClasses[variant],
        className
      )}
      title={name}
    >
      {initials}
    </div>
  );
}

/* =============================================================================
   CGAvatarGroup - Stack of avatars
   ============================================================================= */

interface CGAvatarGroupProps {
  avatars: Array<{ name: string; src?: string }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function CGAvatarGroup({
  avatars,
  max = 4,
  size = 'md',
  className,
}: CGAvatarGroupProps) {
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const overlapClasses = {
    xs: '-ml-1.5',
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3',
  };

  return (
    <div className={cn('flex items-center', className)}>
      {displayed.map((avatar, index) => (
        <div
          key={avatar.name + index}
          className={cn(
            'ring-2 ring-card',
            index > 0 && overlapClasses[size]
          )}
          style={{ zIndex: avatars.length - index }}
        >
          <CGAvatar name={avatar.name} src={avatar.src} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center bg-muted text-muted-foreground font-medium rounded-full ring-2 ring-card',
            overlapClasses[size],
            size === 'xs' && 'w-6 h-6 text-xs',
            size === 'sm' && 'w-8 h-8 text-xs',
            size === 'md' && 'w-10 h-10 text-sm',
            size === 'lg' && 'w-12 h-12 text-sm'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

'use client';

import { ReactNode } from 'react';
import { KidComsLogo } from '@/components/kidcoms/kidcoms-logo';
import { KidSpaceThemeToggle } from '@/components/kidcoms/kidspace-theme-toggle';
import { useKidSpaceTheme } from '@/components/kidcoms/kidspace-theme-provider';

interface KidSpaceHeaderProps {
  /** Page title text */
  title: string;
  /** Subtitle text below the title */
  subtitle?: string;
  /** User initial for the avatar circle */
  userInitial?: string;
  /** Tailwind gradient classes for avatar, e.g. 'from-[#4BA8C8] to-[#3DAA8A]' */
  avatarGradient?: string;
  /** Extra action buttons between theme toggle and avatar */
  actions?: ReactNode;
  /** Content rendered below the title row (e.g. search bar, pills) */
  children?: ReactNode;
  /** Whether the header should be sticky */
  sticky?: boolean;
}

export function KidSpaceHeader({
  title,
  subtitle,
  userInitial,
  avatarGradient = 'from-[#4BA8C8] to-[#3DAA8A]',
  actions,
  children,
  sticky = true,
}: KidSpaceHeaderProps) {
  const { resolvedTheme } = useKidSpaceTheme();
  const logoVariant = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <header
      className={`${sticky ? 'sticky top-0' : ''} z-40 backdrop-blur-lg`}
      style={{
        background: 'var(--portal-background)',
        borderBottom: '1px solid var(--portal-border)',
      }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-3">
            <KidComsLogo showText={false} size="sm" variant={logoVariant} />
            <div>
              <h1
                className="font-black text-xl leading-tight"
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  color: 'var(--portal-text-heading)',
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  className="text-xs"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    color: 'var(--portal-muted)',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions + Theme Toggle + Avatar */}
          <div className="flex items-center gap-2">
            {actions}
            <KidSpaceThemeToggle size="sm" />
            {userInitial && (
              <div
                className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0 ring-2 ring-offset-2 ring-[#4BA8C8]/50`}
                style={{ ['--tw-ring-offset-color' as string]: 'var(--portal-background)' }}
              >
                <span
                  className="text-white font-bold text-sm"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {userInitial}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optional extra content below the title row (search, pills, etc.) */}
      {children}
    </header>
  );
}

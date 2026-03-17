'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Film, BookOpen, Gamepad2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/my-circle/child/library', icon: BookOpen, label: 'Books' },
  { href: '/my-circle/child/my-circle-page', icon: Users, label: 'People' },
  { href: '/my-circle/child/dashboard', icon: Home, label: 'Home' },
  { href: '/my-circle/child/arcade', icon: Gamepad2, label: 'Games' },
  { href: '/my-circle/child/movies', icon: Film, label: 'Movies' },
];

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl',
        'min-w-[56px] justify-center',
        'transition-all duration-300 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1',
        isActive ? 'scale-105' : 'active:scale-95 hover:scale-102'
      )}
      style={{
        color: isActive ? 'var(--portal-text-heading)' : 'var(--portal-muted)',
      }}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className={cn(
          'w-5 h-5 transition-all duration-300 ease-in-out',
          isActive && 'scale-110 drop-shadow-sm'
        )}
        strokeWidth={isActive ? 2.2 : 1.5}
      />
      <span
        className={cn(
          'transition-all duration-300 ease-in-out',
          isActive ? 'font-semibold' : 'font-medium'
        )}
        style={{
          fontSize: '11px',
          fontFamily: 'Inter, DM Sans, sans-serif',
          color: isActive ? 'var(--portal-text-heading)' : 'var(--portal-muted)',
        }}
      >
        {item.label}
      </span>
      {/* Gradient underline for active tab */}
      <div
        className={cn(
          'absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2.5px] rounded-full',
          'transition-all duration-300 ease-in-out',
          isActive ? 'w-8 opacity-100' : 'w-0 opacity-0'
        )}
        style={{
          background: 'linear-gradient(90deg, #06b6d4, #14b8a6, #2dd4bf)',
        }}
      />
    </Link>
  );
}

export function KidBottomNav() {
  const pathname = usePathname();
  const isActiveCheck = (href: string) =>
    pathname === href || pathname?.startsWith(href + '/');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg border-t"
      style={{
        height: '64px',
        background: 'var(--portal-surface)',
        borderColor: 'var(--portal-border)',
      }}
    >
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActiveCheck(item.href)}
          />
        ))}
      </div>
    </nav>
  );
}

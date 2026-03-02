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
  { href: '/my-circle/child/dashboard', icon: Home, label: 'Home' },
  { href: '/my-circle/child/movies', icon: Film, label: 'Movies' },
  { href: '/my-circle/child/library', icon: BookOpen, label: 'Books' },
  { href: '/my-circle/child/arcade', icon: Gamepad2, label: 'Games' },
  { href: '/my-circle/child/my-circle-page', icon: Users, label: 'People' },
];

export function KidBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800"
      style={{ height: '64px' }}
    >
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200',
                'min-w-[56px] justify-center',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900',
                isActive
                  ? 'text-white bg-gradient-to-r from-cyan-500 to-teal-500 scale-105 shadow-lg shadow-cyan-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800 active:scale-95'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn('w-5 h-5 transition-transform duration-150', isActive && 'scale-110')}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span
                className={cn('font-medium transition-all duration-150', isActive && 'font-semibold')}
                style={{ fontSize: '11px', fontFamily: 'Inter, DM Sans, sans-serif' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

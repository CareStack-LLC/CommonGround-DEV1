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
  {
    href: '/my-circle/child/dashboard',
    icon: Home,
    label: 'Home',
  },
  {
    href: '/my-circle/child/movies',
    icon: Film,
    label: 'Movies',
  },
  {
    href: '/my-circle/child/library',
    icon: BookOpen,
    label: 'Books',
  },
  {
    href: '/my-circle/child/arcade',
    icon: Gamepad2,
    label: 'Games',
  },
  {
    href: '/my-circle/child/my-circle-page',
    icon: Users,
    label: 'People',
  },
];

export function KidBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 backdrop-blur-lg bg-white/80 border-t border-slate-200 z-50"
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
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-150',
                'min-w-[56px] justify-center',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1',
                isActive
                  ? 'text-white bg-gradient-to-r from-teal-500 to-violet-500 scale-105'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-95'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform duration-150',
                  isActive && 'scale-110'
                )}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span
                className={cn(
                  'font-medium transition-all duration-150',
                  isActive && 'font-semibold'
                )}
                style={{
                  fontSize: '11px',
                  fontFamily: 'Inter, DM Sans, sans-serif'
                }}
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

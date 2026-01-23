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
      className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-100 z-50 safe-area-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200',
                'min-w-[64px] min-h-[64px] justify-center',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2',
                isActive
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-400 hover:text-gray-600 active:scale-95'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'w-6 h-6 transition-transform duration-200',
                  isActive && 'scale-110'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  'text-xs font-bold transition-all duration-200',
                  isActive && 'scale-105'
                )}
              >
                {item.label}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-600 rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  MessageCircle,
  Calendar,
  Wallet,
  FileText,
  Users,
  Video,
  Settings,
  type LucideIcon,
} from 'lucide-react';

/* =============================================================================
   CGBottomNav - Mobile Bottom Navigation
   Consistent bottom navigation across the app
   ============================================================================= */

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

interface CGBottomNavProps {
  items?: NavItem[];
  familyFileId?: string;
  className?: string;
}

export function CGBottomNav({ items, familyFileId, className }: CGBottomNavProps) {
  const pathname = usePathname();

  // Default navigation items for family file context
  const defaultItems: NavItem[] = familyFileId
    ? [
        { href: `/family-files/${familyFileId}`, icon: Home, label: 'Home' },
        { href: `/messages`, icon: MessageCircle, label: 'Chat' },
        { href: `/schedule`, icon: Calendar, label: 'Schedule' },
        { href: `/payments`, icon: Wallet, label: 'Finances' },
        { href: `/family-files/${familyFileId}/kidcoms`, icon: Video, label: 'KidComs' },
      ]
    : [
        { href: '/family-files', icon: Home, label: 'Home' },
        { href: '/messages', icon: MessageCircle, label: 'Chat' },
        { href: '/schedule', icon: Calendar, label: 'Schedule' },
        { href: '/payments', icon: Wallet, label: 'Finances' },
        { href: '/settings', icon: Settings, label: 'Settings' },
      ];

  const navItems = items || defaultItems;

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-card/95 backdrop-blur-lg border-t border-border/50',
        'safe-area-bottom',
        className
      )}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200',
                'min-w-[64px]',
                isActive
                  ? 'text-cg-sage bg-cg-sage-subtle'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-cg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* =============================================================================
   CGChildBottomNav - Kid-friendly bottom navigation
   Larger touch targets, fun colors, emojis
   ============================================================================= */

interface ChildNavItem {
  href: string;
  emoji: string;
  label: string;
  color: 'purple' | 'blue' | 'green' | 'pink' | 'amber';
}

interface CGChildBottomNavProps {
  items?: ChildNavItem[];
  className?: string;
}

export function CGChildBottomNav({ items, className }: CGChildBottomNavProps) {
  const pathname = usePathname();

  const defaultItems: ChildNavItem[] = [
    { href: '/my-circle/child/dashboard', emoji: '🏠', label: 'Home', color: 'purple' },
    { href: '/my-circle/child/messages', emoji: '💬', label: 'Chat', color: 'blue' },
    { href: '/my-circle/child/gallery', emoji: '🖼️', label: 'Gallery', color: 'green' },
  ];

  const navItems = items || defaultItems;

  const colorClasses = {
    purple: 'bg-purple-100 text-purple-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    pink: 'bg-pink-100 text-pink-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white/95 backdrop-blur-lg border-t-4 border-purple-200',
        'safe-area-bottom',
        className
      )}
    >
      <div className="flex items-center justify-around px-4 py-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200',
                isActive
                  ? colorClasses[item.color]
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-xs font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

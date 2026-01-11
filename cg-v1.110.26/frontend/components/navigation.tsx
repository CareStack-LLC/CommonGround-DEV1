'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Home,
  FolderHeart,
  MessageSquare,
  Calendar,
  Wallet,
  Video,
  Menu,
  X,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Bell,
  User,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/**
 * CommonGround Navigation Component - Organic Minimalist Design
 *
 * Design: Clean, warm, mobile-first with bottom nav.
 * Philosophy: "Navigation should feel natural and unobtrusive"
 */

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Home', path: '/dashboard', icon: Home },
  { name: 'Chat', path: '/messages', icon: MessageSquare },
  { name: 'Calendar', path: '/schedule', icon: Calendar },
  { name: 'Wallet', path: '/wallet', icon: Wallet },
  { name: 'KidComs', path: '/kidcoms', icon: Video },
];

// Logo component
function Logo({ className = '', onClick }: { className?: string; onClick?: () => void }) {
  return (
    <div
      className={`flex items-center gap-2 cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="w-9 h-9 bg-cg-sage rounded-xl flex items-center justify-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
          <circle cx="12" cy="12" r="2.5" fill="white" />
        </svg>
      </div>
      <span className="text-lg font-semibold text-foreground hidden sm:inline">
        CommonGround
      </span>
    </div>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  };

  // Get user initials
  const initials = user
    ? `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`
    : '';

  return (
    <>
      {/* Top Navigation Bar */}
      <header className="cg-glass border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Logo onClick={() => router.push('/dashboard')} />

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                // Special handling for Wallet to also highlight on /payments (ClearFund)
                const isActive =
                  pathname === item.path ||
                  pathname?.startsWith(`${item.path}/`) ||
                  (item.path === '/wallet' && (pathname === '/payments' || pathname?.startsWith('/payments/')));
                const Icon = item.icon;

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </button>
                );
              })}

              {/* Family Files - Desktop only */}
              <button
                onClick={() => handleNavigation('/family-files')}
                className={`nav-item ${
                  pathname === '/family-files' || pathname?.startsWith('/family-files/')
                    ? 'active'
                    : ''
                }`}
              >
                <FolderHeart className="h-4 w-4" />
                Family Files
              </button>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button className="relative p-2 rounded-xl hover:bg-cg-sage-subtle transition-smooth">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {/* Notification badge */}
                <span className="absolute top-1 right-1 w-2 h-2 bg-cg-amber rounded-full" />
              </button>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-cg-sage-subtle transition-smooth"
                >
                  <div className="w-8 h-8 rounded-full bg-cg-sage-subtle flex items-center justify-center">
                    <span className="text-sm font-medium text-cg-sage">{initials}</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform hidden sm:block ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 cg-card-elevated py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-border">
                      <p className="font-medium text-foreground">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => handleNavigation('/family-files')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-cg-sage-subtle transition-smooth"
                      >
                        <FolderHeart className="h-4 w-4 text-muted-foreground" />
                        Family Files
                      </button>
                      <button
                        onClick={() => handleNavigation('/settings')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-cg-sage-subtle transition-smooth"
                      >
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        Settings
                      </button>
                      <button
                        onClick={() => handleNavigation('/help')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-cg-sage-subtle transition-smooth"
                      >
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        Help Center
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-border pt-1 mt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-cg-error hover:bg-cg-error-subtle transition-smooth"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-cg-sage-subtle transition-smooth"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 text-foreground" />
                ) : (
                  <Menu className="h-5 w-5 text-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Slide-down Menu */}
          {mobileMenuOpen && (
            <nav className="lg:hidden pb-4 pt-2 border-t border-border animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <button
                  onClick={() => handleNavigation('/family-files')}
                  className={`w-full nav-item ${
                    pathname === '/family-files' || pathname?.startsWith('/family-files/')
                      ? 'active'
                      : ''
                  }`}
                >
                  <FolderHeart className="h-5 w-5" />
                  Family Files
                </button>
                <button
                  onClick={() => handleNavigation('/settings')}
                  className="w-full nav-item"
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </button>
                <button
                  onClick={() => handleNavigation('/help')}
                  className="w-full nav-item"
                >
                  <HelpCircle className="h-5 w-5" />
                  Help Center
                </button>
              </div>

              {/* User info on mobile */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-3 px-4">
                  <div className="w-10 h-10 rounded-full bg-cg-sage-subtle flex items-center justify-center">
                    <span className="text-sm font-medium text-cg-sage">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 text-sm text-cg-error bg-cg-error-subtle rounded-xl transition-smooth hover:bg-cg-error/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav lg:hidden">
        {navItems.map((item) => {
          // Special handling for Wallet to also highlight on /payments (ClearFund)
          const isActive =
            pathname === item.path ||
            pathname?.startsWith(`${item.path}/`) ||
            (item.path === '/wallet' && (pathname === '/payments' || pathname?.startsWith('/payments/')));
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.name}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

// Export Logo for use in other components
export { Logo };

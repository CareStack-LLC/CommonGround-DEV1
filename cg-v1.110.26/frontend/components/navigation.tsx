'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useNotification } from '@/contexts/notification-context';
import {
  Home,
  FolderHeart,
  MessageSquare,
  Calendar,
  Wallet,
  Menu,
  X,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Bell,
  Sparkles,
  DollarSign,
  Users,
  Info,
  Briefcase,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/**
 * CommonGround Navigation Component - Warm Earth Tones
 *
 * Design: Clean, warm, mobile-first with bottom nav.
 * Philosophy: "Navigation should feel natural and unobtrusive"
 */

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

// App navigation items (bottom nav for mobile)
const appNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Chat', path: '/messages', icon: MessageSquare },
  { name: 'Calendar', path: '/schedule', icon: Calendar },
  { name: 'Clearfund', path: '/payments', icon: Wallet },
  { name: 'Files', path: '/family-files', icon: FolderHeart },
];

// Marketing/public page links for top nav
interface TopNavLink {
  name: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const marketingLinks: TopNavLink[] = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Features', path: '/features', icon: Sparkles },
  { name: 'Pricing', path: '/pricing', icon: DollarSign },
  { name: 'About', path: '/about', icon: Info },
];

// Logo component
function Logo({ className = '', onClick }: { className?: string; onClick?: () => void }) {
  return (
    <div
      className={`flex items-center gap-2 cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20"
            stroke="#2C5F5D"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20"
            stroke="#2C5F5D"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
          <circle cx="12" cy="12" r="2.5" fill="#2C5F5D" />
        </svg>
      </div>
      <span className="text-lg font-semibold text-white hidden sm:inline" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
        CommonGround
      </span>
    </div>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const { unreadCount } = useNotification();
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
      {/* Top Navigation Bar - Portal-aware background */}
      <header className="bg-[var(--portal-primary)] border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Logo onClick={() => router.push('/dashboard')} />

            {/* Desktop Navigation - Marketing Links */}
            <nav className="hidden lg:flex items-center space-x-1">
              {marketingLinks.map((item) => {
                const isActive = pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {/* Notifications - Only for signed in users */}
                  <button
                    onClick={() => router.push('/activities')}
                    className="relative p-2 rounded-xl hover:bg-white/10 transition-smooth"
                    aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                  >
                    <Bell className="h-5 w-5 text-white" />
                    {/* Notification badge - only show when there are unread */}
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* User Menu - Only for signed in users */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-white/10 transition-smooth"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">{initials}</span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-white transition-transform hidden sm:block ${userMenuOpen ? 'rotate-180' : ''
                          }`}
                      />
                    </button>

                    {/* Dropdown Menu - Portal-aware styling */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-[var(--portal-surface)] rounded-[var(--portal-radius-lg)] border border-[var(--portal-border)] shadow-[var(--portal-shadow-lg)] py-2 z-50">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-[var(--portal-border)]">
                          <p className="font-medium text-[var(--portal-text)]">
                            {user?.first_name} {user?.last_name}
                          </p>
                          <p className="text-sm text-[var(--portal-text-light)] truncate">{user?.email}</p>
                        </div>

                        {/* Menu Items */}
                        <div className="py-1">
                          <button
                            onClick={() => handleNavigation('/dashboard')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--portal-text)] hover:bg-[var(--portal-primary)]/10 transition-smooth"
                          >
                            <Home className="h-4 w-4 text-[var(--portal-text-light)]" />
                            Dashboard
                          </button>
                          {profile?.is_professional && (
                            <button
                              onClick={() => handleNavigation('/professional')}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--portal-text)] hover:bg-emerald-50 transition-smooth"
                            >
                              <Briefcase className="h-4 w-4 text-emerald-600" />
                              Professional Portal
                            </button>
                          )}
                          <button
                            onClick={() => handleNavigation('/dashboard/partners/foreverforward')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--portal-text)] hover:bg-amber-50 transition-smooth"
                          >
                            <Users className="h-4 w-4 text-amber-600" />
                            Partner Dashboard
                          </button>
                          <button
                            onClick={() => handleNavigation('/family-files')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--portal-text)] hover:bg-[var(--portal-primary)]/10 transition-smooth"
                          >
                            <FolderHeart className="h-4 w-4 text-[var(--portal-text-light)]" />
                            Family Files
                          </button>
                          <button
                            onClick={() => handleNavigation('/settings')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--portal-text)] hover:bg-[var(--portal-primary)]/10 transition-smooth"
                          >
                            <Settings className="h-4 w-4 text-[var(--portal-text-light)]" />
                            Settings
                          </button>
                          <button
                            onClick={() => handleNavigation('/help')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--portal-text)] hover:bg-[var(--portal-primary)]/10 transition-smooth"
                          >
                            <HelpCircle className="h-4 w-4 text-[var(--portal-text-light)]" />
                            Help Center
                          </button>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-[var(--portal-border)] pt-1 mt-1">
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
                </>
              ) : (
                /* Sign In / Register - For non-authenticated users */
                <div className="hidden lg:flex items-center gap-3">
                  <Link
                    href="/login"
                    className="text-white/80 hover:text-white font-medium px-4 py-2 text-sm transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="bg-white text-[var(--portal-primary)] font-medium px-5 py-2 rounded-full text-sm transition-all duration-200 hover:bg-white/90 hover:shadow-lg"
                  >
                    Get Started Free
                  </Link>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-white/10 transition-smooth"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 text-white" />
                ) : (
                  <Menu className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Slide-down Menu */}
          {mobileMenuOpen && (
            <nav className="lg:hidden pb-4 pt-2 border-t border-white/10 animate-in slide-in-from-top-2 duration-200">
              {/* Marketing Links */}
              <div className="space-y-1">
                {marketingLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      {Icon && <Icon className="h-5 w-5" />}
                      {item.name}
                    </Link>
                  );
                })}
              </div>

              {/* Sign in / Register for non-authenticated users */}
              {!user && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center text-white font-medium py-2.5 rounded-xl border border-white/20 hover:bg-white/10 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center bg-white text-[var(--portal-primary)] font-medium py-2.5 rounded-xl hover:bg-white/90 transition-colors"
                  >
                    Get Started Free
                  </Link>
                </div>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation - App Items */}
      {user && (
        <nav className="bottom-nav lg:hidden">
          {appNavItems.map((item) => {
            // Special handling for Clearfund to also highlight on /wallet
            const isActive =
              pathname === item.path ||
              pathname?.startsWith(`${item.path}/`) ||
              (item.path === '/payments' && (pathname === '/wallet' || pathname?.startsWith('/wallet/')));
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
      )}
    </>
  );
}

// Export Logo for use in other components
export { Logo };

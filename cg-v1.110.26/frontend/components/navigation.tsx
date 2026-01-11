'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
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

// App navigation items (bottom nav for mobile)
const appNavItems: NavItem[] = [
  { name: 'Home', path: '/dashboard', icon: Home },
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
  { name: 'For Professionals', path: '/professionals', icon: Users },
  { name: 'About', path: '/about', icon: Info },
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

            {/* Desktop Navigation - Marketing Links */}
            <nav className="hidden lg:flex items-center space-x-1">
              {marketingLinks.map((item) => {
                const isActive = pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`nav-item ${isActive ? 'active' : ''}`}
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
                  <button className="relative p-2 rounded-xl hover:bg-cg-sage-subtle transition-smooth">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {/* Notification badge */}
                    <span className="absolute top-1 right-1 w-2 h-2 bg-cg-amber rounded-full" />
                  </button>

                  {/* User Menu - Only for signed in users */}
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
                            onClick={() => handleNavigation('/dashboard')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-cg-sage-subtle transition-smooth"
                          >
                            <Home className="h-4 w-4 text-muted-foreground" />
                            Dashboard
                          </button>
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
                </>
              ) : (
                /* Sign In / Register - For non-authenticated users */
                <div className="hidden lg:flex items-center gap-3">
                  <Link
                    href="/login"
                    className="text-muted-foreground hover:text-foreground font-medium px-4 py-2 text-sm transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="bg-cg-sage text-white font-medium px-5 py-2 rounded-full text-sm transition-all duration-200 hover:bg-cg-sage/90 hover:shadow-lg"
                  >
                    Get Started Free
                  </Link>
                </div>
              )}

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
                      className={`w-full nav-item flex items-center gap-3 ${isActive ? 'active' : ''}`}
                    >
                      {Icon && <Icon className="h-5 w-5" />}
                      {item.name}
                    </Link>
                  );
                })}
              </div>

              {/* User-specific links */}
              {user && (
                <div className="mt-4 pt-4 border-t border-border space-y-1">
                  <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Account</p>
                  <button
                    onClick={() => handleNavigation('/dashboard')}
                    className={`w-full nav-item ${
                      pathname === '/dashboard'
                        ? 'active'
                        : ''
                    }`}
                  >
                    <Home className="h-5 w-5" />
                    Dashboard
                  </button>
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
              )}

              {/* User info on mobile */}
              {user ? (
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
              ) : (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center text-foreground font-medium py-2.5 rounded-xl border border-border hover:bg-muted transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center bg-cg-sage text-white font-medium py-2.5 rounded-xl hover:bg-cg-sage/90 transition-colors"
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

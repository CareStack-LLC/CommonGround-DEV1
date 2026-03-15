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
  Mail,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

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
  { name: 'Contact', path: '/contact', icon: Mail },
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
      <span className="text-lg font-semibold text-white hidden sm:inline" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
        CommonGround
      </span>
    </div>
  );
}

// Partner staff access info
interface PartnerStaffInfo {
  partner_slug: string;
  role: string;
  display_name: string;
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const { unreadCount } = useNotification();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [partnerAccess, setPartnerAccess] = useState<PartnerStaffInfo[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch partner staff access for current user
  useEffect(() => {
    const fetchPartnerAccess = async () => {
      if (!user) {
        setPartnerAccess([]);
        return;
      }
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const res = await fetch(`${API_URL}/api/v1/partners/my-partners`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPartnerAccess(data);
        }
      } catch (error) {
        console.error('Failed to fetch partner access:', error);
      }
    };
    fetchPartnerAccess();
  }, [user]);

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

                    {/* Dropdown Menu - CommonGround Styling */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-card rounded-2xl border-2 border-border shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                        {/* User Info */}
                        <div className="px-5 py-4 border-b border-border">
                          <p className="font-bold text-foreground text-lg" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                            {user?.first_name} {user?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground font-medium truncate">{user?.email}</p>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2 space-y-1 px-2">
                          <button
                            onClick={() => handleNavigation('/dashboard')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground rounded-xl hover:bg-muted hover:text-foreground transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-card group-hover:shadow-sm">
                              <Home className="h-4 w-4" />
                            </div>
                            Dashboard
                          </button>

                          {profile?.is_professional && (
                            <button
                              onClick={() => handleNavigation('/professional')}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground rounded-xl hover:bg-emerald-50 hover:text-emerald-900 transition-all"
                            >
                              <div className="w-8 h-8 rounded-lg bg-emerald-100/50 flex items-center justify-center text-emerald-600">
                                <Briefcase className="h-4 w-4" />
                              </div>
                              Professional Portal
                            </button>
                          )}

                          {partnerAccess.length > 0 && (
                            <button
                              onClick={() => handleNavigation(`/dashboard/partners/${partnerAccess[0].partner_slug}`)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground rounded-xl hover:bg-amber-50 hover:text-amber-900 transition-all"
                            >
                              <div className="w-8 h-8 rounded-lg bg-amber-100/50 flex items-center justify-center text-amber-600">
                                <Users className="h-4 w-4" />
                              </div>
                              Partner Dashboard
                            </button>
                          )}

                          <button
                            onClick={() => handleNavigation('/family-files')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground rounded-xl hover:bg-muted hover:text-foreground transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                              <FolderHeart className="h-4 w-4" />
                            </div>
                            Family Files
                          </button>

                          <button
                            onClick={() => handleNavigation('/settings')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground rounded-xl hover:bg-muted hover:text-foreground transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                              <Settings className="h-4 w-4" />
                            </div>
                            Settings
                          </button>

                          <button
                            onClick={() => handleNavigation('/help')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground rounded-xl hover:bg-muted hover:text-foreground transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                              <HelpCircle className="h-4 w-4" />
                            </div>
                            Help Center
                          </button>
                        </div>

                        {/* Theme Toggle */}
                        <div className="border-t border-border pt-2 mt-2 px-3">
                          <p className="text-xs text-muted-foreground font-medium mb-2">Appearance</p>
                          <ThemeToggle />
                        </div>

                        {/* Logout */}
                        <div className="border-t border-border pt-2 mt-2 px-2 pb-2">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                              <LogOut className="h-4 w-4" />
                            </div>
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

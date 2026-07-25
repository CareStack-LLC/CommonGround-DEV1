'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  LogOut,
  Bell,
  Search,
} from 'lucide-react';
import { adminAPI, type PlatformHealth } from '@/lib/admin-api';
import {
  AdminLogo,
  CommandPalette,
  LiveStatusBar,
} from '@/components/superadmin';
import { navSections } from './_nav';

const SIDEBAR_COLLAPSED_KEY = 'cg_admin_sidebar_collapsed';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [health, setHealth] = useState<PlatformHealth | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      adminAPI.getPlatformHealth().then(setHealth).catch(() => {});
      const interval = setInterval(() => {
        adminAPI.getPlatformHealth().then(setHealth).catch(() => {});
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Hydrate sidebar collapsed state after mount (avoid SSR/client mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (raw === 'true') setCollapsed(true);
    } catch {
      // localStorage may be unavailable (SSR edge) — ignore
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [collapsed]);

  // Global Cmd+K / Ctrl+K handler
  useEffect(() => {
    if (!isAuthenticated) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAuthenticated]);

  const closePalette = useCallback(() => setPaletteOpen(false), []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#162D3A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cg-sage/30 border-t-cg-sage rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const healthColor = health?.status === 'healthy' ? 'bg-cg-sage' :
    health?.status === 'degraded' ? 'bg-cg-amber' : health?.status === 'critical' ? 'bg-red-500' : 'bg-[#4A6E7F]';

  return (
    <div className="min-h-screen bg-[#162D3A] text-[#D0E4EC]">
      <header className="sticky top-0 z-50 h-14 border-b border-cg-slate/20 bg-[#162D3A]/95 backdrop-blur-md flex items-center px-4 lg:px-6">
        <button aria-label="Open menu"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden mr-3 p-1.5 rounded-lg hover:bg-cg-slate/20 transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <AdminLogo size={28} />
            <span className="hidden sm:block text-sm" style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}>
              <span className="font-bold text-white">Common</span><span className="font-normal text-cg-sage">Ground</span>
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-cg-sage/15 text-cg-sage border border-cg-sage/20 uppercase">
            Admin
          </span>
        </div>

        <div className="ml-4 hidden md:flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${healthColor} ${health?.status === 'healthy' ? 'animate-pulse' : ''}`} />
          <span className="text-xs text-muted-foreground">
            {health ? `${health.active_sessions} active` : '—'}
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {/* Cmd+K hint button — also opens the palette on click */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0F2533]/60 border border-cg-slate/20 hover:border-cg-slate/50 text-xs text-[#8AACBC] hover:text-white transition-colors"
            title="Open command palette (Cmd+K)"
          >
            <Search className="w-3 h-3" />
            <span>Search…</span>
            <kbd className="ml-1 px-1 rounded bg-cg-slate/20 border border-cg-slate/30 font-mono text-[10px]">⌘K</kbd>
          </button>

          {health && health.errors_24h > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cg-amber/10 border border-cg-amber/20">
              <Bell className="w-3.5 h-3.5 text-cg-amber" />
              <span className="text-xs text-cg-amber font-medium">{health.errors_24h}</span>
            </div>
          )}
          <div className="hidden sm:block text-right">
            <div className="text-xs font-medium text-[#D0E4EC]">{user.first_name} {user.last_name}</div>
            <div className="text-[11px] text-muted-foreground">{user.email}</div>
          </div>
          <button aria-label="Log out"
            onClick={() => logout()}
            className="p-2 rounded-lg hover:bg-cg-slate/20 transition-colors text-[#8AACBC] hover:text-white"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`
          fixed lg:sticky top-14 z-40 h-[calc(100vh-3.5rem)]
          ${collapsed ? 'lg:w-[60px]' : 'lg:w-56'}
          w-56
          bg-foreground border-r border-cg-slate/20
          flex flex-col transition-[width,transform] duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="flex-1 py-3 px-2.5 space-y-4 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.label}>
                {!collapsed && (
                  <div className="text-[10px] uppercase tracking-wider text-cg-sage-light/60 font-semibold px-3 mb-1">
                    {section.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href, item.exact);
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(item.href);
                          setSidebarOpen(false);
                        }}
                        className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
                          active
                            ? 'bg-cg-sage/15 text-cg-sage-light shadow-sm shadow-cg-sage/5'
                            : 'text-[#8AACBC] hover:bg-cg-slate/20 hover:text-white'
                        } ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-cg-sage' : 'text-muted-foreground group-hover:text-[#8AACBC]'}`} />
                        <span className={collapsed ? 'lg:hidden' : ''}>
                          {item.label}
                        </span>
                        {collapsed && (
                          <span className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap bg-[#0F2533] border border-cg-slate/30 text-xs text-white px-2 py-1 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                            {item.label}
                          </span>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-cg-slate/20">
            {/* Collapse toggle — desktop only */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-white hover:bg-cg-slate/20 transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronsRight className="w-4 h-4" /> : (
                <>
                  <ChevronsLeft className="w-4 h-4" />
                  <span>Collapse</span>
                </>
              )}
            </button>

            <a
              href="/dashboard"
              onClick={(e) => { e.preventDefault(); router.push('/dashboard'); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-white hover:bg-cg-slate/20 transition-colors ${collapsed ? 'lg:justify-center' : ''}`}
              title={collapsed ? 'Back to app' : undefined}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className={collapsed ? 'lg:hidden' : ''}>Back to App</span>
            </a>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4 lg:p-6 pb-12">
          {children}
        </main>
      </div>

      {/* Global Cmd+K palette */}
      <CommandPalette open={paletteOpen} onClose={closePalette} />

      {/* Sticky bottom status bar — vitals across all superadmin pages */}
      <LiveStatusBar />
    </div>
  );
}

'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ScrollText,
  TrendingUp,
  FileText,
  Shield,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  Bell,
} from 'lucide-react';
import { adminAPI, type PlatformHealth } from '@/lib/admin-api';

const navItems = [
  { href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/superadmin/users', label: 'Users', icon: Users },
  { href: '/superadmin/billing', label: 'Billing', icon: CreditCard },
  { href: '/superadmin/reports', label: 'Reports', icon: FileText },
  { href: '/superadmin/audit-log', label: 'Audit Log', icon: ScrollText },
  { href: '/superadmin/growth', label: 'Growth', icon: TrendingUp },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const healthColor = health?.status === 'healthy' ? 'bg-emerald-500' :
    health?.status === 'degraded' ? 'bg-amber-500' : health?.status === 'critical' ? 'bg-red-500' : 'bg-zinc-600';

  return (
    <div className="min-h-screen bg-[#0f1117] text-zinc-100">
      <header className="sticky top-0 z-50 h-14 border-b border-zinc-800/80 bg-[#0f1117]/95 backdrop-blur-md flex items-center px-4 lg:px-6">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden mr-3 p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight hidden sm:block">CommonGround</span>
          </div>
          <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 uppercase">
            Admin
          </span>
        </div>

        <div className="ml-4 hidden md:flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${healthColor} ${health?.status === 'healthy' ? 'animate-pulse' : ''}`} />
          <span className="text-xs text-zinc-500">
            {health ? `${health.active_sessions} active` : '—'}
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {health && health.errors_24h > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">{health.errors_24h}</span>
            </div>
          )}
          <div className="hidden sm:block text-right">
            <div className="text-xs font-medium text-zinc-300">{user.first_name} {user.last_name}</div>
            <div className="text-[11px] text-zinc-500">{user.email}</div>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded-lg hover:bg-zinc-800/60 transition-colors text-zinc-400 hover:text-zinc-200"
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
          w-56 bg-[#0f1117] border-r border-zinc-800/80
          flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
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
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    active
                      ? 'bg-violet-500/15 text-violet-300 shadow-sm shadow-violet-500/5'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                  {item.label}
                  {item.label === 'Reports' && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-medium">New</span>
                  )}
                </a>
              );
            })}
          </nav>

          <div className="p-3 border-t border-zinc-800/80">
            <a
              href="/dashboard"
              onClick={(e) => { e.preventDefault(); router.push('/dashboard'); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to App
            </a>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  TrendingUp,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  Bell,
  Brain,
  PenTool,
  Film,
  Bug,
  UserPlus,
  Send,
  Mail,
  Globe,
  MessageCircle,
  Server,
} from 'lucide-react';
import { adminAPI, type PlatformHealth } from '@/lib/admin-api';
import { AdminLogo } from '@/components/superadmin';

const navSections = [
  {
    label: 'Overview',
    items: [
      { href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/superadmin/users', label: 'Users & Activity', icon: Users },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/superadmin/system-health', label: 'System Health', icon: Server },
      { href: '/superadmin/bug-triage', label: 'Bug Triage', icon: Bug },
      { href: '/superadmin/aria', label: 'ARIA Insights', icon: Brain },
      { href: '/superadmin/chatbot', label: 'Chatbot (Aria)', icon: MessageCircle },
    ],
  },
  {
    label: 'Analytics & Revenue',
    items: [
      { href: '/superadmin/growth', label: 'Growth & Engagement', icon: TrendingUp },
      { href: '/superadmin/billing', label: 'Billing & Reports', icon: CreditCard },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/superadmin/leads', label: 'Leads', icon: UserPlus },
      { href: '/superadmin/leads/campaigns', label: 'Campaigns', icon: Send },
      { href: '/superadmin/leads/landing-pages', label: 'Landing Pages', icon: Globe },
      { href: '/superadmin/reddit', label: 'Reddit', icon: MessageCircle },
      { href: '/superadmin/inbox', label: 'Inbox', icon: Mail },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/superadmin/blog', label: 'Blog', icon: PenTool },
      { href: '/superadmin/media-library', label: 'Media Library', icon: Film },
    ],
  },
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
      <div className="min-h-screen bg-[#162D3A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#3DAA8A]/30 border-t-[#3DAA8A] rounded-full animate-spin" />
          <p className="text-[#6B8A9A] text-sm">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const healthColor = health?.status === 'healthy' ? 'bg-[#3DAA8A]' :
    health?.status === 'degraded' ? 'bg-[#F5A623]' : health?.status === 'critical' ? 'bg-red-500' : 'bg-[#4A6E7F]';

  return (
    <div className="min-h-screen bg-[#162D3A] text-[#D0E4EC]">
      <header className="sticky top-0 z-50 h-14 border-b border-[#2D6A8F]/20 bg-[#162D3A]/95 backdrop-blur-md flex items-center px-4 lg:px-6">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden mr-3 p-1.5 rounded-lg hover:bg-[#2D6A8F]/20 transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <AdminLogo size={28} />
            <span className="hidden sm:block text-sm" style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}>
              <span className="font-bold text-white">Common</span><span className="font-normal text-[#3DAA8A]">Ground</span>
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#3DAA8A]/15 text-[#3DAA8A] border border-[#3DAA8A]/20 uppercase">
            Admin
          </span>
        </div>

        <div className="ml-4 hidden md:flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${healthColor} ${health?.status === 'healthy' ? 'animate-pulse' : ''}`} />
          <span className="text-xs text-[#6B8A9A]">
            {health ? `${health.active_sessions} active` : '—'}
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {health && health.errors_24h > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5A623]/10 border border-[#F5A623]/20">
              <Bell className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="text-xs text-[#F5A623] font-medium">{health.errors_24h}</span>
            </div>
          )}
          <div className="hidden sm:block text-right">
            <div className="text-xs font-medium text-[#D0E4EC]">{user.first_name} {user.last_name}</div>
            <div className="text-[11px] text-[#6B8A9A]">{user.email}</div>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded-lg hover:bg-[#2D6A8F]/20 transition-colors text-[#8AACBC] hover:text-white"
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
          w-56 bg-[#1E3A4A] border-r border-[#2D6A8F]/20
          flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="flex-1 py-3 px-2.5 space-y-4 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.label}>
                <div className="text-[10px] uppercase tracking-wider text-[#5BC4A0]/60 font-semibold px-3 mb-1">
                  {section.label}
                </div>
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
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
                          active
                            ? 'bg-[#3DAA8A]/15 text-[#5BC4A0] shadow-sm shadow-[#3DAA8A]/5'
                            : 'text-[#8AACBC] hover:bg-[#2D6A8F]/20 hover:text-white'
                        }`}
                      >
                        <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#3DAA8A]' : 'text-[#6B8A9A] group-hover:text-[#8AACBC]'}`} />
                        {item.label}
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-[#2D6A8F]/20">
            <a
              href="/dashboard"
              onClick={(e) => { e.preventDefault(); router.push('/dashboard'); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#6B8A9A] hover:text-white hover:bg-[#2D6A8F]/20 transition-colors"
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

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import { cn } from '@/lib/utils';
import { User, Bell, Shield, CreditCard, ArrowLeft, FileText, Settings } from 'lucide-react';

/**
 * CommonGround Settings Layout
 *
 * Design: Sidebar navigation for settings sub-pages.
 * Philosophy: "Settings should be easy to find, easy to change."
 */

interface SettingsNavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const settingsNavItems: SettingsNavItem[] = [
  {
    name: 'Account',
    path: '/settings/account',
    icon: User,
    description: 'Profile and personal info',
  },
  {
    name: 'Billing',
    path: '/settings/billing',
    icon: CreditCard,
    description: 'Subscription and payments',
  },
  {
    name: 'Notifications',
    path: '/settings/notifications',
    icon: Bell,
    description: 'Email and push alerts',
  },
  {
    name: 'Security',
    path: '/settings/security',
    icon: Shield,
    description: 'Password and login',
  },
  {
    name: 'Reports',
    path: '/settings/reports',
    icon: FileText,
    description: 'Documentation and court reports',
  },
];

function SettingsLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isSubpage = pathname !== '/settings';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Navigation />

      <PageContainer className="pb-32" background="transparent">
        {/* Header with back button - matches Quick Accord styling */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md">
              <Settings className="w-6 h-6 text-[var(--portal-primary)]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Settings
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Manage your account preferences
              </p>
            </div>
          </div>
        </div>

        {/* Settings Layout: Sidebar + Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation - Always hidden on mobile, only show on desktop */}
          <nav className="w-full lg:w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-2 space-y-1">
              {settingsNavItems.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;

                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200',
                      isActive
                        ? 'bg-[var(--portal-primary)]/10 text-[var(--portal-primary)] border-2 border-[var(--portal-primary)]/20 shadow-md'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-2 border-transparent'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">{item.name}</span>
                      <span className="text-xs opacity-75 font-medium">{item.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Main Content - Full width on mobile */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <SettingsLayoutContent>{children}</SettingsLayoutContent>
    </ProtectedRoute>
  );
}

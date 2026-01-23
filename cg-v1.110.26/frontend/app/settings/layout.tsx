'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import { cn } from '@/lib/utils';
import { User, Bell, Shield, CreditCard, ChevronLeft, FileText } from 'lucide-react';

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

      <PageContainer className="pb-32">
        {/* Back Navigation - Always uses browser back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {/* Settings Header - Only show on settings home */}
        {!isSubpage && (
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              Settings
            </h1>
            <p className="mt-1 text-slate-600 font-medium">
              Manage your account preferences and security
            </p>
          </div>
        )}

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

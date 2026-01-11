'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import { cn } from '@/lib/utils';
import { User, Bell, Shield, ChevronLeft } from 'lucide-react';

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
];

function SettingsLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <PageContainer className="pb-32">
        {/* Back to Dashboard */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-smooth mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Settings Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account preferences and security
          </p>
        </div>

        {/* Settings Layout: Sidebar + Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-card rounded-lg border border-border p-2 space-y-1">
              {settingsNavItems.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;

                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-smooth',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium block">{item.name}</span>
                      <span className="text-xs opacity-75">{item.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Main Content */}
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

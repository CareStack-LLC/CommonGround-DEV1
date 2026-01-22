'use client';

import { useRouter } from 'next/navigation';
import { User, Bell, CreditCard, FileText, ArrowRight } from 'lucide-react';

/**
 * Settings Hub Page
 *
 * Overview of all settings categories with card-based navigation.
 * Design: Professional, trustworthy, and accessible.
 */

interface SettingCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  iconBgGradient: string;
  iconColor: string;
}

const settingCards: SettingCard[] = [
  {
    title: 'Account',
    description: 'Manage your profile, personal information, and account preferences',
    icon: User,
    path: '/settings/account',
    iconBgGradient: 'from-blue-500/10 to-blue-600/5',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Billing',
    description: 'View and manage your subscription, payment methods, and invoices',
    icon: CreditCard,
    path: '/settings/billing',
    iconBgGradient: 'from-emerald-500/10 to-emerald-600/5',
    iconColor: 'text-emerald-600',
  },
  {
    title: 'Notifications',
    description: 'Configure email alerts, push notifications, and communication preferences',
    icon: Bell,
    path: '/settings/notifications',
    iconBgGradient: 'from-amber-500/10 to-amber-600/5',
    iconColor: 'text-amber-600',
  },
  {
    title: 'Security',
    description: 'Update your password, enable two-factor authentication, and review login activity',
    icon: Shield,
    path: '/settings/security',
    iconBgGradient: 'from-red-500/10 to-red-600/5',
    iconColor: 'text-red-600',
  },
  {
    title: 'Reports',
    description: 'Generate court documentation, export data, and access compliance reports',
    icon: FileText,
    path: '/settings/reports',
    iconBgGradient: 'from-[#2C5F5D]/10 to-[#2C5F5D]/5',
    iconColor: 'text-[#2C5F5D]',
  },
];

export default function SettingsPage() {
  const router = useRouter();

  const handleCardClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="space-y-8">
      {/* Settings Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {settingCards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.path}
              onClick={() => handleCardClick(card.path)}
              className="group text-left bg-white rounded-xl p-6 border-2 border-slate-200
                hover:border-[#2C5F5D]/30 hover:shadow-lg transition-all duration-200
                hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className={`
                  p-3 rounded-xl bg-gradient-to-br ${card.iconBgGradient}
                  group-hover:shadow-md transition-shadow duration-200
                `}>
                  <Icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>

                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-[#2C5F5D]
                  group-hover:translate-x-1 transition-all duration-200" />
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-[#2C5F5D]
                transition-colors duration-200">
                {card.title}
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed">
                {card.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <svg
              className="h-5 w-5 text-[#2C5F5D]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-slate-900 mb-1">
              Need help with settings?
            </h4>
            <p className="text-sm text-slate-600">
              Visit our Help Center or contact support for assistance with your account configuration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

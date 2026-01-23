'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Mail,
  Smartphone,
  MessageSquare,
  Calendar,
  FileText,
  Wallet,
  Gavel,
  Sparkles,
  CheckCircle,
  Bell,
  BellOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { usersAPI, NotificationPreferences } from '@/lib/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Notification Settings Page
 *
 * Design: Toggle switches grouped by category.
 * Philosophy: "Give users control without overwhelming them."
 */

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  emailKey: keyof NotificationPreferences;
  pushKey: keyof NotificationPreferences;
}

const notificationCategories: NotificationCategory[] = [
  {
    id: 'messages',
    name: 'Messages',
    description: 'When your co-parent sends you a message',
    icon: MessageSquare,
    emailKey: 'email_messages',
    pushKey: 'push_messages',
  },
  {
    id: 'schedule',
    name: 'Schedule Changes',
    description: 'When events are added, modified, or canceled',
    icon: Calendar,
    emailKey: 'email_schedule',
    pushKey: 'push_schedule',
  },
  {
    id: 'agreements',
    name: 'Agreement Updates',
    description: 'When agreements need your review or are signed',
    icon: FileText,
    emailKey: 'email_agreements',
    pushKey: 'push_agreements',
  },
  {
    id: 'payments',
    name: 'Payment Reminders',
    description: 'When payments are due or expenses need approval',
    icon: Wallet,
    emailKey: 'email_payments',
    pushKey: 'push_payments',
  },
  {
    id: 'court',
    name: 'Court Events',
    description: 'Reminders for upcoming court dates and deadlines',
    icon: Gavel,
    emailKey: 'email_court',
    pushKey: 'push_court',
  },
  {
    id: 'aria',
    name: 'ARIA Suggestions',
    description: 'Tips for improving communication',
    icon: Sparkles,
    emailKey: 'email_aria',
    pushKey: 'push_aria',
  },
];

const defaultPreferences: NotificationPreferences = {
  email_messages: true,
  email_schedule: true,
  email_agreements: true,
  email_payments: true,
  email_court: true,
  email_aria: true,
  push_messages: true,
  push_schedule: true,
  push_agreements: true,
  push_payments: true,
  push_court: true,
  push_aria: true,
};

// Toggle Switch Component
function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
        border-2 transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-cg-primary/50 focus:ring-offset-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${checked
          ? 'bg-cg-primary border-cg-primary'
          : 'bg-gray-300 border-gray-300'
        }
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white shadow-md ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [hasChanges, setHasChanges] = useState(false);

  // Push notifications hook
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    permission: pushPermission,
    isLoading: pushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications();

  // Fetch current preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const data = await usersAPI.getNotificationPreferences();
        setPreferences(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch notification preferences:', err);
        setError('Failed to load notification preferences');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setShowSuccess(false);
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await usersAPI.updateNotificationPreferences(preferences);
      setShowSuccess(true);
      setHasChanges(false);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
      setError('Failed to save notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick actions
  const enableAll = () => {
    const allEnabled = Object.keys(preferences).reduce((acc, key) => ({
      ...acc,
      [key]: true,
    }), {} as NotificationPreferences);
    setPreferences(allEnabled);
    setShowSuccess(false);
    setHasChanges(true);
  };

  const disableAll = () => {
    const allDisabled = Object.keys(preferences).reduce((acc, key) => ({
      ...acc,
      [key]: false,
    }), {} as NotificationPreferences);
    setPreferences(allDisabled);
    setShowSuccess(false);
    setHasChanges(true);
  };

  // Handle push notification toggle
  const handlePushToggle = async () => {
    if (pushSubscribed) {
      await unsubscribePush();
    } else {
      await subscribePush();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cg-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
          Notification Settings
        </h2>
        <p className="text-slate-600 font-medium">
          Choose how you want to be notified about important updates
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-50 border-red-200 rounded-2xl shadow-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600 font-medium">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="bg-emerald-50 border-emerald-200 rounded-2xl shadow-lg">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-600 font-medium">
            Your notification preferences have been saved.
          </AlertDescription>
        </Alert>
      )}

      {/* Push Notifications Status */}
      {pushSupported && (
        <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-3 font-bold" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              <div className={`p-2 rounded-xl shadow-md ${
                pushSubscribed
                  ? 'bg-gradient-to-br from-[#2C5F5D]/10 to-[#2C5F5D]/5'
                  : 'bg-gradient-to-br from-slate-500/10 to-slate-600/5'
              }`}>
                {pushSubscribed ? (
                  <Bell className="h-5 w-5 text-[#2C5F5D]" />
                ) : (
                  <BellOff className="h-5 w-5 text-slate-600" />
                )}
              </div>
              Browser Push Notifications
            </CardTitle>
            <CardDescription className="font-medium">
              {pushSubscribed
                ? 'Push notifications are enabled for this browser'
                : pushPermission === 'denied'
                ? 'Push notifications are blocked. Please enable them in your browser settings.'
                : 'Enable push notifications to receive instant alerts'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant={pushSubscribed ? 'outline' : 'default'}
              onClick={handlePushToggle}
              disabled={pushLoading || pushPermission === 'denied'}
            >
              {pushLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : pushSubscribed ? (
                'Disable Push Notifications'
              ) : (
                'Enable Push Notifications'
              )}
            </Button>
            {pushPermission === 'denied' && (
              <p className="text-sm text-muted-foreground mt-2">
                To enable notifications, click the lock icon in your browser's address bar and allow notifications.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quick Actions */}
        <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              Quick Actions
            </CardTitle>
            <CardDescription className="font-medium">
              Quickly enable or disable all notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={enableAll}>
                Enable All
              </Button>
              <Button type="button" variant="outline" onClick={disableAll}>
                Disable All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Categories */}
        <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  Notification Types
                </CardTitle>
                <CardDescription className="font-medium">
                  Choose which notifications you'd like to receive
                </CardDescription>
              </div>
              <div className="hidden sm:flex gap-8 text-sm font-bold text-slate-600">
                <div className="flex items-center gap-2 w-16 justify-center">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
                <div className="flex items-center gap-2 w-16 justify-center">
                  <Smartphone className="h-4 w-4" />
                  Push
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {notificationCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <div
                    key={category.id}
                    className="py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#2C5F5D]/10 to-[#2C5F5D]/5 rounded-xl shadow-md">
                          <Icon className="h-4 w-4 text-[#2C5F5D]" />
                        </div>
                        <div>
                          <Label className="font-bold text-slate-900">
                            {category.name}
                          </Label>
                          <p className="text-sm text-slate-600 font-medium">
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        {/* Email Toggle */}
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground sm:hidden">
                            Email
                          </span>
                          <Toggle
                            checked={preferences[category.emailKey] as boolean}
                            onChange={(value) =>
                              handleToggle(category.emailKey, value)
                            }
                            label={`Email notifications for ${category.name}`}
                          />
                        </div>
                        {/* Push Toggle */}
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground sm:hidden">
                            Push
                          </span>
                          <Toggle
                            checked={preferences[category.pushKey] as boolean}
                            onChange={(value) =>
                              handleToggle(category.pushKey, value)
                            }
                            label={`Push notifications for ${category.name}`}
                            disabled={!pushSubscribed}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-2xl shadow-lg">
          <CardContent className="py-4">
            <p className="text-sm text-slate-600 font-medium">
              <strong className="text-slate-900">Note:</strong> Some
              notifications (like court-ordered communications) cannot be
              disabled and will always be delivered for legal compliance.
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPreferences(defaultPreferences);
              setHasChanges(true);
            }}
          >
            Reset to Defaults
          </Button>
          <Button type="submit" disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

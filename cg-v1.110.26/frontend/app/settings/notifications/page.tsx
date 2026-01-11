'use client';

import { useState } from 'react';
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
} from 'lucide-react';

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
  email: boolean;
  push: boolean;
}

const defaultNotifications: NotificationCategory[] = [
  {
    id: 'messages',
    name: 'Messages',
    description: 'When your co-parent sends you a message',
    icon: MessageSquare,
    email: true,
    push: true,
  },
  {
    id: 'schedule',
    name: 'Schedule Changes',
    description: 'When events are added, modified, or canceled',
    icon: Calendar,
    email: true,
    push: true,
  },
  {
    id: 'agreements',
    name: 'Agreement Updates',
    description: 'When agreements need your review or are signed',
    icon: FileText,
    email: true,
    push: false,
  },
  {
    id: 'payments',
    name: 'Payment Reminders',
    description: 'When payments are due or expenses need approval',
    icon: Wallet,
    email: true,
    push: false,
  },
  {
    id: 'court',
    name: 'Court Events',
    description: 'Reminders for upcoming court dates and deadlines',
    icon: Gavel,
    email: true,
    push: true,
  },
  {
    id: 'aria',
    name: 'ARIA Suggestions',
    description: 'Tips for improving communication',
    icon: Sparkles,
    email: false,
    push: false,
  },
];

// Toggle Switch Component
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${checked ? 'bg-cg-primary' : 'bg-muted'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white shadow ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [notifications, setNotifications] =
    useState<NotificationCategory[]>(defaultNotifications);

  const handleToggle = (
    categoryId: string,
    type: 'email' | 'push',
    value: boolean
  ) => {
    setNotifications((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, [type]: value } : cat
      )
    );
    setShowSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // In production, this would call the notification preferences API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Implement actual API call
      // await usersAPI.updateNotificationPreferences(notifications);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick actions
  const enableAll = () => {
    setNotifications((prev) =>
      prev.map((cat) => ({ ...cat, email: true, push: true }))
    );
    setShowSuccess(false);
  };

  const disableAll = () => {
    setNotifications((prev) =>
      prev.map((cat) => ({ ...cat, email: false, push: false }))
    );
    setShowSuccess(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Notification Settings
        </h2>
        <p className="text-muted-foreground">
          Choose how you want to be notified about important updates
        </p>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="bg-cg-success-subtle border-cg-success/20">
          <CheckCircle className="h-4 w-4 text-cg-success" />
          <AlertDescription className="text-cg-success">
            Your notification preferences have been saved.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Notification Types</CardTitle>
                <CardDescription>
                  Choose which notifications you'd like to receive
                </CardDescription>
              </div>
              <div className="hidden sm:flex gap-8 text-sm font-medium text-muted-foreground">
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
              {notifications.map((category) => {
                const Icon = category.icon;
                return (
                  <div
                    key={category.id}
                    className="py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-secondary rounded-lg">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <Label className="font-medium">
                            {category.name}
                          </Label>
                          <p className="text-sm text-muted-foreground">
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
                            checked={category.email}
                            onChange={(value) =>
                              handleToggle(category.id, 'email', value)
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
                            checked={category.push}
                            onChange={(value) =>
                              handleToggle(category.id, 'push', value)
                            }
                            label={`Push notifications for ${category.name}`}
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
        <Card className="bg-cg-primary-subtle border-cg-primary/20">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Some
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
            onClick={() => setNotifications(defaultNotifications)}
          >
            Reset to Defaults
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </form>
    </div>
  );
}

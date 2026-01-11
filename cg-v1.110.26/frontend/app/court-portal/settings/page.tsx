"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Building2,
  Shield,
  Bell,
  Key,
  Clock,
  CheckCircle,
  AlertTriangle,
  Save,
  RefreshCw,
} from "lucide-react";
import { useCourtAuth } from "../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Court Portal Settings Page
 *
 * Professional account settings for court professionals.
 */

export default function CourtSettingsPage() {
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    title: "",
    organization: "",
    phone: "",
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    email_case_updates: true,
    email_form_submissions: true,
    email_access_expiring: true,
    email_weekly_digest: false,
  });

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional) {
      setFormData({
        full_name: professional.full_name || "",
        title: professional.title || "",
        organization: professional.organization || "",
        phone: "",
      });
    }
  }, [professional]);

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const roleLabels: Record<string, string> = {
    gal: "Guardian ad Litem",
    attorney_petitioner: "Attorney (Petitioner)",
    attorney_respondent: "Attorney (Respondent)",
    mediator: "Mediator",
    court_clerk: "Court Clerk",
    judge: "Judge",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your court portal account settings
        </p>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Settings saved successfully.
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your professional identity in the court portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Professional Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Senior Attorney"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) =>
                  setFormData({ ...formData, organization: e.target.value })
                }
                placeholder="e.g., Smith & Associates"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your account credentials and verification status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={professional.email}
                  disabled
                  className="bg-muted"
                />
                {professional.is_verified && (
                  <Badge variant="success" className="flex-shrink-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={roleLabels[professional.role] || professional.role}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>
                MFA: {professional.mfa_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            {!professional.mfa_enabled && (
              <Button variant="outline" size="sm">
                <Key className="h-4 w-4 mr-2" />
                Enable MFA
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which notifications you receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            label="Case Updates"
            description="Get notified when cases you're assigned to are updated"
            checked={notifications.email_case_updates}
            onChange={(checked) =>
              setNotifications({ ...notifications, email_case_updates: checked })
            }
          />
          <NotificationToggle
            label="Form Submissions"
            description="Get notified when new court forms are submitted for review"
            checked={notifications.email_form_submissions}
            onChange={(checked) =>
              setNotifications({ ...notifications, email_form_submissions: checked })
            }
          />
          <NotificationToggle
            label="Access Expiring"
            description="Get reminded when your case access is about to expire"
            checked={notifications.email_access_expiring}
            onChange={(checked) =>
              setNotifications({ ...notifications, email_access_expiring: checked })
            }
          />
          <NotificationToggle
            label="Weekly Digest"
            description="Receive a weekly summary of all case activity"
            checked={notifications.email_weekly_digest}
            onChange={(checked) =>
              setNotifications({ ...notifications, email_weekly_digest: checked })
            }
          />
        </CardContent>
      </Card>

      {/* Access History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Recent Access History
          </CardTitle>
          <CardDescription>
            Your recent case access activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <AccessLogEntry
              action="Viewed case messages"
              caseName="Smith v. Johnson"
              timestamp="Today, 2:34 PM"
            />
            <AccessLogEntry
              action="Downloaded compliance report"
              caseName="Smith v. Johnson"
              timestamp="Today, 11:22 AM"
            />
            <AccessLogEntry
              action="Viewed custody agreement"
              caseName="Williams v. Davis"
              timestamp="Yesterday, 4:15 PM"
            />
            <AccessLogEntry
              action="Accessed child profiles"
              caseName="Williams v. Davis"
              timestamp="Yesterday, 4:10 PM"
            />
          </div>
          <Button variant="ghost" className="w-full mt-4 text-indigo-600">
            View Full Access Log
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Toggle Component for notifications
function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${checked ? "bg-indigo-600" : "bg-muted"}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? "translate-x-6" : "translate-x-1"}
          `}
        />
      </button>
    </div>
  );
}

// Access Log Entry Component
function AccessLogEntry({
  action,
  caseName,
  timestamp,
}: {
  action: string;
  caseName: string;
  timestamp: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium">{action}</div>
        <div className="text-xs text-muted-foreground">{caseName}</div>
      </div>
      <div className="text-xs text-muted-foreground">{timestamp}</div>
    </div>
  );
}

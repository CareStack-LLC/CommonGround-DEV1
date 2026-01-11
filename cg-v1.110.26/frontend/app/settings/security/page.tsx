'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Lock,
  Shield,
  Smartphone,
  Monitor,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';

/**
 * Security Settings Page
 *
 * Design: Clear sections for password, 2FA, and session management.
 * Philosophy: "Security should be accessible, not intimidating."
 */

interface ActiveSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

// Mock active sessions
const mockSessions: ActiveSession[] = [
  {
    id: '1',
    device: 'Chrome on MacOS',
    location: 'Los Angeles, CA',
    lastActive: 'Now',
    isCurrent: true,
  },
  {
    id: '2',
    device: 'Safari on iPhone',
    location: 'Los Angeles, CA',
    lastActive: '2 hours ago',
    isCurrent: false,
  },
];

export default function SecuritySettingsPage() {
  const { user, logout } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [sessions] = useState<ActiveSession[]>(mockSessions);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setShowSuccess(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsSaving(true);

    try {
      // In production, this would call the password change API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Implement actual API call
      // await usersAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);

      setShowSuccess(true);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setError('Failed to change password. Please check your current password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!confirm('This will sign you out of all devices including this one. Continue?')) {
      return;
    }

    try {
      // In production, this would call the logout all sessions API
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Implement actual API call
      // await usersAPI.logoutAllSessions();

      logout();
    } catch (err) {
      setError('Failed to sign out of all devices');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      // In production, this would call the revoke session API
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Implement actual API call
      // await usersAPI.revokeSession(sessionId);

      // Refresh sessions list
    } catch (err) {
      setError('Failed to revoke session');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Security Settings
        </h2>
        <p className="text-muted-foreground">
          Manage your password and account security
        </p>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="bg-cg-success-subtle border-cg-success/20">
          <CheckCircle className="h-4 w-4 text-cg-success" />
          <AlertDescription className="text-cg-success">
            Your password has been changed successfully.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Change Password
          </CardTitle>
          <CardDescription>
            Choose a strong password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with a mix of letters and numbers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Confirm your new password"
              />
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Changing Password...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-lg">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Authenticator App</p>
                <p className="text-sm text-muted-foreground">
                  Use an app like Google Authenticator or Authy
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={twoFactorEnabled ? 'success' : 'secondary'}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <Button
                variant="outline"
                onClick={() => {
                  // In production, this would open 2FA setup flow
                  setTwoFactorEnabled(!twoFactorEnabled);
                }}
              >
                {twoFactorEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-5 w-5 text-muted-foreground" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Devices where you're currently signed in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-lg">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {session.device}
                      {session.isCurrent && (
                        <Badge variant="default" size="sm">
                          Current
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.location} • {session.lastActive}
                    </p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="destructive"
              onClick={handleLogoutAllDevices}
              className="w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out of All Devices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Email</CardTitle>
          <CardDescription>
            The email address associated with your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{user?.email}</p>
              <p className="text-sm text-muted-foreground">
                Contact support to change your email address
              </p>
            </div>
            <Badge variant="success">Verified</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

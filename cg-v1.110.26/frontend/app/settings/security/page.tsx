'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usersAPI } from '@/lib/api';
import {
  listMFAFactors,
  enrollMFA,
  verifyMFA,
  unenrollMFA,
} from '@/lib/supabase';
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
  Loader2,
  X,
  Mail,
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

// MFA enrollment state
interface MFAEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

export default function SecuritySettingsPage() {
  const { user, logout } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // MFA state
  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([]);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaEnrollment, setMfaEnrollment] = useState<MFAEnrollment | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaProcessing, setMfaProcessing] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [sessions] = useState<ActiveSession[]>(mockSessions);

  // Check if MFA is enabled (has verified TOTP factor)
  const twoFactorEnabled = mfaFactors.some(
    (f) => f.factor_type === 'totp' && f.status === 'verified'
  );

  // Load MFA factors on mount
  useEffect(() => {
    const loadMFAFactors = async () => {
      try {
        const { totp } = await listMFAFactors();
        setMfaFactors(totp || []);
      } catch (err) {
        console.error('Failed to load MFA factors:', err);
      } finally {
        setMfaLoading(false);
      }
    };

    loadMFAFactors();
  }, []);

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
    if (!passwordForm.currentPassword) {
      setError('Please enter your current password');
      return;
    }

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
      await usersAPI.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      setShowSuccess(true);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      const message = err?.data?.detail || err?.message || 'Failed to change password';
      setError(message);
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

  // Start MFA enrollment
  const handleEnableMFA = async () => {
    setMfaError(null);
    setMfaProcessing(true);

    try {
      const enrollment = await enrollMFA('Authenticator App');
      setMfaEnrollment({
        factorId: enrollment.id,
        qrCode: enrollment.totp.qr_code,
        secret: enrollment.totp.secret,
      });
    } catch (err: any) {
      setMfaError(err?.message || 'Failed to start MFA enrollment');
    } finally {
      setMfaProcessing(false);
    }
  };

  // Verify MFA code and complete enrollment
  const handleVerifyMFA = async () => {
    if (!mfaEnrollment || !mfaCode) return;

    setMfaError(null);
    setMfaProcessing(true);

    try {
      await verifyMFA(mfaEnrollment.factorId, mfaCode);

      // Refresh factors list
      const { totp } = await listMFAFactors();
      setMfaFactors(totp || []);

      // Clear enrollment state
      setMfaEnrollment(null);
      setMfaCode('');
    } catch (err: any) {
      setMfaError(err?.message || 'Invalid code. Please try again.');
    } finally {
      setMfaProcessing(false);
    }
  };

  // Cancel MFA enrollment
  const handleCancelMFA = () => {
    setMfaEnrollment(null);
    setMfaCode('');
    setMfaError(null);
  };

  // Disable MFA
  const handleDisableMFA = async () => {
    const verifiedFactor = mfaFactors.find(
      (f) => f.factor_type === 'totp' && f.status === 'verified'
    );
    if (!verifiedFactor) return;

    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    setMfaError(null);
    setMfaProcessing(true);

    try {
      await unenrollMFA(verifiedFactor.id);

      // Refresh factors list
      const { totp } = await listMFAFactors();
      setMfaFactors(totp || []);
    } catch (err: any) {
      setMfaError(err?.message || 'Failed to disable MFA');
    } finally {
      setMfaProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
          Security Settings
        </h2>
        <p className="text-muted-foreground font-medium mt-1">
          Manage your password and account security
        </p>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="bg-cg-success-subtle border-2 border-cg-success/20 rounded-2xl shadow-lg">
          <CheckCircle className="h-5 w-5 text-cg-success" />
          <AlertDescription className="text-cg-success font-semibold">
            Your password has been changed successfully.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="border-2 rounded-2xl shadow-lg">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="font-semibold">{error}</AlertDescription>
        </Alert>
      )}

      {/* Change Password */}
      <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            <div className="p-2 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-xl shadow-md">
              <Lock className="h-5 w-5 text-[var(--portal-primary)]" />
            </div>
            Change Password
          </CardTitle>
          <CardDescription className="font-medium">
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
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            <div className="p-2 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl shadow-md">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="font-medium">
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* MFA Error */}
          {mfaError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{mfaError}</AlertDescription>
            </Alert>
          )}

          {/* Loading state */}
          {mfaLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mfaEnrollment ? (
            /* Enrollment flow - show QR code */
            <div className="space-y-4">
              <div className="text-center">
                <p className="font-medium mb-2">
                  Scan this QR code with your authenticator app
                </p>
                <div className="flex justify-center mb-4">
                  <img
                    src={mfaEnrollment.qrCode}
                    alt="QR Code for authenticator app"
                    className="w-48 h-48 border rounded-lg"
                  />
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Or enter this code manually:
                </p>
                <code className="bg-muted px-3 py-1 rounded text-sm font-mono">
                  {mfaEnrollment.secret}
                </code>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfaCode">Enter verification code</Label>
                <Input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancelMFA}
                  disabled={mfaProcessing}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyMFA}
                  disabled={mfaProcessing || mfaCode.length !== 6}
                  className="flex-1"
                >
                  {mfaProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify & Enable
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Normal state - show enable/disable */
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
                <Badge variant={twoFactorEnabled ? 'success' : 'outline'}>
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <Button
                  variant="outline"
                  onClick={twoFactorEnabled ? handleDisableMFA : handleEnableMFA}
                  disabled={mfaProcessing}
                >
                  {mfaProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : twoFactorEnabled ? (
                    'Disable'
                  ) : (
                    'Enable'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            <div className="p-2 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl shadow-md">
              <Monitor className="h-5 w-5 text-purple-600" />
            </div>
            Active Sessions
          </CardTitle>
          <CardDescription className="font-medium">
            Devices where you're currently signed in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-slate-500/10 to-slate-600/5 rounded-xl shadow-md">
                    <Monitor className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      {session.device}
                      {session.isCurrent && (
                        <Badge variant="default" size="sm">
                          Current
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-slate-600 font-medium">
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

          <div className="mt-4 pt-4 border-t border-slate-200">
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
      <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            <div className="p-2 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl shadow-md">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            Account Email
          </CardTitle>
          <CardDescription className="font-medium">
            The email address associated with your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900">{user?.email}</p>
              <p className="text-sm text-slate-600 font-medium">
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

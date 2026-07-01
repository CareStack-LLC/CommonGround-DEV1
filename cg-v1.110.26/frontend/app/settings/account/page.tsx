'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usersAPI } from '@/lib/api';
import { TIMEZONE_OPTIONS } from '@/lib/timezone';
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
import { User, Mail, Phone, MapPin, Clock, CheckCircle, Download, AlertTriangle, Loader2, Trash2, ShieldCheck } from 'lucide-react';

/**
 * Account Settings Page
 *
 * Design: Clear sections for profile, contact, and address info.
 * Philosophy: "Make updating information effortless."
 */

interface ProfileFormData {
  first_name: string;
  last_name: string;
  preferred_name: string;
  phone: string;
  timezone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AccountSettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data & Privacy state
  const [exportStatus, setExportStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleExport() {
    setExportStatus('working');
    setExportError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/v1/users/me/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `commonground-data-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportStatus('done');
      setTimeout(() => setExportStatus('idle'), 4000);
    } catch (err: any) {
      setExportError(err?.message || 'Could not prepare your data. Try again in a moment.');
      setExportStatus('error');
    }
  }

  async function handleRequestDeletion() {
    setDeleteStatus('working');
    setDeleteError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/v1/users/request-deletion`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail || `Deletion request failed (${res.status})`);
      }
      setDeleteStatus('done');
    } catch (err: any) {
      setDeleteError(err?.message || 'Could not schedule deletion. Please contact support.');
      setDeleteStatus('error');
    }
  }

  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    preferred_name: '',
    phone: '',
    timezone: 'America/Los_Angeles',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
  });

  // Load profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        // If we already have profile in context, use it
        if (profile) {
          setFormData({
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            preferred_name: profile.preferred_name || '',
            phone: profile.phone || '',
            timezone: profile.timezone || 'America/Los_Angeles',
            address_line1: profile.address_line1 || '',
            address_line2: profile.address_line2 || '',
            city: profile.city || '',
            state: profile.state || '',
            zip_code: profile.zip_code || '',
          });
        } else if (user) {
          // Fallback to user data if no profile
          setFormData((prev) => ({
            ...prev,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
          }));
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, profile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setShowSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setShowSuccess(false);

    try {
      // Call the profile update API
      await usersAPI.updateProfile({
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
        preferred_name: formData.preferred_name || undefined,
        phone: formData.phone || undefined,
        timezone: formData.timezone,
        address_line1: formData.address_line1 || undefined,
        address_line2: formData.address_line2 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip_code: formData.zip_code || undefined,
      });

      // Refresh the profile in auth context so timezone updates everywhere
      await refreshProfile();

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header - matches app design system */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-[#2D6A8F]/10 to-[#2D6A8F]/5 rounded-2xl flex items-center justify-center shadow-md">
          <User className="w-6 h-6 text-[#2D6A8F]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            Account Settings
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Manage your profile and contact information
          </p>
        </div>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="bg-[#E8F4F0] dark:bg-[#1E3A4A]/20 border-[#E8F4F0] dark:border-[#1E3A4A]/40 rounded-2xl shadow-lg">
          <CheckCircle className="h-4 w-4 text-[#2D8A70]" />
          <AlertDescription className="text-[#2D8A70] font-medium">
            Your changes have been saved successfully.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="rounded-2xl shadow-lg">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Information */}
        <Card className="border-2 border-border rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              <div className="p-2 bg-gradient-to-br from-[#2D6A8F]/10 to-[#2D6A8F]/5 rounded-xl shadow-md">
                <User className="h-5 w-5 text-[#2D6A8F]" />
              </div>
              Profile Information
            </CardTitle>
            <CardDescription className="font-medium">
              Your name as it appears throughout the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_name">
                Preferred Name{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="preferred_name"
                name="preferred_name"
                value={formData.preferred_name}
                onChange={handleChange}
                placeholder="What should we call you?"
              />
              <p className="text-xs text-muted-foreground">
                This is how you'll be greeted in the app
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-2 border-border rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              <div className="p-2 bg-gradient-to-br from-[#3DAA8A]/10 to-[#2D8A70]/5 rounded-xl shadow-md">
                <Mail className="h-5 w-5 text-[#2D8A70]" />
              </div>
              Contact Information
            </CardTitle>
            <CardDescription className="font-medium">
              How we can reach you for important updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Contact support to change your email address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
              />
              <p className="text-xs text-muted-foreground">
                For SMS reminders about exchanges and court dates
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Timezone
                </div>
              </Label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="flex h-10 w-full rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-medium focus:border-[var(--portal-primary)] focus:outline-none focus:ring-0 transition-colors"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                All schedule times will display in this timezone
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card className="border-2 border-border rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              <div className="p-2 bg-gradient-to-br from-[#F5A623]/10 to-[#E09520]/5 rounded-xl shadow-md">
                <MapPin className="h-5 w-5 text-[#E09520]" />
              </div>
              Address
            </CardTitle>
            <CardDescription className="font-medium">
              Used for court forms and exchange location defaults
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address_line1">Street Address</Label>
              <Input
                id="address_line1"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                placeholder="123 Main Street"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2">
                Apartment, Suite, etc.{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="address_line2"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                placeholder="Apt 4B"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-6">
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Los Angeles"
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  placeholder="90001"
                  maxLength={10}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              // Reset to profile data
              if (profile) {
                setFormData({
                  first_name: profile.first_name || '',
                  last_name: profile.last_name || '',
                  preferred_name: profile.preferred_name || '',
                  phone: profile.phone || '',
                  timezone: profile.timezone || 'America/Los_Angeles',
                  address_line1: profile.address_line1 || '',
                  address_line2: profile.address_line2 || '',
                  city: profile.city || '',
                  state: profile.state || '',
                  zip_code: profile.zip_code || '',
                });
              } else if (user) {
                setFormData({
                  first_name: user.first_name || '',
                  last_name: user.last_name || '',
                  preferred_name: '',
                  phone: '',
                  timezone: 'America/Los_Angeles',
                  address_line1: '',
                  address_line2: '',
                  city: '',
                  state: '',
                  zip_code: '',
                });
              }
              setError(null);
              setShowSuccess(false);
            }}
            className="px-6 py-2.5 bg-card border-2 border-border text-foreground rounded-xl font-bold hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white rounded-xl font-bold hover:shadow-lg transition-all duration-300 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>

      {/* Data & Privacy */}
      <Card className="border-2 border-border rounded-2xl shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            <div className="p-2 bg-gradient-to-br from-slate-500/10 to-slate-600/5 rounded-xl shadow-md">
              <ShieldCheck className="h-5 w-5 text-slate-700" />
            </div>
            Data &amp; Privacy
          </CardTitle>
          <CardDescription className="font-medium">
            Your data belongs to you. Download a copy anytime — or delete your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border-2 border-border bg-card">
            <div className="flex-1">
              <p className="font-bold text-foreground">Download my data</p>
              <p className="text-sm text-muted-foreground font-medium">
                Get a JSON file with your profile, agreements, messages, schedules, and financial records.
              </p>
              {exportStatus === 'done' && (
                <p className="text-xs text-[#2D8A70] font-semibold mt-1.5">
                  Download started — check your browser's downloads folder.
                </p>
              )}
              {exportStatus === 'error' && exportError && (
                <p className="text-xs text-[#E09520] font-semibold mt-1.5">{exportError}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={exportStatus === 'working'}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-card border-2 border-[var(--portal-primary)]/30 text-[var(--portal-primary)] rounded-xl font-bold hover:bg-[var(--portal-primary)]/5 hover:shadow-md transition-all disabled:opacity-60"
            >
              {exportStatus === 'working' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download
                </>
              )}
            </button>
          </div>

          {/* Delete */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border-2 border-[#FEF7ED] bg-[#FEF7ED]/40">
            <div className="flex-1">
              <p className="font-bold text-[#1E3A4A]">Delete my account</p>
              <p className="text-sm text-[#E09520]/80 font-medium">
                Schedules your account for deletion in 30 days. You can cancel by contacting
                support before then. This is permanent once the grace period ends.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(true);
                setDeleteStatus('idle');
                setDeleteConfirmText('');
                setDeleteError(null);
              }}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#F5A623] text-[#E09520] rounded-xl font-bold hover:bg-[#FEF7ED] hover:border-[#F5A623] transition-all"
            >
              <Trash2 className="h-4 w-4" />
              Delete account
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      {deleteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => deleteStatus !== 'working' && setDeleteModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-border"
          >
            <div className="bg-[#FEF7ED] border-b-2 border-[#FEF7ED] p-5 flex items-start gap-3">
              <div className="p-2 bg-[#FEF7ED] rounded-xl">
                <AlertTriangle className="h-6 w-6 text-[#E09520]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Delete your CommonGround account?
                </h3>
                <p className="text-sm text-[#E09520]/90 mt-1 font-medium">
                  Your account will be scheduled for deletion on a 30-day timer.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {deleteStatus === 'done' ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle className="h-12 w-12 text-[#3DAA8A]" />
                  <p className="font-bold text-foreground text-center">Deletion scheduled</p>
                  <p className="text-sm text-muted-foreground text-center">
                    We've sent a confirmation email. Your data will be removed in 30 days
                    unless you contact support to cancel.
                  </p>
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="mt-2 px-4 py-2 bg-card border-2 border-border rounded-xl font-bold"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-sm text-foreground space-y-2">
                    <p className="font-semibold">What happens next:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>We email you a confirmation with the exact deletion date.</li>
                      <li>Your co-parent keeps access to shared family-file records.</li>
                      <li>Court-ordered audit logs are retained per legal requirement.</li>
                      <li>You can cancel by emailing support within 30 days.</li>
                    </ul>
                  </div>

                  <label className="block">
                    <span className="text-sm font-semibold text-foreground">
                      Type <span className="font-mono text-[#E09520]">DELETE</span> to confirm
                    </span>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="mt-1.5"
                      disabled={deleteStatus === 'working'}
                      autoFocus
                    />
                  </label>

                  {deleteError && (
                    <p className="text-sm text-[#E09520] font-medium">{deleteError}</p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setDeleteModalOpen(false)}
                      disabled={deleteStatus === 'working'}
                      className="px-4 py-2.5 bg-card border-2 border-border rounded-xl font-bold hover:shadow-md transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRequestDeletion}
                      disabled={deleteConfirmText !== 'DELETE' || deleteStatus === 'working'}
                      className="px-4 py-2.5 bg-[#E09520] hover:bg-[#E09520] text-white rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                      {deleteStatus === 'working' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Scheduling…
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Schedule deletion
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

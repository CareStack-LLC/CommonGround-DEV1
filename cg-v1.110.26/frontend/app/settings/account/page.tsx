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
import { User, Mail, Phone, MapPin, Clock, CheckCircle } from 'lucide-react';

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

export default function AccountSettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-2xl flex items-center justify-center shadow-md">
          <User className="w-6 h-6 text-blue-600" />
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
        <Alert className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 rounded-2xl shadow-lg">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-600 font-medium">
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
              <div className="p-2 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl shadow-md">
                <User className="h-5 w-5 text-blue-600" />
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
              <div className="p-2 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl shadow-md">
                <Mail className="h-5 w-5 text-emerald-600" />
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
              <div className="p-2 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl shadow-md">
                <MapPin className="h-5 w-5 text-amber-600" />
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
    </div>
  );
}

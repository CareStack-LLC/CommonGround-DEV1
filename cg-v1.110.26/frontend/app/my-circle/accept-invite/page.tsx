'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Users,
  Shield,
} from 'lucide-react';
import { myCircleAPI } from '@/lib/api';

interface InviteInfo {
  email: string;
  contact_name?: string;
  relationship_type?: string;
  invite_expires_at: string;
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      loadInviteInfo();
    } else {
      setError('Invalid invitation link. Please check the link and try again.');
      setIsLoading(false);
    }
  }, [token]);

  async function loadInviteInfo() {
    try {
      setIsLoading(true);
      const info = await myCircleAPI.getInviteInfo(token!);
      setInviteInfo(info);
    } catch (err: unknown) {
      console.error('Error loading invite:', err);
      const errorMessage = err instanceof Error ? err.message : 'This invitation may have expired or already been used.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await myCircleAPI.acceptCircleInvite(
        token!,
        password,
        confirmPassword
      );

      // Store the token and redirect
      localStorage.setItem('circle_token', response.access_token);
      localStorage.setItem('circle_user', JSON.stringify({
        userId: response.user_id,
        contactId: response.circle_contact_id,
        contactName: response.contact_name,
        familyFileId: response.family_file_id,
      }));

      setIsSuccess(true);

      // Redirect after a moment
      setTimeout(() => {
        router.push('/my-circle/contact/dashboard');
      }, 2000);
    } catch (err: unknown) {
      console.error('Error accepting invite:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to My Circle!</h1>
          <p className="text-gray-600 mb-4">
            Your account has been created successfully.
          </p>
          <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Join My Circle</h1>
          <p className="text-gray-500 mt-1">
            You've been invited to connect with a child
          </p>
        </div>

        {/* Invite Details */}
        {inviteInfo && (
          <div className="bg-teal-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-teal-200 rounded-full flex items-center justify-center text-2xl">
                👋
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {inviteInfo.contact_name || 'Friend'}
                </p>
                {inviteInfo.relationship_type && (
                  <p className="text-sm text-gray-500 capitalize">
                    {inviteInfo.relationship_type.replace('_', ' ')}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Email: <span className="font-medium">{inviteInfo.email}</span>
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Create Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Enter password again"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
              required
              minLength={8}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Trust Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
          <Shield className="h-4 w-4" />
          <span>Protected by ARIA child safety monitoring</span>
        </div>

        {/* Login Link */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/my-circle/contact')}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-teal-50 to-cyan-50 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}

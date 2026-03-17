'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import { myCircleAPI } from '@/lib/api';

/* =============================================================================
   CommonGround SVG Logo Component
   Two parents (teal + blue) above a child (gold) connected by a golden arch
   ============================================================================= */
function CommonGroundLogo({ size = 64 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className="flex-shrink-0"
    >
      <rect width="512" height="512" rx="64" fill="url(#cg-inv-bg)" />
      <defs>
        <linearGradient id="cg-inv-bg" x1="0" y1="0" x2="512" y2="512">
          <stop stopColor="#E8F4F8" />
          <stop offset="1" stopColor="#D6ECE8" />
        </linearGradient>
        <linearGradient id="cg-inv-pa" x1="140" y1="110" x2="196" y2="186">
          <stop stopColor="#5BC4A0" />
          <stop offset="1" stopColor="#3DAA8A" />
        </linearGradient>
        <linearGradient id="cg-inv-pb" x1="316" y1="110" x2="372" y2="186">
          <stop stopColor="#4BA8C8" />
          <stop offset="1" stopColor="#2D6A8F" />
        </linearGradient>
      </defs>
      <circle cx="168" cy="148" r="48" fill="url(#cg-inv-pa)" />
      <path d="M120 260c0-26.5 21.5-48 48-48s48 21.5 48 48" stroke="url(#cg-inv-pa)" strokeWidth="16" fill="none" strokeLinecap="round" />
      <circle cx="344" cy="148" r="48" fill="url(#cg-inv-pb)" />
      <path d="M296 260c0-26.5 21.5-48 48-48s48 21.5 48 48" stroke="url(#cg-inv-pb)" strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d="M168 200 Q256 140 344 200" stroke="#F5A623" strokeWidth="10" fill="none" strokeLinecap="round" />
      <circle cx="256" cy="330" r="38" fill="#F5A623" />
      <path d="M218 410c0-21 17-38 38-38s38 17 38 38" stroke="#F5A623" strokeWidth="14" fill="none" strokeLinecap="round" />
    </svg>
  );
}

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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-gradient-to-br from-[#E8F4F8] via-background to-[#D6ECE8] dark:from-[#1E3A4A]/30 dark:via-background dark:to-[#1E3A4A]/20 -z-10" />
        <div className="bg-card rounded-2xl shadow-xl border-2 border-border p-8 max-w-md w-full text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#3DAA8A] mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-gradient-to-br from-[#E8F4F8] via-background to-[#D6ECE8] dark:from-[#1E3A4A]/30 dark:via-background dark:to-[#1E3A4A]/20 -z-10" />
        <div className="bg-card rounded-2xl shadow-xl border-2 border-border p-8 max-w-md w-full text-center">
          <XCircle className="h-16 w-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Invalid Invitation
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-card border border-border text-foreground rounded-xl hover:bg-muted transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-gradient-to-br from-[#E8F4F8] via-background to-[#D6ECE8] dark:from-[#1E3A4A]/30 dark:via-background dark:to-[#1E3A4A]/20 -z-10" />
        <div className="bg-card rounded-2xl shadow-xl border-2 border-border p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[#3DAA8A]/10 dark:bg-[#3DAA8A]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-[#3DAA8A]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Welcome to Common<span className="text-[#3DAA8A]">Ground</span>!
          </h1>
          <p className="text-muted-foreground mb-4">
            Your account has been created successfully.
          </p>
          <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Subtle branded background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#E8F4F8] via-background to-[#D6ECE8] dark:from-[#1E3A4A]/30 dark:via-background dark:to-[#1E3A4A]/20 -z-10" />

      <div className="bg-card rounded-2xl shadow-xl border-2 border-border p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <CommonGroundLogo size={72} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Common<span className="text-[#3DAA8A]">Ground</span>
          </h1>
          <p className="text-lg font-semibold text-[#2D6A8F] dark:text-[#4BA8C8] mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Join My Circle
          </p>
          <p className="text-muted-foreground text-sm">
            You&apos;ve been invited to connect with a child
          </p>
        </div>

        {/* Invite Details */}
        {inviteInfo && (
          <div className="bg-[#3DAA8A]/5 dark:bg-[#3DAA8A]/10 rounded-xl p-4 mb-6 border border-[#3DAA8A]/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#3DAA8A]/20 to-[#2D6A8F]/20 rounded-full flex items-center justify-center text-2xl">
                {'\u{1F44B}'}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {inviteInfo.contact_name || 'Friend'}
                </p>
                {inviteInfo.relationship_type && (
                  <p className="text-sm text-muted-foreground capitalize">
                    {inviteInfo.relationship_type.replace('_', ' ')}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Email: <span className="font-medium text-foreground">{inviteInfo.email}</span>
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Create Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-[#3DAA8A] focus:border-[#3DAA8A] outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Enter password again"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-[#3DAA8A] focus:border-[#3DAA8A] outline-none transition-colors text-foreground placeholder:text-muted-foreground"
              required
              minLength={8}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-[#3DAA8A] to-[#2D6A8F] hover:from-[#349878] hover:to-[#245A7A] text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
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
        <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Shield className="h-4 w-4 text-[#3DAA8A]" />
          <span>Protected by ARIA child safety monitoring</span>
        </div>

        {/* Login Link */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/my-circle/contact')}
            className="text-[#3DAA8A] hover:text-[#2D6A8F] dark:text-[#5BC4A0] dark:hover:text-[#4BA8C8] font-medium transition-colors"
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
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#3DAA8A]" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}

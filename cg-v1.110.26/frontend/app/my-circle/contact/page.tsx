'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Eye, EyeOff, Shield } from 'lucide-react';
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
      <defs>
        <linearGradient id="cg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8F4F8" />
          <stop offset="100%" stopColor="#D6ECE8" />
        </linearGradient>
        <linearGradient id="cg-parent-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5BC4A0" />
          <stop offset="100%" stopColor="#3DAA8A" />
        </linearGradient>
        <linearGradient id="cg-parent-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4BA8C8" />
          <stop offset="100%" stopColor="#2D6A8F" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#cg-bg)" />
      {/* Left parent */}
      <circle cx="168" cy="148" r="48" fill="url(#cg-parent-a)" />
      <path d="M118 218 Q168 258 218 218" stroke="url(#cg-parent-a)" strokeWidth="16" strokeLinecap="round" fill="none" />
      {/* Right parent */}
      <circle cx="344" cy="148" r="48" fill="url(#cg-parent-b)" />
      <path d="M294 218 Q344 258 394 218" stroke="url(#cg-parent-b)" strokeWidth="16" strokeLinecap="round" fill="none" />
      {/* Golden arch */}
      <path d="M218 168 Q256 104 294 168" stroke="#F5A623" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.95" />
      {/* Child */}
      <circle cx="256" cy="330" r="38" fill="#F5A623" />
      <path d="M218 382 Q256 414 294 382" stroke="#F5A623" strokeWidth="12" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function CircleContactLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill email from URL parameter if provided
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    try {
      setIsLoading(true);
      const response = await myCircleAPI.circleUserLogin(email, password);

      // Store the token and user info
      localStorage.setItem('circle_token', response.access_token);
      localStorage.setItem('circle_user', JSON.stringify({
        userId: response.user_id,
        contactId: response.circle_contact_id,
        contactName: response.contact_name,
        familyFileId: response.family_file_id,
        childIds: response.child_ids,
      }));
      localStorage.setItem('circle_login_data', JSON.stringify({
        terms_accepted: response.terms_accepted,
        terms_accepted_at: response.terms_accepted_at,
      }));

      // Route based on terms acceptance
      if (!response.terms_accepted) {
        router.push('/my-circle/contact/terms');
      } else {
        router.push('/my-circle/contact/dashboard');
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Invalid email or password';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Subtle branded background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#E8F4F8] via-background to-[#D6ECE8] dark:from-[#1E3A4A]/30 dark:via-background dark:to-[#1E3A4A]/20 -z-10" />

      <div className="bg-card rounded-2xl shadow-xl border-2 border-border p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          {/* CommonGround Logo */}
          <div className="flex justify-center mb-5">
            <CommonGroundLogo size={72} />
          </div>

          {/* Brand Name */}
          <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Common<span className="text-[#3DAA8A]">Ground</span>
          </h1>
          <p className="text-lg font-semibold text-[#2D6A8F] dark:text-[#4BA8C8]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            My Circle
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Sign in to connect with your family
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-[#3DAA8A] focus:border-[#3DAA8A] outline-none transition-colors text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-[#3DAA8A] focus:border-[#3DAA8A] outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                required
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

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-[#3DAA8A] to-[#2D6A8F] hover:from-[#349878] hover:to-[#245A7A] text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Forgot Password */}
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/my-circle/contact/forgot-password')}
            className="text-sm text-[#3DAA8A] hover:text-[#2D6A8F] dark:text-[#5BC4A0] dark:hover:text-[#4BA8C8] font-medium transition-colors"
          >
            Forgot your password?
          </button>
        </div>

        {/* Trust Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Shield className="h-4 w-4 text-[#3DAA8A]" />
          <span>Protected by ARIA child safety monitoring</span>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Don&apos;t have an account? You need an invitation from a parent.
          </p>
          <p className="mt-2">
            <button
              onClick={() => router.push('/')}
              className="text-[#3DAA8A] hover:text-[#2D6A8F] dark:text-[#5BC4A0] dark:hover:text-[#4BA8C8] font-medium transition-colors"
            >
              Return to Home
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CircleContactLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#3DAA8A]" />
      </div>
    }>
      <CircleContactLoginContent />
    </Suspense>
  );
}

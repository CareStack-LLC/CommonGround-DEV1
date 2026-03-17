'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Heart, Eye, EyeOff, Shield } from 'lucide-react';
import Image from 'next/image';
import { myCircleAPI } from '@/lib/api';

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
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-background dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl border border-border p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image
              src="/commonground-logo.svg"
              alt="CommonGround"
              width={40}
              height={40}
              className="dark:invert"
            />
          </div>
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            My Circle
          </h1>
          <p
            className="text-muted-foreground mt-1"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Sign in to connect with your family
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label
              className="block text-sm font-medium text-foreground mb-1"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-sm font-medium text-foreground mb-1"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors text-foreground placeholder:text-muted-foreground"
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
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
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
            className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Forgot your password?
          </button>
        </div>

        {/* Trust Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Shield className="h-4 w-4 text-teal-500" />
          <span style={{ fontFamily: 'Inter, sans-serif' }}>
            Protected by ARIA child safety monitoring
          </span>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
          <p>
            Don&apos;t have an account? You need an invitation from a parent.
          </p>
          <p className="mt-2">
            <button
              onClick={() => router.push('/')}
              className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium transition-colors"
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
      <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-background dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    }>
      <CircleContactLoginContent />
    </Suspense>
  );
}

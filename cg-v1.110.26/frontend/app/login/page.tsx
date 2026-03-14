'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { APIError } from '@/lib/api';
import { signInWithGoogle } from '@/lib/supabase';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<boolean>(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setOauthLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
      setOauthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      router.push(redirectTo);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F8F7]">
      {/* Organic decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, var(--portal-primary) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #F5A623 0%, transparent 70%)' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-3 text-[#1E3A4A] hover:text-[var(--portal-primary)] transition-colors group"
        >
          <svg width="40" height="40" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="login-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#E8F4F8" />
                <stop offset="100%" stopColor="#D6ECE8" />
              </linearGradient>
              <linearGradient id="login-lf" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#5BC4A0" />
                <stop offset="100%" stopColor="#3DAA8A" />
              </linearGradient>
              <linearGradient id="login-rf" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4BA8C8" />
                <stop offset="100%" stopColor="#2D6A8F" />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="120" fill="url(#login-bg)" />
            <circle cx="168" cy="148" r="48" fill="url(#login-lf)" />
            <path d="M118 218 Q168 258 218 218" stroke="url(#login-lf)" strokeWidth="16" strokeLinecap="round" fill="none" />
            <circle cx="344" cy="148" r="48" fill="url(#login-rf)" />
            <path d="M294 218 Q344 258 394 218" stroke="url(#login-rf)" strokeWidth="16" strokeLinecap="round" fill="none" />
            <path d="M218 168 Q256 104 294 168" stroke="#F5A623" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.95" />
            <circle cx="256" cy="330" r="38" fill="#F5A623" />
            <path d="M218 382 Q256 414 294 382" stroke="#F5A623" strokeWidth="12" strokeLinecap="round" fill="none" />
          </svg>
          <span
            className="text-xl tracking-tight"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            <span className="font-bold text-[#1E3A4A]">Common</span><span className="font-normal text-[#3DAA8A]">Ground</span>
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Welcome Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-[var(--portal-primary)]/10 p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <h1
                className="text-3xl sm:text-4xl font-bold text-[#1E3A4A] mb-3"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                Welcome Back
              </h1>
              <p className="text-gray-600 text-base">
                Sign in to continue your co-parenting journey
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[var(--portal-primary)] focus:ring-2 focus:ring-[var(--portal-primary)]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-[var(--portal-primary)] hover:text-[#2D6A8F] font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[var(--portal-primary)] focus:ring-2 focus:ring-[var(--portal-primary)]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || oauthLoading}
                className="w-full py-4 px-6 rounded-xl bg-[var(--portal-primary)] hover:bg-[#2D6A8F] text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm text-gray-500 font-medium">
                  or continue with
                </span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="flex flex-col gap-3">
              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading || oauthLoading}
                className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span className="text-sm font-semibold text-gray-700">Continue with Google</span>
              </button>
            </div>

            {/* Register Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm text-gray-500 font-medium">
                  New to CommonGround?
                </span>
              </div>
            </div>

            {/* Register Link */}
            <Link
              href="/register"
              className="block w-full py-4 px-6 rounded-xl border-2 border-[var(--portal-primary)] text-[var(--portal-primary)] hover:bg-[var(--portal-primary)] hover:text-white font-semibold transition-all text-center"
            >
              Create an Account
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 mb-4 font-medium">Trusted by thousands of co-parents</p>
            <div className="flex items-center justify-center gap-6 text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[var(--portal-primary)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium">Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[#F5A623]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium">Court-Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[var(--portal-primary)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium">Child-Focused</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
          <Link href="/legal/privacy" className="hover:text-[var(--portal-primary)] transition-colors font-medium">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-[var(--portal-primary)] transition-colors font-medium">Terms</Link>
          <Link href="/help" className="hover:text-[var(--portal-primary)] transition-colors font-medium">Help</Link>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

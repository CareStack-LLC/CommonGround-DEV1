'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { APIError } from '@/lib/api';
import { signInWithGoogle, signInWithApple } from '@/lib/supabase';
import { Loader2, Mail, Lock, ArrowRight, Leaf } from 'lucide-react';

/* =============================================================================
   LOGIN PAGE
   Design: Organic Minimalist ("The Sanctuary of Truth")
   Palette: Sage Green (#4A6C58), Slate Blue (#475569), Warm Sand
   ============================================================================= */

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  const handleGoogleSignIn = async () => {
    setError('');
    setOauthLoading('google');
    try {
      await signInWithGoogle();
      // Redirect happens automatically via Supabase OAuth
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
      setOauthLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setOauthLoading('apple');
    try {
      await signInWithApple();
      // Redirect happens automatically via Supabase OAuth
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Apple');
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
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
    <div className="min-h-screen flex flex-col bg-cg-sand">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cg-sage-subtle/50 to-transparent rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-cg-slate-subtle/30 to-transparent rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-foreground hover:text-cg-sage transition-colors">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cg-sage to-cg-sage-dark flex items-center justify-center">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="font-serif text-xl font-semibold">CommonGround</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Welcome Card */}
          <div className="bg-card rounded-3xl shadow-lg border border-border/50 p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Welcome Back
              </h1>
              <p className="text-muted-foreground">
                Sign in to continue your co-parenting journey
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
                <p className="text-sm text-cg-error font-medium">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-cg-sage hover:text-cg-sage-dark transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || oauthLoading !== null}
                className="w-full py-3.5 px-6 rounded-xl bg-cg-sage hover:bg-cg-sage-dark text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
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

            {/* OAuth Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-4 text-sm text-muted-foreground">
                  or continue with
                </span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading || oauthLoading !== null}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border bg-background hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading === 'google' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
                <span className="text-sm font-medium text-foreground">Google</span>
              </button>

              {/* Apple Sign In */}
              <button
                type="button"
                onClick={handleAppleSignIn}
                disabled={isLoading || oauthLoading !== null}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border bg-background hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading === 'apple' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                )}
                <span className="text-sm font-medium text-foreground">Apple</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-4 text-sm text-muted-foreground">
                  New to CommonGround?
                </span>
              </div>
            </div>

            {/* Register Link */}
            <Link
              href="/register"
              className="block w-full py-3.5 px-6 rounded-xl border-2 border-cg-sage text-cg-sage hover:bg-cg-sage-subtle font-medium transition-all text-center"
            >
              Create an Account
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">Trusted by thousands of co-parents</p>
            <div className="flex items-center justify-center gap-6 text-muted-foreground/60">
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">Secure</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">Court-Ready</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">Child-Focused</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/legal/privacy" className="hover:text-cg-sage transition-colors">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-cg-sage transition-colors">Terms</Link>
          <Link href="/help" className="hover:text-cg-sage transition-colors">Help</Link>
        </div>
      </footer>
    </div>
  );
}

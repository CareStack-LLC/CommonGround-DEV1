'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Lock, ArrowLeft, Leaf, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authAPI } from '@/lib/api';

/* =============================================================================
   RESET PASSWORD PAGE
   Design: Organic Minimalist ("The Sanctuary of Truth")
   Palette: Sage Green (#4A6C58), Slate Blue (#475569), Warm Sand
   ============================================================================= */

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from URL parameters
    const tokenParam = searchParams.get('token') || searchParams.get('access_token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[a-zA-Z]/.test(pwd)) {
      return 'Password must contain at least one letter';
    }
    if (!/\d/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.resetPassword(token, password);
      setIsSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError('Failed to reset password. The link may have expired. Please request a new password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  // No token state
  if (!token && !isSuccess) {
    return (
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-cg-error-subtle flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8 text-cg-error" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-3">
          Invalid Reset Link
        </h1>
        <p className="text-muted-foreground mb-6">
          This password reset link is invalid or has expired.
          Please request a new password reset.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-cg-sage hover:bg-cg-sage-dark text-white font-medium transition-all shadow-sm hover:shadow-md"
        >
          Request New Reset
        </Link>
      </div>
    );
  }

  return (
    <>
      {isSuccess ? (
        /* Success State */
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-cg-success-subtle flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-cg-success" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Password Reset Complete
          </h1>
          <p className="text-muted-foreground mb-6">
            Your password has been successfully reset.
            You will be redirected to the login page shortly.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-cg-sage hover:bg-cg-sage-dark text-white font-medium transition-all shadow-sm hover:shadow-md"
          >
            Go to Sign In
          </Link>
        </div>
      ) : (
        /* Form State */
        <>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Create New Password
            </h1>
            <p className="text-muted-foreground">
              Enter a new password for your account.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
              <p className="text-sm text-cg-error font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={isLoading}
                  className="w-full pl-12 pr-12 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with letters and numbers
              </p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={isLoading}
                  className="w-full pl-12 pr-12 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full py-3.5 px-6 rounded-xl bg-cg-sage hover:bg-cg-sage-dark text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-cg-sage hover:text-cg-sage-dark transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
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
          {/* Card */}
          <div className="bg-card rounded-3xl shadow-lg border border-border/50 p-8 sm:p-10">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-cg-sage" />
              </div>
            }>
              <ResetPasswordForm />
            </Suspense>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Need help? <Link href="/help" className="text-cg-sage hover:text-cg-sage-dark transition-colors">Contact Support</Link>
            </p>
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

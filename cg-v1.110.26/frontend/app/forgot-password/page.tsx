'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft, Leaf, CheckCircle } from 'lucide-react';
import { authAPI } from '@/lib/api';

/* =============================================================================
   FORGOT PASSWORD PAGE
   Design: Organic Minimalist ("The Sanctuary of Truth")
   Palette: Sage Green (#3DAA8A), Slate Blue (#475569), Warm Sand
   ============================================================================= */

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authAPI.requestPasswordReset(email);
      setIsSuccess(true);
    } catch (err) {
      // Even if the email doesn't exist, show success for security
      // This prevents email enumeration attacks
      setIsSuccess(true);
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
          {/* Card */}
          <div className="bg-card rounded-3xl shadow-lg border border-border/50 p-8 sm:p-10">
            {isSuccess ? (
              /* Success State */
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-cg-success-subtle flex items-center justify-center mb-6">
                  <CheckCircle className="h-8 w-8 text-cg-success" />
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-3">
                  Check Your Email
                </h1>
                <p className="text-muted-foreground mb-6">
                  If an account exists for <span className="font-medium text-foreground">{email}</span>,
                  we've sent password reset instructions to your inbox.
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  Didn't receive an email? Check your spam folder or try again with a different email address.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-cg-sage hover:bg-cg-sage-dark text-white font-medium transition-all shadow-sm hover:shadow-md"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Back to Sign In
                </Link>
              </div>
            ) : (
              /* Form State */
              <>
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    Reset Your Password
                  </h1>
                  <p className="text-muted-foreground">
                    Enter your email address and we'll send you instructions to reset your password.
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
                  {/* Email Field */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-foreground">
                      Email Address
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

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full py-3.5 px-6 rounded-xl bg-cg-sage hover:bg-cg-sage-dark text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send Reset Instructions</span>
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

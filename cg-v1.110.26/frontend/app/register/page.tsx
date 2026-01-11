'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { APIError } from '@/lib/api';
import { Loader2, Mail, Lock, User, ArrowRight, Leaf, Users, CheckCircle } from 'lucide-react';

/* =============================================================================
   REGISTER PAGE
   Design: Organic Minimalist ("The Sanctuary of Truth")
   Palette: Sage Green (#4A6C58), Slate Blue (#475569), Warm Sand
   ============================================================================= */

interface InviteData {
  case_id: string;
  role: string;
  name: string;
  email: string;
  token: string;
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);

  // Parse invite parameter on mount
  useEffect(() => {
    const invite = searchParams.get('invite');
    if (invite) {
      try {
        const decoded = JSON.parse(atob(invite));
        setInviteData(decoded);

        // Pre-fill form with invite data
        const nameParts = decoded.name?.split(' ') || [];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        setFormData((prev) => ({
          ...prev,
          email: decoded.email || '',
          first_name: firstName,
          last_name: lastName,
        }));
      } catch (e) {
        console.error('Failed to parse invite data:', e);
      }
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
      });

      // If we have invite data, accept the invite to link user to case
      if (inviteData) {
        try {
          const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const token = localStorage.getItem('access_token');

          const response = await fetch(`${API_BASE}/cases/accept-invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              case_id: inviteData.case_id,
              role: inviteData.role,
              token: inviteData.token,
            }),
          });

          if (!response.ok) {
            console.error('Failed to accept invite:', await response.text());
          }
        } catch (inviteErr) {
          console.error('Error accepting invite:', inviteErr);
          // Don't block registration even if invite fails
        }
      }

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
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-cg-sage-subtle/50 to-transparent rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-cg-slate-subtle/30 to-transparent rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2" />
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
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Invitation Banner */}
          {inviteData && (
            <div className="mb-6 p-4 bg-cg-sage-subtle border border-cg-sage/20 rounded-2xl flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cg-sage/20 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-cg-sage" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">You've Been Invited</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Join as <span className="font-medium text-cg-sage">{inviteData.role}</span> in a co-parenting case
                </p>
              </div>
            </div>
          )}

          {/* Registration Card */}
          <div className="bg-card rounded-3xl shadow-lg border border-border/50 p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Create Your Account
              </h1>
              <p className="text-muted-foreground">
                {inviteData ? 'Complete your registration to get started' : 'Begin your co-parenting journey today'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
                <p className="text-sm text-cg-error font-medium">{error}</p>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="first_name" className="block text-sm font-medium text-foreground">
                    First Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="John"
                      required
                      disabled={isLoading}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="last_name" className="block text-sm font-medium text-foreground">
                    Last Name
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Doe"
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
              </div>

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
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    disabled={isLoading || !!inviteData?.email}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all disabled:opacity-50 disabled:bg-muted"
                  />
                </div>
                {inviteData?.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-cg-success" />
                    Pre-filled from your invitation
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
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
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Terms Agreement */}
              <p className="text-xs text-muted-foreground text-center">
                By creating an account, you agree to our{' '}
                <Link href="/legal/terms" className="text-cg-sage hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/legal/privacy" className="text-cg-sage hover:underline">
                  Privacy Policy
                </Link>
              </p>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-xl bg-cg-sage hover:bg-cg-sage-dark text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-4 text-sm text-muted-foreground">Already have an account?</span>
              </div>
            </div>

            {/* Login Link */}
            <Link
              href="/login"
              className="block w-full py-3.5 px-6 rounded-xl border-2 border-cg-sage text-cg-sage hover:bg-cg-sage-subtle font-medium transition-all text-center"
            >
              Sign In
            </Link>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-card/50 border border-border/50">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                <svg className="h-5 w-5 text-cg-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-xs font-medium text-foreground">AI-Powered Messaging</p>
            </div>

            <div className="p-4 rounded-2xl bg-card/50 border border-border/50">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                <svg className="h-5 w-5 text-cg-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-xs font-medium text-foreground">Smart Scheduling</p>
            </div>

            <div className="p-4 rounded-2xl bg-card/50 border border-border/50">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                <svg className="h-5 w-5 text-cg-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <p className="text-xs font-medium text-foreground">Court-Ready</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/legal/privacy" className="hover:text-cg-sage transition-colors">
            Privacy
          </Link>
          <Link href="/legal/terms" className="hover:text-cg-sage transition-colors">
            Terms
          </Link>
          <Link href="/help" className="hover:text-cg-sage transition-colors">
            Help
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-cg-sand">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-cg-sage mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}

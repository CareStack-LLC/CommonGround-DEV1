'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { APIError } from '@/lib/api';
import { signInWithGoogle } from '@/lib/supabase';
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

interface GrantData {
  code: string;
  partner: string;
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
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
  const [grantData, setGrantData] = useState<GrantData | null>(null);
  const [oauthLoading, setOauthLoading] = useState<boolean>(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setOauthLoading(true);
    try {
      await signInWithGoogle();
      // Redirect happens automatically via Supabase OAuth
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up with Google');
      setOauthLoading(false);
    }
  };

  // Parse invite and grant code parameters on mount
  useEffect(() => {
    // Parse invite parameter
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

    // Parse grant code parameter (from partner landing page)
    const grantCode = searchParams.get('grant_code');
    const partner = searchParams.get('partner');
    if (grantCode) {
      setGrantData({
        code: grantCode.toUpperCase(),
        partner: partner || ''
      });
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const plans = [
    {
      id: 'web_starter',
      name: 'Web Starter',
      price: { month: 0, year: 0 },
      features: ['Basic Messaging', 'Case Management', 'Standard Reports'],
      priceId: { month: 'price_1T7WgnB3EXvvERPfyu40gtfE', year: 'price_1T7WgnB3EXvvERPfyu40gtfE' }
    },
    {
      id: 'plus',
      name: 'Plus',
      price: { month: 17.99, year: 199.99 },
      features: ['Priority Support', 'Advanced Analytics', 'Unlimited Storage'],
      priceId: { month: 'price_1T7WgnB3EXvvERPfcpZeMSSH', year: 'price_1T7WgnB3EXvvERPfe7NNFlru' }
    },
    {
      id: 'complete',
      name: 'Complete',
      price: { month: 34.99, year: 349.99 },
      features: ['All Plus Features', 'Legal Assistance', 'Expert Consultation'],
      priceId: { month: 'price_1T7WgoB3EXvvERPfDm7qKpBN', year: 'price_1T7WgoB3EXvvERPfmDy9KtDh' }
    }
  ];

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation for Step 1
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedPlan) {
      setError('Please select a subscription plan');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const plan = plans.find(p => p.id === selectedPlan);
      const response = await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        subscription_price_id: billingInterval === 'month' ? plan?.priceId.month : plan?.priceId.year
      });

      // If a checkout URL is returned, redirect to Stripe
      if (response && response.checkout_url) {
        window.location.href = response.checkout_url;
        return; // Don't proceed to dashboard yet
      }

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
        }
      }

      // If we have grant code data, redeem the code
      if (grantData) {
        try {
          const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const token = localStorage.getItem('access_token');

          const response = await fetch(`${API_BASE}/api/v1/grants/redeem`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              code: grantData.code,
            }),
          });

          if (!response.ok) {
            console.error('Failed to redeem grant code');
          }
        } catch (grantErr) {
          console.error('Error redeeming grant code:', grantErr);
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
        <div className={`w-full ${step === 1 ? 'max-w-md' : 'max-w-4xl transition-all duration-500'}`}>
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

          {/* Step Indicator */}
          <div className="flex justify-center mb-8 gap-2">
            <div className={`h-1.5 w-12 rounded-full transition-all ${step >= 1 ? 'bg-cg-sage' : 'bg-border'}`} />
            <div className={`h-1.5 w-12 rounded-full transition-all ${step >= 2 ? 'bg-cg-sage' : 'bg-border'}`} />
          </div>

          {/* Registration Card */}
          <div className="bg-card rounded-3xl shadow-lg border border-border/50 p-8 sm:p-10">
            {step === 1 ? (
              <>
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
                <form onSubmit={handleNextStep} className="space-y-5">
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
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all"
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
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all"
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
                        placeholder="you@email.com"
                        required
                        disabled={!!inviteData?.email}
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
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all"
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
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all"
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
                    className="w-full py-3.5 px-6 rounded-xl bg-cg-sage hover:bg-cg-sage-dark text-white font-medium transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <span>Next: Select Subscription</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </form>

                {/* OAuth Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-4 text-sm text-muted-foreground">
                      or sign up with
                    </span>
                  </div>
                </div>

                {/* OAuth Buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={oauthLoading}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border bg-background hover:bg-muted transition-all disabled:opacity-50"
                  >
                    {oauthLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    )}
                    <span className="text-sm font-medium text-foreground">Sign up with Google</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Step 2: Subscription Selection */}
                <div className="text-center mb-8">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    Choose Your Plan
                  </h1>
                  <p className="text-muted-foreground">
                    Select the tools that best support your co-parenting needs
                  </p>
                </div>

                {/* Billing Toggle */}
                <div className="flex justify-center items-center gap-4 mb-10">
                  <span className={`text-sm font-medium ${billingInterval === 'month' ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
                  <button
                    onClick={() => setBillingInterval(prev => prev === 'month' ? 'year' : 'month')}
                    className="relative w-12 h-6 rounded-full bg-cg-sage/20 transition-colors focus:outline-none"
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-cg-sage transition-transform ${billingInterval === 'year' ? 'translate-x-6' : ''}`} />
                  </button>
                  <span className={`text-sm font-medium ${billingInterval === 'year' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Yearly <span className="text-cg-sage text-[10px] bg-cg-sage-subtle px-1.5 py-0.5 rounded-full ml-1">Save 15%</span>
                  </span>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
                    <p className="text-sm text-cg-error font-medium">{error}</p>
                  </div>
                )}

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative cursor-pointer group rounded-3xl border-2 p-6 transition-all duration-300 hover:shadow-xl ${selectedPlan === plan.id
                        ? 'border-cg-sage bg-cg-sage-subtle ring-1 ring-cg-sage'
                        : 'border-border bg-background hover:border-cg-sage/50'
                        }`}
                    >
                      {selectedPlan === plan.id && (
                        <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-cg-sage flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}

                      <h3 className="font-serif text-xl font-bold mb-2 group-hover:text-cg-sage transition-colors">{plan.name}</h3>
                      <div className="mb-4">
                        <span className="text-3xl font-bold">${billingInterval === 'month' ? plan.price.month : plan.price.year}</span>
                        <span className="text-muted-foreground text-sm ml-1">/{billingInterval === 'month' ? 'mo' : 'yr'}</span>
                      </div>

                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-cg-sage flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 px-6 rounded-xl border border-border text-muted-foreground hover:bg-muted font-medium transition-all text-center"
                  >
                    Back to Personal Info
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || !selectedPlan}
                    className="flex-[2] py-3.5 px-6 rounded-xl bg-cg-sage hover:bg-cg-sage-dark text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Registration</span>
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Divider */}
            {step === 1 && (
              <>
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-4 text-sm text-muted-foreground">Already have an account?</span>
                  </div>
                </div>

                <Link
                  href="/login"
                  className="block w-full py-3.5 px-6 rounded-xl border-2 border-cg-sage text-cg-sage hover:bg-cg-sage-subtle font-medium transition-all text-center"
                >
                  Sign In
                </Link>
              </>
            )}
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

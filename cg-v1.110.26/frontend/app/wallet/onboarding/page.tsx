'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { walletAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Wallet
} from 'lucide-react';

function OnboardingCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'incomplete' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      const wallet = await walletAPI.getMyWallet();

      if (wallet.onboarding_completed && wallet.charges_enabled && wallet.payouts_enabled) {
        setStatus('success');
      } else {
        setStatus('incomplete');
      }
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to verify onboarding status');
    }
  };

  const handleContinueOnboarding = async () => {
    try {
      setStatus('loading');
      const wallet = await walletAPI.getMyWallet();
      const { onboarding_url } = await walletAPI.startOnboarding(wallet.id);
      window.location.href = onboarding_url;
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to resume onboarding');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-cg-sage animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Verifying Setup...
          </h2>
          <p className="text-muted-foreground">
            Please wait while we confirm your wallet setup.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-cg-success-subtle flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-cg-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Wallet Setup Complete!
          </h2>
          <p className="text-muted-foreground mb-8">
            Your wallet is now connected and ready to use. You can add funds,
            pay ClearFund obligations, and receive payouts.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/wallet')}
              className="cg-btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              <Wallet className="h-5 w-5" />
              Go to My Wallet
            </button>
            <button
              onClick={() => router.push('/payments')}
              className="cg-btn-secondary w-full"
            >
              View ClearFund
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'incomplete') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-cg-warning-subtle flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-cg-warning" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Setup Incomplete
          </h2>
          <p className="text-muted-foreground mb-8">
            Your wallet setup wasn't completed. Please finish connecting your
            bank account to use ClearFund payments.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleContinueOnboarding}
              className="cg-btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              Continue Setup
            </button>
            <button
              onClick={() => router.push('/wallet')}
              className="cg-btn-secondary w-full"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-cg-error-subtle flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-cg-error" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Something Went Wrong
        </h2>
        <p className="text-muted-foreground mb-4">
          {error || 'We couldn\'t verify your wallet setup. Please try again.'}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={checkOnboardingStatus}
            className="cg-btn-primary w-full inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Try Again
          </button>
          <button
            onClick={() => router.push('/wallet')}
            className="cg-btn-secondary w-full"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingCallbackPage() {
  return (
    <ProtectedRoute>
      <OnboardingCallbackContent />
    </ProtectedRoute>
  );
}

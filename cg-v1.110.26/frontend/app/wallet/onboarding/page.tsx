'use client';

/**
 * Wave 4-Alt — Connect onboarding has been retired.
 *
 * Parents no longer onboard to Stripe Connect. Shared expenses are funded
 * via Stripe Checkout (normal debit/credit card) and a virtual card is
 * issued when an obligation reaches full funding. This page is kept in
 * the route table so any bookmarked onboarding-callback URLs still land
 * somewhere friendly instead of a 404.
 */

import { useRouter } from 'next/navigation';
import { ArrowRight, CreditCard, Sparkles } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';

function OnboardingInner() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-cg-sage-subtle items-center justify-center mx-auto">
          <Sparkles className="h-7 w-7 text-cg-sage-dark" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Good news — no onboarding needed</h1>
          <p className="text-sm text-muted-foreground">
            CommonGround no longer uses Stripe Connect. You don&apos;t need to
            connect a bank account, upload an ID, or finish any setup to
            split expenses. When it&apos;s time to fund an obligation, just pay
            with your usual debit or credit card — we handle the rest with a
            virtual card so your co-parent can spend the pooled amount
            safely.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-left text-sm text-muted-foreground flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-cg-sage-dark flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">How funding works now</p>
            <p className="mt-1">
              Parent A requests $100 for school clothes → both parents fund
              their share with a card → CommonGround issues a virtual card
              scoped to school-supply merchants → Parent A spends → receipts
              are captured automatically.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Back to dashboard
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function OnboardingCallbackPage() {
  return (
    <ProtectedRoute>
      <OnboardingInner />
    </ProtectedRoute>
  );
}

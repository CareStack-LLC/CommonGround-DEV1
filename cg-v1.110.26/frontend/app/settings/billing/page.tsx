'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { subscriptionAPI, grantsAPI, SubscriptionStatus, GrantStatusResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Gift,
  CheckCircle,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Loader2,
  Crown,
  Check,
  X,
} from 'lucide-react';

/**
 * Billing Settings Page
 *
 * Design: Show current plan, upgrade options, grant code redemption.
 * Philosophy: "Managing your subscription should be simple and transparent."
 */

const PLAN_DETAILS: Record<string, {
  name: string;
  price: string;
  period: string;
  badge?: string;
  features: string[];
}> = {
  web_starter: {
    name: 'Web Starter',
    price: '$0',
    period: 'forever',
    features: [
      'Web-only access',
      'Basic messaging with ARIA flagging',
      'ClearFund expense tracking (no fees)',
      'Calendar view',
      'Basic schedule tracking',
    ],
  },
  // Legacy support for old 'starter' tier name
  starter: {
    name: 'Web Starter',
    price: '$0',
    period: 'forever',
    features: [
      'Web-only access',
      'Basic messaging with ARIA flagging',
      'ClearFund expense tracking (no fees)',
      'Calendar view',
      'Basic schedule tracking',
    ],
  },
  plus: {
    name: 'Plus',
    price: '$17.99',
    period: '/month',
    badge: 'Most Popular',
    features: [
      'Mobile app access',
      'Automated scheduling & recurring exchanges',
      'Custody tracking dashboard',
      'QuickAccords (unlimited)',
      'My Circle: +1 trusted contact',
      'No ClearFund payout fees',
      'Monthly PDF reports',
    ],
  },
  complete: {
    name: 'Complete',
    price: '$34.99',
    period: '/month',
    badge: 'High-Conflict Ready',
    features: [
      'All Plus features',
      'SharedCare Agreements (formal custody plans)',
      'Silent Handoff with GPS verification',
      'Mandatory event check-ins (school, medical, court)',
      'KidsCom access (child video calls)',
      'Watch Together theater mode',
      'My Circle: +5 trusted contacts',
      'Court-ready export bundles',
      'Advanced custody analytics',
    ],
  },
  // Legacy support for old 'family_plus' tier name
  family_plus: {
    name: 'Complete',
    price: '$34.99',
    period: '/month',
    badge: 'High-Conflict Ready',
    features: [
      'All Plus features',
      'SharedCare Agreements (formal custody plans)',
      'Silent Handoff with GPS verification',
      'Mandatory event check-ins (school, medical, court)',
      'KidsCom access (child video calls)',
      'Watch Together theater mode',
      'My Circle: +5 trusted contacts',
      'Court-ready export bundles',
      'Advanced custody analytics',
    ],
  },
};

export default function BillingSettingsPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [grantStatus, setGrantStatus] = useState<GrantStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Grant code redemption
  const [grantCode, setGrantCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [grantValidation, setGrantValidation] = useState<{
    isValid: boolean;
    message: string;
    nonprofitName?: string;
  } | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  // Checkout state
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // API availability state
  const [apiAvailable, setApiAvailable] = useState(true);

  // Handle checkout success/cancelled URL params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccessMessage('Your subscription has been activated! Welcome to your new plan.');
      // Sync subscription from Stripe directly (don't wait for webhook)
      const syncFromStripe = async () => {
        try {
          // First sync from Stripe to update the profile
          const syncedData = await subscriptionAPI.syncSubscription();
          setSubscription(syncedData);

          // Also refresh grant status
          const grantData = await grantsAPI.getStatus();
          setGrantStatus(grantData);

          if (syncedData.tier && syncedData.tier !== 'starter') {
            console.log(`Subscription synced to ${syncedData.tier}`);
          }
        } catch (err) {
          console.error('Failed to sync subscription:', err);
          // Fallback to regular fetch
          try {
            const [subData, grantData] = await Promise.all([
              subscriptionAPI.getCurrentSubscription(),
              grantsAPI.getStatus(),
            ]);
            setSubscription(subData);
            setGrantStatus(grantData);
          } catch (fallbackErr) {
            console.error('Fallback fetch also failed:', fallbackErr);
          }
        }
      };
      syncFromStripe();
    } else if (searchParams.get('cancelled') === 'true') {
      setError('Checkout was cancelled. No changes were made to your subscription.');
    }
  }, [searchParams]);

  // Load subscription status
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [subData, grantData] = await Promise.all([
          subscriptionAPI.getCurrentSubscription(),
          grantsAPI.getStatus(),
        ]);
        console.log('Subscription data from API:', subData);
        console.log('Current tier:', subData?.tier);
        setSubscription(subData);
        setGrantStatus(grantData);
        setApiAvailable(true);
      } catch (err: unknown) {
        console.error('Failed to load subscription data:', err);
        // Check if it's a 404 (API not deployed yet) vs other error
        const is404 = err instanceof Error && (
          err.message.includes('404') ||
          err.message.includes('Not Found') ||
          err.message.includes('Failed to fetch')
        );
        if (is404) {
          // API not available yet - show fallback UI
          setApiAvailable(false);
        } else {
          setError('Failed to load subscription information. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Validate grant code as user types (debounced)
  useEffect(() => {
    if (!grantCode || grantCode.length < 4) {
      setGrantValidation(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsValidating(true);
        const result = await grantsAPI.validateCode(grantCode);
        setGrantValidation({
          isValid: result.is_valid,
          message: result.is_valid
            ? `Valid code from ${result.nonprofit_name}`
            : result.reason || 'Invalid code',
          nonprofitName: result.nonprofit_name,
        });
      } catch (err) {
        setGrantValidation({
          isValid: false,
          message: 'Unable to validate code',
        });
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [grantCode]);

  const handleRedeemGrant = async () => {
    if (!grantValidation?.isValid) return;

    try {
      setIsRedeeming(true);
      const result = await grantsAPI.redeemCode(grantCode);
      setRedeemSuccess(result.message);
      setGrantCode('');
      setGrantValidation(null);

      // Refresh subscription data
      const [subData, grantData] = await Promise.all([
        subscriptionAPI.getCurrentSubscription(),
        grantsAPI.getStatus(),
      ]);
      setSubscription(subData);
      setGrantStatus(grantData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to redeem grant code';
      setError(errorMessage);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleUpgrade = async (planCode: string) => {
    // Prevent upgrading to current plan
    if (planCode === currentTier) {
      setError(`You are already on the ${PLAN_DETAILS[planCode]?.name || planCode} plan`);
      return;
    }

    try {
      setIsProcessing(planCode);
      setError(null);

      // Call checkout endpoint - it handles both new subscriptions AND upgrades
      const result = await subscriptionAPI.createCheckout(
        planCode,
        `${window.location.origin}/settings/billing?success=true`,
        `${window.location.origin}/settings/billing?cancelled=true`
      );

      // Check response action type
      if (result.action === 'upgraded') {
        // Subscription was upgraded directly - refresh and show success
        const updatedSubscription = await subscriptionAPI.getCurrentSubscription();
        setSubscription(updatedSubscription);
        setIsProcessing(null);
        alert(result.message || 'Successfully upgraded your plan!');
      } else if (result.action === 'checkout' && result.checkout_url) {
        // New subscription - redirect to Stripe Checkout
        window.location.href = result.checkout_url;
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process upgrade';
      setError(errorMessage);
      setIsProcessing(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsProcessing('portal');
      const result = await subscriptionAPI.createPortalSession(
        `${window.location.origin}/settings/billing`
      );
      window.location.href = result.portal_url;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open billing portal';
      setError(errorMessage);
      setIsProcessing(null);
    }
  };

  const handleDowngradeToStarter = async () => {
    if (!confirm('Are you sure you want to downgrade to the Starter plan? Your current subscription will be cancelled at the end of the billing period.')) {
      return;
    }

    try {
      setIsProcessing('starter');
      setError(null);
      await subscriptionAPI.cancelSubscription();
      // Refresh subscription data
      const updatedSubscription = await subscriptionAPI.getCurrentSubscription();
      setSubscription(updatedSubscription);
      setIsProcessing(null);
      alert('Your subscription will be cancelled at the end of the billing period. You will be downgraded to the Starter plan.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to downgrade';
      setError(errorMessage);
      setIsProcessing(null);
    }
  };

  const currentTier = subscription?.tier || profile?.subscription_tier || 'starter';
  const currentPlan = PLAN_DETAILS[currentTier] || PLAN_DETAILS.starter;
  const isGrantUser = subscription?.has_active_grant || grantStatus?.has_active_grant;
  const isPaidUser = !!subscription?.stripe_subscription_id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-600 font-medium">Loading billing information...</p>
        </div>
      </div>
    );
  }

  // Fallback UI when subscription API is not yet deployed
  if (!apiAvailable) {
    const fallbackTier = profile?.subscription_tier || 'starter';
    const fallbackPlan = PLAN_DETAILS[fallbackTier] || PLAN_DETAILS.starter;

    return (
      <div className="space-y-6">
        {/* Page Header - matches app design system */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-2xl flex items-center justify-center shadow-md">
            <CreditCard className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              Billing & Subscription
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Manage your subscription and payment information
            </p>
          </div>
        </div>

        {/* Current Plan */}
        <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              <div className="p-2 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl shadow-md">
                <Crown className="h-5 w-5 text-amber-600" />
              </div>
              Current Plan
            </CardTitle>
            <CardDescription className="font-medium">Your current subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold text-foreground">{fallbackPlan.name}</span>
              {fallbackPlan.badge && (
                <span className="bg-cg-sage text-white text-xs px-2 py-0.5 rounded-full">
                  {fallbackPlan.badge}
                </span>
              )}
            </div>
            <div className="text-muted-foreground mb-4">
              <span className="text-lg font-semibold text-foreground">{fallbackPlan.price}</span>
              <span>{fallbackPlan.period}</span>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-2">Included in your plan:</p>
              <ul className="grid gap-1 text-sm text-muted-foreground">
                {fallbackPlan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-cg-sage flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon Notice */}
        <Alert className="bg-purple-50 border-purple-200 rounded-2xl shadow-lg">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-600 font-medium">
            <strong>Subscription management coming soon!</strong>
            <br />
            Upgrade options and billing management will be available shortly. For now, enjoy your current plan features.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header - matches app design system */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-2xl flex items-center justify-center shadow-md">
          <CreditCard className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            Billing & Subscription
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Manage your subscription and payment information
          </p>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMessage && (
        <Alert className="bg-emerald-50 border-emerald-200 rounded-2xl shadow-lg">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-600 font-medium">{successMessage}</AlertDescription>
        </Alert>
      )}

      {redeemSuccess && (
        <Alert className="bg-emerald-50 border-emerald-200 rounded-2xl shadow-lg">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-600 font-medium">{redeemSuccess}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="rounded-2xl shadow-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            <div className="p-2 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl shadow-md">
              <Crown className="h-5 w-5 text-amber-600" />
            </div>
            Current Plan
          </CardTitle>
          <CardDescription className="font-medium">
            {isGrantUser
              ? `You have access through a nonprofit grant`
              : isPaidUser
              ? 'Your active subscription'
              : 'You are on the free tier'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">{currentPlan.name}</span>
                {currentPlan.badge && (
                  <span className="bg-cg-sage text-white text-xs px-2 py-0.5 rounded-full">
                    {currentPlan.badge}
                  </span>
                )}
              </div>
              <div className="text-muted-foreground">
                <span className="text-lg font-semibold text-foreground">{currentPlan.price}</span>
                <span>{currentPlan.period}</span>
              </div>
              {isGrantUser && (subscription?.grant_nonprofit_name || grantStatus?.nonprofit_name) && (
                <p className="text-sm text-cg-sage mt-1">
                  Provided by {subscription?.grant_nonprofit_name || grantStatus?.nonprofit_name}
                  {(subscription?.grant_expires_at || grantStatus?.expires_at) && (
                    <span className="text-muted-foreground">
                      {' '}
                      (expires {new Date(subscription?.grant_expires_at || grantStatus?.expires_at || '').toLocaleDateString()})
                    </span>
                  )}
                </p>
              )}
              {isPaidUser && subscription?.period_end && (
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription.status === 'canceling' || subscription.status === 'cancelled'
                    ? 'Access until '
                    : 'Renews '}
                  {new Date(subscription.period_end).toLocaleDateString()}
                </p>
              )}
            </div>

            {isPaidUser && (
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={isProcessing === 'portal'}
              >
                {isProcessing === 'portal' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Manage Subscription
              </Button>
            )}
          </div>

          {/* Current plan features */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-2">Included in your plan:</p>
            <ul className="grid gap-1 text-sm text-muted-foreground">
              {currentPlan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cg-sage flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Plan Options */}
      {!isGrantUser && (
        <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              <div className="p-2 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl shadow-md">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              Choose Your Plan
            </CardTitle>
            <CardDescription className="font-medium">
              Select the plan that best fits your co-parenting needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Web Starter Plan */}
              <div className={`rounded-lg border p-4 relative ${(currentTier === 'web_starter' || currentTier === 'starter') ? 'border-cg-sage ring-2 ring-cg-sage/20' : 'border-border'}`}>
                {(currentTier === 'web_starter' || currentTier === 'starter') && (
                  <div className="absolute -top-3 left-4">
                    <span className="bg-cg-sage text-white text-xs px-2 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}
                <h3 className="font-semibold text-foreground mt-2">Web Starter</h3>
                <p className="text-2xl font-bold text-foreground">
                  Free
                </p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-cg-sage" />
                    Web-only access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-cg-sage" />
                    Basic messaging
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-cg-sage" />
                    Calendar view
                  </li>
                </ul>
                {(currentTier === 'web_starter' || currentTier === 'starter') ? (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    disabled
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={handleDowngradeToStarter}
                    disabled={isProcessing === 'web_starter'}
                  >
                    {isProcessing === 'web_starter' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Downgrade to Free
                  </Button>
                )}
              </div>

              {/* Plus Plan */}
              <div className={`rounded-lg border p-4 relative ${currentTier === 'plus' ? 'border-cg-sage ring-2 ring-cg-sage/20' : 'border-border'}`}>
                {currentTier === 'plus' ? (
                  <div className="absolute -top-3 left-4">
                    <span className="bg-cg-sage text-white text-xs px-2 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                ) : (
                  <div className="absolute -top-3 left-4">
                    <span className="bg-cg-amber text-white text-xs px-2 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="font-semibold text-foreground mt-2">Plus</h3>
                <p className="text-2xl font-bold text-foreground">
                  $17.99<span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-cg-sage" />
                    Mobile app access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-cg-sage" />
                    Custody tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-cg-sage" />
                    No ClearFund fees
                  </li>
                </ul>
                {currentTier === 'plus' ? (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    disabled
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant={(currentTier === 'complete' || currentTier === 'family_plus') ? 'outline' : 'default'}
                    className="w-full mt-4"
                    onClick={() => handleUpgrade('plus')}
                    disabled={isProcessing === 'plus'}
                  >
                    {isProcessing === 'plus' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {(currentTier === 'complete' || currentTier === 'family_plus') ? 'Downgrade to Plus' : 'Upgrade to Plus'}
                  </Button>
                )}
              </div>

              {/* Complete Plan */}
              <div className={`rounded-lg border p-4 relative ${(currentTier === 'complete' || currentTier === 'family_plus') ? 'border-cg-sage ring-2 ring-cg-sage/20' : 'border-border'}`}>
                {(currentTier === 'complete' || currentTier === 'family_plus') && (
                  <div className="absolute -top-3 left-4">
                    <span className="bg-cg-sage text-white text-xs px-2 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}
                <h3 className={`font-semibold text-foreground ${(currentTier === 'complete' || currentTier === 'family_plus') ? 'mt-2' : ''}`}>Complete</h3>
                <p className="text-2xl font-bold text-foreground">
                  $34.99<span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-cg-sage" />
                    Silent Handoff GPS
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-cg-sage" />
                    KidsCom video calls
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-cg-sage" />
                    Court-ready exports
                  </li>
                </ul>
                {(currentTier === 'complete' || currentTier === 'family_plus') ? (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    disabled
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="w-full mt-4"
                    onClick={() => handleUpgrade('complete')}
                    disabled={isProcessing === 'complete'}
                  >
                    {isProcessing === 'complete' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Upgrade to Complete
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grant Code Redemption */}
      {!isPaidUser && (
        <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              <div className="p-2 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl shadow-md">
                <Gift className="h-5 w-5 text-emerald-600" />
              </div>
              Have a Grant Code?
            </CardTitle>
            <CardDescription className="font-medium">
              DV nonprofits and partner organizations provide grant codes for free access to premium
              features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grant-code">Grant Code</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="grant-code"
                    value={grantCode}
                    onChange={(e) => setGrantCode(e.target.value.toUpperCase())}
                    placeholder="Enter your grant code"
                    className="uppercase"
                    disabled={isGrantUser}
                  />
                  {isValidating && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <Button
                  onClick={handleRedeemGrant}
                  disabled={!grantValidation?.isValid || isRedeeming || isGrantUser}
                >
                  {isRedeeming ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Redeem
                </Button>
              </div>
              {grantValidation && (
                <p
                  className={`text-sm flex items-center gap-1 ${
                    grantValidation.isValid ? 'text-cg-success' : 'text-destructive'
                  }`}
                >
                  {grantValidation.isValid ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {grantValidation.message}
                </p>
              )}
              {isGrantUser && (
                <p className="text-sm text-muted-foreground">
                  You already have an active grant. Only one grant can be active at a time.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Information */}
      {isPaidUser && (
        <Card className="border-2 border-slate-200 rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-bold" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              <div className="p-2 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl shadow-md">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              Payment Method
            </CardTitle>
            <CardDescription className="font-medium">
              Manage your payment method and billing details through the secure Stripe portal.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={handleManageSubscription}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Billing Portal
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

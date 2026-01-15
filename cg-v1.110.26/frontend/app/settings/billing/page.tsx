'use client';

import { useState, useEffect } from 'react';
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
  starter: {
    name: 'Starter',
    price: '$0',
    period: 'forever',
    features: [
      'Basic ARIA messaging',
      'ClearFund expense tracking ($1.50/payout)',
      'TimeBridge calendar view',
      'Silent Handoff GPS logging',
    ],
  },
  plus: {
    name: 'Plus',
    price: '$12',
    period: '/month',
    badge: 'Most Popular',
    features: [
      'QuickAccords with auto-scheduling',
      'Custody tracking dashboard',
      'Monthly PDF summaries',
      'My Circle: +1 trusted contact',
      'No ClearFund payout fees',
    ],
  },
  family_plus: {
    name: 'Family+',
    price: '$25',
    period: '/month',
    features: [
      'KidsCom access (child portal)',
      'Watch Together theater mode',
      'My Circle: +3-5 contacts',
      'Advanced ARIA features',
      'Court-ready reporting bundles',
    ],
  },
};

export default function BillingSettingsPage() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [grantStatus, setGrantStatus] = useState<GrantStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Load subscription status
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [subData, grantData] = await Promise.all([
          subscriptionAPI.getCurrentSubscription(),
          grantsAPI.getStatus(),
        ]);
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
    try {
      setIsProcessing(planCode);
      const result = await subscriptionAPI.createCheckout(
        planCode,
        `${window.location.origin}/settings/billing?success=true`,
        `${window.location.origin}/settings/billing?cancelled=true`
      );
      window.location.href = result.checkout_url;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start checkout';
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

  const currentTier = subscription?.subscription_tier || profile?.subscription_tier || 'starter';
  const currentPlan = PLAN_DETAILS[currentTier] || PLAN_DETAILS.starter;
  const isGrantUser = subscription?.has_active_grant || grantStatus?.has_active_grant;
  const isPaidUser = subscription?.stripe_subscription_id !== null && subscription?.stripe_subscription_id !== undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Fallback UI when subscription API is not yet deployed
  if (!apiAvailable) {
    const fallbackTier = profile?.subscription_tier || 'starter';
    const fallbackPlan = PLAN_DETAILS[fallbackTier] || PLAN_DETAILS.starter;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Billing & Subscription</h2>
          <p className="text-muted-foreground">
            Manage your subscription and payment information
          </p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-5 w-5 text-cg-amber" />
              Current Plan
            </CardTitle>
            <CardDescription>Your current subscription tier</CardDescription>
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
        <Alert className="bg-cg-sage-subtle border-cg-sage/20">
          <Sparkles className="h-4 w-4 text-cg-sage" />
          <AlertDescription className="text-cg-sage">
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
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Billing & Subscription</h2>
        <p className="text-muted-foreground">
          Manage your subscription and payment information
        </p>
      </div>

      {/* Success/Error Alerts */}
      {redeemSuccess && (
        <Alert className="bg-cg-success-subtle border-cg-success/20">
          <CheckCircle className="h-4 w-4 text-cg-success" />
          <AlertDescription className="text-cg-success">{redeemSuccess}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-5 w-5 text-cg-amber" />
            Current Plan
          </CardTitle>
          <CardDescription>
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
              {isGrantUser && grantStatus?.nonprofit_name && (
                <p className="text-sm text-cg-sage mt-1">
                  Provided by {grantStatus.nonprofit_name}
                  {grantStatus.expires_at && (
                    <span className="text-muted-foreground">
                      {' '}
                      (expires {new Date(grantStatus.expires_at).toLocaleDateString()})
                    </span>
                  )}
                </p>
              )}
              {isPaidUser && subscription?.subscription_period_end && (
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription.subscription_status === 'canceling'
                    ? 'Access until '
                    : 'Renews '}
                  {new Date(subscription.subscription_period_end).toLocaleDateString()}
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

      {/* Upgrade Options */}
      {currentTier !== 'family_plus' && !isGrantUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-cg-amber" />
              Upgrade Your Plan
            </CardTitle>
            <CardDescription>
              Get more features by upgrading to a higher tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Plus Plan - show if user can upgrade to Plus */}
              {currentTier !== 'plus' && currentTier !== 'family_plus' && (
                <div className="rounded-lg border border-cg-sage p-4 relative">
                  <div className="absolute -top-3 left-4">
                    <span className="bg-cg-sage text-white text-xs px-2 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mt-2">Plus</h3>
                  <p className="text-2xl font-bold text-foreground">
                    $12<span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-cg-sage" />
                      QuickAccords auto-scheduling
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-cg-sage" />
                      Custody dashboard
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-cg-sage" />
                      No ClearFund fees
                    </li>
                  </ul>
                  <Button
                    className="w-full mt-4"
                    onClick={() => handleUpgrade('plus')}
                    disabled={isProcessing === 'plus'}
                  >
                    {isProcessing === 'plus' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Upgrade to Plus
                  </Button>
                </div>
              )}

              {/* Family+ Plan - show if user can upgrade to Family+ */}
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-semibold text-foreground">Family+</h3>
                <p className="text-2xl font-bold text-foreground">
                  $25<span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-cg-sage" />
                    KidsCom child portal
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-cg-sage" />
                    Watch Together theater
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-cg-sage" />
                    Court-ready reports
                  </li>
                </ul>
                <Button
                  variant={currentTier !== 'plus' && currentTier !== 'family_plus' ? 'outline' : 'default'}
                  className="w-full mt-4"
                  onClick={() => handleUpgrade('family_plus')}
                  disabled={isProcessing === 'family_plus'}
                >
                  {isProcessing === 'family_plus' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {currentTier === 'plus' ? 'Upgrade to Family+' : 'Choose Family+'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grant Code Redemption */}
      {!isPaidUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-5 w-5 text-cg-sage" />
              Have a Grant Code?
            </CardTitle>
            <CardDescription>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Payment Method
            </CardTitle>
            <CardDescription>
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

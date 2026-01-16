'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { subscriptionAPI } from '@/lib/api';
import {
  Check,
  X,
  ArrowRight,
  Shield,
  Users,
  HelpCircle,
  Loader2,
} from 'lucide-react';

/**
 * Pricing Page
 *
 * Main pricing page for parents with three tiers.
 * - If user is logged in: Subscribe directly via Stripe Checkout
 * - If user is not logged in: Redirect to registration with plan param
 */

const plans = [
  {
    name: 'Starter',
    planCode: 'starter',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to get started with safe, documented co-parenting.',
    cta: 'Get Started Free',
    ctaLoggedIn: 'Current Plan',
    highlighted: false,
    features: [
      { name: 'Basic ARIA messaging', included: true, tooltip: 'Manual sentiment checks' },
      { name: 'ClearFund expense tracking', included: true, tooltip: '$1.50 per payout' },
      { name: 'TimeBridge calendar view', included: true },
      { name: 'Silent Handoff GPS logging', included: true },
      { name: 'Unlimited children', included: true },
      { name: 'Email support', included: true },
      { name: 'QuickAccords', included: false },
      { name: 'Custody tracking dashboard', included: false },
      { name: 'KidsCom video calls', included: false },
      { name: 'My Circle contacts', included: false },
    ],
  },
  {
    name: 'Plus',
    planCode: 'plus',
    price: '$12',
    period: '/month',
    description: 'Smart automation and tracking for organized co-parenting. No more manual work.',
    cta: 'Start 14-Day Free Trial',
    ctaLoggedIn: 'Subscribe to Plus',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      { name: 'Everything in Starter', included: true },
      { name: 'QuickAccords with auto-scheduling', included: true, tooltip: 'AI-assisted agreement creation' },
      { name: 'Auto-generated events from agreements', included: true },
      { name: 'Custody tracking dashboard', included: true, tooltip: 'Who has the kids?' },
      { name: 'Monthly PDF summaries', included: true },
      { name: 'My Circle: +1 trusted contact', included: true },
      { name: 'No ClearFund payout fees', included: true },
      { name: 'Priority email support', included: true },
      { name: 'KidsCom video calls', included: false },
      { name: 'Court-ready reporting', included: false },
    ],
  },
  {
    name: 'Family+',
    planCode: 'family_plus',
    price: '$25',
    period: '/month',
    description: 'Complete platform access with KidsCom for safe child communication.',
    cta: 'Start 14-Day Free Trial',
    ctaLoggedIn: 'Subscribe to Family+',
    highlighted: false,
    features: [
      { name: 'Everything in Plus', included: true },
      { name: 'KidsCom access', included: true, tooltip: 'Child login, video calls' },
      { name: 'Watch Together theater mode', included: true },
      { name: 'My Circle: +3-5 contacts', included: true },
      { name: 'Advanced ARIA features', included: true },
      { name: 'Court-ready reporting bundles', included: true },
      { name: 'Compliance analytics', included: true },
      { name: 'Priority phone support', included: true },
      { name: 'Calendar sync (Google/Outlook)', included: true },
      { name: 'SMS notifications', included: true },
    ],
  },
];

const faqs = [
  {
    question: 'Do both parents need to pay?',
    answer: 'Each parent manages their own subscription independently. Both parents can use the free tier, or each can upgrade to access premium features. You don\'t need matching plans to communicate.',
  },
  {
    question: 'Can I switch plans anytime?',
    answer: 'Yes! You can upgrade, downgrade, or cancel at any time. If you upgrade, you\'ll get immediate access to new features. If you downgrade, your current plan remains active until the end of your billing period.',
  },
  {
    question: 'Is there a contract or commitment?',
    answer: 'No contracts. All paid plans are month-to-month and you can cancel anytime. We also offer annual plans with 2 months free if you prefer to pay yearly.',
  },
  {
    question: 'What happens to my data if I cancel?',
    answer: 'Your data remains accessible in read-only mode for 90 days after cancellation. You can export everything before that period ends. After 90 days, data is securely deleted per our privacy policy.',
  },
  {
    question: 'Do you offer discounts for financial hardship?',
    answer: 'Yes. We believe every family deserves access to better co-parenting tools. Contact us to discuss hardship pricing options.',
  },
  {
    question: 'Is there a family law professional discount?',
    answer: 'Absolutely! Attorneys, GALs, mediators, and other family law professionals can access special bulk pricing. Visit our Professionals page to learn more.',
  },
];

const comparisonFeatures = [
  {
    category: 'Communication',
    features: [
      { name: 'ARIA messaging', starter: 'Manual checks', plus: 'Auto-analysis', familyPlus: 'Advanced AI' },
      { name: 'Message history', starter: '90 days', plus: 'Unlimited', familyPlus: 'Unlimited' },
      { name: 'SMS notifications', starter: false, plus: false, familyPlus: true },
    ]
  },
  {
    category: 'Scheduling',
    features: [
      { name: 'TimeBridge calendar', starter: true, plus: true, familyPlus: true },
      { name: 'Silent Handoff GPS', starter: true, plus: true, familyPlus: true },
      { name: 'QuickAccords auto-scheduling', starter: false, plus: true, familyPlus: true },
      { name: 'Calendar sync (Google/Outlook)', starter: false, plus: false, familyPlus: true },
    ]
  },
  {
    category: 'Finances (ClearFund)',
    features: [
      { name: 'Expense tracking', starter: true, plus: true, familyPlus: true },
      { name: 'Payout requests', starter: '$1.50/payout', plus: 'No fees', familyPlus: 'No fees' },
      { name: 'Receipt uploads', starter: true, plus: true, familyPlus: true },
    ]
  },
  {
    category: 'Family Features',
    features: [
      { name: 'Custody dashboard', starter: false, plus: true, familyPlus: true },
      { name: 'My Circle contacts', starter: '0', plus: '1', familyPlus: '3-5' },
      { name: 'KidsCom (child portal)', starter: false, plus: false, familyPlus: true },
      { name: 'Watch Together theater', starter: false, plus: false, familyPlus: true },
    ]
  },
  {
    category: 'Legal & Court',
    features: [
      { name: 'PDF summaries', starter: false, plus: 'Monthly', familyPlus: 'On-demand' },
      { name: 'Court-ready exports', starter: false, plus: false, familyPlus: true },
      { name: 'Compliance analytics', starter: false, plus: false, familyPlus: true },
    ]
  },
];

export default function PricingPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!user;
  const currentTier = profile?.subscription_tier || 'starter';

  const handlePlanAction = async (planCode: string) => {
    // If not logged in, redirect to register with plan param
    if (!isLoggedIn) {
      if (planCode === 'starter') {
        router.push('/register');
      } else {
        router.push(`/register?plan=${planCode}`);
      }
      return;
    }

    // If logged in and clicking starter, go to billing settings
    if (planCode === 'starter') {
      router.push('/settings/billing');
      return;
    }

    // If logged in and clicking current plan, go to billing settings
    if (planCode === currentTier) {
      router.push('/settings/billing');
      return;
    }

    // If logged in, start checkout for paid plans
    try {
      setProcessingPlan(planCode);
      setError(null);

      const result = await subscriptionAPI.createCheckout(
        planCode,
        `${window.location.origin}/settings/billing?success=true`,
        `${window.location.origin}/pricing?cancelled=true`
      );

      if (result.action === 'upgraded') {
        // Already upgraded - redirect to billing
        router.push('/settings/billing?success=true');
      } else if (result.action === 'checkout' && result.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = result.checkout_url;
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start checkout';
      setError(errorMessage);
      setProcessingPlan(null);
    }
  };

  const getButtonText = (plan: typeof plans[0]) => {
    if (processingPlan === plan.planCode) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Processing...
        </>
      );
    }

    if (!isLoggedIn) {
      return plan.cta;
    }

    // Logged in user
    if (plan.planCode === currentTier) {
      return (
        <>
          <Check className="w-4 h-4 mr-2" />
          Current Plan
        </>
      );
    }

    if (plan.planCode === 'starter') {
      return 'View Billing';
    }

    return plan.ctaLoggedIn;
  };

  const isCurrentPlan = (planCode: string) => isLoggedIn && planCode === currentTier;

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-cg-sage/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-amber/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              Simple, <span className="text-cg-sage">transparent</span> pricing
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Start free and upgrade when you need more. No hidden fees, no surprises.
            </p>
            {isLoggedIn && (
              <p className="text-sm text-cg-sage">
                You&apos;re currently on the <strong>{currentTier === 'family_plus' ? 'Family+' : currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</strong> plan
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Looking for professional or court pricing?{' '}
              <Link href="/pricing/professionals" className="text-cg-sage hover:underline">
                See professional plans
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
            {error}
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <section className="py-12 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-card rounded-2xl border ${
                  plan.highlighted
                    ? 'border-cg-sage shadow-xl scale-105'
                    : isCurrentPlan(plan.planCode)
                    ? 'border-cg-sage/50 ring-2 ring-cg-sage/20'
                    : 'border-border/50'
                } p-8 flex flex-col`}
              >
                {plan.badge && !isCurrentPlan(plan.planCode) && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-cg-sage text-white text-sm font-medium px-4 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                {isCurrentPlan(plan.planCode) && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-cg-amber text-white text-sm font-medium px-4 py-1 rounded-full">
                      Your Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    {plan.name}
                  </h2>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-cg-sage flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? 'text-foreground' : 'text-muted-foreground/50'}>
                        {feature.name}
                      </span>
                      {feature.tooltip && (
                        <HelpCircle className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanAction(plan.planCode)}
                  disabled={processingPlan === plan.planCode || (isCurrentPlan(plan.planCode) && plan.planCode !== 'starter')}
                  className={`w-full py-3 px-6 rounded-full font-medium text-center transition-all duration-200 flex items-center justify-center ${
                    isCurrentPlan(plan.planCode)
                      ? 'bg-muted text-muted-foreground cursor-default'
                      : plan.highlighted
                      ? 'bg-cg-sage text-white hover:bg-cg-sage-light hover:shadow-lg disabled:opacity-50'
                      : 'border-2 border-cg-sage text-cg-sage hover:bg-cg-sage hover:text-white disabled:opacity-50'
                  }`}
                >
                  {getButtonText(plan)}
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            All paid plans include a 14-day free trial. No credit card required to start.
          </p>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Compare Plans
            </h2>
            <p className="text-muted-foreground">
              A detailed breakdown of what&apos;s included in each plan.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">Starter</th>
                  <th className="text-center py-4 px-4 font-semibold text-cg-sage">Plus</th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">Family+</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((category) => (
                  <>
                    <tr key={category.category} className="bg-muted/30">
                      <td colSpan={4} className="py-3 px-4 font-semibold text-foreground">
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((feature) => (
                      <tr key={feature.name} className="border-b border-border/50">
                        <td className="py-3 px-4 text-foreground">{feature.name}</td>
                        <td className="text-center py-3 px-4">
                          {typeof feature.starter === 'boolean' ? (
                            feature.starter ? (
                              <Check className="w-5 h-5 text-cg-sage mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                            )
                          ) : (
                            <span className="text-muted-foreground">{feature.starter}</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {typeof feature.plus === 'boolean' ? (
                            feature.plus ? (
                              <Check className="w-5 h-5 text-cg-sage mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                            )
                          ) : (
                            <span className="text-cg-sage font-medium">{feature.plus}</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {typeof feature.familyPlus === 'boolean' ? (
                            feature.familyPlus ? (
                              <Check className="w-5 h-5 text-cg-sage mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                            )
                          ) : (
                            <span className="text-foreground font-medium">{feature.familyPlus}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Other Audiences */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-card rounded-2xl p-8 border border-border/50">
              <Users className="w-10 h-10 text-cg-sage mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                For Professionals
              </h3>
              <p className="text-muted-foreground mb-6">
                Attorneys, GALs, mediators, and family law professionals get special bulk pricing and multi-case access.
              </p>
              <Link
                href="/pricing/professionals"
                className="inline-flex items-center gap-2 text-cg-sage font-medium hover:gap-3 transition-all"
              >
                View professional plans
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-border/50">
              <Shield className="w-10 h-10 text-cg-sage mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                For Courts
              </h3>
              <p className="text-muted-foreground mb-6">
                Family courts and judicial systems can access per-form processing and integration options.
              </p>
              <Link
                href="/pricing/courts"
                className="inline-flex items-center gap-2 text-cg-sage font-medium hover:gap-3 transition-all"
              >
                View court pricing
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group bg-background rounded-xl border border-border/50 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-medium text-foreground">{faq.question}</span>
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="px-6 pb-6 text-muted-foreground">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-cg-sage-subtle to-cg-slate-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
            Start your journey today
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join thousands of families who&apos;ve found a better way to co-parent.
            Start free, upgrade when you&apos;re ready.
          </p>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

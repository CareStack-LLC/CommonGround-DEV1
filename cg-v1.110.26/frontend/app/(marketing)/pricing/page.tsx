'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Check, Clock, DollarSign, Scale, Minus } from 'lucide-react';
import { InlineNewsletterCta } from '@/components/marketing/inline-newsletter-cta';
import { ComparisonTable, FaqJsonLd } from '@/components/marketing';
import { trackViewPricing, trackBeginCheckout } from '@/lib/analytics';

const plans = [
  {
    name: 'Web Starter',
    code: 'web_starter',
    tagline: 'Everything you need to start',
    whoFor: 'Parents beginning their co-parenting journey',
    monthly: 0,
    annual: 0,
    features: [
      'ARIA-assisted messaging',
      'Shared custody calendar',
      'ClearFund expense tracking',
      'Full web access',
    ],
    color: 'var(--portal-primary)',
    cta: 'Start Free',
  },
  {
    name: 'Plus',
    code: 'plus',
    tagline: 'Automate the hard parts',
    whoFor: 'Parents ready to stop coordinating and start co-parenting',
    monthly: 17.99,
    annual: 199.99,
    popular: true,
    features: [
      'Everything in Web Starter',
      'Automated recurring schedules',
      'Quick Accords (one-time agreements)',
      'PDF exports',
      'My Circle: 1 trusted contact',
      'Mobile apps (coming soon)',
    ],
    color: '#F5A623',
    cta: 'Start 14-Day Trial',
  },
  {
    name: 'Complete',
    code: 'complete',
    tagline: 'Peace of mind, documented',
    whoFor: 'Parents who need verified exchanges and court-ready records',
    monthly: 34.99,
    annual: 349.99,
    features: [
      'Everything in Plus',
      'Silent Handoff GPS verification',
      'Custody analytics & tracking',
      'KidSpace video calls',
      'Court-ready evidence packages',
      'Priority support',
    ],
    color: 'var(--portal-primary)',
    cta: 'Start 14-Day Trial',
  },
];

const comparisonCategories = [
  {
    name: 'Communication',
    features: [
      { name: 'ARIA-assisted messaging', free: true, plus: true, complete: true },
      { name: 'Message history & search', free: true, plus: true, complete: true },
      { name: 'Read receipts', free: false, plus: true, complete: true },
      { name: 'Message tone analysis', free: true, plus: true, complete: true },
    ],
  },
  {
    name: 'Scheduling',
    features: [
      { name: 'Shared custody calendar', free: true, plus: true, complete: true },
      { name: 'Automated recurring schedules', free: false, plus: true, complete: true },
      { name: 'Holiday rotation management', free: false, plus: true, complete: true },
      { name: 'Quick Accords (one-time agreements)', free: false, plus: true, complete: true },
      { name: 'Automatic reminders', free: false, plus: true, complete: true },
    ],
  },
  {
    name: 'Finances',
    features: [
      { name: 'ClearFund expense tracking', free: true, plus: true, complete: true },
      { name: 'Receipt uploads', free: true, plus: true, complete: true },
      { name: 'Auto-split calculations', free: false, plus: true, complete: true },
      { name: 'Payment tracking', free: false, plus: true, complete: true },
    ],
  },
  {
    name: 'Children',
    features: [
      { name: 'KidSpace video calls', free: false, plus: false, complete: true },
      { name: 'KidSpace messaging', free: false, plus: false, complete: true },
      { name: 'KidSpace movie nights & activities', free: false, plus: false, complete: true },
    ],
  },
  {
    name: 'Exchanges',
    features: [
      { name: 'Silent Handoff GPS verification', free: false, plus: false, complete: true },
      { name: 'QR code check-in confirmation', free: false, plus: false, complete: true },
      { name: 'Exchange history & logs', free: false, plus: false, complete: true },
    ],
  },
  {
    name: 'Documentation & Evidence',
    features: [
      { name: 'PDF message exports', free: false, plus: true, complete: true },
      { name: 'Court-ready evidence packages', free: false, plus: false, complete: true },
      { name: 'SHA-256 tamper verification', free: false, plus: false, complete: true },
      { name: 'Custody analytics & time tracking', free: false, plus: false, complete: true },
    ],
  },
  {
    name: 'Support & Access',
    features: [
      { name: 'Web access', free: true, plus: true, complete: true },
      { name: 'Mobile apps', free: false, plus: 'Coming soon', complete: 'Coming soon' },
      { name: 'My Circle trusted contacts', free: false, plus: '1 contact', complete: '3 contacts' },
      { name: 'Professional portal access', free: false, plus: false, complete: true },
      { name: 'Priority support', free: false, plus: false, complete: true },
    ],
  },
];

/* ── Competitor comparison rows — publicly listed pricing snapshot ─ */
const OFW_ROWS = [
  { feature: 'Price', ours: '$17.99/mo flat', theirs: '$174/yr per parent' },
  { feature: 'Per-child fees', ours: 'None', theirs: 'Yes' },
  { feature: 'AI message coaching', ours: true, theirs: 'Limited' },
  { feature: 'Child app (KidSpace)', ours: true, theirs: false },
  { feature: 'GPS-verified handoffs', ours: true, theirs: false },
  { feature: 'Court-ready exports', ours: true, theirs: true },
  { feature: 'iOS + Android', ours: true, theirs: true },
  { feature: 'Free tier', ours: true, theirs: false },
];

const TP_ROWS = [
  { feature: 'Price', ours: '$17.99/mo flat', theirs: '$12.99/mo per parent' },
  { feature: 'Per-child fees', ours: 'None', theirs: 'None' },
  { feature: 'AI message coaching', ours: true, theirs: false },
  { feature: 'Child app (KidSpace)', ours: true, theirs: false },
  { feature: 'GPS-verified handoffs', ours: true, theirs: false },
  { feature: 'Court-ready exports', ours: true, theirs: true },
  { feature: 'iOS + Android', ours: true, theirs: true },
  { feature: 'Free tier', ours: true, theirs: false },
];

/* ── Pricing FAQ items (shared between visual FAQ + JSON-LD) ─────── */
const PRICING_FAQ_ITEMS: { question: string; answer: string }[] = [
  { question: 'Do both parents need to pay?', answer: 'No. Each parent manages their own subscription. You can message each other regardless of plan.' },
  { question: 'Can I cancel anytime?', answer: 'Yes. No contracts. No commitments. Cancel with one click from your settings.' },
  { question: 'What happens to my data if I cancel?', answer: 'You keep read-only access for 90 days. Export everything before that if you need it.' },
  { question: 'Do you offer financial hardship discounts?', answer: "Yes. Every family deserves access to these tools. Email support@find-commonground.com and we'll work with you." },
  { question: 'How does CommonGround compare to other co-parenting apps?', answer: 'CommonGround includes ARIA messaging free (most competitors charge), plus unique features like KidSpace video calls and Silent Handoff GPS exchanges that no other app offers.' },
  { question: 'What happens after the 14-day trial?', answer: "You'll be charged for your chosen plan. Cancel before the trial ends and you won't be charged. You can always downgrade to the free Web Starter plan." },
  { question: 'Can I switch plans anytime?', answer: 'Yes. Upgrade or downgrade anytime from your settings. Changes take effect on your next billing cycle.' },
  { question: 'Is there a family or couple discount?', answer: 'Each parent has their own account and subscription. We keep pricing simple — the same price for everyone, with financial hardship discounts available.' },
];

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => { trackViewPricing(); }, []);

  const getPrice = (plan: (typeof plans)[0]) => {
    if (plan.monthly === 0) return '$0';
    if (billingPeriod === 'monthly') return `$${plan.monthly}`;
    return `$${(plan.annual / 12).toFixed(2)}`;
  };

  const getPeriod = (plan: (typeof plans)[0]) => {
    if (plan.monthly === 0) return 'forever';
    if (billingPeriod === 'annual') return '/month (billed annually)';
    return '/month';
  };

  const getSavings = (plan: (typeof plans)[0]) => {
    if (plan.monthly === 0 || billingPeriod === 'monthly') return null;
    const savings = plan.monthly * 12 - plan.annual;
    return `Save $${savings.toFixed(0)}/year`;
  };

  const handleCTA = (planName?: string, price?: number) => {
    if (planName) trackBeginCheckout(planName, price);
    router.push(user ? '/settings/billing' : '/early-access');
  };

  const renderCheckmark = (value: boolean | string) => {
    if (value === true) return <Check className="w-5 h-5 text-[var(--portal-primary)] mx-auto" />;
    if (value === false) return <Minus className="w-4 h-4 text-gray-300 mx-auto" />;
    return <span className="text-xs text-gray-600">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      {/* Hero */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--portal-primary)] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#F5A623] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#1E3A4A] mb-6 leading-[1.05]"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Start free.
            <br />
            <span className="text-[var(--portal-primary)]">Upgrade when ready.</span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-600 mb-4 leading-relaxed max-w-2xl mx-auto">
            No credit card. No pressure. Just see if automation works better than coordination.
          </p>
          <p className="text-base text-gray-600 mb-8 max-w-xl mx-auto">
            Less than the cost of one missed exchange or one heated text that ends up in court.
          </p>

          <div className="inline-flex items-center gap-4 bg-white/60 backdrop-blur-sm rounded-full p-2">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                billingPeriod === 'monthly'
                  ? 'bg-[var(--portal-primary)] text-white shadow-md'
                  : 'text-gray-600 hover:text-[var(--portal-primary)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                billingPeriod === 'annual'
                  ? 'bg-[var(--portal-primary)] text-white shadow-md'
                  : 'text-gray-600 hover:text-[var(--portal-primary)]'
              }`}
            >
              Annual
              <span className="ml-2 text-xs text-[#F5A623] font-bold">Save 17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.code}
                className={`relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 ${
                  plan.popular ? 'ring-2 ring-[#F5A623] scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[#F5A623] text-white text-sm font-medium px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {plan.monthly > 0 && (
                  <div className="absolute top-4 right-4">
                    <span className="text-[var(--portal-primary)] bg-[var(--portal-primary)]/10 text-xs font-medium px-2 py-1 rounded-full">
                      14-day free trial
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h2
                    className="text-3xl font-serif text-[#1E3A4A] mb-2"
                    style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                  >
                    {plan.name}
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">{plan.tagline}</p>

                  <div className="mb-2">
                    <span className="text-5xl font-bold" style={{ color: plan.color }}>
                      {getPrice(plan)}
                    </span>
                    <span className="text-gray-600 text-sm ml-1">{getPeriod(plan)}</span>
                  </div>

                  {getSavings(plan) && (
                    <div className="text-sm text-[#F5A623] font-medium">{getSavings(plan)}</div>
                  )}
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-center">
                    <span className="font-medium text-gray-700">Best for:</span>{' '}
                    <span className="text-gray-600">{plan.whoFor}</span>
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCTA(plan.name, plan.monthly)}
                  className="w-full py-3 rounded-xl font-medium text-lg transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5"
                  style={{
                    backgroundColor: plan.popular ? plan.color : 'white',
                    color: plan.popular ? 'white' : plan.color,
                    border: plan.popular ? 'none' : `2px solid ${plan.color}`,
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-600 mt-8">
            All paid plans include a 14-day free trial. Cancel anytime. No contracts.
          </p>
        </div>
      </section>

      {/* Full Feature Comparison Table */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Compare every <span className="text-[#3DAA8A]">feature</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See exactly what&apos;s included in each plan.
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1E3A4A] text-white">
                  <th className="text-left py-4 px-6 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold w-[110px]">
                    <div>Web Starter</div>
                    <div className="text-xs font-normal text-white/60 mt-0.5">Free</div>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold w-[110px] bg-[#F5A623]/20">
                    <div className="text-[#F5A623]">Plus</div>
                    <div className="text-xs font-normal text-white/60 mt-0.5">$17.99/mo</div>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold w-[110px]">
                    <div>Complete</div>
                    <div className="text-xs font-normal text-white/60 mt-0.5">$34.99/mo</div>
                  </th>
                </tr>
              </thead>
              {comparisonCategories.map((category) => (
                <tbody key={category.name}>
                  <tr>
                    <td
                      colSpan={4}
                      className="py-3 px-6 bg-[#F4F8F7] font-semibold text-[#1E3A4A] text-xs uppercase tracking-wide border-t border-gray-200"
                    >
                      {category.name}
                    </td>
                  </tr>
                  {category.features.map((feature) => (
                    <tr
                      key={feature.name}
                      className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-3 px-6 text-gray-700">{feature.name}</td>
                      <td className="py-3 px-4 text-center">{renderCheckmark(feature.free)}</td>
                      <td className="py-3 px-4 text-center bg-[#F5A623]/[0.03]">
                        {renderCheckmark(feature.plus)}
                      </td>
                      <td className="py-3 px-4 text-center">{renderCheckmark(feature.complete)}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-6">
            {comparisonCategories.map((category) => (
              <div key={category.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-[#F4F8F7] py-3 px-4 border-b border-gray-200">
                  <h3 className="font-semibold text-[#1E3A4A] text-xs uppercase tracking-wide">
                    {category.name}
                  </h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {category.features.map((feature) => (
                    <div key={feature.name} className="px-4 py-3">
                      <div className="font-medium text-gray-700 text-sm mb-2">{feature.name}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex flex-col items-center gap-1 rounded-lg bg-gray-50 py-1.5">
                          <span className="text-gray-600 font-medium">Free</span>
                          {renderCheckmark(feature.free)}
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-lg bg-[#F5A623]/5 py-1.5 ring-1 ring-[#F5A623]/20">
                          <span className="text-[#F5A623] font-medium">Plus</span>
                          {renderCheckmark(feature.plus)}
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-lg bg-gray-50 py-1.5">
                          <span className="text-gray-600 font-medium">Complete</span>
                          {renderCheckmark(feature.complete)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free Tier Highlight */}
      <section className="py-16 px-6 bg-gradient-to-br from-[#E8F4F8] to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            ARIA messaging. <span className="text-[#3DAA8A]">Included free.</span>
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Most co-parenting apps charge for AI features. CommonGround includes ARIA messaging in the free tier &mdash; no ads, no message limits, no expiring trial.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-[var(--portal-primary)] mb-1">$0</p>
              <p className="text-sm text-gray-600">ARIA messaging forever</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-[var(--portal-primary)] mb-1">No ads</p>
              <p className="text-sm text-gray-600">Clean, focused experience</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-[var(--portal-primary)] mb-1">Unlimited</p>
              <p className="text-sm text-gray-600">No message caps</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Comparison */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            The cost of <span className="text-[#F5A623]">not</span> having CommonGround
          </h2>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            One heated text in court. One missed exchange. One undocumented conversation. The cost adds up fast.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#FEF7ED] rounded-xl p-6 border border-[#F5A623]/10">
              <div className="h-12 w-12 rounded-xl bg-[#F5A623]/10 flex items-center justify-center mx-auto mb-3">
                <Scale className="h-6 w-6 text-[#F5A623]" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Avg. attorney hour</p>
              <p className="text-3xl font-bold text-[#1E3A4A]">$300+</p>
              <p className="text-xs text-gray-600 mt-2">1 hour saved = 8 months of Complete</p>
            </div>
            <div className="bg-[#E8F4F8] rounded-xl p-6 border border-[var(--portal-primary)]/10">
              <div className="h-12 w-12 rounded-xl bg-[var(--portal-primary)]/10 flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-6 w-6 text-[var(--portal-primary)]" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Avg. mediation session</p>
              <p className="text-3xl font-bold text-[#1E3A4A]">$200–500</p>
              <p className="text-xs text-gray-600 mt-2">Calmer messages mean fewer sessions</p>
            </div>
            <div className="bg-[#FEF7ED] rounded-xl p-6 border border-[#F5A623]/10">
              <div className="h-12 w-12 rounded-xl bg-[#F5A623]/10 flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-[#F5A623]" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Hours spent coordinating</p>
              <p className="text-3xl font-bold text-[#1E3A4A]">Countless</p>
              <p className="text-xs text-gray-600 mt-2">Time you could spend with your kids</p>
            </div>
          </div>
        </div>
      </section>

      {/* Competitor Comparisons — publicly listed pricing snapshot */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-3"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              How CommonGround <span className="text-[#3DAA8A]">stacks up</span>
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              A side-by-side look at what each app includes at the subscription tier families actually pay for.
            </p>
          </div>

          <div className="mb-12">
            <h3 className="font-serif text-xl sm:text-2xl text-[#1E3A4A] mb-4 text-center">
              CommonGround vs OurFamilyWizard
            </h3>
            <ComparisonTable
              ourProduct="CommonGround"
              competitor="OurFamilyWizard"
              rows={OFW_ROWS}
            />
          </div>

          <div className="mb-6">
            <h3 className="font-serif text-xl sm:text-2xl text-[#1E3A4A] mb-4 text-center">
              CommonGround vs TalkingParents
            </h3>
            <ComparisonTable
              ourProduct="CommonGround"
              competitor="TalkingParents"
              rows={TP_ROWS}
            />
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            Competitor figures based on publicly listed pricing as of 2026-04-18.
          </p>
        </div>
      </section>

      {/* Professional Pricing */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-[#1E3A4A]/5 to-white rounded-2xl p-8 border-2 border-[var(--portal-primary)]/10 text-center">
            <h3
              className="text-2xl font-serif text-[#1E3A4A] mb-3"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              For Family Law Professionals
            </h3>
            <p className="text-gray-600 mb-4 max-w-xl mx-auto">
              Free access for professionals. Your clients choose their own plans. Includes the Professional Portal, court-ready exports, and searchable directory listing.
            </p>
            <button
              onClick={() => router.push('/professionals')}
              className="px-6 py-3 bg-[var(--portal-primary)] text-white rounded-xl font-medium hover:bg-[#2D6A8F] transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Schedule a Demo
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-white">
        <FaqJsonLd items={PRICING_FAQ_ITEMS} />
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-4xl font-serif text-[#1E3A4A] mb-12 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Common questions
          </h2>

          <div className="space-y-6">
            {PRICING_FAQ_ITEMS.map((faq) => (
              <details key={faq.question} className="group bg-gray-50 rounded-xl p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between font-medium text-[#1E3A4A]">
                  {faq.question}
                  <span className="text-gray-600 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-gray-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Not Ready Yet — Newsletter Capture */}
      <section className="py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <InlineNewsletterCta
            source="newsletter_pricing"
            headline="Not ready yet? Stay in the loop."
            subtext="Get co-parenting tips and be the first to know about new features and special offers."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-[var(--portal-primary)] to-[#234846] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#F5A623] rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif mb-6 leading-tight"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Ready to find common ground?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join the families who&apos;ve found a calmer way.
          </p>
          <button
            onClick={() => router.push('/early-access')}
            className="px-8 py-4 bg-white text-[var(--portal-primary)] rounded-xl font-medium text-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
          >
            Start Free Today
          </button>
          <p className="mt-6 text-sm text-white/60">No credit card required. Start in 2 minutes.</p>
        </div>
      </section>
    </div>
  );
}

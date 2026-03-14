'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Check } from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      name: 'Web Starter',
      code: 'web_starter',
      tagline: 'For getting started',
      whoFor: 'Parents testing the waters',
      monthly: 0,
      annual: 0,
      features: [
        'ARIA messaging (flagging only)',
        'Basic calendar view',
        'ClearFund tracking (no fees)',
        'Web-only access'
      ],
      color: 'var(--portal-primary)',
      cta: 'Start Free'
    },
    {
      name: 'Plus',
      code: 'plus',
      tagline: 'For structure & stability',
      whoFor: 'Parents who want automation',
      monthly: 17.99,
      annual: 199.99,
      popular: true,
      features: [
        'Everything in Web Starter',
        'Automated recurring schedules',
        'Quick Accords (one-time agreements)',
        'PDF exports',
        'My Circle: 1 trusted contact',
        'Mobile apps (coming soon)'
      ],
      color: '#F5A623',
      cta: 'Start Trial'
    },
    {
      name: 'Complete',
      code: 'complete',
      tagline: 'For families & court',
      whoFor: 'Parents heading to court',
      monthly: 34.99,
      annual: 349.99,
      features: [
        'Everything in Plus',
        'Silent Handoff GPS verification',
        'Custody analytics & tracking',
        'KidsCom video calls',
        'Court-ready evidence packages',
        'Priority support'
      ],
      color: 'var(--portal-primary)',
      cta: 'Start Trial'
    }
  ];

  const getPrice = (plan: typeof plans[0]) => {
    if (plan.monthly === 0) return '$0';
    if (billingPeriod === 'monthly') {
      return `$${plan.monthly}`;
    }
    const monthlyEquiv = (plan.annual / 12).toFixed(2);
    return `$${monthlyEquiv}`;
  };

  const getPeriod = (plan: typeof plans[0]) => {
    if (plan.monthly === 0) return 'forever';
    if (billingPeriod === 'annual') return '/month (billed annually)';
    return '/month';
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (plan.monthly === 0 || billingPeriod === 'monthly') return null;
    const monthlyCost = plan.monthly * 12;
    const savings = monthlyCost - plan.annual;
    return `Save $${savings.toFixed(0)}/year`;
  };

  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--portal-primary)] rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#F5A623] rounded-full blur-3xl"></div>
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

          <p className="text-xl sm:text-2xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            No credit card. No pressure. Just see if automation works better than coordination.
          </p>

          {/* Billing Toggle */}
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
            {plans.map((plan, idx) => (
              <div
                key={plan.code}
                className={`relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 ${
                  plan.popular ? 'ring-2 ring-[#F5A623] scale-105' : ''
                }`}
                style={{
                  animationDelay: `${idx * 100}ms`,
                  animation: 'slideUp 0.6s ease-out forwards',
                  opacity: 0
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[#F5A623] text-white text-sm font-medium px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="text-center mb-6">
                  <h2
                    className="text-3xl font-serif text-[#1E3A4A] mb-2"
                    style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                  >
                    {plan.name}
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">{plan.tagline}</p>

                  <div className="mb-2">
                    <span
                      className="text-5xl font-bold"
                      style={{ color: plan.color }}
                    >
                      {getPrice(plan)}
                    </span>
                    <span className="text-gray-500 text-sm ml-1">
                      {getPeriod(plan)}
                    </span>
                  </div>

                  {getSavings(plan) && (
                    <div className="text-sm text-[#F5A623] font-medium">
                      {getSavings(plan)}
                    </div>
                  )}
                </div>

                {/* Who it's for */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-center">
                    <span className="font-medium text-gray-700">Best for:</span>{' '}
                    <span className="text-gray-600">{plan.whoFor}</span>
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check
                        className="w-5 h-5 flex-shrink-0 mt-0.5"
                        style={{ color: plan.color }}
                      />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => {
                    if (user) {
                      router.push('/settings/billing');
                    } else {
                      router.push('/signup');
                    }
                  }}
                  className="w-full py-3 rounded-xl font-medium text-lg transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5"
                  style={{
                    backgroundColor: plan.popular ? plan.color : 'white',
                    color: plan.popular ? 'white' : plan.color,
                    border: plan.popular ? 'none' : `2px solid ${plan.color}`
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            All paid plans include a 14-day free trial. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif text-[#1E3A4A] mb-6"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Why upgrade?
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-3">⏰</div>
              <h3 className="font-serif text-xl text-[#1E3A4A] mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Stop coordinating
              </h3>
              <p className="text-gray-600 text-sm">
                Set schedules once. Get automatic reminders. Never text about pickups again.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-serif text-xl text-[#1E3A4A] mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Keep finances clear
              </h3>
              <p className="text-gray-600 text-sm">
                Track every dollar. Upload receipts. Auto-split costs. Clear records for court.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-3">⚖️</div>
              <h3 className="font-serif text-xl text-[#1E3A4A] mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Be court-ready
              </h3>
              <p className="text-gray-600 text-sm">
                GPS verification. Custody analytics. Evidence packages. Everything timestamped.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-4xl font-serif text-[#1E3A4A] mb-12 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Common questions
          </h2>

          <div className="space-y-6">
            {[
              {
                q: 'Do both parents need to pay?',
                a: 'No. Each parent manages their own subscription. You can message each other regardless of plan.'
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. No contracts. No commitments. Cancel with one click from your settings.'
              },
              {
                q: 'What happens to my data if I cancel?',
                a: 'You keep read-only access for 90 days. Export everything before that if you need it.'
              },
              {
                q: 'Do you offer financial hardship discounts?',
                a: 'Yes. We believe everyone deserves better tools. Email us to discuss options.'
              }
            ].map((faq) => (
              <details key={faq.q} className="group bg-gray-50 rounded-xl p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between font-medium text-[#1E3A4A]">
                  {faq.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <p className="mt-4 text-gray-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-[var(--portal-primary)] to-[#234846] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#F5A623] rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif mb-6 leading-tight"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Ready to find common ground?
          </h2>

          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join 10,000+ families who automated their co-parenting.
          </p>

          <button
            onClick={() => router.push('/signup')}
            className="px-8 py-4 bg-white text-[var(--portal-primary)] rounded-xl font-medium text-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
          >
            Start Free Today
          </button>

          <p className="mt-6 text-sm text-white/60">
            No credit card required. Start in 2 minutes.
          </p>
        </div>
      </section>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

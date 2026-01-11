import { Metadata } from 'next';
import Link from 'next/link';
import {
  Check,
  X,
  ArrowRight,
  MessageSquare,
  FileText,
  Calendar,
  Wallet,
  Shield,
  Users,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing | CommonGround',
  description: 'Simple, transparent pricing for co-parents. Start free and upgrade when you need more features.',
};

/**
 * Pricing Page
 *
 * Main pricing page for parents with three tiers.
 */

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to get started with better co-parenting.',
    cta: 'Get Started Free',
    ctaLink: '/register',
    highlighted: false,
    features: [
      { name: 'ARIA-powered messaging', included: true, tooltip: 'AI helps prevent conflict' },
      { name: 'Basic agreement builder', included: true },
      { name: 'Shared calendar', included: true },
      { name: 'Up to 2 children', included: true },
      { name: '1 active case', included: true },
      { name: 'Email support', included: true },
      { name: 'Expense tracking', included: false },
      { name: 'Court export packages', included: false },
      { name: 'Legal access portal', included: false },
      { name: 'Priority support', included: false },
    ],
  },
  {
    name: 'Basic',
    price: '$9.99',
    period: '/month',
    description: 'Full expense tracking and documentation for organized co-parenting.',
    cta: 'Start 14-Day Free Trial',
    ctaLink: '/register?plan=basic',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      { name: 'Everything in Free', included: true },
      { name: 'ClearFund expense tracking', included: true, tooltip: 'Track and split all expenses' },
      { name: 'Receipt uploads', included: true },
      { name: 'Payment history & ledger', included: true },
      { name: 'Unlimited children', included: true },
      { name: 'Multiple cases', included: true },
      { name: 'Basic court exports', included: true },
      { name: 'Priority email support', included: true },
      { name: 'Legal access portal', included: false },
      { name: 'Advanced analytics', included: false },
    ],
  },
  {
    name: 'Premium',
    price: '$19.99',
    period: '/month',
    description: 'Complete platform access with legal portal and advanced features.',
    cta: 'Start 14-Day Free Trial',
    ctaLink: '/register?plan=premium',
    highlighted: false,
    features: [
      { name: 'Everything in Basic', included: true },
      { name: 'Legal access portal', included: true, tooltip: 'Grant access to attorneys & GALs' },
      { name: 'Advanced court exports', included: true },
      { name: 'Compliance analytics', included: true },
      { name: 'Calendar sync (Google/Outlook)', included: true },
      { name: 'SMS notifications', included: true },
      { name: 'API access', included: true },
      { name: 'Phone support', included: true },
      { name: 'Custom branding', included: true },
      { name: 'Dedicated success manager', included: true },
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
      { name: 'ARIA messaging', free: true, basic: true, premium: true },
      { name: 'Message history', free: '90 days', basic: 'Unlimited', premium: 'Unlimited' },
      { name: 'SMS notifications', free: false, basic: false, premium: true },
    ]
  },
  {
    category: 'Agreements',
    features: [
      { name: 'Agreement builder', free: 'Basic', basic: 'Full', premium: 'Full' },
      { name: 'Section templates', free: '5', basic: '18', premium: '18' },
      { name: 'PDF export', free: false, basic: true, premium: true },
    ]
  },
  {
    category: 'Scheduling',
    features: [
      { name: 'Shared calendar', free: true, basic: true, premium: true },
      { name: 'Exchange check-ins', free: true, basic: true, premium: true },
      { name: 'Calendar sync', free: false, basic: false, premium: true },
    ]
  },
  {
    category: 'Finances',
    features: [
      { name: 'Expense tracking', free: false, basic: true, premium: true },
      { name: 'Receipt uploads', free: false, basic: true, premium: true },
      { name: 'Payment ledger', free: false, basic: true, premium: true },
    ]
  },
  {
    category: 'Legal & Court',
    features: [
      { name: 'Court exports', free: false, basic: 'Basic', premium: 'Advanced' },
      { name: 'Legal portal', free: false, basic: false, premium: true },
      { name: 'Audit logging', free: 'Basic', basic: 'Full', premium: 'Full' },
    ]
  },
];

export default function PricingPage() {
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
            <p className="text-sm text-muted-foreground">
              Looking for professional or court pricing?{' '}
              <Link href="/pricing/professionals" className="text-cg-sage hover:underline">
                See professional plans
              </Link>
            </p>
          </div>
        </div>
      </section>

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
                    : 'border-border/50'
                } p-8 flex flex-col`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-cg-sage text-white text-sm font-medium px-4 py-1 rounded-full">
                      {plan.badge}
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

                <Link
                  href={plan.ctaLink}
                  className={`w-full py-3 px-6 rounded-full font-medium text-center transition-all duration-200 ${
                    plan.highlighted
                      ? 'bg-cg-sage text-white hover:bg-cg-sage-light hover:shadow-lg'
                      : 'border-2 border-cg-sage text-cg-sage hover:bg-cg-sage hover:text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
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
              A detailed breakdown of what's included in each plan.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">Free</th>
                  <th className="text-center py-4 px-4 font-semibold text-cg-sage">Basic</th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">Premium</th>
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
                          {typeof feature.free === 'boolean' ? (
                            feature.free ? (
                              <Check className="w-5 h-5 text-cg-sage mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                            )
                          ) : (
                            <span className="text-muted-foreground">{feature.free}</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {typeof feature.basic === 'boolean' ? (
                            feature.basic ? (
                              <Check className="w-5 h-5 text-cg-sage mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                            )
                          ) : (
                            <span className="text-cg-sage font-medium">{feature.basic}</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          {typeof feature.premium === 'boolean' ? (
                            feature.premium ? (
                              <Check className="w-5 h-5 text-cg-sage mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                            )
                          ) : (
                            <span className="text-foreground font-medium">{feature.premium}</span>
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
            Join thousands of families who've found a better way to co-parent.
            Start free, upgrade when you're ready.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

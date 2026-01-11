import { Metadata } from 'next';
import Link from 'next/link';
import {
  Check,
  ArrowRight,
  Users,
  Building2,
  Scale,
  FileText,
  Shield,
  Clock,
  Zap,
  HeadphonesIcon,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Professional Pricing | CommonGround',
  description: 'Special pricing for attorneys, GALs, mediators, and family law professionals. Bulk vouchers and multi-case access.',
};

/**
 * Professional Pricing Page
 *
 * Pricing for attorneys, GALs, mediators, and other family law professionals.
 */

const professionalPlans = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    vouchers: '5 vouchers',
    description: 'Perfect for solo practitioners just getting started.',
    features: [
      '5 client vouchers per month',
      'Professional dashboard',
      'Multi-case view',
      'Basic analytics',
      'Email support',
      'Client invitation system',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/register?plan=pro-starter',
  },
  {
    name: 'Practice',
    price: '$149',
    period: '/month',
    vouchers: '20 vouchers',
    description: 'For established practices with regular family law cases.',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      '20 client vouchers per month',
      'Everything in Starter',
      'Advanced case analytics',
      'Bulk export tools',
      'Priority support',
      'Custom branding options',
      'Team member access (up to 3)',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/register?plan=pro-practice',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    vouchers: 'Unlimited',
    description: 'For large firms and organizations with high volume needs.',
    features: [
      'Unlimited client vouchers',
      'Everything in Practice',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantees',
      'On-site training',
      'Unlimited team members',
      'White-label options',
    ],
    cta: 'Contact Sales',
    ctaLink: '/help/contact?type=enterprise',
  },
];

const roles = [
  {
    icon: Scale,
    title: 'Attorneys',
    description: 'Family law attorneys can provide clients with vouchers for premium CommonGround access, ensuring better documentation and communication.',
  },
  {
    icon: Users,
    title: 'Guardians ad Litem',
    description: 'GALs get read-only access to case communications, schedules, and compliance metrics to better advocate for children.',
  },
  {
    icon: Building2,
    title: 'Mediators',
    description: 'Access shared agreement drafts and communication history to facilitate more productive mediation sessions.',
  },
  {
    icon: FileText,
    title: 'Custody Evaluators',
    description: 'Review verified communication records and compliance data for more informed custody recommendations.',
  },
];

const benefits = [
  {
    icon: Clock,
    title: 'Save Time',
    description: 'Clients arrive with organized documentation instead of boxes of printed emails.',
  },
  {
    icon: Shield,
    title: 'Verified Records',
    description: 'SHA-256 hashed exports provide court-admissible evidence with chain of custody.',
  },
  {
    icon: Zap,
    title: 'Reduce Conflict',
    description: 'ARIA helps clients communicate better, leading to faster resolutions.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Dedicated Support',
    description: 'Priority support for professionals with complex questions or integration needs.',
  },
];

const faqs = [
  {
    question: 'How do vouchers work?',
    answer: 'Vouchers give your clients access to premium CommonGround features. You distribute voucher codes to clients, they redeem during signup, and both parents get upgraded access. Unused vouchers roll over for up to 3 months.',
  },
  {
    question: 'What access do I get to client cases?',
    answer: 'You get read-only access to cases where your clients have granted you access. This includes communication history, agreement drafts, schedules, and compliance metrics. You cannot modify anything—only view and export.',
  },
  {
    question: 'Can I try before I buy?',
    answer: 'Yes! All professional plans include a 30-day free trial with 3 vouchers included. No credit card required to start.',
  },
  {
    question: 'Do you offer bar association discounts?',
    answer: 'Yes, we partner with several state bar associations to offer member discounts. Contact us to check if your bar association is a partner.',
  },
  {
    question: 'How does billing work?',
    answer: 'Plans are billed monthly or annually (with 2 months free). Vouchers reset each billing cycle, with unused vouchers rolling over for up to 90 days.',
  },
  {
    question: 'Can I white-label CommonGround for my firm?',
    answer: 'Enterprise plans include white-label options. You can customize colors, add your firm\'s logo, and use a custom domain for client-facing pages.',
  },
];

export default function ProfessionalPricingPage() {
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage-subtle rounded-full mb-6">
              <Users className="w-4 h-4 text-cg-sage" />
              <span className="text-sm font-medium text-cg-sage">For Professionals</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              Pricing for <span className="text-cg-sage">legal professionals</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Help your clients co-parent better with professional tools and bulk voucher access.
            </p>
            <p className="text-sm text-muted-foreground">
              Looking for parent pricing?{' '}
              <Link href="/pricing" className="text-cg-sage hover:underline">
                See individual plans
              </Link>
              {' · '}
              <Link href="/pricing/courts" className="text-cg-sage hover:underline">
                Court pricing
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Role Cards */}
      <section className="py-12 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.title}
                  className="bg-card rounded-xl p-6 border border-border/50"
                >
                  <Icon className="w-8 h-8 text-cg-sage mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">{role.title}</h3>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Professional Plans
            </h2>
            <p className="text-muted-foreground">
              Choose the plan that fits your practice size.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {professionalPlans.map((plan) => (
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
                  <div className="text-cg-sage font-medium mt-1">
                    {plan.vouchers}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-cg-sage flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
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
            All plans include a 30-day free trial with 3 vouchers. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Why Professionals Choose CommonGround
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="text-center">
                  <div className="w-14 h-14 bg-cg-sage-subtle rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-7 h-7 text-cg-sage" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How Vouchers Work */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-foreground mb-4">
                How Vouchers Work
              </h2>
            </div>

            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-10 h-10 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Generate Voucher Code</h3>
                  <p className="text-muted-foreground">
                    From your professional dashboard, generate a unique voucher code for each client case.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-10 h-10 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Share with Both Parents</h3>
                  <p className="text-muted-foreground">
                    Send the voucher code to both parents. They'll enter it during registration or in settings.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-10 h-10 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Clients Get Premium Access</h3>
                  <p className="text-muted-foreground">
                    Both parents receive premium features for 30 days. Voucher access can be extended as needed.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-10 h-10 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">You Get Case Access</h3>
                  <p className="text-muted-foreground">
                    Once both parents are on the platform, they can grant you read-only access to their case for professional review.
                  </p>
                </div>
              </div>
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
            Ready to help your clients co-parent better?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Start your free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register?plan=pro-practice"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/help/contact?type=professional"
              className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage hover:text-white"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

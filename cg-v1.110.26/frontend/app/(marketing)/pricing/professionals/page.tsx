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
import { FaqJsonLd } from '@/components/marketing';

export const metadata: Metadata = {
  title: 'Professional Pricing | CommonGround',
  description: 'Free professional access for attorneys, GALs, mediators, and evaluators. Optional practice plans add AI intake, court-order OCR, included reports, and featured directory placement.',
};

/**
 * Professional Pricing Page
 *
 * Free-to-practice model: reviewing a client case is always free.
 * Paid tiers sell practice tools (AI intake, OCR, included reports) and
 * growth (featured directory placement, firm management).
 */

const professionalPlans = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    tagline: 'Up to 3 active cases',
    description: 'Review client cases at no cost — ever. Get invited by a parent or listed in our directory.',
    features: [
      'Read access to invited cases',
      'Case timeline & communications view',
      'Compliance & exchange metrics',
      'Secure client messaging',
      'Directory listing',
      'Court-ready reports, pay per report',
    ],
    cta: 'Create Free Account',
    ctaLink: '/register?redirect=/professional/onboarding',
  },
  {
    name: 'Solo',
    price: '$49',
    period: '/month',
    tagline: 'Up to 15 active cases',
    description: 'The full toolkit for independent attorneys, mediators, and GALs.',
    features: [
      'Everything in Starter',
      'ARIA-assisted client intake',
      'Court-order OCR & field locking',
      'Compliance reports included',
      'Call logging',
      'Enhanced directory profile',
    ],
    cta: 'Start 14-Day Trial',
    ctaLink: '/register?redirect=/professional/onboarding',
  },
  {
    name: 'Firm',
    price: '$249',
    period: '/month',
    tagline: '50 cases · 5 team members',
    description: 'Run the practice and grow it — team workflow plus featured placement where parents search.',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      'Everything in Solo',
      'Firm management & case queue',
      'Firm templates & analytics',
      'Featured directory placement',
      'Bulk actions & exports',
      'Priority support',
    ],
    cta: 'Start 14-Day Trial',
    ctaLink: '/register?redirect=/professional/onboarding',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    tagline: 'Unlimited cases & seats',
    description: 'For large firms, court programs, and organizations with high volume needs.',
    features: [
      'Everything in Firm',
      'Unlimited cases & team members',
      'API access',
      'Custom integrations',
      'White-label options',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    ctaLink: '/help/contact?type=enterprise',
  },
];

const reportProducts = [
  { name: 'Court Investigation Package', price: '$149', description: 'Comprehensive analysis of communication, schedule, and custody exchanges.' },
  { name: 'Custody Compliance Report', price: '$99', description: 'Agreement adherence, schedule compliance rates, and exchange history.' },
  { name: 'Communication Analysis Report', price: '$79', description: 'Message patterns, tone trends, and ARIA intervention history.' },
  { name: 'Financial Compliance Report', price: '$79', description: 'Expense reimbursements and obligation payments, fully audited.' },
];

const roles = [
  {
    icon: Scale,
    title: 'Attorneys',
    description: 'Open every case to a verified, timestamped record — communications, exchanges, and finances — instead of a box of screenshots.',
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
    title: 'Win New Clients',
    description: 'Parents searching for help find you in our professional directory and can request your firm in one click.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Dedicated Support',
    description: 'Priority support for professionals with complex questions or integration needs.',
  },
];

const faqs = [
  {
    question: 'Is professional access really free?',
    answer: 'Yes. Reviewing cases clients invite you to — timeline, communications, schedules, and compliance metrics — is free forever, for up to 3 active cases. Paid plans add practice tools like AI-assisted intake, court-order OCR, included reports, higher case limits, and featured directory placement.',
  },
  {
    question: 'What access do I get to client cases?',
    answer: 'You get read-only access to cases where parents have granted you access, with scoped permissions and a complete audit trail. This includes communication history, agreement drafts, schedules, financial records, and compliance metrics. You cannot modify anything — only view, message, and export.',
  },
  {
    question: 'How do court-ready reports work?',
    answer: 'Every report is timestamped, SHA-256 hashed, and cryptographically signed, with a public verification number anyone — including opposing counsel or the court — can check. On the free Starter plan you purchase reports individually ($79–$149). Solo and above include compliance reports in the subscription.',
  },
  {
    question: 'How does the directory bring me clients?',
    answer: 'Parents on CommonGround browse the professional directory when they need an attorney, mediator, or evaluator, and can request to connect with your firm in one click. Every plan includes a listing; Firm plans and above get featured placement.',
  },
  {
    question: 'Do my clients have to pay for me to access their case?',
    answer: 'No. Clients on any plan — including the free plan — can grant you access to their case. Your clients choose their own plans based on the features they want.',
  },
  {
    question: 'How does billing work?',
    answer: 'Paid plans are billed monthly or annually (annual gets 2 months free) and include a 14-day free trial. Cancel anytime — your free Starter access and directory listing remain.',
  },
  {
    question: 'Do you offer bar association discounts?',
    answer: 'Yes, we partner with several state bar associations to offer member discounts. Contact us to check if your bar association is a partner.',
  },
  {
    question: 'Can I white-label CommonGround for my firm?',
    answer: 'Enterprise plans include white-label options. You can customize colors, add your firm\'s logo, and use a custom domain for client-facing pages.',
  },
];

export default function ProfessionalPricingPage() {
  return (
    <div className="bg-background">
      {/* FAQPage structured data — paired with the visible FAQ below */}
      <FaqJsonLd items={faqs} />
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
              Free to practice. <span className="text-cg-sage">Pay to grow.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Reviewing a client&apos;s case is always free. Upgrade when you want the intake, reporting, and lead-generation tools that grow your practice.
            </p>
            <p className="text-sm text-muted-foreground">
              Looking for parent pricing?{' '}
              <Link href="/pricing" className="text-cg-sage hover:underline">
                See individual plans
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
              Start free. Upgrade when your caseload — or your client pipeline — asks for it.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {professionalPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-card rounded-2xl border ${
                  plan.highlighted
                    ? 'border-cg-sage shadow-xl lg:scale-105'
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
                    {plan.tagline}
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
            Paid plans include a 14-day free trial. Annual billing gets 2 months free. Cancel anytime.
            <br />
            Growing past 5 seats? Mid-Size ($599/mo) covers 150 cases and 15 team members —{' '}
            <Link href="/help/contact?type=professional" className="text-cg-sage hover:underline">
              talk to us
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Court-Ready Reports, à la carte */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Court-ready reports, on demand
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every report is timestamped, SHA-256 verified, and cryptographically signed — with a public
              verification number the court can check. Buy them one at a time on the free plan, or get
              compliance reports included with Solo and above.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {reportProducts.map((report) => (
              <div key={report.name} className="bg-background rounded-xl p-6 border border-border/50 flex flex-col">
                <FileText className="w-8 h-8 text-cg-sage mb-3" />
                <h3 className="font-semibold text-foreground mb-1">{report.name}</h3>
                <div className="text-2xl font-bold text-foreground mb-2">{report.price}</div>
                <p className="text-sm text-muted-foreground flex-1">{report.description}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Need it fast? Rush delivery (48h) +$50 · Urgent delivery (24h) +$100.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
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

      {/* How It Works */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-foreground mb-4">
                How It Works
              </h2>
            </div>

            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-10 h-10 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Create Your Free Account</h3>
                  <p className="text-muted-foreground">
                    Sign up in minutes and get listed in the professional directory. No credit card, no install.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-10 h-10 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Get Connected to Cases</h3>
                  <p className="text-muted-foreground">
                    A client invites you by email, or a parent finds your firm in the directory and requests you in one click.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-10 h-10 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Review With Consent</h3>
                  <p className="text-muted-foreground">
                    Parents approve your access with scoped permissions. Every view is logged in an audit trail.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-10 h-10 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Export Court-Ready Documentation</h3>
                  <p className="text-muted-foreground">
                    Generate verified, tamper-evident reports — per report on the free plan, included with Solo and above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
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
                className="group bg-card rounded-xl border border-border/50 overflow-hidden"
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
            Ready to open a clean case file?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Create your free professional account today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register?redirect=/professional/onboarding"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              Create Free Account
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

import { Metadata } from 'next';
import Link from 'next/link';
import {
  Check,
  ArrowRight,
  Building,
  FileText,
  Shield,
  Clock,
  Users,
  Scale,
  Gavel,
  BarChart3,
  Lock,
  Workflow,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Court Pricing | CommonGround',
  description: 'CommonGround for family courts. Per-form processing, case management integrations, and judicial dashboards.',
};

/**
 * Court Pricing Page
 *
 * Pricing and information for family courts and judicial systems.
 */

const courtFeatures = [
  {
    icon: FileText,
    title: 'Digital Form Processing',
    description: 'Parents complete court-required parenting plans digitally. Reduce paper, improve accuracy, and speed up processing.',
  },
  {
    icon: Shield,
    title: 'Verified Documentation',
    description: 'All agreements and communications are SHA-256 hashed with timestamps for court-admissible evidence.',
  },
  {
    icon: BarChart3,
    title: 'Compliance Dashboards',
    description: 'Track parenting plan compliance across cases. Identify high-conflict cases before they escalate.',
  },
  {
    icon: Workflow,
    title: 'Case Management Integration',
    description: 'Integrate with existing court case management systems via secure API connections.',
  },
  {
    icon: Lock,
    title: 'Secure Access Controls',
    description: 'Role-based access for judges, clerks, GALs, and attorneys with full audit logging.',
  },
  {
    icon: Clock,
    title: 'Reduced Hearing Time',
    description: 'Better documentation means fewer disputes over facts, leading to faster case resolution.',
  },
];

const pricingModels = [
  {
    name: 'Per-Form Processing',
    description: 'Pay only for what you use',
    price: '$15',
    unit: '/parenting plan',
    features: [
      'Digital parenting plan completion',
      'PDF generation for filing',
      'E-signature collection',
      'Basic compliance tracking',
      'Standard support',
    ],
    cta: 'Request Quote',
    ctaLink: '/help/contact?type=court',
  },
  {
    name: 'Court Subscription',
    description: 'Unlimited processing for busy courts',
    price: 'Custom',
    unit: '/month',
    highlighted: true,
    features: [
      'Unlimited form processing',
      'Case management integration',
      'Judicial dashboard',
      'Advanced analytics',
      'Compliance monitoring',
      'Dedicated support team',
      'Staff training included',
    ],
    cta: 'Contact Sales',
    ctaLink: '/help/contact?type=court-enterprise',
  },
  {
    name: 'State/County Enterprise',
    description: 'Multi-courthouse deployment',
    price: 'Custom',
    unit: '/year',
    features: [
      'Everything in Subscription',
      'Multi-location support',
      'Centralized administration',
      'Custom branding',
      'On-premise option available',
      'SLA guarantees',
      'Executive reporting',
      'Legislative compliance support',
    ],
    cta: 'Schedule Demo',
    ctaLink: '/help/contact?type=court-state',
  },
];

const outcomes = [
  { value: '40%', label: 'Reduction in modification hearings' },
  { value: '60%', label: 'Faster parenting plan completion' },
  { value: '75%', label: 'Decrease in incomplete filings' },
  { value: '90%', label: 'Parent satisfaction with process' },
];

const useCases = [
  {
    title: 'Initial Parenting Plan Filing',
    description: 'Parents complete comprehensive parenting plans online before their hearing, arriving prepared with court-ready documentation.',
  },
  {
    title: 'Modification Requests',
    description: 'When circumstances change, parents can propose modifications through CommonGround, documenting reasoning and obtaining consent.',
  },
  {
    title: 'Compliance Monitoring',
    description: 'Courts can monitor compliance with existing orders, identifying patterns before they escalate to enforcement actions.',
  },
  {
    title: 'GAL/Evaluator Access',
    description: 'Grant temporary access to evaluators and GALs for more informed recommendations to the court.',
  },
];

const faqs = [
  {
    question: 'How does CommonGround integrate with our case management system?',
    answer: 'We offer REST API integration with common court case management systems. Our team works directly with your IT department to establish secure connections. For systems without API access, we provide secure file-based data exchange options.',
  },
  {
    question: 'Is CommonGround compliant with state court technology standards?',
    answer: 'Yes. We comply with NCSC (National Center for State Courts) guidelines and work with each jurisdiction to meet specific state requirements. Our infrastructure meets or exceeds court security standards.',
  },
  {
    question: 'Can judges access cases directly?',
    answer: 'Judicial access can be configured based on your court\'s policies. Options include read-only dashboard access, case-by-case access grants, or integration with existing judicial portals.',
  },
  {
    question: 'What training is provided?',
    answer: 'All subscription and enterprise plans include comprehensive training for court staff, clerks, and judges. We provide on-site training, webinars, and ongoing support resources.',
  },
  {
    question: 'How do you handle data retention and public records?',
    answer: 'Data retention policies are configurable to match your jurisdiction\'s requirements. We support public records request workflows and can redact sensitive information as needed.',
  },
  {
    question: 'What if parents don\'t have internet access?',
    answer: 'Courts can provide in-office kiosk access, or court staff can assist with form completion. Paper backup options are available for accessibility compliance.',
  },
];

export default function CourtPricingPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-cg-sage/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-slate/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage-subtle rounded-full mb-6">
              <Gavel className="w-4 h-4 text-cg-sage" />
              <span className="text-sm font-medium text-cg-sage">For Family Courts</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              Modernize your <span className="text-cg-sage">family court</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Digital parenting plans, compliance monitoring, and better outcomes for families.
            </p>
            <p className="text-sm text-muted-foreground">
              Looking for other pricing?{' '}
              <Link href="/pricing" className="text-cg-sage hover:underline">
                Parent plans
              </Link>
              {' · '}
              <Link href="/pricing/professionals" className="text-cg-sage hover:underline">
                Professional plans
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="py-12 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card rounded-2xl border border-border/50 p-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {outcomes.map((outcome) => (
                <div key={outcome.label} className="text-center">
                  <div className="text-4xl font-bold text-cg-sage mb-2">
                    {outcome.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {outcome.label}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-6">
              *Based on pilot program data. Individual results may vary.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Built for Family Courts
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tools designed specifically for the unique needs of family court administration.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {courtFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-card rounded-xl p-6 border border-border/50"
                >
                  <div className="w-12 h-12 bg-cg-sage-subtle rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-cg-sage" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Flexible Pricing Options
            </h2>
            <p className="text-muted-foreground">
              From per-form processing to enterprise deployment.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingModels.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-background rounded-2xl border ${
                  plan.highlighted
                    ? 'border-cg-sage shadow-xl'
                    : 'border-border/50'
                } p-8 flex flex-col`}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground mb-1">
                    {plan.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.unit}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-cg-sage flex-shrink-0 mt-0.5" />
                      <span className="text-foreground text-sm">{feature}</span>
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
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              How Courts Use CommonGround
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {useCases.map((useCase, index) => (
              <div
                key={useCase.title}
                className="bg-card rounded-xl p-6 border border-border/50"
              >
                <div className="w-8 h-8 bg-cg-sage rounded-lg flex items-center justify-center text-white font-semibold mb-4">
                  {index + 1}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{useCase.title}</h3>
                <p className="text-sm text-muted-foreground">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Implementation Process */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-foreground mb-4">
                Implementation Process
              </h2>
              <p className="text-muted-foreground">
                We make deployment straightforward with dedicated support.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-12 h-12 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Discovery & Planning</h3>
                  <p className="text-muted-foreground">
                    We meet with your team to understand workflows, integration requirements, and customization needs.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Configuration & Integration</h3>
                  <p className="text-muted-foreground">
                    Our team configures forms for your jurisdiction and establishes secure connections with your systems.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Pilot Program</h3>
                  <p className="text-muted-foreground">
                    We run a pilot with select cases to refine workflows and gather feedback before full deployment.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Training & Launch</h3>
                  <p className="text-muted-foreground">
                    Comprehensive training for all staff, followed by full deployment with ongoing support.
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
            Ready to modernize your family court?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Schedule a demo to see how CommonGround can help your court serve families better.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/help/contact?type=court-demo"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              Schedule Demo
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/help/contact?type=court"
              className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage hover:text-white"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import { Metadata } from 'next';
import Link from 'next/link';
import {
  Scale,
  Users,
  Building2,
  FileText,
  Shield,
  Clock,
  Eye,
  ArrowRight,
  Check,
  BarChart3,
  MessageSquare,
  Calendar,
  Download,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Professionals | CommonGround',
  description: 'CommonGround for family law professionals. Help your clients co-parent better with verified documentation and reduced conflict.',
};

/**
 * Professionals Landing Page
 *
 * Use case and feature page for attorneys, GALs, mediators, and other family law professionals.
 */

const professionalRoles = [
  {
    icon: Scale,
    title: 'Family Law Attorneys',
    subtitle: 'Represent clients with better documentation',
    description: 'Your clients arrive with organized communication records, verified compliance data, and court-ready documentation instead of boxes of screenshots.',
    benefits: [
      'Court-admissible evidence packages',
      'Real-time case monitoring',
      'Automated parenting plan generation',
      'Reduced discovery disputes',
    ],
  },
  {
    icon: Users,
    title: 'Guardians ad Litem',
    subtitle: 'Advocate with complete information',
    description: 'Access verified communication history, compliance metrics, and behavioral patterns to make informed recommendations for children.',
    benefits: [
      'Read-only case access',
      'Communication pattern analysis',
      'Compliance tracking dashboards',
      'Objective behavioral data',
    ],
  },
  {
    icon: Building2,
    title: 'Mediators',
    subtitle: 'Facilitate more productive sessions',
    description: 'Review shared agreement drafts, understand communication dynamics, and help parents build on existing progress.',
    benefits: [
      'Draft agreement access',
      'Communication history review',
      'Real-time collaborative editing',
      'Session note integration',
    ],
  },
  {
    icon: FileText,
    title: 'Custody Evaluators',
    subtitle: 'Evaluate with verified data',
    description: 'Base recommendations on objective data: actual communication records, schedule compliance, and documented interactions.',
    benefits: [
      'Verified communication logs',
      'GPS-verified exchanges',
      'Good faith metrics',
      'Trend analysis over time',
    ],
  },
];

const features = [
  {
    icon: Eye,
    title: 'Case Access Portal',
    description: 'Secure, time-limited access to client cases. See messages, agreements, schedules, and compliance data in one dashboard.',
  },
  {
    icon: Download,
    title: 'Court Export Packages',
    description: 'Generate verified evidence packages with SHA-256 integrity hashes. Select date ranges, apply redactions, and export court-ready PDFs.',
  },
  {
    icon: BarChart3,
    title: 'Compliance Analytics',
    description: 'Track schedule adherence, communication quality, and agreement compliance over time with visual dashboards.',
  },
  {
    icon: UserCheck,
    title: 'Voucher System',
    description: 'Provide clients with premium access vouchers. Both parents get upgraded features, and you get case visibility.',
  },
  {
    icon: Shield,
    title: 'Audit Trail',
    description: 'Every access is logged with timestamps. Full transparency for you, your clients, and the court.',
  },
  {
    icon: AlertCircle,
    title: 'Alert Notifications',
    description: 'Get notified of concerning patterns: missed exchanges, escalating communication, or agreement violations.',
  },
];

const workflow = [
  {
    step: 1,
    title: 'Invite Your Client',
    description: 'Generate a voucher code from your professional dashboard and share it with your client.',
  },
  {
    step: 2,
    title: 'Client Onboards',
    description: 'Your client registers with the voucher code, getting premium access and inviting their co-parent.',
  },
  {
    step: 3,
    title: 'Request Access',
    description: 'Once both parents are on the platform, request case access through the professional portal.',
  },
  {
    step: 4,
    title: 'Monitor & Export',
    description: 'Review case activity, track compliance, and generate court-ready documentation as needed.',
  },
];

const testimonials = [
  {
    quote: "CommonGround has transformed how I handle custody cases. My clients come to hearings with verified documentation instead of he-said-she-said disputes.",
    author: "Sarah M.",
    role: "Family Law Attorney",
    location: "Los Angeles, CA",
  },
  {
    quote: "The compliance tracking is invaluable. I can show the court objective data about schedule adherence rather than relying on conflicting parental accounts.",
    author: "Michael R.",
    role: "Guardian ad Litem",
    location: "Chicago, IL",
  },
  {
    quote: "Mediation sessions are so much more productive when I can review the communication history beforehand. I understand the dynamics before we even start.",
    author: "Jennifer L.",
    role: "Family Mediator",
    location: "Seattle, WA",
  },
];

const faqs = [
  {
    question: 'How do I get access to my client\'s case?',
    answer: 'After your client joins CommonGround (using your voucher or on their own), they can grant you access from their settings. You\'ll receive an email to verify your credentials and accept the access grant.',
  },
  {
    question: 'What information can I see?',
    answer: 'With case access, you can view: all messages between parents, agreement drafts and history, schedule events and compliance data, expense records, and activity logs. You cannot modify anything—access is read-only.',
  },
  {
    question: 'Is the data court-admissible?',
    answer: 'Yes. All exports include SHA-256 integrity verification, timestamps, and chain of custody documentation. The platform is designed specifically for court-admissible evidence.',
  },
  {
    question: 'How long does access last?',
    answer: 'Access duration is set by your client when granting access. Typical periods are 90 days for attorneys and 120 days for GALs. Clients can extend or revoke access at any time.',
  },
  {
    question: 'Can I access cases from multiple clients?',
    answer: 'Absolutely. Your professional dashboard shows all cases where you\'ve been granted access. You can switch between cases and manage them all from one interface.',
  },
  {
    question: 'What if my client\'s co-parent won\'t join?',
    answer: 'CommonGround works best with both parents, but single-parent functionality is available. Your client can still document their communications, track their schedule compliance, and build agreements.',
  },
];

export default function ProfessionalsPage() {
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
              <Scale className="w-4 h-4 text-cg-sage" />
              <span className="text-sm font-medium text-cg-sage">For Family Law Professionals</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              Better outcomes for your <span className="text-cg-sage">clients and their children</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              CommonGround gives you verified documentation, objective compliance data,
              and tools to help your clients communicate better.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/pricing/professionals"
                className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
              >
                View Professional Plans
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/help/contact?type=professional"
                className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage hover:text-white"
              >
                Schedule Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Specific Sections */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Built for how you work
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every family law professional has unique needs. Here's how CommonGround helps.
            </p>
          </div>

          <div className="space-y-16">
            {professionalRoles.map((role, index) => {
              const Icon = role.icon;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={role.title}
                  className={`grid lg:grid-cols-2 gap-12 items-center ${
                    isEven ? '' : 'lg:flex-row-reverse'
                  }`}
                >
                  <div className={isEven ? '' : 'lg:order-2'}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage-subtle rounded-full mb-4">
                      <Icon className="w-4 h-4 text-cg-sage" />
                      <span className="text-sm font-medium text-cg-sage">{role.subtitle}</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4">
                      {role.title}
                    </h3>
                    <p className="text-lg text-muted-foreground mb-6">
                      {role.description}
                    </p>
                    <ul className="space-y-3">
                      {role.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-cg-sage-subtle flex items-center justify-center">
                            <Check className="w-3 h-3 text-cg-sage" />
                          </div>
                          <span className="text-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={isEven ? '' : 'lg:order-1'}>
                    <div className="bg-gradient-to-br from-cg-sage-subtle to-background rounded-3xl p-8 aspect-video flex items-center justify-center border border-border/50">
                      <Icon className="w-24 h-24 text-cg-sage/30" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Professional Tools
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to support your clients and build stronger cases.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-background rounded-xl p-6 border border-border/50"
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

      {/* Workflow Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Simple Workflow
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get your clients on CommonGround and start seeing better outcomes.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-8">
              {workflow.map((item, index) => (
                <div key={item.step} className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-cg-sage rounded-full flex items-center justify-center text-white font-semibold">
                      {item.step}
                    </div>
                    {index < workflow.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-4" />
                    )}
                  </div>
                  <div className="flex-1 pb-8">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Trusted by Professionals
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-background rounded-xl p-6 border border-border/50"
              >
                <div className="text-cg-sage text-4xl font-serif mb-4">"</div>
                <p className="text-foreground mb-6">{testimonial.quote}</p>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                </div>
              </div>
            ))}
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
            Ready to transform your practice?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join hundreds of family law professionals who use CommonGround
            to help their clients co-parent better.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing/professionals"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              View Plans & Pricing
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/register?plan=pro-practice"
              className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage hover:text-white"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

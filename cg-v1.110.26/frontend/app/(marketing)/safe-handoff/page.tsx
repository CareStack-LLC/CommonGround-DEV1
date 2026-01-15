import { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  MapPin,
  Clock,
  FileText,
  Lock,
  Heart,
  Phone,
  ArrowRight,
  Check,
  Users,
  AlertTriangle,
  Eye,
  MessageSquare,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Safe Handoff - Custody Exchange Safety | CommonGround',
  description: 'Safe custody exchanges for survivors of domestic violence. GPS verification, zero-contact documentation, and court-ready records. No direct communication required.',
  keywords: 'custody exchange app, DV custody, domestic violence co-parenting, safe custody handoff, custody documentation',
};

/**
 * Safe Handoff Landing Page
 *
 * DV-focused marketing page emphasizing safety features,
 * zero-contact workflows, and nonprofit partnership program.
 */

const safetyFeatures = [
  {
    icon: MapPin,
    title: 'GPS Verification',
    description: 'Silent, automatic location logging at every exchange. Build a timestamped, verifiable record without any interaction.',
  },
  {
    icon: MessageSquare,
    title: 'Zero Direct Contact',
    description: 'All communication runs through ARIA\'s AI filter. No phone calls, no texts, no face-to-face conversation required.',
  },
  {
    icon: Eye,
    title: 'Third-Party Witnesses',
    description: 'Invite trusted contacts from your Circle to receive real-time exchange notifications and logs.',
  },
  {
    icon: FileText,
    title: 'Court-Ready Documentation',
    description: 'Every exchange creates an immutable, timestamped record with location data ready for legal proceedings.',
  },
  {
    icon: Clock,
    title: 'Pattern Documentation',
    description: 'Track late arrivals, no-shows, and schedule violations over time. Generate compliance reports automatically.',
  },
  {
    icon: Lock,
    title: 'Privacy Protection',
    description: 'Your address is never shared. Exchange locations can be set to neutral, public spaces.',
  },
];

const howItWorks = [
  {
    step: 1,
    title: 'Schedule Through the App',
    description: 'Set up exchange times and locations without any direct communication. ARIA handles all coordination.',
  },
  {
    step: 2,
    title: 'Arrive and Check In',
    description: 'GPS silently logs your arrival time and location. No need to speak to or see the other parent.',
  },
  {
    step: 3,
    title: 'Complete the Handoff',
    description: 'Confirm the exchange with one tap. Both parents\' check-ins create a verified record.',
  },
  {
    step: 4,
    title: 'Automatic Documentation',
    description: 'Every exchange is logged with timestamps, locations, and compliance status for court records.',
  },
];

const crisisResources = [
  {
    name: 'National Domestic Violence Hotline',
    number: '1-800-799-7233',
    description: 'Available 24/7, confidential support',
  },
  {
    name: 'Crisis Text Line',
    number: 'Text HOME to 741741',
    description: 'Free 24/7 crisis counseling via text',
  },
  {
    name: 'Love Is Respect (Youth)',
    number: '1-866-331-9474',
    description: 'For young adults experiencing abuse',
  },
];

const partnerBenefits = [
  'Free Plus tier access for your clients',
  'Bulk grant codes for your organization',
  'Co-branded safety resources',
  'Priority support for survivors',
  'Training materials for staff',
  'Quarterly impact reporting',
];

const testimonials = [
  {
    quote: "I haven't had to speak to my ex in 8 months. Every exchange is documented, and my attorney has everything she needs for our case.",
    context: "Domestic violence survivor",
  },
  {
    quote: "The GPS logging gave me proof when he kept showing up late. The court finally took my concerns seriously because I had documentation.",
    context: "Using CommonGround for 1 year",
  },
  {
    quote: "I feel safe for the first time since the separation. The app handles everything so I don't have to.",
    context: "Referred through DV nonprofit",
  },
];

export default function SafeHandoffPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-cg-sage/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-amber/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage-subtle rounded-full mb-6">
                <Shield className="w-4 h-4 text-cg-sage" />
                <span className="text-sm font-medium text-cg-sage">
                  Safety-First Design
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
                Safe custody exchanges.{' '}
                <span className="text-cg-sage">Zero contact.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                You shouldn't have to see, speak to, or interact with your co-parent to
                raise your children safely. CommonGround handles everything.
              </p>
              <p className="text-muted-foreground mb-8">
                Built in partnership with domestic violence organizations, Safe Handoff
                provides GPS-verified custody exchanges with complete documentation
                for court proceedings.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="#grant-code"
                  className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all hover:bg-cg-sage hover:text-white"
                >
                  Have a Grant Code?
                </Link>
              </div>
            </div>

            {/* Crisis Resources Sidebar */}
            <div className="bg-card rounded-2xl border border-border p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-cg-sage-subtle rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-cg-sage" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Need Help Now?</h3>
                  <p className="text-sm text-muted-foreground">These resources are free and confidential</p>
                </div>
              </div>
              <div className="space-y-4">
                {crisisResources.map((resource) => (
                  <div key={resource.name} className="p-4 bg-background rounded-lg border border-border/50">
                    <div className="font-medium text-foreground">{resource.name}</div>
                    <div className="text-lg font-semibold text-cg-sage">
                      {resource.number}
                    </div>
                    <div className="text-sm text-muted-foreground">{resource.description}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                If you are in immediate danger, call 911.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Features */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Safety Built Into Every Feature
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              CommonGround was designed with survivors in mind. Every feature prioritizes
              your safety and minimizes contact with your co-parent.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {safetyFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-background rounded-xl p-6 border border-border/50 hover:border-cg-sage/30 transition-colors"
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

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              How Safe Handoff Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple, silent, and fully documented.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid gap-8">
              {howItWorks.map((step) => (
                <div key={step.step} className="flex gap-6 items-start">
                  <div className="w-12 h-12 bg-cg-sage rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
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
              Stories of Safety
            </h2>
            <p className="text-lg text-muted-foreground">
              Real experiences from survivors using CommonGround.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-background rounded-xl p-6 border border-border/50"
              >
                <div className="text-cg-sage text-4xl font-serif mb-4">"</div>
                <p className="text-foreground mb-6">{testimonial.quote}</p>
                <div className="text-sm text-muted-foreground">{testimonial.context}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grant Code Section */}
      <section id="grant-code" className="py-20 bg-gradient-to-br from-cg-sage-subtle to-cg-slate-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage/20 rounded-full mb-6">
                <Heart className="w-4 h-4 text-cg-sage" />
                <span className="text-sm font-medium text-cg-sage">
                  Nonprofit Partner Program
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
                Free Access for Survivors
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                If you've received a grant code from a domestic violence organization,
                shelter, or advocacy group, you can access CommonGround Plus for free.
              </p>
              <p className="text-muted-foreground mb-8">
                Grant codes provide full access to all safety features including GPS verification,
                court documentation, and priority support - at no cost to you.
              </p>
              <div className="bg-card rounded-xl p-6 border border-border">
                <h4 className="font-semibold text-foreground mb-4">How to Redeem Your Code</h4>
                <ol className="space-y-3 text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-cg-sage-subtle rounded-full flex items-center justify-center text-sm text-cg-sage font-medium">1</span>
                    Create a free CommonGround account
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-cg-sage-subtle rounded-full flex items-center justify-center text-sm text-cg-sage font-medium">2</span>
                    Go to Settings &gt; Billing
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-cg-sage-subtle rounded-full flex items-center justify-center text-sm text-cg-sage font-medium">3</span>
                    Enter your grant code in the redemption form
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-cg-sage-subtle rounded-full flex items-center justify-center text-sm text-cg-sage font-medium">4</span>
                    Instant access to Plus features
                  </li>
                </ol>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-8 border border-border">
              <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-cg-sage" />
                For Nonprofit Organizations
              </h3>
              <p className="text-muted-foreground mb-6">
                Partner with CommonGround to provide safe co-parenting tools to your clients.
                Grant codes are available for DV shelters, advocacy organizations, and legal aid services.
              </p>
              <ul className="space-y-3 mb-8">
                {partnerBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-cg-sage flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="mailto:partnerships@commonground.co?subject=Safe Handoff Grant Partnership"
                className="inline-flex items-center justify-center gap-2 w-full bg-cg-sage text-white font-medium px-6 py-3 rounded-lg transition-all hover:bg-cg-sage-light"
              >
                Become a Partner Organization
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Warning Section */}
      <section className="py-12 bg-amber-50 dark:bg-amber-950/20 border-y border-amber-200 dark:border-amber-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-2">
                A Note on Safety
              </h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                While CommonGround provides documentation and reduces contact, it cannot guarantee
                physical safety. If you are in immediate danger, contact law enforcement or the
                National Domestic Violence Hotline at 1-800-799-7233. If you have a protective order,
                ensure your co-parent is aware of its terms. CommonGround documentation can support
                but does not replace legal protections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-12 h-12 text-cg-sage mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
            You deserve to feel safe
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Start documenting your custody exchanges today. No credit card required.
            Your safety is our priority.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 border-2 border-border text-foreground font-medium px-8 py-4 rounded-full text-lg transition-all hover:bg-muted"
            >
              View All Features
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  FileText,
  MessageSquare,
  Brain,
  Scale,
  Eye,
  Lock,
  ArrowRight,
  Check,
  AlertTriangle,
  Clock,
  BarChart3,
  Download,
  Gavel,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'High-Conflict Co-Parenting App | Custody Documentation | CommonGround',
  description: 'The co-parenting app designed for high-conflict situations. Document everything, protect yourself, and build evidence for court. AI-powered conflict prevention.',
  keywords: 'high conflict custody, co-parenting with a narcissist, custody documentation app, parallel parenting app, high conflict divorce, custody battle evidence, co-parenting app narcissist',
};

/**
 * High-Conflict Co-Parenting Landing Page
 *
 * SEO-focused page targeting parents in difficult custody situations.
 * Emphasizes documentation, protection, and court-ready evidence.
 */

const protectionFeatures = [
  {
    icon: MessageSquare,
    title: 'ARIA Conflict Shield',
    description: 'Every message is analyzed by AI before sending. Remove hostile language, stay calm, and never give ammunition.',
  },
  {
    icon: FileText,
    title: 'Complete Documentation',
    description: 'Every message, schedule change, exchange, and agreement is timestamped and stored. Nothing can be denied or gaslit.',
  },
  {
    icon: Scale,
    title: 'Court-Ready Evidence',
    description: 'Export comprehensive evidence packages with hash verification. Judges and attorneys can trust your records.',
  },
  {
    icon: Eye,
    title: 'Pattern Recognition',
    description: 'Track and document patterns of behavior: late pickups, last-minute changes, communication violations.',
  },
  {
    icon: BarChart3,
    title: 'Compliance Metrics',
    description: 'Objective data on who follows the agreement and who doesn\'t. No more "he said, she said."',
  },
  {
    icon: Lock,
    title: 'Tamper-Proof Records',
    description: 'SHA-256 hash verification ensures records cannot be altered. Every entry is cryptographically sealed.',
  },
];

const parallelParentingFeatures = [
  {
    title: 'Minimal Direct Contact',
    description: 'ARIA handles coordination so you don\'t have to engage in unnecessary back-and-forth.',
  },
  {
    title: 'Boundary Enforcement',
    description: 'Set communication windows, topic restrictions, and response timeframes.',
  },
  {
    title: 'Automatic Record Keeping',
    description: 'Everything is documented automatically. Focus on your kids, not on building evidence.',
  },
  {
    title: 'Good Faith Protection',
    description: 'Your constructive communication attempts are tracked. Their violations are too.',
  },
];

const warningSignsYouNeedThis = [
  'Your co-parent twists your words or denies conversations',
  'You feel anxious every time you see a message notification',
  'Court orders seem like suggestions to your co-parent',
  'Schedule changes come at the last minute with unreasonable demands',
  'You\'ve been told you\'re "too difficult" for wanting basic cooperation',
  'Your co-parent refuses to communicate except through you',
  'Important information about your children is withheld',
  'Every interaction feels like a battle you\'re losing',
];

const courtExportFeatures = [
  {
    title: 'Communication Logs',
    description: 'Complete message history with timestamps, ARIA interventions, and response times.',
  },
  {
    title: 'Schedule Compliance',
    description: 'Visual timeline of all exchanges, late arrivals, no-shows, and modifications.',
  },
  {
    title: 'Good Faith Metrics',
    description: 'Objective measures of each parent\'s willingness to cooperate and communicate constructively.',
  },
  {
    title: 'Pattern Analysis',
    description: 'AI-identified patterns in communication and behavior over time.',
  },
  {
    title: 'Evidence Package',
    description: 'Court-formatted PDF with hash verification, ready for legal proceedings.',
  },
  {
    title: 'Expert Integration',
    description: 'Share read-only access with attorneys, GALs, therapists, or custody evaluators.',
  },
];

const testimonials = [
  {
    quote: "My ex used to deny everything. Now I have receipts for every single interaction. When he told the judge I 'never respond,' I showed them my response times.",
    context: "Parent in custody modification case",
  },
  {
    quote: "ARIA stopped me from sending messages I would have regretted. My attorney said my communication record was the strongest evidence we had.",
    context: "Using CommonGround for 14 months",
  },
  {
    quote: "The pattern tracking was what convinced the evaluator. They could see exactly who was causing the conflict - and it wasn't me.",
    context: "Completed custody evaluation",
  },
];

const faqs = [
  {
    question: 'How is this different from just texting?',
    answer: 'Text messages can be deleted, screenshots can be questioned, and context is easily lost. CommonGround creates tamper-proof records with timestamps, read receipts, response times, and hash verification that courts can trust. Every message is permanently logged and cannot be denied.',
  },
  {
    question: 'What if my co-parent refuses to use the app?',
    answer: 'You can still use CommonGround for one-sided documentation. Your messages are logged even if they respond via text. Many courts are now ordering the use of parenting apps in high-conflict cases. Your attorney can request it be included in your parenting plan.',
  },
  {
    question: 'Can my co-parent see that ARIA suggested changes?',
    answer: 'They only see the final message you send. They cannot see your original draft or that you used ARIA. However, the fact that you consistently engage with ARIA constructively is tracked in your good faith metrics.',
  },
  {
    question: 'Will this help in court?',
    answer: 'CommonGround evidence has been used successfully in custody modifications, contempt hearings, and protective order cases. The objective nature of the data - timestamps, GPS verification, compliance metrics - provides the documentation courts need. Several family law attorneys now recommend it to clients.',
  },
  {
    question: 'What about emergency situations?',
    answer: 'CommonGround is for regular co-parenting communication, not emergencies. For true emergencies involving child safety, always call 911 first. However, all emergency-related follow-up communication should still go through the app for documentation purposes.',
  },
  {
    question: 'How long are records kept?',
    answer: 'All records are kept indefinitely on paid plans. Free tier users have 90-day message history, but upgrade at any time to access complete archives. We recommend maintaining your account through the duration of any ongoing custody case.',
  },
];

export default function HighConflictPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-red-500/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-sage/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
              <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                For High-Conflict Custody Situations
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              Protect yourself.{' '}
              <span className="text-cg-sage">Document everything.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              When co-parenting feels like a constant battle, you need more than
              a calendar app. You need armor.
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              CommonGround gives you AI-powered communication tools and court-ready
              documentation for high-conflict custody situations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
              >
                Start Documenting Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all hover:bg-cg-sage hover:text-white"
              >
                See How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Warning Signs Section */}
      <section className="py-16 bg-red-50 dark:bg-red-950/20 border-y border-red-200 dark:border-red-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Sound Familiar?
            </h2>
            <p className="text-muted-foreground">
              If you're experiencing any of these, you need documentation on your side.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {warningSignsYouNeedThis.map((sign, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-background rounded-lg border border-border/50">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{sign}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Protection Features */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Your Protection Toolkit
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every feature designed to document, protect, and prepare you for court if needed.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {protectionFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-card rounded-xl p-6 border border-border/50 hover:border-cg-sage/30 transition-colors"
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

      {/* Parallel Parenting */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage-subtle rounded-full mb-6">
                <Brain className="w-4 h-4 text-cg-sage" />
                <span className="text-sm font-medium text-cg-sage">Parallel Parenting Mode</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
                When co-parenting isn't possible
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Traditional co-parenting requires cooperation. When that's not possible,
                parallel parenting lets you raise your children effectively while
                minimizing conflict.
              </p>
              <p className="text-muted-foreground mb-8">
                CommonGround is designed for parallel parenting: clear boundaries,
                minimal contact, automatic documentation, and zero opportunity for manipulation.
              </p>
              <div className="space-y-4">
                {parallelParentingFeatures.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-cg-sage-subtle flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3 text-cg-sage" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{feature.title}</span>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-background rounded-2xl p-8 border border-border">
              <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Response Time Tracking
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Your average response</span>
                    <span className="font-semibold text-cg-sage">2.3 hours</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-2 bg-cg-sage rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Co-parent average response</span>
                    <span className="font-semibold text-red-500">18.7 hours</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-2 bg-red-500 rounded-full" style={{ width: '22%' }} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This data is automatically tracked and available in court exports.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Court Export Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-6">
              <Gavel className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Court-Ready</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Evidence That Holds Up
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              When you need to prove what really happened, CommonGround exports give you
              the documentation courts trust.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {courtExportFeatures.map((feature) => (
              <div key={feature.title} className="p-6 bg-card rounded-xl border border-border/50">
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/features"
              className="inline-flex items-center gap-2 text-cg-sage font-medium hover:underline"
            >
              <Download className="w-4 h-4" />
              See a sample court export
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Parents Who Fought Back
            </h2>
            <p className="text-lg text-muted-foreground">
              Documentation changed their cases.
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

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Common Questions
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
                    &#9660;
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

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-cg-sage-subtle to-cg-slate-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-12 h-12 text-cg-sage mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
            Stop fighting blind.
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Every day without documentation is another day of "he said, she said."
            Start building your evidence today.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required. Start documenting in minutes.
          </p>
        </div>
      </section>
    </div>
  );
}

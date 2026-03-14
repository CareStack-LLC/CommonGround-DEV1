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
  Heart,
  Clock,
  BarChart3,
  Download,
  Gavel,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'When Communication Is Difficult | Co-Parenting Support | CommonGround',
  description: 'Co-parenting tools designed for families who need extra structure. Document everything, communicate clearly, and keep your children protected with court-ready records.',
  keywords: 'co-parenting support, custody documentation app, parallel parenting app, structured co-parenting, custody records, co-parenting tools',
};

/**
 * Structured Co-Parenting Landing Page
 *
 * For parents who need extra structure and documentation support.
 * Child-focused, calm tone per brand voice guidelines.
 */

const protectionFeatures = [
  {
    icon: MessageSquare,
    title: 'ARIA Communication Support',
    description: 'Every message is reviewed by AI to help keep conversations constructive and focused on your children.',
  },
  {
    icon: FileText,
    title: 'Complete Documentation',
    description: 'Every message, schedule change, exchange, and agreement is timestamped and securely stored for your records.',
  },
  {
    icon: Scale,
    title: 'Court-Ready Records',
    description: 'Export comprehensive documentation packages with hash verification that attorneys and courts can trust.',
  },
  {
    icon: Eye,
    title: 'Pattern Tracking',
    description: 'Track scheduling patterns, response times, and agreement compliance to maintain clear, objective records.',
  },
  {
    icon: BarChart3,
    title: 'Compliance Metrics',
    description: 'Objective data on schedule adherence and communication responsiveness. Clear facts, not assumptions.',
  },
  {
    icon: Lock,
    title: 'Tamper-Proof Records',
    description: 'SHA-256 hash verification ensures records cannot be altered. Every entry is cryptographically sealed.',
  },
];

const structuredParentingFeatures = [
  {
    title: 'Clear Boundaries',
    description: 'Set communication windows, topic guidelines, and response timeframes that work for your family.',
  },
  {
    title: 'Minimal Direct Contact',
    description: 'ARIA handles coordination so you can focus on your children instead of managing interactions.',
  },
  {
    title: 'Automatic Record Keeping',
    description: 'Everything is documented automatically. Focus on being present for your kids.',
  },
  {
    title: 'Constructive Communication',
    description: 'Your thoughtful communication efforts are tracked. Build a record of good faith cooperation.',
  },
];

const signsYouCouldBenefit = [
  'Communication with your co-parent often feels stressful',
  'You want clear records of all parenting decisions',
  'Schedule changes sometimes cause confusion or frustration',
  'You want to ensure your children have consistent routines',
  'Important information about your children sometimes gets lost',
  'You want structure and clarity in your co-parenting relationship',
  'You need documentation for legal proceedings',
  'You want to focus more on your children and less on coordination',
];

const courtExportFeatures = [
  {
    title: 'Communication Logs',
    description: 'Complete message history with timestamps, ARIA suggestions, and response times.',
  },
  {
    title: 'Schedule Compliance',
    description: 'Visual timeline of all exchanges, modifications, and adherence to agreements.',
  },
  {
    title: 'Cooperation Metrics',
    description: 'Objective measures of each parent\'s communication responsiveness and cooperation.',
  },
  {
    title: 'Pattern Analysis',
    description: 'AI-identified patterns in communication and scheduling over time.',
  },
  {
    title: 'Documentation Package',
    description: 'Court-formatted PDF with hash verification, ready for legal proceedings.',
  },
  {
    title: 'Professional Access',
    description: 'Share read-only access with attorneys, GALs, therapists, or custody evaluators.',
  },
];

const testimonials = [
  {
    quote: "CommonGround gave me peace of mind. I have clear records of every interaction, and my attorney said the documentation was exactly what we needed.",
    context: "Parent using CommonGround for 14 months",
  },
  {
    quote: "ARIA helped me communicate more clearly. My kids noticed the difference — they said things feel calmer now.",
    context: "Parent in California",
  },
  {
    quote: "The structure changed everything for our family. The kids know what to expect, and we spend less time coordinating and more time being parents.",
    context: "Parent in Texas",
  },
];

const faqs = [
  {
    question: 'How is this different from just texting?',
    answer: 'Text messages can be deleted, screenshots can be questioned, and context is easily lost. CommonGround creates tamper-proof records with timestamps, read receipts, response times, and hash verification that courts can trust. Every message is permanently logged.',
  },
  {
    question: 'What if my co-parent doesn\'t want to use the app?',
    answer: 'You can still use CommonGround for one-sided documentation. Your messages are logged even if they respond via text. Many courts now recommend parenting apps for structured communication. Your attorney can request it be included in your parenting plan.',
  },
  {
    question: 'Can my co-parent see that ARIA suggested changes?',
    answer: 'They only see the final message you send. They cannot see your original draft or that you used ARIA. Your constructive communication efforts are tracked in your cooperation metrics.',
  },
  {
    question: 'Will this help in court?',
    answer: 'CommonGround documentation has been used successfully in custody proceedings. The objective nature of the data — timestamps, GPS verification, compliance metrics — provides the clear records courts need. Several family law attorneys now recommend it to clients.',
  },
  {
    question: 'What about emergency situations?',
    answer: 'CommonGround is for regular co-parenting communication, not emergencies. For emergencies involving child safety, always call 911 first. However, all follow-up communication should still go through the app for documentation purposes.',
  },
  {
    question: 'How long are records kept?',
    answer: 'All records are kept indefinitely on paid plans. Free tier users have 90-day message history, but you can upgrade at any time to access complete archives. We recommend maintaining your account through the duration of any ongoing custody case.',
  },
];

export default function HighConflictPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-[#F5A623]/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-sage/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5A623]/10 rounded-full mb-6">
              <Shield className="w-4 h-4 text-[#F5A623]" />
              <span className="text-sm font-medium text-[#F5A623]">
                Extra Support for Your Family
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              When communication is difficult,{' '}
              <span className="text-cg-sage">your children still come first.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Some families need more structure. CommonGround provides the tools
              to keep things calm, clear, and focused on your children.
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              AI-powered communication support and court-ready documentation
              that helps your family find stability.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
              >
                Get Started Free
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

      {/* Signs You Could Benefit */}
      <section className="py-16 bg-[#FEF7ED] border-y border-[#F5A623]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Could your family benefit from more structure?
            </h2>
            <p className="text-muted-foreground">
              Many families find that clear structure and documentation brings peace.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {signsYouCouldBenefit.map((sign, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-background rounded-lg border border-border/50">
                <Heart className="w-5 h-5 text-[#F5A623] flex-shrink-0 mt-0.5" />
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
              Tools that protect your family
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every feature designed to bring clarity, structure, and peace to your co-parenting.
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

      {/* Structured Parenting */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage-subtle rounded-full mb-6">
                <Brain className="w-4 h-4 text-cg-sage" />
                <span className="text-sm font-medium text-cg-sage">Structured Co-Parenting</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
                Clear boundaries, calmer families
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                When direct communication is challenging, structured co-parenting
                lets you focus on raising your children effectively while maintaining
                healthy boundaries.
              </p>
              <p className="text-muted-foreground mb-8">
                CommonGround provides the structure: clear boundaries,
                automatic documentation, and communication support that keeps
                the focus on your children.
              </p>
              <div className="space-y-4">
                {structuredParentingFeatures.map((feature) => (
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
                    <span className="font-semibold text-[#F5A623]">18.7 hours</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-2 bg-[#F5A623] rounded-full" style={{ width: '22%' }} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Response times are tracked automatically and available in documentation exports.
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5A623]/10 rounded-full mb-6">
              <Gavel className="w-4 h-4 text-[#F5A623]" />
              <span className="text-sm font-medium text-[#F5A623]">Court-Ready</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Documentation you can trust
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              When you need clear records, CommonGround exports provide
              the documentation that courts and attorneys rely on.
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
              See a sample documentation export
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Families finding peace
            </h2>
            <p className="text-lg text-muted-foreground">
              Structure and clarity changed their co-parenting experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-background rounded-xl p-6 border border-border/50"
              >
                <div className="text-cg-sage text-4xl font-serif mb-4">&ldquo;</div>
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
          <Heart className="w-12 h-12 text-cg-sage mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
            Your children deserve calm.
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Clear structure and documentation bring peace of mind to your family.
            Start building a calmer co-parenting experience today.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required. Start in minutes.
          </p>
        </div>
      </section>
    </div>
  );
}

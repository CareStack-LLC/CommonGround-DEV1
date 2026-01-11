import { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  MessageSquare,
  Shield,
  Brain,
  TrendingUp,
  Heart,
  ArrowRight,
  Check,
  Zap,
  Eye,
  RefreshCw,
  BarChart3,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'ARIA - AI Communication Assistant | CommonGround',
  description: 'Meet ARIA, your AI-powered communication assistant. Reduce conflict, improve understanding, and co-parent with confidence.',
};

/**
 * ARIA Feature Page
 *
 * Dedicated page explaining ARIA's AI-powered communication features.
 */

const ariaFeatures = [
  {
    icon: Shield,
    title: 'Sentiment Shield',
    description: 'ARIA analyzes every message before it\'s sent, detecting hostility, blame, passive-aggression, and other conflict triggers.',
  },
  {
    icon: RefreshCw,
    title: 'Smart Rewrites',
    description: 'When ARIA detects potential conflict, it suggests gentler alternatives that preserve your meaning while reducing tension.',
  },
  {
    icon: Eye,
    title: 'Conflict Prevention',
    description: 'Stop arguments before they start. ARIA helps you communicate clearly and calmly, even in difficult situations.',
  },
  {
    icon: TrendingUp,
    title: 'Good Faith Tracking',
    description: 'Build a record of positive communication. ARIA tracks your willingness to communicate constructively over time.',
  },
  {
    icon: BarChart3,
    title: 'Communication Analytics',
    description: 'See patterns in your communication. Identify triggers, track improvement, and understand dynamics.',
  },
  {
    icon: Brain,
    title: 'Context Awareness',
    description: 'ARIA understands your custody agreement and can reference specific terms when helping you communicate.',
  },
];

const howItWorks = [
  {
    step: 1,
    title: 'You Write Your Message',
    description: 'Compose your message naturally. Don\'t worry about filtering yourself—just say what you need to say.',
    visual: '"I can\'t believe you forgot to pick up the kids AGAIN. This is so typical of you."',
  },
  {
    step: 2,
    title: 'ARIA Analyzes',
    description: 'Before sending, ARIA reviews your message for hostility, blame, and other conflict triggers.',
    visual: 'Detecting: Blame language, accusatory tone, absolutist words ("always", "never")',
  },
  {
    step: 3,
    title: 'You Get Suggestions',
    description: 'If ARIA detects potential conflict, you\'ll see alternative phrasings that preserve your message.',
    visual: '"I noticed the kids weren\'t picked up at the scheduled time. Can we discuss how to prevent this in the future?"',
  },
  {
    step: 4,
    title: 'You Choose',
    description: 'Accept ARIA\'s suggestion, modify it, or send your original. You\'re always in control.',
    visual: 'Options: Accept suggestion • Edit suggestion • Send original • Save as draft',
  },
];

const comparisonBefore = [
  '"You NEVER follow the schedule!"',
  '"This is ALL your fault."',
  '"I guess you just don\'t care about the kids."',
  '"Whatever. Do what you want."',
  '"Stop trying to control everything!"',
];

const comparisonAfter = [
  '"I\'ve noticed some schedule changes. Can we discuss?"',
  '"Let\'s focus on how to handle this going forward."',
  '"I want to make sure [child] has what they need."',
  '"I\'d like to understand your perspective on this."',
  '"Can we find a decision process that works for both of us?"',
];

const testimonials = [
  {
    quote: "ARIA helped me realize how many of my messages sounded accusatory, even when I didn't mean them that way. The suggestions are always better than what I wrote.",
    author: "Rebecca T.",
    context: "Using CommonGround for 6 months",
  },
  {
    quote: "I used to dread every message from my ex. Now that we both use ARIA, our conversations are actually productive. My kids have noticed the difference.",
    author: "Marcus J.",
    context: "Using CommonGround for 1 year",
  },
  {
    quote: "The good faith metrics helped in our custody modification hearing. The judge could see we were both trying to communicate better.",
    author: "Andrea S.",
    context: "Using CommonGround for 8 months",
  },
];

const faqs = [
  {
    question: 'Does ARIA read all my messages?',
    answer: 'ARIA only analyzes messages within the CommonGround platform. It does not access any of your other communications. All analysis happens in real-time and is not stored separately from your messages.',
  },
  {
    question: 'Can I turn ARIA off?',
    answer: 'Yes. You can disable ARIA suggestions in your settings. However, your communication metrics will still be tracked for court reporting purposes. Many users find they prefer having suggestions even if they don\'t always use them.',
  },
  {
    question: 'Will my co-parent see my original message?',
    answer: 'No. If you accept an ARIA suggestion, only the final version is sent. Your original phrasing is never shared. However, the fact that you used ARIA is logged for transparency.',
  },
  {
    question: 'How does ARIA know what\'s "hostile"?',
    answer: 'ARIA is trained on extensive research about high-conflict communication patterns. It recognizes blame language, absolutist statements, passive aggression, and other patterns that typically escalate conflict in co-parenting situations.',
  },
  {
    question: 'What if ARIA is wrong?',
    answer: 'ARIA is a suggestion tool, not a filter. You can always send your original message if you disagree with the analysis. Over time, ARIA learns from your choices to provide better suggestions.',
  },
  {
    question: 'Is ARIA used against me in court?',
    answer: 'Good faith metrics show your willingness to communicate constructively. Accepting ARIA suggestions demonstrates effort to reduce conflict. Courts view this positively. The actual content of ARIA suggestions is not disclosed—only whether you engaged with the tool constructively.',
  },
];

export default function ARIAPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-cg-amber/10 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-sage/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-amber-subtle rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-cg-amber" />
              <span className="text-sm font-medium text-cg-amber">AI-Powered Communication</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              Meet <span className="text-cg-amber">ARIA</span>
            </h1>
            <p className="text-2xl text-muted-foreground mb-4">
              AI-Powered Relationship Intelligence Assistant
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              ARIA helps you communicate with your co-parent more effectively.
              Reduce conflict, build trust, and focus on what matters: your children.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-cg-amber text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-amber/90 hover:shadow-xl hover:-translate-y-1"
            >
              Try ARIA Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* What ARIA Does */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              What ARIA Does
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ARIA is your personal communication coach, helping you navigate
              difficult conversations with clarity and calm.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {ariaFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-card rounded-xl p-6 border border-border/50 hover:border-cg-amber/30 transition-colors"
                >
                  <div className="w-12 h-12 bg-cg-amber-subtle rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-cg-amber" />
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
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              How ARIA Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See ARIA in action with this example workflow.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-12">
            {howItWorks.map((step, index) => (
              <div key={step.step} className="grid md:grid-cols-2 gap-8 items-center">
                <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-cg-amber rounded-full flex items-center justify-center text-white font-semibold">
                      {step.step}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                <div className={index % 2 === 1 ? 'md:order-1' : ''}>
                  <div className="bg-background rounded-xl p-6 border border-border/50">
                    <code className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {step.visual}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before & After Comparison */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              The ARIA Difference
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how ARIA transforms conflict into cooperation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-8 border border-red-200 dark:border-red-900/50">
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                  ✗
                </span>
                Without ARIA
              </h3>
              <ul className="space-y-4">
                {comparisonBefore.map((message, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-red-700 dark:text-red-300">{message}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 rounded-2xl p-8 border border-green-200 dark:border-green-900/50">
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                  ✓
                </span>
                With ARIA
              </h3>
              <ul className="space-y-4">
                {comparisonAfter.map((message, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-green-700 dark:text-green-300">{message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Good Faith Metrics */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage-subtle rounded-full mb-6">
                <TrendingUp className="w-4 h-4 text-cg-sage" />
                <span className="text-sm font-medium text-cg-sage">Good Faith Metrics</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
                Build a record of positive communication
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Every time you accept an ARIA suggestion or communicate constructively,
                you're building evidence of your good faith effort to co-parent effectively.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cg-sage-subtle flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-cg-sage" />
                  </div>
                  <span className="text-foreground">Track suggestion acceptance rates</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cg-sage-subtle flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-cg-sage" />
                  </div>
                  <span className="text-foreground">See communication trends over time</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cg-sage-subtle flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-cg-sage" />
                  </div>
                  <span className="text-foreground">Export metrics for court documentation</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cg-sage-subtle flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-cg-sage" />
                  </div>
                  <span className="text-foreground">Demonstrate improvement to evaluators</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-cg-sage-subtle to-cg-amber-subtle rounded-3xl p-8">
                <div className="bg-card rounded-2xl p-6 border border-border/50">
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-semibold text-foreground">Good Faith Score</span>
                    <span className="text-2xl font-bold text-cg-sage">87%</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Suggestions Accepted</span>
                        <span className="text-foreground">73%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-2 bg-cg-sage rounded-full" style={{ width: '73%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Constructive Responses</span>
                        <span className="text-foreground">91%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-2 bg-cg-sage rounded-full" style={{ width: '91%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Timely Replies</span>
                        <span className="text-foreground">85%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-2 bg-cg-sage rounded-full" style={{ width: '85%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              What Parents Say About ARIA
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-6 border border-border/50"
              >
                <div className="text-cg-amber text-4xl font-serif mb-4">"</div>
                <p className="text-foreground mb-6">{testimonial.quote}</p>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.context}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
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

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-cg-amber-subtle to-cg-sage-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Heart className="w-12 h-12 text-cg-amber mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-6">
            Ready to communicate better?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            ARIA is included free with every CommonGround account.
            Start your journey to conflict-free co-parenting today.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-cg-amber text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-amber/90 hover:shadow-xl hover:-translate-y-1"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

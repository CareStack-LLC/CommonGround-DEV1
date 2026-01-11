import { Metadata } from 'next';
import Link from 'next/link';
import {
  UserPlus,
  Users,
  FileText,
  MessageSquare,
  Calendar,
  ArrowRight,
  Check,
  ChevronDown,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works | CommonGround',
  description: 'Learn how CommonGround helps separated families co-parent more effectively in 5 simple steps.',
};

/**
 * How It Works Page
 *
 * Step-by-step guide for new users to understand the platform.
 */

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: 'Create Your Account',
    description: 'Sign up in minutes with just your email. No credit card required to start.',
    details: [
      'Quick registration process',
      'Email verification for security',
      'Set up your profile and preferences',
      'Choose your notification settings',
    ],
  },
  {
    number: 2,
    icon: Users,
    title: 'Invite Your Co-Parent',
    description: 'Send an invitation to your co-parent to join your Family File. They\'ll receive an email with a secure link.',
    details: [
      'Secure invitation system',
      'They create their own account',
      'Both parents have equal access',
      'Start collaborating immediately',
    ],
  },
  {
    number: 3,
    icon: FileText,
    title: 'Build Your Agreement',
    description: 'Use our guided 18-section wizard to create a comprehensive custody agreement together.',
    details: [
      'Covers all major topics',
      'Each parent contributes their input',
      'Track changes and versions',
      'Both parents must approve',
    ],
  },
  {
    number: 4,
    icon: MessageSquare,
    title: 'Communicate with ARIA',
    description: 'Send messages through ARIA, our AI assistant that helps prevent conflict before it starts.',
    details: [
      'Real-time message analysis',
      'Suggested rewrites for sensitive topics',
      'Keep conversations child-focused',
      'Build a record of positive communication',
    ],
  },
  {
    number: 5,
    icon: Calendar,
    title: 'Track Everything',
    description: 'Manage schedules, expenses, and important information in one centralized place.',
    details: [
      'Shared custody calendar',
      'Exchange check-ins',
      'Expense tracking and splits',
      'Document everything for court if needed',
    ],
  },
];

const faqs = [
  {
    question: 'How much does CommonGround cost?',
    answer: 'CommonGround offers a free tier with essential features. Paid plans start at $9.99/month for additional features like expense tracking and court exports.',
  },
  {
    question: 'Do both parents need to pay?',
    answer: 'Each parent manages their own subscription. Both can use the free tier, or each can upgrade independently for premium features.',
  },
  {
    question: 'What if my co-parent won\'t join?',
    answer: 'While CommonGround works best when both parents participate, you can still use many features solo, including scheduling and documentation.',
  },
  {
    question: 'Is my information secure?',
    answer: 'Yes! We use bank-level encryption for all data. Your information is never shared or sold, and everything is stored securely.',
  },
  {
    question: 'Can attorneys access CommonGround?',
    answer: 'Yes! You can grant time-limited access to attorneys, GALs, mediators, and other professionals through our Legal Portal.',
  },
  {
    question: 'What is ARIA?',
    answer: 'ARIA is our AI-powered communication assistant. It analyzes messages before they\'re sent and suggests gentler alternatives to help prevent conflict.',
  },
];

export default function HowItWorksPage() {
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
              Get started in <span className="text-cg-sage">5 simple steps</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              CommonGround makes co-parenting easier from day one.
              Here's how to get started.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage-light hover:shadow-xl hover:-translate-y-1"
            >
              Start Your Journey
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative">
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-8 top-24 bottom-0 w-0.5 bg-border hidden md:block" />
                  )}

                  <div className="grid md:grid-cols-[80px,1fr] gap-6 mb-16">
                    {/* Step Number */}
                    <div className="flex md:flex-col items-center gap-4 md:gap-0">
                      <div className="w-16 h-16 bg-cg-sage rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                        {step.number}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="bg-card rounded-2xl p-8 border border-border/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-cg-sage-subtle rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-cg-sage" />
                        </div>
                        <h2 className="text-2xl font-semibold text-foreground">
                          {step.title}
                        </h2>
                      </div>
                      <p className="text-lg text-muted-foreground mb-6">
                        {step.description}
                      </p>
                      <ul className="grid sm:grid-cols-2 gap-3">
                        {step.details.map((detail) => (
                          <li key={detail} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-cg-sage flex-shrink-0" />
                            <span className="text-foreground">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group bg-background rounded-xl border border-border/50 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-medium text-foreground">{faq.question}</span>
                  <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" />
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
            Ready to find your common ground?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Start your free trial today. Setup takes less than 5 minutes.
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
              href="/features"
              className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-sage hover:text-white"
            >
              Explore Features
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

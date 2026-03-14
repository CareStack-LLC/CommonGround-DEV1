'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, HelpCircle, MessageSquare, Calendar, Wallet, Shield, Gavel, Sparkles, CreditCard } from 'lucide-react';

/**
 * FAQ Page
 *
 * Comprehensive FAQ with design system styling.
 */

const faqCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: HelpCircle,
    faqs: [
      {
        question: 'What is CommonGround?',
        answer: 'CommonGround is a co-parenting platform that helps separated parents communicate effectively, manage custody schedules, track expenses, and create agreements. Our AI assistant ARIA helps reduce conflict by suggesting calmer ways to communicate.',
      },
      {
        question: 'How do I get started?',
        answer: 'Sign up for a free account at commonground.app/register. Once registered, you can invite your co-parent to join. Both parents need accounts to fully use the platform, but you can start setting things up before your co-parent joins.',
      },
      {
        question: 'Do both parents need to sign up?',
        answer: 'CommonGround works best when both parents are on the platform. Your co-parent needs an account to receive messages, view shared calendars, and approve agreements. You can start using many features solo while waiting for them to join.',
      },
      {
        question: 'What if my co-parent won\'t join?',
        answer: 'You can still document communications, track your schedule, and build agreements. If needed, you can export records for court. Some parents find that demonstrating the platform\'s benefits helps convince the other parent to join.',
      },
    ],
  },
  {
    id: 'aria',
    title: 'ARIA & Messaging',
    icon: Sparkles,
    faqs: [
      {
        question: 'What is ARIA?',
        answer: 'ARIA (AI Relationship Intelligence Assistant) analyzes messages before they\'re sent. If ARIA detects language that might cause conflict, it suggests calmer alternatives while preserving your intended meaning.',
      },
      {
        question: 'Does ARIA read all my messages?',
        answer: 'ARIA only analyzes messages within CommonGround, not your other communications. Analysis happens in real-time when you send a message. Suggestions are not stored separately from your messages.',
      },
      {
        question: 'Can I turn ARIA off?',
        answer: 'Yes, you can disable ARIA suggestions in your settings. However, communication metrics like response times will still be tracked for compliance purposes.',
      },
      {
        question: 'Will my co-parent see my original message?',
        answer: 'No. If you accept an ARIA suggestion, only the revised message is sent. Your original wording is never shared with your co-parent.',
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing & Billing',
    icon: CreditCard,
    faqs: [
      {
        question: 'How much does CommonGround cost?',
        answer: 'CommonGround offers a free tier with essential features. Paid plans start at $9.99/month for Basic and $19.99/month for Premium with advanced features. See our pricing page for full details.',
      },
      {
        question: 'Do both parents need to pay?',
        answer: 'Each parent manages their own subscription independently. Both can use the free tier, or each can upgrade separately. You don\'t need matching plans to communicate.',
      },
      {
        question: 'Is there a free trial?',
        answer: 'Yes! All paid plans include a 14-day free trial. No credit card required to start.',
      },
      {
        question: 'Can I cancel anytime?',
        answer: 'Absolutely. No contracts or commitments. Cancel from your account settings and your plan stays active until the end of your billing period.',
      },
      {
        question: 'Do you offer hardship pricing?',
        answer: 'Yes. We believe every family deserves access to better co-parenting tools. Contact support@commonground.app to discuss hardship options.',
      },
    ],
  },
  {
    id: 'scheduling',
    title: 'Scheduling & Exchanges',
    icon: Calendar,
    faqs: [
      {
        question: 'How does the shared calendar work?',
        answer: 'The shared calendar shows custody schedules, events, and exchanges. Both parents can add events, view who has custody when, and set up exchange reminders.',
      },
      {
        question: 'What is exchange check-in?',
        answer: 'Exchange check-in lets you record when custody transfers happen. You can check in manually or use GPS verification. This creates documented records for compliance tracking.',
      },
      {
        question: 'How is compliance tracked?',
        answer: 'CommonGround tracks on-time exchanges, schedule adherence, and grace period usage. Compliance metrics can be included in court exports.',
      },
    ],
  },
  {
    id: 'expenses',
    title: 'Expenses',
    icon: Wallet,
    faqs: [
      {
        question: 'How does expense tracking work?',
        answer: 'Log child-related expenses, upload receipts, and request reimbursement. CommonGround calculates who owes what based on your agreed split percentages.',
      },
      {
        question: 'Can I upload receipts?',
        answer: 'Yes. Attach photos or PDFs of receipts to any expense. This documentation helps with court records and prevents disputes.',
      },
      {
        question: 'How are expenses split?',
        answer: 'Split percentages are typically defined in your custody agreement (e.g., 50/50). CommonGround automatically calculates each parent\'s share.',
      },
    ],
  },
  {
    id: 'court',
    title: 'Court & Legal',
    icon: Gavel,
    faqs: [
      {
        question: 'Are CommonGround records court-admissible?',
        answer: 'CommonGround exports include SHA-256 integrity verification, timestamps, and chain of custody documentation. Each court has its own rules, so check with your attorney.',
      },
      {
        question: 'What can I export for court?',
        answer: 'You can export message history, agreements, schedules, compliance metrics, expense records, and activity logs as professional PDFs with verification.',
      },
      {
        question: 'Can my attorney access my case?',
        answer: 'Yes. Grant time-limited access to attorneys, GALs, and mediators. They get read-only access and all activity is logged.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    icon: Shield,
    faqs: [
      {
        question: 'Is my data secure?',
        answer: 'Yes. We use bank-level encryption (AES-256 at rest, TLS 1.3 in transit), role-based access controls, and comprehensive audit logging.',
      },
      {
        question: 'Who can see my information?',
        answer: 'Only you, your co-parent, and professionals you\'ve granted access to. CommonGround staff can only access data for support purposes when you request help.',
      },
      {
        question: 'Do you sell my data?',
        answer: 'Absolutely not. We never sell, share, or use your data for advertising. Your family\'s information is sacred to us.',
      },
      {
        question: 'Can I delete my account?',
        answer: 'Yes. Request account deletion from your settings. Your data will be removed within 90 days, except where legally required.',
      },
    ],
  },
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());

  const toggleQuestion = (id: string) => {
    const newOpen = new Set(openQuestions);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenQuestions(newOpen);
  };

  const currentCategory = faqCategories.find(c => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#F5F9F9]">
      {/* Hero */}
      <section className="pt-24 pb-12 sm:pt-32 sm:pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-serif text-[#1E3A4A] mb-4 leading-[1.1]"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Frequently Asked <span className="text-[#F5A623]">Questions</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Find quick answers to common questions about CommonGround.
          </p>
        </div>
      </section>

      {/* Category Navigation */}
      <section className="pb-8 sticky top-16 bg-gradient-to-b from-[#F4F8F7] to-transparent z-40 pt-4">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-2">
            {faqCategories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--portal-primary)] text-white'
                      : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-[var(--portal-primary)]/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.title}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-6">
          {currentCategory && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                {(() => {
                  const Icon = currentCategory.icon;
                  return (
                    <div className="w-12 h-12 rounded-xl bg-[var(--portal-primary)]/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-[var(--portal-primary)]" />
                    </div>
                  );
                })()}
                <h2
                  className="text-2xl font-serif text-[#1E3A4A]"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  {currentCategory.title}
                </h2>
              </div>

              <div className="space-y-4">
                {currentCategory.faqs.map((faq, index) => {
                  const questionId = `${currentCategory.id}-${index}`;
                  const isOpen = openQuestions.has(questionId);
                  return (
                    <div
                      key={questionId}
                      className="bg-white rounded-2xl border-2 border-[var(--portal-primary)]/10 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleQuestion(questionId)}
                        className="w-full flex items-center justify-between p-6 text-left"
                      >
                        <span className="font-medium text-[#1E3A4A] pr-4">{faq.question}</span>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-6 text-gray-600">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-6 text-[#F5A623]" />
          <h2
            className="text-3xl sm:text-4xl font-serif mb-4"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Still have questions?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/help/contact"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#F5A623] text-white font-semibold rounded-full hover:bg-[#c26647] transition-all group"
            >
              Contact Support
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-all border-2 border-white/30"
            >
              Browse Help Center
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

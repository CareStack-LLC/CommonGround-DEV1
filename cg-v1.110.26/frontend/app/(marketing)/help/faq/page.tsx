import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'FAQ | CommonGround',
  description: 'Frequently asked questions about CommonGround. Find quick answers about features, pricing, security, and more.',
};

/**
 * FAQ Page
 *
 * Comprehensive FAQ organized by category.
 */

const faqCategories = [
  {
    title: 'Getting Started',
    faqs: [
      {
        question: 'What is CommonGround?',
        answer: 'CommonGround is a co-parenting platform that helps separated parents communicate more effectively, manage custody schedules, track expenses, and create custody agreements. Our AI assistant, ARIA, helps reduce conflict by suggesting calmer ways to communicate.',
      },
      {
        question: 'How do I get started?',
        answer: 'Sign up for a free account at commonground.app/register. Once registered, you can invite your co-parent to join your case. Both parents need accounts to fully use the platform, though you can start setting things up before your co-parent joins.',
      },
      {
        question: 'Do both parents need to sign up?',
        answer: 'CommonGround works best when both parents are on the platform, but you can start using many features solo. Your co-parent will need an account to receive messages, view shared calendars, and approve agreements.',
      },
      {
        question: 'What if my co-parent won\'t join?',
        answer: 'You can still use CommonGround to document your communications, track your schedule, and build agreements. If needed, you can export your records for court use. Some parents find that demonstrating the platform\'s benefits helps convince the other parent to join.',
      },
    ],
  },
  {
    title: 'ARIA & Messaging',
    faqs: [
      {
        question: 'What is ARIA?',
        answer: 'ARIA (AI-Powered Relationship Intelligence Assistant) is our AI that analyzes messages before they\'re sent. If ARIA detects language that might cause conflict, it suggests calmer alternatives while preserving your intended meaning.',
      },
      {
        question: 'Does ARIA read all my messages?',
        answer: 'ARIA only analyzes messages within CommonGround, not your other communications. The analysis happens in real-time when you send a message. ARIA\'s suggestions are not stored separately from your messages.',
      },
      {
        question: 'Can I turn ARIA off?',
        answer: 'Yes, you can disable ARIA suggestions in your settings. However, your communication metrics (like response times) will still be tracked for compliance purposes. Many users find the suggestions helpful even if they don\'t always use them.',
      },
      {
        question: 'Will my co-parent see my original message?',
        answer: 'No. If you accept an ARIA suggestion, only the revised message is sent. Your original wording is never shared with your co-parent. The system does log that you used ARIA for transparency.',
      },
      {
        question: 'What are Good Faith metrics?',
        answer: 'Good Faith metrics track how constructively you communicate over time, including how often you accept ARIA suggestions, respond promptly, and use respectful language. These metrics can be included in court exports to demonstrate your communication efforts.',
      },
    ],
  },
  {
    title: 'Pricing & Billing',
    faqs: [
      {
        question: 'How much does CommonGround cost?',
        answer: 'CommonGround offers a free tier with essential features. Paid plans start at $9.99/month for Basic (expense tracking, court exports) and $19.99/month for Premium (legal portal, advanced analytics). See our pricing page for full details.',
      },
      {
        question: 'Do both parents need to pay?',
        answer: 'Each parent manages their own subscription independently. Both parents can use the free tier, or each can upgrade to access premium features. You don\'t need matching plans to communicate.',
      },
      {
        question: 'Is there a free trial?',
        answer: 'Yes! All paid plans include a 14-day free trial. No credit card is required to start. You can explore all features before deciding to subscribe.',
      },
      {
        question: 'Can I cancel anytime?',
        answer: 'Absolutely. There are no contracts or commitments. You can cancel your subscription at any time from your account settings. Your plan remains active until the end of your billing period.',
      },
      {
        question: 'What happens to my data if I cancel?',
        answer: 'Your data remains accessible in read-only mode for 90 days after cancellation. You can export your data during this period. After 90 days, your data is securely deleted per our privacy policy.',
      },
      {
        question: 'Do you offer hardship pricing?',
        answer: 'Yes. We believe every family deserves access to better co-parenting tools. Contact us at support@commonground.app to discuss hardship pricing options.',
      },
    ],
  },
  {
    title: 'Agreements',
    faqs: [
      {
        question: 'What is the Agreement Builder?',
        answer: 'The Agreement Builder is a guided 18-section wizard that helps you create a comprehensive custody agreement. It covers everything from physical custody schedules to decision-making authority, holiday arrangements, and more.',
      },
      {
        question: 'Do both parents need to approve?',
        answer: 'Yes. Agreements require approval from both parents before they become active. Each parent can review, suggest edits, and approve independently. The agreement is only finalized when both parents approve.',
      },
      {
        question: 'Can I edit the agreement later?',
        answer: 'Agreements can be modified, but changes also require mutual approval. All versions are tracked, so you can see the history of changes. This ensures both parents are always on the same page.',
      },
      {
        question: 'Is the agreement legally binding?',
        answer: 'Agreements created in CommonGround can be used as the basis for legal custody agreements, but they should be reviewed by your attorney and filed with the court to become legally binding. We provide court-ready PDF exports.',
      },
    ],
  },
  {
    title: 'Scheduling & Exchanges',
    faqs: [
      {
        question: 'How does the shared calendar work?',
        answer: 'The shared calendar shows custody schedules, events, and exchanges. Both parents can add events (like medical appointments), view who has custody when, and set up exchange reminders.',
      },
      {
        question: 'What is exchange check-in?',
        answer: 'Exchange check-in lets you record when custody transfers happen. You can check in manually or use GPS verification. This creates a documented record of exchanges for compliance tracking.',
      },
      {
        question: 'How is compliance tracked?',
        answer: 'CommonGround tracks on-time exchanges, schedule adherence, and grace period usage. Compliance metrics show patterns over time and can be included in court exports.',
      },
      {
        question: 'Can I sync with Google Calendar or Outlook?',
        answer: 'Calendar sync is available on Premium plans. You can export your CommonGround calendar to Google Calendar, Outlook, or any calendar that supports iCal format.',
      },
    ],
  },
  {
    title: 'Expenses & Payments',
    faqs: [
      {
        question: 'How does expense tracking work?',
        answer: 'You can log child-related expenses, upload receipts, and request reimbursement from your co-parent. CommonGround calculates who owes what based on your agreed split percentages.',
      },
      {
        question: 'Can I upload receipts?',
        answer: 'Yes. You can attach photos or PDFs of receipts to any expense. This documentation is helpful for court records and prevents disputes about what was purchased.',
      },
      {
        question: 'How are expenses split?',
        answer: 'Split percentages are typically defined in your custody agreement (e.g., 50/50 or 60/40). CommonGround automatically calculates each parent\'s share based on these percentages.',
      },
      {
        question: 'Does CommonGround process payments?',
        answer: 'Currently, CommonGround tracks expenses and calculates balances, but actual money transfers happen outside the platform (Venmo, bank transfer, etc.). We\'re working on integrated payments for the future.',
      },
    ],
  },
  {
    title: 'Court & Legal',
    faqs: [
      {
        question: 'Are CommonGround records court-admissible?',
        answer: 'CommonGround exports include SHA-256 integrity verification, timestamps, and chain of custody documentation to support admissibility. However, each court has its own rules, so check with your attorney.',
      },
      {
        question: 'What can I export for court?',
        answer: 'You can export message history, agreements, schedules, compliance metrics, expense records, and activity logs. Exports are formatted as professional PDFs with verification hashes.',
      },
      {
        question: 'Can my attorney access my case?',
        answer: 'Yes. You can grant time-limited access to attorneys, GALs, mediators, and other professionals. They get read-only access to view case information, and all their activity is logged.',
      },
      {
        question: 'What if my co-parent lies about what was said?',
        answer: 'That\'s exactly why CommonGround exists. All messages are logged with timestamps and cannot be edited after sending. If there\'s a dispute about what was communicated, the records are there.',
      },
    ],
  },
  {
    title: 'Security & Privacy',
    faqs: [
      {
        question: 'Is my data secure?',
        answer: 'Yes. We use bank-level encryption (AES-256 at rest, TLS 1.3 in transit), role-based access controls, and comprehensive audit logging. See our Security page for more details.',
      },
      {
        question: 'Who can see my information?',
        answer: 'Your case information is only visible to: you, your co-parent, and any professionals you\'ve granted access to. CommonGround staff can only access data for support purposes when you request help.',
      },
      {
        question: 'Do you sell my data?',
        answer: 'Absolutely not. We never sell, share, or use your data for advertising. Your family\'s information is sacred to us. See our Privacy Policy for full details.',
      },
      {
        question: 'Can I delete my account?',
        answer: 'Yes. You can request account deletion from your settings. Your data will be removed within 90 days, except where we\'re required to retain it by law or for court records.',
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="bg-background">
      {/* Header */}
      <section className="py-16 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-semibold text-foreground mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground">
            Find quick answers to common questions about CommonGround.
          </p>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="py-8 border-b border-border sticky top-16 bg-background/95 backdrop-blur z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {faqCategories.map((category) => (
              <a
                key={category.title}
                href={`#${category.title.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-3 py-1.5 text-sm rounded-full bg-card border border-border hover:border-cg-sage/30 hover:text-cg-sage transition-colors"
              >
                {category.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {faqCategories.map((category) => (
            <div
              key={category.title}
              id={category.title.toLowerCase().replace(/\s+/g, '-')}
              className="mb-16 scroll-mt-32"
            >
              <h2 className="text-2xl font-semibold text-foreground mb-6">
                {category.title}
              </h2>
              <div className="space-y-4">
                {category.faqs.map((faq, index) => (
                  <details
                    key={index}
                    className="group bg-card rounded-xl border border-border/50 overflow-hidden"
                  >
                    <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                      <span className="font-medium text-foreground pr-4">{faq.question}</span>
                      <span className="text-muted-foreground group-open:rotate-180 transition-transform flex-shrink-0">
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
          ))}
        </div>
      </section>

      {/* Still Have Questions? */}
      <section className="py-16 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Still have questions?
          </h2>
          <p className="text-muted-foreground mb-8">
            Can't find what you're looking for? We're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/help/contact"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg"
            >
              Contact Support
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage hover:text-white"
            >
              Browse Help Center
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

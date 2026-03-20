'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqItems = [
  {
    question: "What if my co-parent won't sign up?",
    answer:
      'You can still use the calendar, expense tracking, and court documentation on your own. When they join, everything syncs automatically.',
  },
  {
    question: 'Is this really free?',
    answer:
      "The Web Starter plan is free forever \u2014 no credit card, no trial that expires. Paid plans add automation and advanced features when you're ready.",
  },
  {
    question: 'Will this hold up in court?',
    answer:
      'Every message, schedule change, and payment is timestamped and securely stored. Our exports are designed for family law proceedings.',
  },
  {
    question: 'What about my kids?',
    answer:
      'KidSpace lets children video call, read stories, and play games with both parents \u2014 a safe space designed around them, not the conflict.',
  },
  {
    question: 'How is CommonGround different from other co-parenting apps?',
    answer:
      'CommonGround includes ARIA messaging free (most competitors charge for AI features), plus unique features like KidSpace for direct parent-child video calls and Silent Handoff for GPS-verified contactless exchanges. No other co-parenting app offers these.',
  },
  {
    question: 'Can my attorney access my records?',
    answer:
      'Yes. You can invite your attorney, mediator, or other family law professional to view your CommonGround data. They get read-only access to verified records at no cost to them.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4"
            style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
          >
            Questions parents ask
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-[#F4F8F7] to-white rounded-2xl border-2 border-gray-100 hover:border-[var(--portal-primary)]/20 transition-all overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between px-6 py-5 text-left group"
              >
                <span className="text-lg font-semibold text-[#1E3A4A] group-hover:text-[var(--portal-primary)] transition-colors">
                  {item.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 group-hover:text-[var(--portal-primary)] transition-transform duration-200 flex-shrink-0 ml-4 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5">
                  <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

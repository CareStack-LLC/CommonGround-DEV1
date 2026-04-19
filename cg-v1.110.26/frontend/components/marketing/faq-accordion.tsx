'use client';

/**
 * FaqAccordion
 *
 * Reusable version of FAQSection that accepts items as props. Used by
 * Phase-C landing pages that each need their own FAQ copy. Pair this
 * with <FaqJsonLd> for SEO.
 */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FaqAccordionItem {
  question: string;
  answer: string;
}

export interface FaqAccordionProps {
  heading?: string;
  items: FaqAccordionItem[];
  className?: string;
}

export function FaqAccordion({
  heading = 'Frequently asked questions',
  items,
  className = '',
}: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className={`py-16 sm:py-24 bg-white ${className}`.trim()}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl text-[#1E3A4A]">
            {heading}
          </h2>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.question}
              className="bg-gradient-to-br from-[#F4F8F7] to-white rounded-2xl border-2 border-gray-100 hover:border-[#3DAA8A]/20 transition-all overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between px-6 py-5 text-left group"
                aria-expanded={openIndex === index}
              >
                <span className="text-lg font-semibold text-[#1E3A4A] group-hover:text-[#3DAA8A] transition-colors">
                  {item.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 group-hover:text-[#3DAA8A] transition-transform duration-200 flex-shrink-0 ml-4 ${
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

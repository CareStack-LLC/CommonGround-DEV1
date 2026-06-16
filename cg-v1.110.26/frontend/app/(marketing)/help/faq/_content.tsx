'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronDown, MessageSquare } from 'lucide-react';

import { faqCategories } from './_data';

/**
 * FAQ Page — Expanded with 9 categories and 60+ Q&As.
 *
 * Data lives in `./_data.ts` so the server page.tsx can also import it
 * for JSON-LD. See _data.ts for why this separation matters.
 */


export function FAQContent() {
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

  const currentCategory = faqCategories.find((c) => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-cg-sand">
      {/* Hero */}
      <section className="pt-16 pb-8 lg:pt-24 lg:pb-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1
            className="text-4xl sm:text-5xl text-foreground mb-4 leading-[1.1]"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Frequently Asked{' '}
            <span className="text-cg-amber">Questions</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Quick answers to common questions about CommonGround.
          </p>
        </div>
      </section>

      {/* Category Navigation */}
      <section className="pb-6 sticky top-16 bg-cg-sand z-40 pt-3">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-2">
            {faqCategories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cg-sage text-white shadow-md'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-cg-sage/30'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {category.title}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-8 lg:py-12">
        <div className="max-w-3xl mx-auto px-6">
          {currentCategory && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                {(() => {
                  const Icon = currentCategory.icon;
                  return (
                    <div className="w-11 h-11 rounded-xl bg-cg-sage/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-cg-sage" />
                    </div>
                  );
                })()}
                <div>
                  <h2
                    className="text-2xl text-foreground"
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                    }}
                  >
                    {currentCategory.title}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {currentCategory.faqs.length} questions
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {currentCategory.faqs.map((faq, index) => {
                  const questionId = `${currentCategory.id}-${index}`;
                  const isOpen = openQuestions.has(questionId);
                  return (
                    <div
                      key={questionId}
                      className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm"
                    >
                      <button
                        onClick={() => toggleQuestion(questionId)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50/50 transition-colors"
                      >
                        <span className="font-medium text-foreground pr-4 text-[15px]">
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 text-gray-600 text-[15px] leading-relaxed border-t border-gray-50 pt-3">
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

      {/* Guides CTA */}
      <section className="py-8 lg:py-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-cg-sage/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-cg-sage" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                Need more detail?
              </h3>
              <p className="text-sm text-gray-600">
                Our step-by-step guides walk you through every feature in depth.
              </p>
            </div>
            <Link
              href="/help/guides"
              className="inline-flex items-center gap-2 bg-cg-sage text-white font-medium px-6 py-2.5 rounded-full text-sm transition-all hover:bg-cg-sage-dark hover:shadow-md"
            >
              Browse Guides
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 lg:py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-gradient-to-br from-foreground to-cg-slate rounded-2xl p-8 text-white text-center">
            <MessageSquare className="w-10 h-10 mx-auto mb-5 text-cg-amber" />
            <h2
              className="text-2xl sm:text-3xl mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Still have questions?
            </h2>
            <p className="text-white/75 mb-8 max-w-md mx-auto">
              Our support team typically responds within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/help/contact"
                className="inline-flex items-center justify-center gap-2 bg-cg-amber text-white font-medium px-6 py-3 rounded-full transition-all hover:bg-cg-amber-dark hover:shadow-lg"
              >
                Contact Support
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/help"
                className="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-white font-medium rounded-full hover:bg-white/20 transition-all border border-white/20"
              >
                Help Center
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

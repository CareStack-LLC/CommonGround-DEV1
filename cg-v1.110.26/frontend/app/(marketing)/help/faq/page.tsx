import type { Metadata } from 'next';
import { FaqJsonLd } from '@/components/marketing';
import { FAQContent, faqCategories } from './_content';

export const metadata: Metadata = {
  title: 'CommonGround FAQ — 60+ answers for co-parents | CommonGround',
  description:
    'Answers to the most common questions about CommonGround — ARIA coaching, custody calendar, KidSpace, ClearFund expenses, court exports, and billing.',
  alternates: { canonical: '/help/faq' },
  openGraph: {
    type: 'website',
    title: 'CommonGround FAQ',
    description:
      'Answers to the most common questions about CommonGround — ARIA, KidSpace, expenses, court exports, and billing.',
    url: 'https://www.find-commonground.com/help/faq',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary',
    title: 'CommonGround FAQ',
    description: '60+ answers for co-parents using CommonGround.',
  },
};

/* Flatten every {question, answer} across all categories so the
 * FAQPage JSON-LD mirrors exactly what's rendered visually. */
const FAQ_ITEMS = faqCategories.flatMap((cat) =>
  cat.faqs.map((f) => ({ question: f.question, answer: f.answer })),
);

export default function FAQPage() {
  return (
    <>
      <FaqJsonLd items={FAQ_ITEMS} />
      <FAQContent />
    </>
  );
}

import type { Metadata } from 'next';
import {
  HeroSection,
  ComparisonTable,
  TestimonialCard,
  CtaBand,
  FaqJsonLd,
  FaqAccordion,
} from '@/components/marketing';
import type { ComparisonTableRow } from '@/components/marketing/primitives/comparison-table';

export const metadata: Metadata = {
  title: 'TalkingParents Alternative | CommonGround',
  description:
    'The modern talkingparents alternative: AI message coaching, GPS handoffs, a child-facing app, and flat $17.99/mo pricing — no per-child fees.',
  alternates: { canonical: '/vs-talkingparents' },
  openGraph: {
    type: 'website',
    title: 'TalkingParents Alternative | CommonGround',
    description:
      'Calmer messages, GPS-verified handoffs, a child-facing app, and flat $17.99/mo pricing — the modern talkingparents alternative.',
    url: 'https://www.find-commonground.com/vs-talkingparents',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TalkingParents Alternative | CommonGround',
    description:
      'AI coaching, GPS handoffs, a child-facing app, and flat $17.99/mo — the modern talkingparents alternative.',
  },
};

const COMPARISON_ROWS: ComparisonTableRow[] = [
  {
    feature: 'Monthly price',
    ours: '$17.99 flat',
    theirs: '$24.99 per parent',
    note: 'CommonGround covers both parents on one subscription.',
  },
  {
    feature: 'Per-child fees',
    ours: 'None',
    theirs: 'None',
  },
  {
    feature: 'AI message coaching (ARIA)',
    ours: true,
    theirs: false,
  },
  {
    feature: 'AI rewrite suggestions',
    ours: true,
    theirs: false,
  },
  {
    feature: 'KidSpace child-facing app',
    ours: true,
    theirs: false,
  },
  {
    feature: 'Silent Handoff GPS exchanges',
    ours: true,
    theirs: false,
  },
  {
    feature: 'Unified family calendar',
    ours: true,
    theirs: 'limited',
    note: 'TalkingParents offers a shared calendar without schedule automation.',
  },
  {
    feature: 'Shared expenses (ClearFund)',
    ours: true,
    theirs: 'limited',
    note: 'TalkingParents has an Accountable Payments add-on, not a full expense ledger.',
  },
  {
    feature: 'Court-ready PDF exports',
    ours: true,
    theirs: true,
  },
  {
    feature: 'iOS + Android apps',
    ours: true,
    theirs: true,
  },
  {
    feature: 'Video calls',
    ours: true,
    theirs: 'limited',
    note: 'TalkingParents offers Accountable Calling as a paid add-on.',
  },
  {
    feature: 'Message attachments',
    ours: true,
    theirs: true,
  },
];

const FAQ_ITEMS = [
  {
    question: 'Can I switch from TalkingParents mid-case?',
    answer:
      'Yes. Most families switch between court dates. You can export your TalkingParents message history as a PDF and store it in CommonGround as a reference document, then start fresh with a timestamped record on our platform.',
  },
  {
    question: 'Is CommonGround admissible in court?',
    answer:
      'Yes. Every message, schedule change, exchange, and payment is timestamped and cryptographically verified. Court-ready PDF exports include a SHA-256 integrity hash so attorneys and judges can confirm the record has not been altered.',
  },
  {
    question: 'What about TalkingParents document storage?',
    answer:
      'CommonGround includes unlimited document storage in every plan. You can upload court orders, medical records, and school forms, organize them by child, and share them with your co-parent or attorney from one place.',
  },
  {
    question: 'Do I lose my message history when I switch?',
    answer:
      'No. Your TalkingParents history stays on their platform and can be exported as a PDF for court. CommonGround starts a clean, separately admissible record from day one — most attorneys prefer this clean break.',
  },
  {
    question: 'Is pricing really flat?',
    answer:
      'Yes. $17.99 per month covers both parents, every child, unlimited messages, GPS handoffs, KidSpace, and court exports. No per-child fees, no per-parent fees, no add-on fees for standard features.',
  },
];

export default function VsTalkingParentsPage() {
  return (
    <>
      <HeroSection
        variant="centered"
        eyebrow="Compare"
        headline="The modern alternative to TalkingParents"
        headlineAccent="TalkingParents"
        subheadline="Calmer messages, GPS-verified handoffs, and a child-facing app — features TalkingParents doesn't ship. Flat $17.99/mo, no per-child fees."
        primaryCta={{ label: 'Start free', href: '/signup' }}
        secondaryCta={{ label: 'See pricing', href: '/pricing' }}
      />

      <section className="px-6 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <ComparisonTable
            ourProduct="CommonGround"
            competitor="TalkingParents"
            rows={COMPARISON_ROWS}
          />
        </div>
      </section>

      <section className="px-6 py-12 sm:py-16 bg-[#F4F8F7]">
        <div className="max-w-6xl mx-auto" data-seed="placeholder">
          {/* TODO(marketing): replace with real quote */}
          <TestimonialCard
            variant="featured"
            quote="Switching from TalkingParents cut our weekly back-and-forth in half. The AI suggestions keep things calm, and Silent Handoff ended the driveway standoffs."
            name="Jordan M."
            role="Co-parent, post-decree case"
            rating={5}
          />
        </div>
      </section>

      <FaqAccordion
        heading="Switching from TalkingParents"
        items={FAQ_ITEMS}
      />
      <FaqJsonLd items={FAQ_ITEMS} />

      <CtaBand
        background="teal"
        headline="Ready to switch?"
        primaryCta={{ label: 'Start free', href: '/signup' }}
      />

      <footer className="px-6 py-8 bg-white">
        <p className="max-w-4xl mx-auto text-xs text-gray-500 leading-relaxed text-center">
          TalkingParents pricing and feature claims based on publicly listed
          data at talkingparents.com as of 2026-04-18. Feature parity and
          pricing may change; verify on the vendor&rsquo;s site before making
          a final decision.
        </p>
      </footer>
    </>
  );
}

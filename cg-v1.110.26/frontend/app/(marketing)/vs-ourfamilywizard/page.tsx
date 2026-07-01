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
  title: 'OurFamilyWizard Alternative | CommonGround',
  description:
    'The simpler ourfamilywizard alternative: AI rewrite coaching, a free child app, and flat $17.99/mo — no $174/yr-per-parent fees, no court add-ons.',
  alternates: { canonical: '/vs-ourfamilywizard' },
  openGraph: {
    type: 'website',
    title: 'OurFamilyWizard Alternative | CommonGround',
    description:
      'AI rewrite coaching, a free child-facing app, and flat $17.99/mo pricing — the simpler ourfamilywizard alternative.',
    url: 'https://www.find-commonground.com/vs-ourfamilywizard',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OurFamilyWizard Alternative | CommonGround',
    description:
      'AI coaching, a free child app, flat $17.99/mo — the simpler ourfamilywizard alternative.',
  },
};

const COMPARISON_ROWS: ComparisonTableRow[] = [
  {
    feature: 'Price',
    ours: '$17.99/mo flat',
    theirs: '$174/yr per parent',
    note: 'OurFamilyWizard bills each parent separately on an annual plan.',
  },
  {
    feature: 'Per-child fees',
    ours: 'None',
    theirs: '$12/yr per child',
  },
  {
    feature: 'AI tone coaching',
    ours: true,
    theirs: 'limited',
    note: 'OFW ships ToneMeter for sentiment detection without rewrite suggestions.',
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
    theirs: true,
  },
  {
    feature: 'Shared expenses ledger',
    ours: true,
    theirs: true,
  },
  {
    feature: 'Court-ready PDF exports',
    ours: 'Included',
    theirs: 'Paid add-on',
    note: 'OurFamilyWizard court-certified record uploads are a separate fee.',
  },
  {
    feature: 'Free professional (attorney) access',
    ours: true,
    theirs: 'limited',
    note: 'OFW charges attorneys for practitioner accounts.',
  },
  {
    feature: 'iOS + Android parity',
    ours: true,
    theirs: true,
  },
  {
    feature: "Free tier for professionals' clients",
    ours: true,
    theirs: false,
  },
];

const FAQ_ITEMS = [
  {
    question: 'Can I switch from OurFamilyWizard mid-case?',
    answer:
      'Yes. Families switch between court dates. Export your OFW message history as a certified PDF to preserve the record, then start a clean, timestamped record on CommonGround. Most attorneys prefer this approach.',
  },
  {
    question: 'Is CommonGround admissible in court?',
    answer:
      'Yes. Every message, schedule change, exchange, and payment is timestamped. Court-ready PDF exports include a SHA-256 integrity hash so judges and opposing counsel can confirm the record has not been altered — no separate certification fee.',
  },
  {
    question: 'What about the OFW ToneMeter?',
    answer:
      'ARIA, our AI coaching system, goes further than ToneMeter. It detects toxicity and then suggests a calmer rewrite you can accept, edit, or reject. ToneMeter only flags tone — you still have to rewrite the message yourself.',
  },
  {
    question: 'Is pricing really flat?',
    answer:
      'Yes. $17.99 per month covers both parents, every child, unlimited messages, GPS handoffs, KidSpace, court exports, and attorney access. No per-parent fees, no per-child fees, no court-certification add-ons.',
  },
  {
    question: 'Can my attorney still access the case?',
    answer:
      'Yes, and free of charge to them. Attorneys, mediators, and GALs get scoped read access to verified records. You invite them by email; they confirm, and their access is time-limited and audit-logged.',
  },
];

export default function VsOurFamilyWizardPage() {
  return (
    <>
      <HeroSection
        variant="centered"
        eyebrow="Compare"
        headline="Everything OurFamilyWizard does — calmer, and for less"
        headlineAccent="OurFamilyWizard"
        subheadline="ARIA rewrites the heat out of messages, KidSpace lets your kids reach you directly, and Silent Handoff ends driveway standoffs — all at a flat $17.99/mo that covers both parents. No per-parent fees, no per-child charges, no court add-ons."
        primaryCta={{ label: 'Start free — no card needed', href: '/signup' }}
        secondaryCta={{ label: 'See plans & pricing', href: '/pricing' }}
      />

      <section className="px-6 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <ComparisonTable
            ourProduct="CommonGround"
            competitor="OurFamilyWizard"
            rows={COMPARISON_ROWS}
          />
        </div>
      </section>

      <section className="px-6 py-12 sm:py-16 bg-cg-sand">
        <div className="max-w-6xl mx-auto" data-seed="placeholder">
          {/* TODO(marketing): replace with real quote */}
          <TestimonialCard
            variant="featured"
            quote="ARIA actually rewrites the message. OFW just told me my tone was off — CommonGround shows me the calmer version and lets me send it with one tap."
            name="Alex P."
            role="Parent, three-child custody case"
            rating={5}
          />
        </div>
      </section>

      <FaqAccordion
        heading="Switching from OurFamilyWizard"
        items={FAQ_ITEMS}
      />
      <FaqJsonLd items={FAQ_ITEMS} />

      <CtaBand
        background="teal"
        headline="Switch in minutes — keep your OFW record for court"
        subheadline="Start a clean, timestamped record on CommonGround. No credit card, forever-free tier, and your data stays yours."
        primaryCta={{ label: 'Start free — no card needed', href: '/signup' }}
      />

      <footer className="px-6 py-8 bg-white">
        <p className="max-w-4xl mx-auto text-xs text-gray-500 leading-relaxed text-center">
          OurFamilyWizard pricing and feature claims based on publicly listed
          data at ourfamilywizard.com as of 2026-04-18. Feature parity and
          pricing may change; verify on the vendor&rsquo;s site before making
          a final decision.
        </p>
      </footer>
    </>
  );
}

import type { Metadata } from 'next';
import {
  HeroSection,
  TrustBar,
  TestimonialCard,
  CtaBand,
  FaqJsonLd,
  FaqAccordion,
  ProfessionalInterestForm,
} from '@/components/marketing';

export const metadata: Metadata = {
  title: 'See CommonGround — for firms and mediators | Demo',
  description:
    'Book a 15-minute co-parenting platform demo tailored to your firm. See intake, case timeline, ARIA controls, and court-ready exports in action.',
  alternates: { canonical: '/demo' },
  openGraph: {
    type: 'website',
    title: 'See CommonGround — for firms and mediators | Demo',
    description:
      'Book a 15-minute co-parenting platform demo tailored to your firm. Intake, case timeline, ARIA controls, and court-ready exports.',
    url: 'https://www.find-commonground.com/demo',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'See CommonGround — for firms and mediators | Demo',
    description:
      'Book a 15-minute co-parenting platform demo tailored to your firm.',
  },
};

const FAQ_ITEMS = [
  {
    question: "What's included in the demo?",
    answer:
      'A 15-minute walkthrough of the professional portal: firm setup, client intake, case timeline, ARIA sentiment controls, court-ready PDF exports, and billing. We tailor the flow to your practice area — family law, mediation, or GAL work.',
  },
  {
    question: 'Is there a minimum contract or commitment?',
    answer:
      'No. Professionals join free when a client invites them. Paid firm plans are month-to-month with no minimum seats. You can add or remove team members any time.',
  },
  {
    question: 'Can I invite my paralegal or associate to the demo?',
    answer:
      'Yes. Invite as many team members as you like — attorneys, paralegals, intake coordinators. We recommend including whoever will run client onboarding and daily case work.',
  },
  {
    question: 'Do you support multi-firm accounts?',
    answer:
      'Yes. Practices with multiple offices or affiliated firms can set up a parent organization with scoped access per firm. Case data stays siloed; billing and admin roll up.',
  },
  {
    question: 'How does client data move between CommonGround and our case management system?',
    answer:
      'We export timestamped PDFs with a SHA-256 integrity hash — drop them straight into Clio, MyCase, Smokeball, or any DMS. A Zapier integration and a REST API are available on team plans for automated syncs.',
  },
];

export default function DemoPage() {
  const embedUrl = process.env.NEXT_PUBLIC_DEMO_EMBED_URL;

  return (
    <>
      <HeroSection
        variant="split"
        eyebrow="For professionals"
        headline="See CommonGround in action"
        headlineAccent="in action"
        subheadline="Book a 15-minute walkthrough tailored to your firm's workflow — intake, case timeline, court-ready exports."
        primaryCta={{ label: 'Book a demo', href: '#book' }}
        secondaryCta={{ label: 'See our walkthrough', href: '/walkthrough' }}
      />

      <section className="px-6 py-8 bg-cg-sand">
        <div className="max-w-6xl mx-auto">
          <TrustBar
            variant="stats"
            items={[
              { value: '15-min', label: 'Tailored walkthrough' },
              { value: 'SOC 2', label: 'Firm-grade security' },
              { value: 'Scoped', label: 'Per-case client access' },
            ]}
          />
        </div>
      </section>

      <section id="book" className="px-6 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-start">
          <div>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-cg-sage mb-3">
              What you&rsquo;ll see
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground leading-tight">
              A live tour of the professional portal
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
              Fifteen focused minutes covering the features family law firms
              use every day.
            </p>
            <ul className="mt-6 space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-cg-sage flex-shrink-0"
                />
                <span>
                  Client intake: guided onboarding that captures custody
                  status, court orders, and children&rsquo;s data.
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-cg-sage flex-shrink-0"
                />
                <span>
                  Case timeline: a chronological feed of messages, exchanges,
                  and court events in one place.
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-cg-sage flex-shrink-0"
                />
                <span>
                  ARIA controls: per-case sentiment thresholds and
                  intervention logging for high-conflict matters.
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-cg-sage flex-shrink-0"
                />
                <span>
                  Court-ready exports: timestamped PDFs with SHA-256
                  integrity hashing for admissibility.
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-cg-sage flex-shrink-0"
                />
                <span>
                  Firm billing and team roles: attorneys, paralegals, and
                  intake coordinators in one seat hierarchy.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                style={{ width: '100%', height: '680px', border: 'none' }}
                title="Book a CommonGround demo"
              />
            ) : (
              <>
                <h3 className="font-serif text-xl text-foreground mb-2">
                  Tell us about your practice
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  We&rsquo;ll reach out within one business day to schedule a
                  15-minute walkthrough.
                </p>
                <ProfessionalInterestForm source="demo_page" />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:py-16 bg-cg-sand">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8" data-seed="placeholder">
          {/* TODO(marketing): replace with real quote */}
          <TestimonialCard
            variant="featured"
            quote="We onboard new clients in under ten minutes. The timeline export alone saves my paralegal two hours per hearing."
            name="Morgan L."
            role="Family law attorney"
            rating={5}
          />
          {/* TODO(marketing): replace with real quote */}
          <TestimonialCard
            variant="featured"
            quote="As a mediator, ARIA changed my caseload. High-conflict clients arrive calmer because the platform coaches them before sessions."
            name="Dr. Riley T."
            role="Mediator, parenting coordinator"
            rating={5}
          />
        </div>
      </section>

      <FaqAccordion
        heading="Common questions from firms and mediators"
        items={FAQ_ITEMS}
      />
      <FaqJsonLd items={FAQ_ITEMS} />

      <CtaBand
        background="gold"
        headline="Prefer to self-tour?"
        primaryCta={{ label: 'Try the walkthrough', href: '/walkthrough' }}
      />
    </>
  );
}

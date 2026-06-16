import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HeroSection, CtaBand, InlineNewsletterCta } from '@/components/marketing';
import { CASE_STUDIES } from '@/content/case-studies/case-studies';

export const metadata: Metadata = {
  title: 'Case Studies | CommonGround',
  description:
    'Real families, firms, and mediators. See how CommonGround cuts court motions, shortens parenting plans, and keeps pro se families out of court.',
  alternates: { canonical: '/case-studies' },
  openGraph: {
    type: 'website',
    title: 'Case Studies | CommonGround',
    description:
      'Real families, firms, and mediators. See how CommonGround changes co-parenting outcomes.',
    url: 'https://www.find-commonground.com/case-studies',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Case Studies | CommonGround',
    description:
      'Real families, firms, and mediators. Measurable co-parenting outcomes.',
  },
};

export default function CaseStudiesIndexPage() {
  return (
    <>
      <HeroSection
        variant="centered"
        eyebrow="Real families, real outcomes"
        headline="Case studies"
        subheadline="See how firms, mediators, and pro se parents use CommonGround to lower conflict, cut court motions, and keep kids at the center."
        primaryCta={{ label: 'Start free', href: '/signup' }}
        secondaryCta={{ label: 'Book a demo', href: '/demo' }}
      />

      <section className="px-6 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {CASE_STUDIES.map((study) => (
            <Link
              key={study.slug}
              href={`/case-studies/${study.slug}`}
              className="cg-card-hover group block rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:border-cg-sage/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cg-sage focus-visible:ring-offset-2"
            >
              <div className="flex flex-col h-full">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cg-sage mb-3">
                  Case study
                </p>
                <h3 className="font-serif text-xl text-foreground leading-snug">
                  {study.title}
                </h3>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed flex-1">
                  {study.subtitle}
                </p>
                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-cg-sage">
                  Read the story
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <InlineNewsletterCta
            source="newsletter_case_studies"
            headline="Want new case studies as they publish?"
            subtext="One email when we publish a new story — real outcomes, real numbers, nothing else."
          />
        </div>
      </section>

      <CtaBand
        background="teal"
        headline="Ready to write your own story?"
        subheadline="Start free — no credit card, no trial clock."
        primaryCta={{ label: 'Start free', href: '/signup' }}
        secondaryCta={{ label: 'Book a demo', href: '/demo' }}
      />
    </>
  );
}

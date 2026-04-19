import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HeroSection, CtaBand } from '@/components/marketing';
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

      <section className="px-6 py-12 sm:py-16" data-seed="placeholder">
        {/* TODO(marketing): replace with real case study */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {CASE_STUDIES.map((study) => (
            <Link
              key={study.slug}
              href={`/case-studies/${study.slug}`}
              className="group block rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-[#3DAA8A]/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3DAA8A] focus-visible:ring-offset-2"
            >
              <div className="flex flex-col h-full">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3DAA8A] mb-3">
                  Case study
                </p>
                <h3 className="font-serif text-xl text-[#1E3A4A] leading-snug">
                  {study.title}
                </h3>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed flex-1">
                  {study.subtitle}
                </p>
                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#3DAA8A]">
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

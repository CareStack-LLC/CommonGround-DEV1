import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  SectionHeading,
  StatCounter,
  TestimonialCard,
  CtaBand,
} from '@/components/marketing';
import {
  CASE_STUDIES,
  getCaseStudy,
  type CaseStudy,
} from '@/content/case-studies/case-studies';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return CASE_STUDIES.map((cs) => ({ slug: cs.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) return {};

  const canonical = `/case-studies/${study.slug}`;
  const url = `https://www.find-commonground.com${canonical}`;
  const title = `${study.title} | CommonGround`;
  // Metadata description ≤ 155 chars — truncate defensively.
  const description =
    study.description.length > 155
      ? `${study.description.slice(0, 152)}...`
      : study.description;

  return {
    title: title.length > 70 ? `${study.title} | CommonGround` : title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: 'CommonGround',
      publishedTime: study.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

function ArticleJsonLd({ study }: { study: CaseStudy }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: study.title,
    description: study.description,
    datePublished: study.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'CommonGround',
    },
    publisher: {
      '@type': 'Organization',
      name: 'CommonGround',
    },
    url: `https://www.find-commonground.com/case-studies/${study.slug}`,
  };
  const safe = JSON.stringify(data).replace(/</g, '\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) notFound();

  return (
    <div data-seed="placeholder">
      {/* TODO(marketing): replace with real case study */}
      <ArticleJsonLd study={study} />

      <section className="px-6 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/case-studies"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#3DAA8A] hover:text-[#2F8C70] mb-8"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All case studies
          </Link>
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-[#3DAA8A] mb-3">
            Case study
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#1E3A4A] leading-tight tracking-tight">
            {study.title}
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-gray-600 leading-relaxed">
            {study.subtitle}
          </p>
        </div>
      </section>

      <section className="px-6 py-12 sm:py-16 bg-white">
        <div className="max-w-3xl mx-auto space-y-12">
          <div>
            <SectionHeading
              title="The challenge"
              align="left"
              as="h2"
            />
            <p className="mt-4 text-base sm:text-lg text-gray-700 leading-relaxed">
              {study.challenge}
            </p>
          </div>

          <div>
            <SectionHeading
              title="The approach"
              align="left"
              as="h2"
            />
            <p className="mt-4 text-base sm:text-lg text-gray-700 leading-relaxed">
              {study.approach}
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:py-20 bg-[#F4F8F7]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <SectionHeading
              title="The results"
              align="center"
              as="h2"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {study.results.map((result) => (
              <StatCounter
                key={result.label}
                value={result.value}
                label={result.label}
                accent="teal"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <TestimonialCard
            variant="featured"
            quote={study.quote.text}
            name={study.quote.author}
            role={study.quote.role}
            rating={5}
          />
        </div>
      </section>

      <CtaBand
        background="teal"
        headline={study.cta.headline}
        subheadline={study.cta.subheadline}
        primaryCta={{ label: 'Start free', href: '/signup' }}
        secondaryCta={{ label: 'Book a demo', href: '/demo' }}
      />
    </div>
  );
}

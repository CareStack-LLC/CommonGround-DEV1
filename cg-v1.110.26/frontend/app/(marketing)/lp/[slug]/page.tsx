import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LandingPageTemplate } from '@/components/marketing/landing-page-template';
import { LpAnalytics } from '@/components/marketing/lp-analytics';
import { JsonLd } from '@/components/marketing/json-ld';
import { sanitizeHtml } from '@/lib/sanitize';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/api\/v1\/?$/, '');

interface LandingPageData {
  slug: string;
  title: string;
  headline: string;
  subheadline?: string;
  hero_image_url?: string;
  body_html: string;
  cta_text: string;
  cta_url: string;
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
  target_audience: string;
  utm_source?: string;
  utm_campaign?: string;
  sections_json?: {
    format_version: number;
    hero_label?: string;
    headline?: string;
    headline_accent?: string;
    subheadline?: string;
    cta_text?: string;
    pain_points_heading?: string;
    pain_points_subheading?: string;
    pain_points?: Array<{ old: string; cg: string }>;
    features_label?: string;
    features_heading?: string;
    features_subheading?: string;
    features?: Array<{ icon: string; name: string; tagline: string; description: string; accent: string }>;
    testimonial?: { quote: string; name: string; title: string; initial: string };
    early_adopter_label?: string;
    early_adopter_heading?: string;
    early_adopter_subheading?: string;
    faq_heading?: string;
    faqs?: Array<{ q: string; a: string }>;
  } | null;
}

async function fetchLandingPage(slug: string): Promise<LandingPageData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/lp/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchLandingPage(slug);
  if (!data) return {};

  const title = data.seo_title || data.title || data.headline;
  const description = data.seo_description || data.subheadline || '';

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.find-commonground.com/lp/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://www.find-commonground.com/lp/${slug}`,
      siteName: 'CommonGround',
      ...(data.og_image_url ? { images: [data.og_image_url] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(data.og_image_url ? { images: [data.og_image_url] } : {}),
    },
  };
}

export default async function DynamicLandingPage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchLandingPage(slug);

  if (!data) {
    notFound();
  }

  const sections = data.sections_json;

  // V2 structured template rendering
  if (sections && sections.format_version === 2) {
    return (
      <>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: data.title || data.headline,
            description: data.seo_description || data.subheadline,
            url: `https://www.find-commonground.com/lp/${slug}`,
            provider: {
              '@type': 'Organization',
              name: 'CommonGround',
              url: 'https://www.find-commonground.com',
            },
            offers: {
              '@type': 'Offer',
              name: 'Early Adopter — 30% Off for Life',
              description: 'First 50 members get 30% off all subscriptions, locked for 36 months.',
              eligibleQuantity: { '@type': 'QuantitativeValue', value: 50 },
            },
          }}
        />
        <LpAnalytics slug={slug} />
        <LandingPageTemplate
          slug={slug}
          heroLabel={sections.hero_label || `For ${data.target_audience}`}
          headline={sections.headline || data.headline}
          headlineAccent={sections.headline_accent}
          subheadline={sections.subheadline || data.subheadline || ''}
          ctaText={sections.cta_text || data.cta_text || 'Join the Early Adopter List'}
          heroImageUrl={data.hero_image_url}
          painPointsHeading={sections.pain_points_heading || 'Sound Familiar?'}
          painPointsSubheading={sections.pain_points_subheading || ''}
          painPoints={sections.pain_points || []}
          featuresLabel={sections.features_label || 'Your corner'}
          featuresHeading={sections.features_heading || 'Tools Built for You'}
          featuresSubheading={sections.features_subheading || ''}
          features={sections.features || []}
          testimonial={sections.testimonial || { quote: '', name: '', title: '', initial: '' }}
          earlyAdopterLabel={sections.early_adopter_label || 'Early Adopter Offer'}
          earlyAdopterHeading={sections.early_adopter_heading || 'Your Kids Need You Present'}
          earlyAdopterSubheading={sections.early_adopter_subheading || 'Join the first 50 members and lock in 30% off for life.'}
          faqHeading={sections.faq_heading || 'Questions You Might Have'}
          faqs={sections.faqs || []}
        />
      </>
    );
  }

  // Legacy V1 fallback: raw HTML rendering
  return (
    <div className="min-h-screen bg-white">
      <LpAnalytics slug={slug} />

      <section className="relative bg-gradient-to-b from-cg-sand to-white pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1
            className="text-4xl md:text-5xl text-foreground mb-4 leading-tight"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            {data.headline}
          </h1>
          {data.subheadline && (
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              {data.subheadline}
            </p>
          )}
          <a
            href={data.cta_url}
            className="inline-flex items-center gap-2 px-8 py-4 bg-cg-sage hover:bg-cg-sage-dark text-white font-semibold rounded-xl text-lg transition-colors shadow-lg shadow-cg-sage/25"
          >
            {data.cta_text}
          </a>
        </div>
        {data.hero_image_url && (
          <div className="max-w-4xl mx-auto mt-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.hero_image_url} alt={data.headline} className="w-full rounded-2xl shadow-xl" />
          </div>
        )}
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16">
        <div
          className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-gray-600"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.body_html) }}
        />
      </section>

      <section className="bg-cg-sage py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-white/80 mb-8">Join families using CommonGround for better co-parenting.</p>
          <Link
            href={data.cta_url}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-cg-sage font-semibold rounded-xl text-lg transition-colors"
          >
            {data.cta_text}
          </Link>
        </div>
      </section>
    </div>
  );
}

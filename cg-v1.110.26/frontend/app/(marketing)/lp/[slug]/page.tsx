'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/api\/v1\/?$/, '');

interface LandingPageData {
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
}

export default function LandingPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [page, setPage] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/lp/${slug}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to load page');
        const data = await res.json();
        setPage(data);

        // Set SEO meta tags
        if (data.seo_title) document.title = data.seo_title;
        const setMeta = (name: string, content: string) => {
          let el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
          if (!el) { el = document.createElement('meta'); el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name); document.head.appendChild(el); }
          el.setAttribute('content', content);
        };
        if (data.seo_description) setMeta('description', data.seo_description);
        if (data.seo_title) { setMeta('og:title', data.seo_title); setMeta('twitter:title', data.seo_title); }
        if (data.seo_description) { setMeta('og:description', data.seo_description); setMeta('twitter:description', data.seo_description); }
        if (data.og_image_url) { setMeta('og:image', data.og_image_url); setMeta('twitter:image', data.og_image_url); }

        // Track GA event
        trackEvent('landing_page_view', {
          page_slug: slug,
          target_audience: data.target_audience,
          utm_source: data.utm_source,
          utm_campaign: data.utm_campaign,
        });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const handleCtaClick = () => {
    if (page) {
      trackEvent('landing_page_cta_click', {
        page_slug: slug,
        cta_text: page.cta_text,
        target_audience: page.target_audience,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-6">This landing page doesn&apos;t exist or has been unpublished.</p>
        <Link href="/" className="px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-500 transition-colors">
          Go to CommonGround
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-violet-50 to-white pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            {page.headline}
          </h1>
          {page.subheadline && (
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              {page.subheadline}
            </p>
          )}
          <a
            href={page.cta_url}
            onClick={handleCtaClick}
            className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-lg transition-colors shadow-lg shadow-violet-500/25"
          >
            {page.cta_text}
          </a>
        </div>
        {page.hero_image_url && (
          <div className="max-w-4xl mx-auto mt-12">
            <img src={page.hero_image_url} alt={page.headline} className="w-full rounded-2xl shadow-xl" />
          </div>
        )}
      </section>

      {/* Body Content */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div
          className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-violet-600"
          dangerouslySetInnerHTML={{ __html: page.body_html }}
        />
      </section>

      {/* Bottom CTA */}
      <section className="bg-violet-600 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-violet-200 mb-8">Join thousands of families using CommonGround for better co-parenting.</p>
          <a
            href={page.cta_url}
            onClick={handleCtaClick}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-violet-600 font-semibold rounded-xl text-lg transition-colors"
          >
            {page.cta_text}
          </a>
        </div>
      </section>
    </div>
  );
}

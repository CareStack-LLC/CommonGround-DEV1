import { MetadataRoute } from 'next';
import { CASE_STUDIES } from '@/content/case-studies/case-studies';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.find-commonground.com';
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/parents`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/professionals`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    // /lawyers redirects to /professionals — no separate sitemap entry needed
    { url: `${baseUrl}/aria`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/kidspace`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/safe-handoff`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/testimonials`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/grant-partnership`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/partners`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/help/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/help/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${baseUrl}/high-conflict`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/security`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/legal/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/legal/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/register`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },

    // — Phase C additions ————————————————————————————————————————
    // High-intent competitor-comparison pages get priority 0.8.
    { url: `${baseUrl}/vs-talkingparents`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/vs-ourfamilywizard`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/demo`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/walkthrough`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/case-studies`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ];

  // — Dynamic case-study slugs ————————————————————————————————————
  // CASE_STUDIES is a compile-time constant, so iterating at build time
  // is safe and does not require a network call.
  const caseStudyRoutes: MetadataRoute.Sitemap = CASE_STUDIES.map((cs) => ({
    url: `${baseUrl}/case-studies/${cs.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // TODO: /blog/[slug] — blog posts are fetched from the API at request
  // time (see app/(marketing)/blog/_content.tsx). Emitting them from a
  // build-time sitemap would require a backend fetch we do not want to
  // introduce here. Revisit when a static content layer lands.

  // TODO: /lp/[slug] — partner/state landing pages. The dynamic route
  // already provides generateMetadata, but a static slug list lives
  // outside this file; emit sitemap entries for them once that list is
  // promoted to a shared content module.

  return [...staticRoutes, ...caseStudyRoutes];
}

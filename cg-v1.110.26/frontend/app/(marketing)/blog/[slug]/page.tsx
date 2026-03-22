'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Clock, ArrowLeft, ArrowRight, User, Share2, Loader2, CheckCircle } from 'lucide-react';
import {
  getPostBySlug,
  getRelatedPosts,
  formatDate,
  getCategoryStyles,
} from '@/lib/blog-data';
import { BlogContent } from '@/components/marketing/blog-content';
import { InlineNewsletterCta } from '@/components/marketing/inline-newsletter-cta';
import { trackBlogRead, trackBlogPageView, setupSectionTracking } from '@/lib/analytics';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  category: string;
  tags: string[];
  featured_image_url: string | null;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string | null;
}

function estimateReadTime(content: string): string {
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function categoryToColor(cat: string): 'sage' | 'amber' | 'slate' | 'red' {
  const map: Record<string, 'sage' | 'amber' | 'slate' | 'red'> = {
    'Co-Parenting Tips': 'sage', 'Communication': 'amber', 'Agreements': 'sage',
    'High-Conflict': 'red', 'Parenting': 'sage', 'Scheduling': 'amber',
    'Legal Insights': 'slate', 'Platform Updates': 'amber', 'ARIA & Technology': 'slate',
    'Family Wellness': 'sage', 'KidSpace': 'amber',
  };
  return map[cat] || 'sage';
}

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [apiPost, setApiPost] = useState<ApiPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Try API first, fall back to legacy
  const legacyPost = getPostBySlug(slug);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/blog/posts/${slug}`);
        if (res.ok) {
          setApiPost(await res.json());
        }
      } catch {
        // API unavailable — use legacy
      }
      setIsLoading(false);
    };
    fetchPost();
  }, [slug]);

  // Track blog read with source attribution (UTM params)
  useEffect(() => {
    if (!isLoading) {
      const category = apiPost?.category || legacyPost?.category || '';
      const params = new URLSearchParams(window.location.search);
      const source = params.get('utm_source') || undefined;
      const medium = params.get('utm_medium') || undefined;
      const campaign = params.get('utm_campaign') || undefined;
      trackBlogRead(slug, category, source, medium, campaign);
      trackBlogPageView(slug);
    }
  }, [isLoading, slug, apiPost, legacyPost]);

  // Section tracking (same pattern as landing pages)
  useEffect(() => {
    return setupSectionTracking(`blog-${slug}`);
  }, [slug]);

  // Set page title + OG/Twitter meta tags for SEO
  useEffect(() => {
    const title = apiPost?.seo_title || apiPost?.title || legacyPost?.title;
    const description = apiPost?.seo_description || apiPost?.excerpt || legacyPost?.excerpt || '';
    const imageUrl = apiPost?.featured_image_url || legacyPost?.image || '';

    if (title) document.title = `${title} | CommonGround Blog`;

    // Set OG and Twitter meta tags dynamically
    const metaTags: Record<string, string> = {
      'og:title': title || '',
      'og:description': description,
      'og:image': imageUrl,
      'og:image:width': '1792',
      'og:image:height': '1024',
      'og:type': 'article',
      'twitter:card': 'summary_large_image',
      'twitter:title': title || '',
      'twitter:description': description,
      'twitter:image': imageUrl,
    };

    const cleanupTags: HTMLMetaElement[] = [];
    for (const [property, content] of Object.entries(metaTags)) {
      if (!content) continue;
      const isOg = property.startsWith('og:');
      const attr = isOg ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, property);
        document.head.appendChild(tag);
        cleanupTags.push(tag);
      }
      tag.setAttribute('content', content);
    }

    return () => {
      cleanupTags.forEach(tag => tag.remove());
    };
  }, [apiPost, legacyPost]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F8F7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3DAA8A] animate-spin" />
      </div>
    );
  }

  // API post found — render dynamic content
  if (apiPost) {
    const readTime = estimateReadTime(apiPost.content);
    const catColor = categoryToColor(apiPost.category);

    return (
      <div className="bg-[#F4F8F7]">
        {/* Header */}
        <section className="py-16 bg-white border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-[#3DAA8A] hover:text-[#1E3A4A] font-medium transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </Link>

            <div className={`inline-block px-3 py-1 ${getCategoryStyles(catColor)} text-sm font-medium rounded-full mb-5`}>
              {apiPost.category}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-serif font-semibold text-[#1E3A4A] mb-6 leading-tight">
              {apiPost.title}
            </h1>

            {/* Excerpt */}
            {apiPost.excerpt && (
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">{apiPost.excerpt}</p>
            )}

            {/* Author bar */}
            <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3DAA8A] to-[#2D6A8F] flex items-center justify-center text-white text-sm font-bold">
                {apiPost.author.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1E3A4A]">{apiPost.author}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatDate(apiPost.published_at || apiPost.created_at || '')}</span>
                  <span>·</span>
                  <span>{readTime}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Image */}
        {apiPost.featured_image_url && (
          <section>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
              <div className="aspect-[16/9] rounded-2xl overflow-hidden shadow-lg">
                <Image src={apiPost.featured_image_url} alt={apiPost.title} width={1792} height={1024} sizes="(max-width: 1280px) 100vw, 1280px" className="w-full h-full object-cover" priority />
              </div>
            </div>
          </section>
        )}

        {/* Content — rendered HTML from AI generation */}
        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Scoped blog content styles */}
            <style>{`
              .blog-content { color: #374151; font-size: 1.125rem; line-height: 1.8; }
              .blog-content h2 { color: #1E3A4A; font-size: 1.75rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #E8F4F0; }
              .blog-content h3 { color: #1E3A4A; font-size: 1.35rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; }
              .blog-content p { margin-bottom: 1.25rem; }
              .blog-content ul, .blog-content ol { margin: 1.25rem 0; padding-left: 1.5rem; }
              .blog-content ul { list-style-type: disc; }
              .blog-content ol { list-style-type: decimal; }
              .blog-content li { margin-bottom: 0.5rem; padding-left: 0.25rem; }
              .blog-content li::marker { color: #3DAA8A; }
              .blog-content strong { color: #1E3A4A; font-weight: 600; }
              .blog-content em { font-style: italic; }
              .blog-content a { color: #3DAA8A; text-decoration: none; font-weight: 500; }
              .blog-content a:hover { text-decoration: underline; }
              .blog-content blockquote { border-left: 4px solid #3DAA8A; padding: 1rem 1.5rem; margin: 1.5rem 0; background: #F4F8F7; border-radius: 0 0.75rem 0.75rem 0; color: #4B5563; font-style: italic; }
              .blog-content img { border-radius: 1rem; margin: 2rem 0; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
              .blog-content hr { border: none; border-top: 2px solid #E8F4F0; margin: 2.5rem 0; }
            `}</style>
            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: apiPost.content }}
            />

            {/* Share & Tags */}
            <div className="mt-12 pt-8 border-t border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {apiPost.tags.length > 0 && apiPost.tags.map(tag => (
                    <span key={tag} className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-600 font-medium">{tag}</span>
                  ))}
                </div>
                <button onClick={handleShare} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 hover:border-[#3DAA8A]/30 hover:bg-[#F4F8F7] transition-all text-sm text-gray-600">
                  {copied ? <><CheckCircle className="w-4 h-4 text-[#3DAA8A]" /> <span className="text-[#3DAA8A] font-medium">Link copied!</span></> : <><Share2 className="w-4 h-4" /> Share</>}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-8">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <InlineNewsletterCta
              source={`newsletter_blog_${slug}`}
              headline="Enjoy this article? Get more like it."
              subtext="Co-parenting tips, expert advice, and product updates — straight to your inbox."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] rounded-2xl p-10 text-center">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3DAA8A] via-[#D4AF37] to-[#3DAA8A]" />
              <h2 className="text-xl font-semibold text-white mb-3">Ready to improve your co-parenting journey?</h2>
              <p className="text-[#C8E6DC] mb-8 max-w-lg mx-auto">CommonGround gives you the tools to communicate better, track agreements, and co-parent more effectively.</p>
              <Link href="/early-access" className="inline-flex items-center justify-center gap-2 bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white font-semibold px-8 py-3.5 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Legacy post — use existing BlogContent component
  if (legacyPost) {
    const relatedPosts = getRelatedPosts(legacyPost.relatedPosts);

    return (
      <div className="bg-[#F4F8F7]">
        <section className="py-12 bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/blog" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#1E3A4A] transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </Link>
            <div className={`inline-block px-3 py-1 ${getCategoryStyles(legacyPost.categoryColor)} text-sm font-medium rounded-full mb-4`}>
              {legacyPost.category}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-[#1E3A4A] mb-6">{legacyPost.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-2"><User className="w-4 h-4" />{legacyPost.author}</span>
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4" />{formatDate(legacyPost.date)}</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" />{legacyPost.readTime}</span>
            </div>
          </div>
        </section>

        {legacyPost.image && (
          <section>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
              <div className="aspect-[16/9] rounded-2xl overflow-hidden shadow-lg">
                <Image src={legacyPost.image} alt={legacyPost.title} width={1792} height={1024} sizes="(max-width: 1280px) 100vw, 1280px" className="w-full h-full object-cover" priority />
              </div>
            </div>
          </section>
        )}

        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-lg max-w-none prose-headings:text-[#1E3A4A] prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-[#1E3A4A] prose-a:text-[#3DAA8A] prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-[#3DAA8A] prose-blockquote:text-gray-600 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3">
              <BlogContent slug={slug} />
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Share this article:</span>
                <button onClick={handleShare} className="p-2 rounded-lg bg-white border border-gray-200 hover:border-cg-sage/30 transition-colors flex items-center gap-2">
                  {copied ? <CheckCircle className="w-4 h-4 text-[#3DAA8A]" /> : <Share2 className="w-4 h-4 text-gray-600" />}
                  {copied && <span className="text-xs text-[#3DAA8A]">Copied!</span>}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <InlineNewsletterCta
              source={`newsletter_blog_${slug}`}
              headline="Enjoy this article? Get more like it."
              subtext="Co-parenting tips, expert advice, and product updates — straight to your inbox."
            />
          </div>
        </section>

        {relatedPosts.length > 0 && (
          <section className="py-12 bg-white border-t border-gray-200">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl font-semibold text-[#1E3A4A] mb-6">Related Articles</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {relatedPosts.map((rp) => (
                  <Link key={rp.slug} href={`/blog/${rp.slug}`} className="group p-4 rounded-xl bg-[#F4F8F7] border border-gray-200/50 hover:border-cg-sage/30 transition-all">
                    <h3 className="font-semibold text-[#1E3A4A] group-hover:text-cg-sage transition-colors mb-2">{rp.title}</h3>
                    <p className="text-sm text-gray-600">{rp.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`bg-gradient-to-br ${legacyPost.ctaGradient} rounded-2xl p-8 text-center`}>
              <h2 className="text-xl font-semibold text-[#1E3A4A] mb-3">{legacyPost.ctaTitle}</h2>
              <p className="text-gray-600 mb-6">{legacyPost.ctaDescription}</p>
              <Link href={legacyPost.ctaLink} className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-6 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg">
                {legacyPost.ctaLinkText} <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Not found
  return (
    <div className="min-h-screen bg-[#F4F8F7] flex flex-col items-center justify-center py-20">
      <h1 className="text-2xl font-semibold text-[#1E3A4A] mb-4">Post Not Found</h1>
      <p className="text-gray-600 mb-6">This article doesn't exist or has been removed.</p>
      <Link href="/blog" className="inline-flex items-center gap-2 bg-cg-sage text-white px-6 py-3 rounded-full">
        <ArrowLeft className="w-4 h-4" /> Back to Blog
      </Link>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Clock, ArrowLeft, ArrowRight, User, Share2, Loader2, CheckCircle } from 'lucide-react';
import {
  getPostBySlug,
  getRelatedPosts,
  formatDate,
  getCategoryStyles,
} from '@/lib/blog-data';
import { BlogContent } from '@/components/marketing/blog-content';

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

  // Set page title
  useEffect(() => {
    const title = apiPost?.seo_title || apiPost?.title || legacyPost?.title;
    if (title) document.title = `${title} | CommonGround Blog`;
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
        <section className="py-12 bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/blog" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#1E3A4A] transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </Link>

            <div className={`inline-block px-3 py-1 ${getCategoryStyles(catColor)} text-sm font-medium rounded-full mb-4`}>
              {apiPost.category}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-[#1E3A4A] mb-6">
              {apiPost.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-2"><User className="w-4 h-4" />{apiPost.author}</span>
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4" />{formatDate(apiPost.published_at || apiPost.created_at || '')}</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" />{readTime}</span>
            </div>
          </div>
        </section>

        {/* Featured Image */}
        {apiPost.featured_image_url && (
          <section>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
              <div className="aspect-[16/9] rounded-2xl overflow-hidden shadow-lg">
                <img src={apiPost.featured_image_url} alt={apiPost.title} className="w-full h-full object-cover" />
              </div>
            </div>
          </section>
        )}

        {/* Content — rendered HTML from AI generation */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="prose prose-lg max-w-none text-gray-700
                prose-headings:text-[#1E3A4A] prose-headings:font-semibold
                prose-p:leading-relaxed prose-p:text-gray-700
                prose-li:text-gray-700
                prose-strong:text-[#1E3A4A]
                prose-a:text-[#3DAA8A] prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-[#3DAA8A] prose-blockquote:text-gray-600
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-ul:list-disc prose-ol:list-decimal
                prose-img:rounded-xl prose-img:shadow-md"
              dangerouslySetInnerHTML={{ __html: apiPost.content }}
            />

            {/* Tags */}
            {apiPost.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {apiPost.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 text-xs bg-[#F4F8F7] border border-gray-200 rounded-full text-gray-600">{tag}</span>
                ))}
              </div>
            )}

            {/* Share */}
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

        {/* CTA */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-cg-sage-subtle to-cg-amber-subtle rounded-2xl p-8 text-center">
              <h2 className="text-xl font-semibold text-[#1E3A4A] mb-3">Ready to improve your co-parenting journey?</h2>
              <p className="text-gray-600 mb-6">CommonGround gives you the tools to communicate better, track agreements, and co-parent more effectively.</p>
              <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-6 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg">
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
                <img src={legacyPost.image} alt={legacyPost.title} className="w-full h-full object-cover" />
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

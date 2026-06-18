'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { NewsletterForm } from '@/components/marketing/newsletter-form';
import { blogPosts as legacyPosts, formatDate, HIDDEN_BLOG_SLUGS, type BlogPost as LegacyPost } from '@/lib/blog-data';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiBlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  category: string;
  tags: string[];
  featured_image_url: string | null;
  status: string;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string | null;
}

// Unified post type for rendering
interface DisplayPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  pillClasses: string;
  author: string;
  date: string;
  readTime: string;
  featured: boolean;
  image: string;
  isApi: boolean;
}

function estimateReadTime(content: string): string {
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

function categoryToPillClasses(cat: string): string {
  const map: Record<string, string> = {
    'Co-Parenting Tips': 'bg-cg-sage-subtle text-cg-sage',
    'Communication': 'bg-cg-amber-subtle text-cg-amber',
    'Agreements': 'bg-cg-sage-subtle text-cg-sage',
    'High-Conflict': 'bg-red-100 text-red-700',
    'Parenting': 'bg-cg-sage-subtle text-cg-sage',
    'Scheduling': 'bg-cg-amber-subtle text-cg-amber',
    'Legal Insights': 'bg-gray-100 text-gray-700',
    'Platform Updates': 'bg-cg-amber-subtle text-cg-amber',
    'ARIA & Technology': 'bg-gray-100 text-gray-700',
    'Family Wellness': 'bg-cg-sage-subtle text-cg-sage',
    'KidSpace': 'bg-cg-amber-subtle text-cg-amber',
  };
  return map[cat] || 'bg-cg-sage-subtle text-cg-sage';
}

export function BlogContent() {
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchPosts = async () => {
      let apiPosts: DisplayPost[] = [];

      try {
        const res = await fetch(`${API_BASE}/api/v1/blog/posts?limit=50`);
        if (res.ok) {
          const data = await res.json();
          const items: ApiBlogPost[] = data.posts || [];
          apiPosts = items.map((p, i) => ({
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            category: p.category,
            pillClasses: categoryToPillClasses(p.category),
            author: p.author,
            date: p.published_at || p.created_at || '',
            readTime: estimateReadTime(p.content),
            featured: i < 3,
            image: p.featured_image_url || '',
            isApi: true,
          }));
        }
      } catch {
        // API unavailable
      }

      // Merge CMS (API) posts with the curated local library so both show.
      // Dedupe by slug (API wins), sort newest-first, then mark the first
      // three as featured so the featured grid never hides extras.
      const legacyMapped: DisplayPost[] = legacyPosts.map(p => ({
        slug: p.slug, title: p.title, excerpt: p.excerpt,
        category: p.category, pillClasses: categoryToPillClasses(p.category),
        author: p.author, date: p.date, readTime: p.readTime,
        featured: p.featured, image: p.image, isApi: false,
      }));
      const apiSlugs = new Set(apiPosts.map(p => p.slug));
      const merged = [...apiPosts, ...legacyMapped.filter(p => !apiSlugs.has(p.slug))]
        .filter(p => !HIDDEN_BLOG_SLUGS.has(p.slug))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .map((p, i) => ({ ...p, featured: i < 3 }));
      setPosts(merged);
      setIsLoading(false);
    };
    fetchPosts();
  }, []);

  const allCategories = ['All', ...Array.from(new Set(posts.map(p => p.category)))];
  const filteredPosts = activeCategory === 'All' ? posts : posts.filter(p => p.category === activeCategory);
  const featuredPosts = filteredPosts.filter(p => p.featured);
  const recentPosts = filteredPosts.filter(p => !p.featured);

  // Placeholder gradient for posts without images
  const placeholderBg = 'bg-gradient-to-br from-cg-sage-subtle via-[#D6EEF5] to-[#E0E8ED]';

  return (
    <div className="bg-cg-sand">
      {/* Hero */}
      <section className="relative py-16 lg:py-20 bg-gradient-to-br from-foreground to-cg-slate overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-[10%] w-64 h-64 rounded-full bg-cg-sage/10 blur-3xl" />
          <div className="absolute bottom-10 left-[5%] w-48 h-48 rounded-full bg-cg-amber/10 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-white mb-4">The CommonGround Blog</h1>
            <p className="text-lg text-white/70">Expert advice, practical tips, and insights for co-parents navigating the journey of raising children together, apart.</p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-4 border-b border-gray-200 sticky top-16 bg-white/95 backdrop-blur z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 text-sm rounded-full transition-all duration-300 ${
                  activeCategory === category
                    ? 'bg-cg-sage text-white'
                    : 'bg-cg-sand border border-gray-200 hover:border-cg-sage/30 text-foreground'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-cg-sage animate-spin" />
        </div>
      ) : (
        <>
          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <section className="py-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-semibold text-foreground mb-8">Featured Articles</h2>
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Main Featured */}
                  <div className="lg:col-span-2">
                    <Link href={`/blog/${featuredPosts[0].slug}`} className="group block">
                      <div className={`aspect-[16/9] rounded-2xl mb-6 overflow-hidden ${!featuredPosts[0].image ? placeholderBg : ''}`}>
                        {featuredPosts[0].image ? (
                          <Image src={featuredPosts[0].image} alt={featuredPosts[0].title} width={1792} height={1024} sizes="(max-width: 768px) 100vw, 66vw" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" priority />
                        ) : (
                          <div className={`w-full h-full ${placeholderBg} flex items-center justify-center`}>
                            <span className="text-6xl opacity-30">📝</span>
                          </div>
                        )}
                      </div>
                      <div className={`inline-block px-3 py-1 ${featuredPosts[0].pillClasses} text-sm font-medium rounded-full mb-3`}>
                        {featuredPosts[0].category}
                      </div>
                      <h3 className="text-2xl font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-3">{featuredPosts[0].title}</h3>
                      <p className="text-gray-600 mb-4">{featuredPosts[0].excerpt}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(featuredPosts[0].date)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{featuredPosts[0].readTime}</span>
                      </div>
                    </Link>
                  </div>
                  {/* Side Featured */}
                  <div className="space-y-8">
                    {featuredPosts.slice(1, 3).map((post) => (
                      <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                        <div className={`aspect-[16/9] rounded-xl mb-4 overflow-hidden ${!post.image ? placeholderBg : ''}`}>
                          {post.image ? (
                            <Image src={post.image} alt={post.title} width={1792} height={1024} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className={`w-full h-full ${placeholderBg} flex items-center justify-center`}>
                              <span className="text-4xl opacity-30">📝</span>
                            </div>
                          )}
                        </div>
                        <div className={`inline-block px-2 py-0.5 ${post.pillClasses} text-xs font-medium rounded-full mb-2`}>
                          {post.category}
                        </div>
                        <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">{post.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>{formatDate(post.date)}</span>
                          <span>{post.readTime}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* All/Recent Posts */}
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-semibold text-foreground mb-8">
                {activeCategory === 'All' ? 'Recent Articles' : activeCategory}
              </h2>
              {(recentPosts.length > 0 || (activeCategory !== 'All' && featuredPosts.length === 0)) ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {(activeCategory !== 'All' ? filteredPosts : recentPosts).map((post) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group bg-cg-sand rounded-xl border border-gray-200/50 overflow-hidden hover:shadow-lg transition-shadow">
                      <div className={`aspect-[16/10] overflow-hidden ${!post.image ? placeholderBg : ''}`}>
                        {post.image ? (
                          <Image src={post.image} alt={post.title} width={1792} height={1024} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className={`w-full h-full ${placeholderBg} flex items-center justify-center`}>
                            <span className="text-4xl opacity-30">📝</span>
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <div className={`inline-block px-2 py-0.5 ${post.pillClasses} text-xs font-medium rounded-full mb-3`}>
                          {post.category}
                        </div>
                        <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">{post.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>{formatDate(post.date)}</span>
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-12">No articles in this category yet.</p>
              )}
            </div>
          </section>
        </>
      )}

      {/* Newsletter */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-cg-sage-subtle to-cg-amber-subtle rounded-2xl p-8 lg:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4">Get co-parenting tips in your inbox</h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto">Join thousands of parents receiving weekly advice on communication, scheduling, and building a better co-parenting relationship.</p>
            <NewsletterForm />
            <p className="text-xs text-gray-500 mt-4">No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Ready to put these tips into practice?</h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">CommonGround gives you the tools to communicate better, track agreements, and co-parent more effectively.</p>
          <Link href="/early-access" className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage-dark hover:shadow-lg">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

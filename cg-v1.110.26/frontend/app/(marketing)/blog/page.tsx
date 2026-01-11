import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { NewsletterForm } from '@/components/marketing/newsletter-form';

export const metadata: Metadata = {
  title: 'Blog | CommonGround',
  description: 'Co-parenting tips, communication strategies, and expert advice for separated families.',
};

/**
 * Blog Listing Page
 *
 * Main blog page with featured and recent articles.
 */

// Blog post data - in a real app this would come from a CMS
const blogPosts = [
  {
    slug: '10-coparenting-best-practices',
    title: '10 Co-Parenting Best Practices That Actually Work',
    excerpt: 'Practical strategies for building a healthy co-parenting relationship, from communication tips to boundary setting.',
    category: 'Co-Parenting Tips',
    author: 'CommonGround Team',
    date: '2025-01-06',
    readTime: '8 min read',
    featured: true,
    image: null,
  },
  {
    slug: 'communication-tool-for-progress',
    title: 'Using Communication as a Tool for Progress, Not Conflict',
    excerpt: 'Learn how intentional communication strategies can transform your co-parenting relationship and benefit your children.',
    category: 'Communication',
    author: 'CommonGround Team',
    date: '2025-01-04',
    readTime: '10 min read',
    featured: true,
    image: null,
  },
  {
    slug: 'why-written-agreements-matter',
    title: 'Why Written Agreements Matter in Co-Parenting',
    excerpt: 'Discover how clear, documented agreements prevent misunderstandings and create stability for your children.',
    category: 'Agreements',
    author: 'CommonGround Team',
    date: '2025-01-02',
    readTime: '7 min read',
    featured: true,
    image: null,
  },
  {
    slug: 'managing-high-conflict-coparenting',
    title: 'Managing High-Conflict Co-Parenting: A Survival Guide',
    excerpt: 'Strategies for protecting yourself and your children when co-parenting with a difficult ex-partner.',
    category: 'High-Conflict',
    author: 'CommonGround Team',
    date: '2024-12-28',
    readTime: '12 min read',
    featured: false,
    image: null,
  },
  {
    slug: 'putting-children-first',
    title: 'Putting Children First: What It Really Means',
    excerpt: 'Moving beyond the phrase to practical actions that genuinely prioritize your children\'s wellbeing.',
    category: 'Parenting',
    author: 'CommonGround Team',
    date: '2024-12-24',
    readTime: '9 min read',
    featured: false,
    image: null,
  },
  {
    slug: 'holiday-custody-planning',
    title: 'Holiday Custody Planning: Creating Joy Instead of Stress',
    excerpt: 'Tips for navigating holiday schedules, managing expectations, and making celebrations special for everyone.',
    category: 'Scheduling',
    author: 'CommonGround Team',
    date: '2024-12-20',
    readTime: '8 min read',
    featured: false,
    image: null,
  },
];

const categories = [
  'All',
  'Co-Parenting Tips',
  'Communication',
  'Agreements',
  'High-Conflict',
  'Parenting',
  'Scheduling',
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogPage() {
  const featuredPosts = blogPosts.filter(post => post.featured);
  const recentPosts = blogPosts.filter(post => !post.featured);

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-24 bg-card border-b border-border overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-cg-sage/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-amber/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-semibold text-foreground mb-6">
              The CommonGround Blog
            </h1>
            <p className="text-xl text-muted-foreground">
              Expert advice, practical tips, and insights for co-parents navigating
              the journey of raising children together, apart.
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-6 border-b border-border sticky top-16 bg-background/95 backdrop-blur z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`px-4 py-2 text-sm rounded-full transition-colors ${
                  category === 'All'
                    ? 'bg-cg-sage text-white'
                    : 'bg-card border border-border hover:border-cg-sage/30 text-foreground'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-foreground mb-8">Featured Articles</h2>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Featured Post */}
            <div className="lg:col-span-2">
              <Link href={`/blog/${featuredPosts[0].slug}`} className="group block">
                <div className="aspect-[16/9] bg-gradient-to-br from-cg-sage-subtle to-cg-amber-subtle rounded-2xl mb-6 flex items-center justify-center">
                  <span className="text-6xl">📝</span>
                </div>
                <div className="inline-block px-3 py-1 bg-cg-sage-subtle text-cg-sage text-sm font-medium rounded-full mb-3">
                  {featuredPosts[0].category}
                </div>
                <h3 className="text-2xl font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-3">
                  {featuredPosts[0].title}
                </h3>
                <p className="text-muted-foreground mb-4">{featuredPosts[0].excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(featuredPosts[0].date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {featuredPosts[0].readTime}
                  </span>
                </div>
              </Link>
            </div>

            {/* Side Featured Posts */}
            <div className="space-y-8">
              {featuredPosts.slice(1).map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                  <div className="aspect-[16/9] bg-gradient-to-br from-cg-slate-subtle to-cg-sage-subtle rounded-xl mb-4 flex items-center justify-center">
                    <span className="text-4xl">
                      {post.category === 'Communication' ? '💬' : '📋'}
                    </span>
                  </div>
                  <div className="inline-block px-2 py-0.5 bg-cg-sage-subtle text-cg-sage text-xs font-medium rounded-full mb-2">
                    {post.category}
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(post.date)}</span>
                    <span>{post.readTime}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-foreground mb-8">Recent Articles</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-background rounded-xl border border-border/50 overflow-hidden hover:border-cg-sage/30 transition-colors"
              >
                <div className="aspect-[16/10] bg-gradient-to-br from-cg-sage-subtle to-background flex items-center justify-center">
                  <span className="text-4xl">
                    {post.category === 'High-Conflict' ? '🛡️' :
                     post.category === 'Parenting' ? '👨‍👩‍👧‍👦' : '📅'}
                  </span>
                </div>
                <div className="p-6">
                  <div className="inline-block px-2 py-0.5 bg-cg-sage-subtle text-cg-sage text-xs font-medium rounded-full mb-3">
                    {post.category}
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(post.date)}</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-cg-sage-subtle to-cg-amber-subtle rounded-2xl p-8 lg:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4">
              Get co-parenting tips in your inbox
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of parents receiving weekly advice on communication,
              scheduling, and building a better co-parenting relationship.
            </p>
            <NewsletterForm />
            <p className="text-xs text-muted-foreground mt-4">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Ready to put these tips into practice?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            CommonGround gives you the tools to communicate better, track agreements,
            and co-parent more effectively.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

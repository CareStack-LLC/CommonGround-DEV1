import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { NewsletterForm } from '@/components/marketing/newsletter-form';
import { blogPosts, formatDate, getCategoryStyles } from '@/lib/blog-data';

export const metadata: Metadata = {
  title: 'Blog | CommonGround',
  description:
    'Co-parenting tips, communication strategies, and expert advice for separated families.',
};

/**
 * Blog Listing Page
 *
 * Main blog page with featured and recent articles.
 * Uses centralized blog data with subtle animations.
 */

const categories = [
  'All',
  'Co-Parenting Tips',
  'Communication',
  'Agreements',
  'High-Conflict',
  'Parenting',
  'Scheduling',
];

export default function BlogPage() {
  const featuredPosts = blogPosts.filter((post) => post.featured);
  const recentPosts = blogPosts.filter((post) => !post.featured);

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-24 bg-card border-b border-border overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-cg-sage/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-amber/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl animate-blog-fade-in">
            <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-foreground mb-6">
              The CommonGround Blog
            </h1>
            <p className="text-xl text-muted-foreground">
              Expert advice, practical tips, and insights for co-parents navigating the journey of
              raising children together, apart.
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
                className={`px-4 py-2 text-sm rounded-full transition-all duration-300 ${
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
          <h2 className="text-2xl font-semibold text-foreground mb-8 animate-blog-fade-in">
            Featured Articles
          </h2>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Featured Post */}
            <div className="lg:col-span-2 animate-blog-fade-in stagger-1">
              <Link href={`/blog/${featuredPosts[0].slug}`} className="group block">
                <div className="aspect-[16/9] rounded-2xl mb-6 overflow-hidden">
                  <img
                    src={featuredPosts[0].image || ''}
                    alt={featuredPosts[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div
                  className={`inline-block px-3 py-1 ${getCategoryStyles(featuredPosts[0].categoryColor)} text-sm font-medium rounded-full mb-3`}
                >
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
              {featuredPosts.slice(1).map((post, index) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className={`group block animate-blog-fade-in stagger-${index + 2}`}
                >
                  <div className="aspect-[16/9] rounded-xl mb-4 overflow-hidden">
                    <img
                      src={post.image || ''}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div
                    className={`inline-block px-2 py-0.5 ${getCategoryStyles(post.categoryColor)} text-xs font-medium rounded-full mb-2`}
                  >
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
            {recentPosts.map((post, index) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className={`group bg-background rounded-xl border border-border/50 overflow-hidden blog-card-hover animate-blog-fade-in stagger-${index + 1}`}
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={post.image || ''}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div
                    className={`inline-block px-2 py-0.5 ${getCategoryStyles(post.categoryColor)} text-xs font-medium rounded-full mb-3`}
                  >
                    {post.category}
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{post.excerpt}</p>
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
              Join thousands of parents receiving weekly advice on communication, scheduling, and
              building a better co-parenting relationship.
            </p>
            <NewsletterForm />
            <p className="text-xs text-muted-foreground mt-4">No spam. Unsubscribe anytime.</p>
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
            CommonGround gives you the tools to communicate better, track agreements, and co-parent
            more effectively.
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

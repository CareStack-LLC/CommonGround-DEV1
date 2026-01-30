import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Clock, ArrowLeft, ArrowRight, User, Share2 } from 'lucide-react';
import {
  blogPosts,
  getPostBySlug,
  getAllSlugs,
  getRelatedPosts,
  formatDate,
  getCategoryStyles,
} from '@/lib/blog-data';
import { BlogContent } from '@/components/marketing/blog-content';

/**
 * Dynamic Blog Post Page
 *
 * Renders individual blog posts based on URL slug.
 * Uses static generation with generateStaticParams.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found | CommonGround Blog',
    };
  }

  return {
    title: `${post.title} | CommonGround Blog`,
    description: post.metaDescription,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(post.relatedPosts);

  return (
    <div className="bg-background">
      {/* Header */}
      <section className="py-12 bg-card border-b border-border animate-blog-fade-in">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          <div
            className={`inline-block px-3 py-1 ${getCategoryStyles(post.categoryColor)} text-sm font-medium rounded-full mb-4`}
          >
            {post.category}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-foreground mb-6">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {post.image && (
        <section className="animate-blog-fade-in stagger-1">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
            <div className="aspect-[16/9] rounded-2xl overflow-hidden shadow-lg">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* Content */}
      <section className="py-12 animate-blog-fade-in stagger-2">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <BlogContent slug={slug} />

          {/* Share */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Share this article:</span>
                <button className="p-2 rounded-lg bg-card border border-border hover:border-cg-sage/30 transition-colors">
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12 bg-card border-t border-border animate-blog-fade-in stagger-3">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-semibold text-foreground mb-6">Related Articles</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={`/blog/${relatedPost.slug}`}
                  className="group p-4 rounded-xl bg-background border border-border/50 hover:border-cg-sage/30 transition-all blog-card-hover"
                >
                  <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors mb-2">
                    {relatedPost.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{relatedPost.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-12 animate-blog-fade-in stagger-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`bg-gradient-to-br ${post.ctaGradient} rounded-2xl p-8 text-center`}
          >
            <h2 className="text-xl font-semibold text-foreground mb-3">{post.ctaTitle}</h2>
            <p className="text-muted-foreground mb-6">{post.ctaDescription}</p>
            <Link
              href={post.ctaLink}
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-6 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg"
            >
              {post.ctaLinkText}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

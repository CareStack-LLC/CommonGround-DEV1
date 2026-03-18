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
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      type: 'article',
    },
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
    <div className="bg-[#F4F8F7]">
      {/* Header */}
      <section className="py-12 bg-white border-b border-gray-200 animate-blog-fade-in">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#1E3A4A] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          <div
            className={`inline-block px-3 py-1 ${getCategoryStyles(post.categoryColor)} text-sm font-medium rounded-full mb-4`}
          >
            {post.category}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-[#1E3A4A] mb-6">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
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
          <div className="prose prose-lg max-w-none prose-headings:text-[#1E3A4A] prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-[#1E3A4A] prose-a:text-[#3DAA8A] prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-[#3DAA8A] prose-blockquote:text-gray-600 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3">
            <BlogContent slug={slug} />
          </div>

          {/* Share */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Share this article:</span>
                <button className="p-2 rounded-lg bg-white border border-gray-200 hover:border-cg-sage/30 transition-colors">
                  <Share2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12 bg-white border-t border-gray-200 animate-blog-fade-in stagger-3">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-semibold text-[#1E3A4A] mb-6">Related Articles</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={`/blog/${relatedPost.slug}`}
                  className="group p-4 rounded-xl bg-[#F4F8F7] border border-gray-200/50 hover:border-cg-sage/30 transition-all blog-card-hover"
                >
                  <h3 className="font-semibold text-[#1E3A4A] group-hover:text-cg-sage transition-colors mb-2">
                    {relatedPost.title}
                  </h3>
                  <p className="text-sm text-gray-600">{relatedPost.excerpt}</p>
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
            <h2 className="text-xl font-semibold text-[#1E3A4A] mb-3">{post.ctaTitle}</h2>
            <p className="text-gray-600 mb-6">{post.ctaDescription}</p>
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

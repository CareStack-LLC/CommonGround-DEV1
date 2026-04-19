import type { Metadata } from 'next';
import { getPostBySlug } from '@/lib/blog-data';
import { BlogPostContent } from './_content';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Blog post | CommonGround',
      description: 'Co-parenting guidance from the CommonGround team.',
      alternates: { canonical: `/blog/${slug}` },
    };
  }

  const title = `${post.title} | CommonGround`;
  const description = post.metaDescription || post.excerpt;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `https://www.find-commonground.com/blog/${post.slug}`,
      siteName: 'CommonGround',
      images: post.image ? [post.image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.image ? [post.image] : undefined,
    },
  };
}

export default function BlogPostPage() {
  return <BlogPostContent />;
}

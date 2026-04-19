import type { Metadata } from 'next';
import { BlogContent } from './_content';

export const metadata: Metadata = {
  title: 'Co-parenting blog & resources | CommonGround',
  description:
    'Practical co-parenting guidance — ARIA coaching, custody schedules, high-conflict tactics, legal insights, and KidSpace stories.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    title: 'Co-parenting blog & resources | CommonGround',
    description:
      'Practical co-parenting guidance from the CommonGround team and community.',
    url: 'https://www.find-commonground.com/blog',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Co-parenting blog | CommonGround',
    description:
      'Practical co-parenting guidance from CommonGround.',
  },
};

export default function BlogPage() {
  return <BlogContent />;
}

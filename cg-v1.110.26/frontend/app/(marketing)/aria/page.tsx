import type { Metadata } from 'next';
import { ARIAContent } from './_content';

export const metadata: Metadata = {
  title: 'ARIA — AI coaching for co-parent messaging | CommonGround',
  description:
    'ARIA rewrites hostile messages, summarizes incoming attacks, and protects kids from conflict — all before a message is sent. See it in action.',
  alternates: { canonical: '/aria' },
  openGraph: {
    type: 'website',
    title: 'ARIA — AI coaching for co-parent messaging',
    description:
      'ARIA rewrites hostile messages and summarizes incoming attacks — protecting kids from the middle.',
    url: 'https://www.find-commonground.com/aria',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ARIA — AI coaching for co-parent messaging',
    description:
      'Rewrites hostile messages before they send and shields kids from conflict.',
  },
};

export default function ARIAPage() {
  return <ARIAContent />;
}

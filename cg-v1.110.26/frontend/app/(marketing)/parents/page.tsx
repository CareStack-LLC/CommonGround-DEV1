import type { Metadata } from 'next';
import { ParentsContent } from './_content';

export const metadata: Metadata = {
  title: 'Co-parenting app for high-conflict divorce | CommonGround',
  description:
    'High-conflict parents get ARIA calm-tone coaching, GPS-verified Silent Handoff exchanges, KidSpace video calls, and court-ready exports.',
  alternates: { canonical: '/parents' },
  openGraph: {
    type: 'website',
    title: 'Co-parenting app for high-conflict divorce | CommonGround',
    description:
      'ARIA calm-tone coaching, GPS-verified handoffs, KidSpace video calls, and court-ready exports for high-conflict co-parents.',
    url: 'https://www.find-commonground.com/parents',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Co-parenting app for high-conflict divorce | CommonGround',
    description:
      'Calm-tone coaching, GPS-verified handoffs, KidSpace video calls, and court-ready exports.',
  },
};

export default function ParentsPage() {
  return <ParentsContent />;
}

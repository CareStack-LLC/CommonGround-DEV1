import type { Metadata } from 'next';
import { HowItWorksContent } from './_content';

export const metadata: Metadata = {
  title: 'How CommonGround works | CommonGround',
  description:
    'A walkthrough of the CommonGround co-parenting platform — ARIA coaching, shared custody calendar, expense tracking, and court-ready exports.',
  alternates: { canonical: '/how-it-works' },
  openGraph: {
    type: 'website',
    title: 'How CommonGround works',
    description:
      'ARIA coaching, shared custody calendar, expense tracking, and court-ready exports — explained.',
    url: 'https://www.find-commonground.com/how-it-works',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How CommonGround works',
    description: 'An end-to-end tour of the CommonGround platform.',
  },
};

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}

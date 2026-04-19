import type { Metadata } from 'next';
import { KidSpaceContent } from './_content';

export const metadata: Metadata = {
  title: 'KidSpace — safe video calls for kids | CommonGround',
  description:
    'Safe, parent-approved video, voice, and messaging for kids to stay close to both parents and extended family — with built-in ARIA monitoring.',
  alternates: { canonical: '/kidspace' },
  openGraph: {
    type: 'website',
    title: 'KidSpace — safe video calls for kids',
    description:
      'Parent-approved video, voice, and messaging that keeps kids connected to both homes.',
    url: 'https://www.find-commonground.com/kidspace',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KidSpace | CommonGround',
    description:
      'Safe video calls for kids to stay connected to both parents.',
  },
};

export default function KidSpacePage() {
  return <KidSpaceContent />;
}

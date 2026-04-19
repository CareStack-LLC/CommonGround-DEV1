import type { Metadata } from 'next';
import { TermsOfServiceContent } from './_content';

export const metadata: Metadata = {
  title: 'Terms of Service | CommonGround',
  description:
    'Terms governing use of CommonGround — acceptable use, service availability, account responsibilities, payments, and dispute resolution.',
  alternates: { canonical: '/legal/terms' },
  openGraph: {
    type: 'website',
    title: 'Terms of Service | CommonGround',
    description:
      'Terms governing use of CommonGround — acceptable use, payments, and dispute resolution.',
    url: 'https://www.find-commonground.com/legal/terms',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Service | CommonGround',
    description: 'Terms governing use of CommonGround.',
  },
};

export default function TermsOfServicePage() {
  return <TermsOfServiceContent />;
}

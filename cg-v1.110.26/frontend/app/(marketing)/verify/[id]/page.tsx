import type { Metadata } from 'next';
import { VerifyResultContent } from './_content';

export const metadata: Metadata = {
  title: 'Verification result | CommonGround',
  description:
    'See the authenticity verification result for a CommonGround report — confirms integrity and the original generation timestamp.',
  alternates: { canonical: '/verify' },
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    type: 'website',
    title: 'CommonGround report verification result',
    description:
      'Authenticity verification result for a specific CommonGround report.',
    url: 'https://www.find-commonground.com/verify',
    siteName: 'CommonGround',
  },
};

export default function VerifyResultPage() {
  return <VerifyResultContent />;
}

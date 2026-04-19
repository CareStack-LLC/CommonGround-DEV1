import type { Metadata } from 'next';
import { VerifyContent } from './_content';

export const metadata: Metadata = {
  title: 'Verify a CommonGround report | CommonGround',
  description:
    'Confirm the authenticity of any CommonGround report. Enter a Report ID or SHA-256 hash to verify the document has not been altered.',
  alternates: { canonical: '/verify' },
  openGraph: {
    type: 'website',
    title: 'Verify a CommonGround report',
    description:
      'Confirm a CommonGround report is authentic and unaltered using its Report ID or SHA-256 hash.',
    url: 'https://www.find-commonground.com/verify',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary',
    title: 'Verify a CommonGround report',
    description:
      'Check that a CommonGround report is authentic and unaltered.',
  },
};

export default function VerifyPage() {
  return <VerifyContent />;
}

import type { Metadata } from 'next';
import { PrivacyPolicyContent } from './_content';

export const metadata: Metadata = {
  title: 'Privacy Policy | CommonGround',
  description:
    'How CommonGround collects, stores, and protects your family data — encryption, retention, your rights, and what we will never do with your information.',
  alternates: { canonical: '/legal/privacy' },
  openGraph: {
    type: 'website',
    title: 'Privacy Policy | CommonGround',
    description:
      'How CommonGround protects family data, your rights, and what we will never do with your information.',
    url: 'https://www.find-commonground.com/legal/privacy',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary',
    title: 'Privacy Policy | CommonGround',
    description: 'How CommonGround protects your family data.',
  },
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContent />;
}

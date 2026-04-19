import type { Metadata } from 'next';
import { SecurityContent } from './_content';

export const metadata: Metadata = {
  title: 'Security & encryption | CommonGround',
  description:
    'How CommonGround protects your family data — end-to-end encryption, SHA-256 tamper-proof records, SOC 2 controls, and zero-data-sharing policy.',
  alternates: { canonical: '/security' },
  openGraph: {
    type: 'website',
    title: 'Security & encryption | CommonGround',
    description:
      'Encryption, tamper-proof records, and a zero-data-sharing policy for your family data.',
    url: 'https://www.find-commonground.com/security',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary',
    title: 'Security & encryption | CommonGround',
    description:
      'Encryption, tamper-proof records, and zero data sharing.',
  },
};

export default function SecurityPage() {
  return <SecurityContent />;
}

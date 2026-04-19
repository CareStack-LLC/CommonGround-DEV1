import type { Metadata } from 'next';
import { ContactContent } from './_content';

export const metadata: Metadata = {
  title: 'Contact CommonGround | CommonGround',
  description:
    'Get in touch with the CommonGround team — support, partnerships, media, and legal inquiries. We respond to every message within one business day.',
  alternates: { canonical: '/help/contact' },
  openGraph: {
    type: 'website',
    title: 'Contact CommonGround',
    description:
      'Reach CommonGround for support, partnerships, media, or legal inquiries.',
    url: 'https://www.find-commonground.com/help/contact',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary',
    title: 'Contact CommonGround',
    description:
      'Support, partnerships, media, and legal inquiries.',
  },
};

export default function ContactPage() {
  return <ContactContent />;
}

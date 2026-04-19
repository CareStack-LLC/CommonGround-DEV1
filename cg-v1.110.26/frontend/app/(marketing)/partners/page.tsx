import type { Metadata } from 'next';
import { PartnersDirectoryContent } from './_content';

export const metadata: Metadata = {
  title: 'Partners & integrations | CommonGround',
  description:
    'Law firms, mediators, nonprofits, and family courts partnering with CommonGround to support families through separation and custody transitions.',
  alternates: { canonical: '/partners' },
  openGraph: {
    type: 'website',
    title: 'Partners & integrations | CommonGround',
    description:
      'Law firms, mediators, and nonprofits partnering with CommonGround to support families.',
    url: 'https://www.find-commonground.com/partners',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary',
    title: 'Partners | CommonGround',
    description:
      'Law firms, mediators, and nonprofits partnering with CommonGround.',
  },
};

export default function PartnersDirectoryPage() {
  return <PartnersDirectoryContent />;
}

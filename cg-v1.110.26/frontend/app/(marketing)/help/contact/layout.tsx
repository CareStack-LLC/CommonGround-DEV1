import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact CommonGround | Support, Partnerships & Questions',
  description: 'Get help from CommonGround. Technical support, partnership inquiries, or questions about co-parenting tools. Real people respond within 24 hours.',
  keywords: 'contact CommonGround, co-parenting app support, CommonGround help, co-parenting customer service, family law partnership',
  openGraph: {
    title: 'Contact CommonGround',
    description: 'Support, partnership inquiries, or questions about co-parenting — real people respond within 24 hours.',
    type: 'website',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

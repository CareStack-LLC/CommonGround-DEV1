import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Co-Parenting Features | Messaging, Calendar & More | CommonGround',
  description: 'All-in-one co-parenting tools: AI-assisted messaging, shared custody calendar, expense tracking, court-ready documents, GPS-verified exchanges, and KidSpace video calls.',
  keywords: 'co-parenting features, custody calendar app, co-parent messaging, expense splitting, court documentation, custody exchange GPS, ARIA AI, KidSpace',
  openGraph: {
    title: 'Co-Parenting Features | CommonGround',
    description: 'AI-assisted messaging, shared calendar, expense tracking, court-ready documents, and more. Everything co-parents need in one calm place.',
    type: 'website',
  },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

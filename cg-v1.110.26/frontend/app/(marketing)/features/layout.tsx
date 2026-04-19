import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features | CommonGround AI co-parenting platform',
  description:
    'ARIA AI messaging, TimeBridge scheduling, ClearFund expenses, KidSpace video calls, Silent Handoff GPS exchanges, and court-ready evidence.',
  keywords:
    'co-parenting features, AI co-parenting messaging, custody schedule app, child video calls co-parenting, GPS custody exchange, court ready evidence app, ARIA messaging, KidSpace, Silent Handoff, TimeBridge, ClearFund',
  alternates: { canonical: '/features' },
  openGraph: {
    type: 'website',
    title: 'Features | CommonGround AI co-parenting platform',
    description:
      'AI messaging, automated schedules, child video calls, GPS-verified exchanges, and court-ready evidence.',
    url: 'https://www.find-commonground.com/features',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Features | CommonGround AI co-parenting platform',
    description:
      'AI messaging, automated schedules, child video calls, GPS handoffs, and court-ready evidence.',
  },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

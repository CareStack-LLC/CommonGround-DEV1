import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features | AI Messaging, Automated Schedules, Video Calls & Court Docs | CommonGround',
  description:
    'Explore CommonGround features: ARIA AI messaging, TimeBridge automated schedules, ClearFund expense tracking, KidSpace video calls, Silent Handoff GPS exchanges, and court-ready evidence exports.',
  keywords:
    'co-parenting features, AI co-parenting messaging, custody schedule app, child video calls co-parenting, GPS custody exchange, court ready evidence app, ARIA messaging, KidSpace, Silent Handoff, TimeBridge, ClearFund',
  openGraph: {
    title: 'CommonGround Features — Tools for Calmer Co-Parenting',
    description:
      'AI messaging, automated schedules, child video calls, GPS-verified exchanges, and court-ready evidence. Features no other co-parenting app offers.',
    type: 'website',
  },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

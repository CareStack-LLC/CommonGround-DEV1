import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing | Free Co-Parenting App | Plans from $0/month | CommonGround',
  description:
    'Start co-parenting for free, forever. No credit card required. Upgrade for automated schedules ($17.99/mo), GPS exchanges, KidSpace video calls, and court-ready evidence ($34.99/mo). 14-day free trial on all paid plans.',
  keywords:
    'co-parenting app pricing, free co-parenting app, custody app cost, co-parenting subscription, CommonGround plans, affordable co-parenting, KidSpace video calls pricing',
  openGraph: {
    title: 'CommonGround Pricing — Free Forever Tier Available',
    description:
      'Start free. Upgrade when you need automation, GPS tracking, KidSpace video calls, and court-ready documentation. Compare all features across plans.',
    type: 'website',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

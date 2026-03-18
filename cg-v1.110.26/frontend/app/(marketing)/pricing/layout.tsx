import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing | Free Co-Parenting App | CommonGround',
  description: 'Start co-parenting for free, forever. Upgrade for automated schedules, GPS-verified exchanges, custody analytics, and court-ready exports. Plans from $17.99/month.',
  keywords: 'co-parenting app pricing, free co-parenting app, custody app cost, co-parenting subscription, CommonGround plans, affordable co-parenting',
  openGraph: {
    title: 'CommonGround Pricing — Free Forever Tier Available',
    description: 'Start free. Upgrade when you need automation, GPS tracking, and court-ready documentation.',
    type: 'website',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

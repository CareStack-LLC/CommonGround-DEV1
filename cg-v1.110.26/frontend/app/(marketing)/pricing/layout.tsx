import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — CommonGround plans from $17.99/mo',
  description:
    'Start free. Upgrade to Plus ($17.99/mo) or Complete ($34.99/mo) when you need automation, GPS handoffs, and court-ready records.',
  keywords:
    'co-parenting app pricing, free co-parenting app, custody app cost, co-parenting subscription, CommonGround plans, affordable co-parenting, KidSpace video calls pricing',
  alternates: { canonical: '/pricing' },
  openGraph: {
    type: 'website',
    title: 'Pricing — CommonGround plans from $17.99/mo',
    description:
      'Start free. Upgrade to Plus ($17.99/mo) or Complete ($34.99/mo) for automation, GPS handoffs, and court-ready records.',
    url: 'https://www.find-commonground.com/pricing',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — CommonGround plans from $17.99/mo',
    description:
      'Free tier forever. Paid plans from $17.99/mo for automation, GPS handoffs, and court-ready records.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

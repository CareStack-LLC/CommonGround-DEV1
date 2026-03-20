import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Co-Parenting App for Moms | Stop Chasing, Start Living | CommonGround',
  description:
    'Tired of unreliable co-parents who forget pickups and go off-topic? CommonGround keeps communication focused, automates reminders he can\'t ignore, and tracks every payment. Early adopter spots available.',
  keywords:
    'co-parenting app for moms, unreliable co-parent app, co-parent doesn\'t show up, co-parenting communication app, co-parent forgets pickup, co-parenting help for mothers, single mom co-parenting tool',
  alternates: { canonical: 'https://www.find-commonground.com/for-moms' },
  openGraph: {
    title: 'You Shouldn\'t Have to Chase Him to Be a Good Parent — CommonGround',
    description:
      'AI-powered co-parenting that keeps messages focused, automates schedules he can\'t ignore, and tracks every payment. Be one of the first 50 early adopters.',
    type: 'website',
    url: 'https://www.find-commonground.com/for-moms',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Co-Parenting App for Moms | CommonGround',
    description: 'Stop chasing. Start co-parenting with peace of mind.',
  },
};

export default function ForMomsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

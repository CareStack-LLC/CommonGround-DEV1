import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Family Law Professionals | CommonGround',
  description:
    'Access verified co-parenting data for your cases. Communications, custody exchanges, financial records, and court-ready exports — all in one secure platform.',
  keywords: [
    'family law professionals',
    'co-parenting data',
    'court-ready exports',
    'custody exchange records',
    'family law attorney tools',
    'guardian ad litem',
    'custody evaluator',
    'parenting coordinator',
    'mediator tools',
    'co-parenting compliance',
    'family law evidence',
    'CommonGround professionals',
  ],
  openGraph: {
    title: 'For Family Law Professionals | CommonGround',
    description:
      'Access verified co-parenting data for your cases. Communications, custody exchanges, financial records, and court-ready exports — all in one secure platform.',
    type: 'website',
  },
};

export default function ProfessionalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

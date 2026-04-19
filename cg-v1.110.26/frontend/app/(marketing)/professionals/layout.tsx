import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CommonGround for Family-Law Professionals | Firm-grade case visibility',
  description:
    'Attorneys, mediators, and GALs get verified timestamps, ARIA insights, and SHA-256 exports across every case — free for professionals.',
  keywords: [
    'family law software',
    'custody case management',
    'guardian ad litem tools',
    'co-parenting compliance data',
    'court-ready evidence platform',
    'family law attorney tools',
    'custody evaluator software',
    'parenting coordinator tools',
    'mediator co-parenting tools',
    'co-parenting professional portal',
    'CommonGround professionals',
    'KidSpace',
  ],
  alternates: { canonical: '/professionals' },
  openGraph: {
    type: 'website',
    title: 'CommonGround for Family-Law Professionals | Firm-grade case visibility',
    description:
      'Verified timestamps, ARIA insights, and SHA-256 exports across every case — free for attorneys, mediators, and GALs.',
    url: 'https://www.find-commonground.com/professionals',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CommonGround for Family-Law Professionals',
    description:
      'Verified case visibility and court-ready exports, free for family-law professionals.',
  },
};

export default function ProfessionalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

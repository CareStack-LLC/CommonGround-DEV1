import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Family Law Professionals | Free Case Data Access | CommonGround',
  description:
    'Access verified co-parenting data for custody cases. Communications, exchanges, financial records, compliance metrics, and court-ready SHA-256 verified exports. Free for attorneys, mediators, GALs, and evaluators.',
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
  openGraph: {
    title: 'For Family Law Professionals | Free Case Data Access | CommonGround',
    description:
      'Access verified co-parenting data for your cases. Free for professionals — communications, custody exchanges, financial records, and SHA-256 verified court-ready exports.',
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

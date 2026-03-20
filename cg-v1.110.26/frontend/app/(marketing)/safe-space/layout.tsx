import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Safe Co-Parenting for DV Survivors | No Contact, Full Documentation | CommonGround',
  description:
    'Zero-contact custody exchanges, no phone number sharing, GPS-verified handoffs, and court-ready documentation. CommonGround is built for survivors who need safety and peace of mind. Early adopter spots available.',
  keywords:
    'domestic violence co-parenting app, no contact co-parenting, safe custody exchange app, dv survivor parenting app, supervised exchange app, GPS custody handoff, protective order co-parenting',
  alternates: { canonical: 'https://www.find-commonground.com/safe-space' },
  openGraph: {
    title: 'You Deserve to Feel Safe Raising Your Child — CommonGround',
    description:
      'Silent Handoff GPS exchanges, zero-contact communication through ARIA, and court-ready documentation. Built for survivors. Be one of the first 50 early adopters.',
    type: 'website',
    url: 'https://www.find-commonground.com/safe-space',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Safe Co-Parenting for DV Survivors | CommonGround',
    description: 'No contact. No phone number. Full documentation.',
  },
};

export default function SafeSpaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

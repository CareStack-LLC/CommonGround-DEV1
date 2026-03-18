import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Legal | CommonGround',
  description: 'Terms of Service, Privacy Policy, and legal information for CommonGround co-parenting platform.',
  openGraph: {
    title: 'Legal | CommonGround',
    description: 'Terms of Service, Privacy Policy, and legal information for CommonGround co-parenting platform.',
    type: 'website',
  },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

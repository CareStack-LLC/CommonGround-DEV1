import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How CommonGround Works | Set Up Co-Parenting in Minutes',
  description: 'Get started in 2 minutes. Sign up free, invite your co-parent, set up your schedule, and let ARIA help keep communication calm. No credit card required.',
  keywords: 'how co-parenting app works, getting started co-parenting, set up custody app, co-parenting onboarding, easy co-parenting setup',
  openGraph: {
    title: 'How CommonGround Works',
    description: 'From signup to family peace in 5 simple steps. Free to start, no credit card required.',
    type: 'website',
  },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

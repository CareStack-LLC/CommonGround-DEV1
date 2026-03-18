import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KidSpace | A Safe Digital Space for Children Ages 3-12 | CommonGround',
  description: 'KidSpace gives children ages 3-12 their own safe, COPPA-compliant space to video call parents, read stories together, and play age-appropriate games. Built for kids in two-home families.',
  keywords: 'kids co-parenting app, child video calls, safe kids app, children two homes, co-parenting kids space, parent child video chat, KidSpace, COPPA compliant, grandparent video calls, family bonding app',
  openGraph: {
    title: 'KidSpace — Where Kids Stay Connected',
    description: 'COPPA-compliant video calls, stories, and games in a safe space designed for children of co-parents. Perfect for parents, grandparents, and extended family.',
    type: 'website',
  },
};

export default function KidSpaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

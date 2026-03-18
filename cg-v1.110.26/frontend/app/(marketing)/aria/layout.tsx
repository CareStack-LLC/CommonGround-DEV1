import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ARIA | AI Co-Parenting Assistant | CommonGround',
  description: 'ARIA helps co-parents communicate constructively. AI-powered message coaching flags tension before you send, keeping every conversation focused on your children.',
  keywords: 'AI co-parenting assistant, co-parent communication tool, message tone checker, co-parenting AI, ARIA, constructive co-parenting, conflict reduction',
  openGraph: {
    title: 'Meet ARIA — Your AI Co-Parenting Assistant',
    description: 'ARIA coaches your messages before you send them, helping every conversation stay calm and child-focused.',
    type: 'website',
  },
};

export default function AriaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

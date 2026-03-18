import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center | CommonGround',
  description: 'Get help with CommonGround. FAQs, tutorials, and support for co-parenting tools, messaging, scheduling, expenses, and court documentation.',
  openGraph: {
    title: 'Help Center | CommonGround',
    description: 'Get help with CommonGround. FAQs, tutorials, and support for co-parenting tools, messaging, scheduling, expenses, and court documentation.',
    type: 'website',
  },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

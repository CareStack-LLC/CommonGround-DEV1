import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ | Common Questions About Co-Parenting with CommonGround',
  description: 'Answers to common questions about ARIA messaging, custody scheduling, expense tracking, court documentation, KidSpace, and account management.',
  openGraph: {
    title: 'FAQ | Common Questions About Co-Parenting with CommonGround',
    description: 'Answers to common questions about ARIA messaging, custody scheduling, expense tracking, court documentation, KidSpace, and account management.',
    type: 'website',
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

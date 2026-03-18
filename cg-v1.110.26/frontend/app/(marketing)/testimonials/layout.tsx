import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Impact Stories | How CommonGround Helps Families | CommonGround',
  description: 'Through the 4Ever Forward Foundation grant program, CommonGround helped real families in high-conflict situations find calmer communication, stronger bonds, and peace of mind.',
  keywords: 'co-parenting impact, family stories, 4Ever Forward Foundation, grant program, co-parenting success, ARIA messaging, KidSpace',
  openGraph: {
    title: 'Impact Stories | How CommonGround Helps Families',
    description: 'Real families. Real impact. See how the 4Ever Forward Foundation grant program helped parents find calmer communication and stronger bonds with their children.',
    type: 'website',
  },
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

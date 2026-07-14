import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stories | Families Finding Peace Through CommonGround',
  description: 'Real stories from families who found calmer co-parenting through CommonGround and the community organizations that support them. From hostile texts to movie nights — transformation is possible.',
  keywords: 'co-parenting stories, family transformation, co-parenting success, community partnerships, nonprofit co-parenting, Forever Forward Foundation, ARIA messaging, KidSpace',
  openGraph: {
    title: 'Stories | Families Finding Peace Through CommonGround',
    description: 'Real stories from families who found calmer co-parenting through CommonGround and the community organizations that support them.',
    type: 'website',
  },
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

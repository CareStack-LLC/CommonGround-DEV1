import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KidSpace for Grandparents & Family | Stay Connected to Your Grandchild | CommonGround',
  description:
    'Grandparents, aunts, uncles — stay bonded with your grandchild through KidSpace video calls, shared movies, stories, and games. Safe, parent-controlled, ARIA-monitored. Early adopter spots available.',
  keywords:
    'grandparent video call app, extended family co-parenting, grandparents rights app, family bonding app for kids, grandparent child video call, family connection app, grandchild bonding app',
  openGraph: {
    title: 'Family Doesn\'t End at the Front Door — CommonGround KidSpace',
    description:
      'Video calls, shared movies, storytime, and games — all safe, parent-controlled, and documented. Keep your bond strong no matter the distance. Be one of the first 50 early adopters.',
    type: 'website',
    url: 'https://www.find-commonground.com/my-circle',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KidSpace for Extended Family | CommonGround',
    description: 'Stay connected to the kids who need you.',
  },
};

export default function MyCircleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Co-Parenting App for Dads | Stay in Your Kids\' Lives | CommonGround',
  description:
    'Feeling pushed out of your kids\' lives? CommonGround detects manipulation, documents patterns for court, and lets you bond with your kids through KidSpace — without needing her phone. Early adopter spots available.',
  keywords:
    'co-parenting app for dads, fathers rights co-parenting, see my kids co-parenting app, co-parent weaponizing kids, parental alienation app, dad co-parenting tool, father custody app',
  openGraph: {
    title: 'Being a Good Dad Shouldn\'t Feel Like Walking on Eggshells — CommonGround',
    description:
      'AI that detects manipulation, documents patterns, and lets you bond with your kids through video calls — without needing her cooperation. Be one of the first 50 early adopters.',
    type: 'website',
    url: 'https://www.find-commonground.com/for-dads',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Co-Parenting App for Dads | CommonGround',
    description: 'Stop walking on eggshells. Start being the dad you are.',
  },
};

export default function ForDadsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

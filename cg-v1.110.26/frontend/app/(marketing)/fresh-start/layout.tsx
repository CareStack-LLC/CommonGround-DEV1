import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Co-Parenting After Divorce | Keep Structure, Stay Civil | CommonGround',
  description:
    'Recently divorced and want to keep things on track? CommonGround sets up agreements, automates custody schedules and payments, and prevents regression. Early adopter spots available.',
  keywords:
    'divorce co-parenting app, co-parenting after divorce, co-parenting schedule app, newly divorced parenting plan, post-divorce co-parenting, custody schedule automation, co-parenting agreement app',
  openGraph: {
    title: 'The Hard Part Is Over. Don\'t Let Co-Parenting Undo the Progress. — CommonGround',
    description:
      'Automate schedules, split expenses, and keep agreements documented. CommonGround gives your fresh start the structure it needs. Be one of the first 50 early adopters.',
    type: 'website',
    url: 'https://www.find-commonground.com/fresh-start',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Co-Parenting After Divorce | CommonGround',
    description: 'Structure your fresh start. Automate the hard parts.',
  },
};

export default function FreshStartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

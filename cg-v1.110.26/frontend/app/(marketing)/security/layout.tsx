import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security | How We Protect Your Family\'s Data | CommonGround',
  description: 'AES-256 encryption, TLS 1.3, daily backups, and court-ready security. Learn how CommonGround protects your family\'s most sensitive information.',
  openGraph: {
    title: 'Security | How We Protect Your Family\'s Data | CommonGround',
    description: 'AES-256 encryption, TLS 1.3, daily backups, and court-ready security. Learn how CommonGround protects your family\'s most sensitive information.',
    type: 'website',
  },
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/marketing/json-ld';

export const metadata: Metadata = {
  title: 'Guides | CommonGround Help Center',
  description:
    'Step-by-step guides for using CommonGround. Learn about messaging, scheduling, expenses, agreements, KidSpace, court exports, and more.',
};

export default function GuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cg-sand">
      {/* Keep in sync with the visual breadcrumb below */}
      <BreadcrumbJsonLd
        items={[
          { name: 'Help Center', href: '/help' },
          { name: 'Guides', href: '/help/guides' },
        ]}
      />
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-gray-500">
            <Link href="/help" className="hover:text-cg-sage transition-colors">
              Help Center
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/help/guides" className="hover:text-cg-sage transition-colors">
              Guides
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}

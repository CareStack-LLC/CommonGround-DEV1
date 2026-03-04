import { MarketingHeader } from '@/components/marketing/marketing-header';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

/**
 * Marketing Layout
 *
 * Shared layout for all public marketing pages.
 * Includes the marketing header and footer.
 */

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketingHeader />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

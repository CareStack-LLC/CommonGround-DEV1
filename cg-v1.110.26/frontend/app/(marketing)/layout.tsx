import { MarketingHeader } from '@/components/marketing/marketing-header';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { GlobalJsonLd } from '@/components/marketing';

/**
 * Marketing Layout
 *
 * Shared layout for all public marketing pages.
 * Includes the marketing header and footer.
 *
 * <GlobalJsonLd /> emits Organization + SoftwareApplication JSON-LD
 * on every marketing route. Individual pages can still emit their own
 * page-specific structured data (FAQPage, Article, etc.) in addition.
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
        <GlobalJsonLd />
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

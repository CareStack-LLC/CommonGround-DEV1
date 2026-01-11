'use client';

import Link from 'next/link';

/**
 * Marketing Footer Component
 *
 * Comprehensive footer for marketing pages with links organized by category.
 */

const footerLinks = {
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Security', href: '/security' },
      { label: 'About ARIA', href: '/aria' },
    ],
  },
  solutions: {
    title: 'Solutions',
    links: [
      { label: 'For Parents', href: '/pricing' },
      { label: 'For Professionals', href: '/professionals' },
      { label: 'For Courts', href: '/pricing/courts' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Testimonials', href: '/testimonials' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/help/contact' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Security', href: '/security' },
    ],
  },
  support: {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'FAQ', href: '/help/faq' },
      { label: 'Contact Support', href: '/help/contact' },
    ],
  },
};

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="w-10 h-10 bg-cg-sage rounded-xl flex items-center justify-center">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
          <circle cx="12" cy="12" r="3" fill="white" />
          <path
            d="M12 9V6M15 12H18M12 15V18M9 12H6"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="text-xl font-semibold text-foreground">CommonGround</span>
    </Link>
  );
}

export function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Reducing conflict in separated families through technology, transparency, and AI-powered communication.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h3 className="font-semibold text-foreground mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="font-semibold text-foreground">Stay updated</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Get co-parenting tips and product updates delivered to your inbox.
              </p>
            </div>
            <form className="flex gap-2 w-full md:w-auto" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent"
              />
              <button
                type="submit"
                className="bg-cg-sage text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} CommonGround. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/legal/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/legal/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/security"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

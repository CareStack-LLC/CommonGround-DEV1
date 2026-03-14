'use client';

import Link from 'next/link';
import { NewsletterForm } from './newsletter-form';

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
      { label: 'KidsCom', href: '/kids-com' },
    ],
  },
  solutions: {
    title: 'Solutions',
    links: [
      { label: 'For Parents', href: '/pricing' },
      { label: 'For Professionals', href: '/professionals' },
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
  partners: {
    title: 'Partners',
    links: [
      { label: 'Grant Program', href: '/grant-partnership' },
      { label: 'Partner Directory', href: '/partners' },
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
    <Link href="/" className="flex items-center gap-2.5">
      <svg width="40" height="40" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ftr-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E3A4A" />
            <stop offset="100%" stopColor="#2D6A8F" />
          </linearGradient>
          <linearGradient id="ftr-lf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5BC4A0" />
            <stop offset="100%" stopColor="#3DAA8A" />
          </linearGradient>
          <linearGradient id="ftr-rf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4BA8C8" />
            <stop offset="100%" stopColor="#2D6A8F" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="120" fill="url(#ftr-bg)" />
        <circle cx="168" cy="148" r="48" fill="url(#ftr-lf)" />
        <path d="M118 218 Q168 258 218 218" stroke="url(#ftr-lf)" strokeWidth="16" strokeLinecap="round" fill="none" />
        <circle cx="344" cy="148" r="48" fill="url(#ftr-rf)" />
        <path d="M294 218 Q344 258 394 218" stroke="url(#ftr-rf)" strokeWidth="16" strokeLinecap="round" fill="none" />
        <path d="M218 168 Q256 104 294 168" stroke="#F5A623" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.95" />
        <circle cx="256" cy="330" r="38" fill="#F5A623" />
        <path d="M218 382 Q256 414 294 382" stroke="#F5A623" strokeWidth="12" strokeLinecap="round" fill="none" />
      </svg>
      <span className="text-xl text-foreground" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
        <span className="font-bold">Common</span><span className="font-normal text-[#3DAA8A]">Ground</span>
      </span>
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
              Child-centered co-parenting tools trusted by families and attorneys. Secure, safe, and court-ready.
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
            <div className="w-full md:w-auto">
              <NewsletterForm />
            </div>
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

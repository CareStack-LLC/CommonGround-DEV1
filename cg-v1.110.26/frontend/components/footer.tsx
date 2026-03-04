'use client';

import Link from 'next/link';

/**
 * CommonGround Footer Component
 *
 * Design: Minimal, unobtrusive footer with legal links.
 * Philosophy: "Essential links, nothing more."
 */

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} CommonGround. All rights reserved.
          </p>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/legal/privacy"
              className="text-muted-foreground hover:text-foreground transition-smooth"
            >
              Privacy Policy
            </Link>
            <Link
              href="/legal/terms"
              className="text-muted-foreground hover:text-foreground transition-smooth"
            >
              Terms of Service
            </Link>
            <Link
              href="/help"
              className="text-muted-foreground hover:text-foreground transition-smooth"
            >
              Help Center
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/**
 * Minimal Footer (for legal pages)
 */
export function FooterMinimal() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border py-4">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>&copy; {currentYear} CommonGround</span>
          <span className="hidden sm:inline">|</span>
          <Link
            href="/legal/privacy"
            className="hover:text-foreground transition-smooth"
          >
            Privacy
          </Link>
          <span className="hidden sm:inline">|</span>
          <Link
            href="/legal/terms"
            className="hover:text-foreground transition-smooth"
          >
            Terms
          </Link>
          <span className="hidden sm:inline">|</span>
          <Link
            href="/help"
            className="hover:text-foreground transition-smooth"
          >
            Help
          </Link>
        </div>
      </div>
    </footer>
  );
}

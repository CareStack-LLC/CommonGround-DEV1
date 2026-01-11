'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

/**
 * Marketing Header Component
 *
 * Public navigation for marketing pages.
 * Responsive with mobile menu.
 */

interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string; description?: string }[];
}

const navItems: NavItem[] = [
  { label: 'Features', href: '/features' },
  {
    label: 'Pricing',
    href: '/pricing',
    children: [
      { label: 'For Parents', href: '/pricing', description: 'Individual subscription plans' },
      { label: 'For Professionals', href: '/pricing/professionals', description: 'Bulk voucher packs' },
      { label: 'For Courts', href: '/pricing/courts', description: 'Per-form processing' },
    ]
  },
  { label: 'For Professionals', href: '/professionals' },
  { label: 'About', href: '/about' },
];

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

function DropdownMenu({
  item,
  isOpen,
  onToggle
}: {
  item: NavItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        {item.label}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && item.children && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-card rounded-xl shadow-lg border border-border/50 py-2 z-50">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className="block px-4 py-3 hover:bg-muted/50 transition-colors"
              onClick={onToggle}
            >
              <div className="font-medium text-foreground">{child.label}</div>
              {child.description && (
                <div className="text-sm text-muted-foreground">{child.description}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function MarketingHeader() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Logo />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item) =>
              item.children ? (
                <DropdownMenu
                  key={item.label}
                  item={item}
                  isOpen={openDropdown === item.label}
                  onToggle={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {!isLoading && isAuthenticated ? (
              <Link
                href="/dashboard"
                className="bg-cg-sage text-white font-medium px-5 py-2 rounded-full text-sm transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground font-medium px-4 py-2 text-sm transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-cg-sage text-white font-medium px-5 py-2 rounded-full text-sm transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-background border-b border-border">
          <div className="px-4 py-4 space-y-4">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <div>
                    <div className="font-medium text-foreground py-2">{item.label}</div>
                    <div className="pl-4 space-y-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block text-muted-foreground hover:text-foreground py-1"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className="block text-foreground font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}

            <div className="pt-4 border-t border-border space-y-3">
              {!isLoading && isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="block w-full text-center bg-cg-sage text-white font-medium px-5 py-3 rounded-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block w-full text-center text-foreground font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="block w-full text-center bg-cg-sage text-white font-medium px-5 py-3 rounded-full"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

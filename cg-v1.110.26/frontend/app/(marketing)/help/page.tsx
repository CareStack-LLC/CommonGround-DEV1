import { Metadata } from 'next';
import Link from 'next/link';
import {
  Search,
  MessageSquare,
  FileText,
  Calendar,
  Wallet,
  Shield,
  Users,
  Settings,
  ArrowRight,
  HelpCircle,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Help Center | CommonGround',
  description: 'Get help with CommonGround. Find answers, tutorials, and support resources.',
};

/**
 * Help Center Page
 *
 * Main help center with categories and popular articles.
 */

const categories = [
  {
    icon: MessageSquare,
    title: 'Messaging & ARIA',
    description: 'Learn how to communicate effectively with ARIA assistance',
    articles: [
      { title: 'Getting started with messaging', href: '/help/messaging/getting-started' },
      { title: 'Understanding ARIA suggestions', href: '/help/messaging/aria-suggestions' },
      { title: 'Good faith metrics explained', href: '/help/messaging/good-faith' },
      { title: 'Message history and search', href: '/help/messaging/history' },
    ],
    color: 'cg-amber',
  },
  {
    icon: FileText,
    title: 'Agreements',
    description: 'Build and manage custody agreements',
    articles: [
      { title: 'Creating your first agreement', href: '/help/agreements/create' },
      { title: 'The 18-section wizard', href: '/help/agreements/sections' },
      { title: 'Approval workflow', href: '/help/agreements/approval' },
      { title: 'Exporting to PDF', href: '/help/agreements/export' },
    ],
    color: 'cg-sage',
  },
  {
    icon: Calendar,
    title: 'Scheduling',
    description: 'Manage custody schedules and exchanges',
    articles: [
      { title: 'Setting up your schedule', href: '/help/schedule/setup' },
      { title: 'Exchange check-ins', href: '/help/schedule/checkins' },
      { title: 'Holiday and vacation planning', href: '/help/schedule/holidays' },
      { title: 'Compliance tracking', href: '/help/schedule/compliance' },
    ],
    color: 'cg-slate',
  },
  {
    icon: Wallet,
    title: 'Expenses',
    description: 'Track and split child-related costs',
    articles: [
      { title: 'Adding expenses', href: '/help/expenses/add' },
      { title: 'Uploading receipts', href: '/help/expenses/receipts' },
      { title: 'Expense categories', href: '/help/expenses/categories' },
      { title: 'Payment tracking', href: '/help/expenses/payments' },
    ],
    color: 'cg-sage',
  },
  {
    icon: Shield,
    title: 'Court & Legal',
    description: 'Documentation for legal proceedings',
    articles: [
      { title: 'Generating court exports', href: '/help/court/exports' },
      { title: 'Understanding verification', href: '/help/court/verification' },
      { title: 'Granting professional access', href: '/help/court/access' },
      { title: 'What courts can see', href: '/help/court/visibility' },
    ],
    color: 'cg-slate',
  },
  {
    icon: Settings,
    title: 'Account & Settings',
    description: 'Manage your account and preferences',
    articles: [
      { title: 'Account settings', href: '/help/account/settings' },
      { title: 'Notification preferences', href: '/help/account/notifications' },
      { title: 'Security and password', href: '/help/account/security' },
      { title: 'Billing and subscription', href: '/help/account/billing' },
    ],
    color: 'cg-amber',
  },
];

const popularArticles = [
  { title: 'How does ARIA work?', href: '/aria', icon: Sparkles },
  { title: 'What can my co-parent see?', href: '/help/privacy/coparent-visibility', icon: Users },
  { title: 'How to invite my co-parent', href: '/help/getting-started/invite', icon: Users },
  { title: 'Understanding pricing plans', href: '/pricing', icon: HelpCircle },
  { title: 'Is my data secure?', href: '/security', icon: Shield },
  { title: 'Exporting data for court', href: '/help/court/exports', icon: FileText },
];

const quickLinks = [
  { title: 'FAQ', description: 'Quick answers to common questions', href: '/help/faq', icon: HelpCircle },
  { title: 'Contact Support', description: 'Get help from our team', href: '/help/contact', icon: MessageSquare },
  { title: 'Video Tutorials', description: 'Watch how-to guides', href: '/help/tutorials', icon: BookOpen },
];

export default function HelpCenterPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 bg-card overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-cg-sage/5 blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-48 h-48 rounded-full bg-cg-amber/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-semibold text-foreground mb-6">
              How can we help?
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Search our help center or browse categories below.
            </p>

            {/* Search Box */}
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search for help..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.title}
                  href={link.href}
                  className="bg-card rounded-xl p-6 border border-border/50 hover:border-cg-sage/30 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-cg-sage-subtle rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-cg-sage" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors">
                        {link.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-cg-sage group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-foreground mb-8">Browse by Category</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.title}
                  className="bg-card rounded-xl border border-border/50 overflow-hidden"
                >
                  <div className="p-6 border-b border-border/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 bg-${category.color}-subtle rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 text-${category.color}`} />
                      </div>
                      <h3 className="font-semibold text-foreground">{category.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <div className="p-4">
                    <ul className="space-y-2">
                      {category.articles.map((article) => (
                        <li key={article.title}>
                          <Link
                            href={article.href}
                            className="text-sm text-muted-foreground hover:text-cg-sage transition-colors flex items-center gap-2"
                          >
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                            {article.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-foreground mb-8">Popular Articles</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularArticles.map((article) => {
              const Icon = article.icon;
              return (
                <Link
                  key={article.title}
                  href={article.href}
                  className="flex items-center gap-4 p-4 rounded-xl bg-background border border-border/50 hover:border-cg-sage/30 transition-colors group"
                >
                  <div className="w-10 h-10 bg-cg-sage-subtle rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-cg-sage" />
                  </div>
                  <span className="text-foreground group-hover:text-cg-sage transition-colors">
                    {article.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Still Need Help? */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-cg-sage-subtle to-cg-amber-subtle rounded-2xl p-8 lg:p-12 text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Still need help?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/help/contact"
                className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg"
              >
                Contact Support
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/help/faq"
                className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage hover:text-white"
              >
                View FAQ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

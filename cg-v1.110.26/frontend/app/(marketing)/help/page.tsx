'use client';

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
  Mail,
  Phone,
} from 'lucide-react';

/**
 * Help Center Page
 *
 * Matches homepage design: Crimson Text serif, warm colors
 */

const categories = [
  {
    icon: MessageSquare,
    title: 'Messaging & ARIA',
    description: 'How to communicate effectively',
    href: '/help/messaging',
    color: 'from-[#D97757]/10 to-[#D97757]/5',
    iconColor: 'text-[#D97757]',
  },
  {
    icon: FileText,
    title: 'Agreements',
    description: 'Build custody agreements',
    href: '/help/agreements',
    color: 'from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5',
    iconColor: 'text-[var(--portal-primary)]',
  },
  {
    icon: Calendar,
    title: 'Scheduling',
    description: 'Manage custody schedules',
    href: '/help/schedule',
    color: 'from-[#D97757]/10 to-[#D97757]/5',
    iconColor: 'text-[#D97757]',
  },
  {
    icon: Wallet,
    title: 'Expenses',
    description: 'Track and split costs',
    href: '/help/expenses',
    color: 'from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5',
    iconColor: 'text-[var(--portal-primary)]',
  },
  {
    icon: Shield,
    title: 'Court & Legal',
    description: 'Documentation for court',
    href: '/help/court',
    color: 'from-[#D97757]/10 to-[#D97757]/5',
    iconColor: 'text-[#D97757]',
  },
  {
    icon: Settings,
    title: 'Account',
    description: 'Manage your settings',
    href: '/help/account',
    color: 'from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5',
    iconColor: 'text-[var(--portal-primary)]',
  },
];

const popularQuestions = [
  { question: 'How does ARIA work?', href: '/aria' },
  { question: 'What can my co-parent see?', href: '/help/privacy' },
  { question: 'How do I invite my co-parent?', href: '/help/getting-started' },
  { question: 'Is my data secure?', href: '/security' },
  { question: 'How do I export for court?', href: '/help/court/exports' },
  { question: 'How do I cancel my subscription?', href: '/help/account/billing' },
];

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9]">
      {/* Hero */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#2C3E50] mb-6 leading-[1.05]"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            How can we <span className="text-[#D97757]">help?</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            Find answers, tutorials, and support resources.
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for help..."
                className="w-full pl-14 pr-5 py-4 text-lg rounded-full border-2 border-gray-200 bg-white text-[#2C3E50] placeholder:text-gray-400 focus:outline-none focus:border-[var(--portal-primary)] transition-colors shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-8 -mt-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: HelpCircle, title: 'FAQ', description: 'Quick answers', href: '/help/faq' },
              { icon: MessageSquare, title: 'Contact Us', description: 'Get in touch', href: '/contact' },
              { icon: BookOpen, title: 'Tutorials', description: 'Video guides', href: '/help/tutorials' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-4 bg-white rounded-2xl p-5 border-2 border-gray-100 hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all group"
                >
                  <div className="h-12 w-12 rounded-xl bg-[var(--portal-primary)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-[var(--portal-primary)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#2C3E50] group-hover:text-[var(--portal-primary)] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 ml-auto group-hover:text-[var(--portal-primary)] group-hover:translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-2xl sm:text-3xl font-serif text-[#2C3E50] mb-10 text-center"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            Browse by <span className="text-[#D97757]">category</span>
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.title}
                  href={category.href}
                  className="bg-white rounded-3xl p-6 border-2 border-gray-100 hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all group"
                >
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-7 w-7 ${category.iconColor}`} />
                  </div>
                  <h3
                    className="text-lg font-semibold text-[#2C3E50] mb-1 group-hover:text-[var(--portal-primary)] transition-colors"
                    style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                  >
                    {category.title}
                  </h3>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Questions */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-2xl sm:text-3xl font-serif text-[#2C3E50] mb-10 text-center"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            Popular <span className="text-[#D97757]">questions</span>
          </h2>

          <div className="space-y-4">
            {popularQuestions.map((item) => (
              <Link
                key={item.question}
                href={item.href}
                className="flex items-center justify-between p-5 bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl border-2 border-[var(--portal-primary)]/10 hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all group"
              >
                <span className="text-[#2C3E50] font-medium group-hover:text-[var(--portal-primary)] transition-colors">
                  {item.question}
                </span>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--portal-primary)] group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[var(--portal-primary)] to-[#1e4442] rounded-3xl p-10 text-white text-center">
            <h2
              className="text-3xl sm:text-4xl font-serif mb-4"
              style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
            >
              Still need help?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
              Our support team is here to help you get the most out of CommonGround.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-8 py-4 bg-[#D97757] text-white font-semibold rounded-full hover:bg-[#c26647] transition-all shadow-lg hover:-translate-y-0.5 group"
              >
                <Mail className="w-5 h-5 mr-2" />
                Contact Support
              </Link>
              <Link
                href="/help/faq"
                className="inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-all border-2 border-white/30"
              >
                View All FAQs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

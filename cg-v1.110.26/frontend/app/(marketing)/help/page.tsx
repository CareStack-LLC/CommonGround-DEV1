import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  CreditCard,
  FileText,
  Heart,
  HelpCircle,
  Mail,
  MapPin,
  MessageSquare,
  Scale,
  Search,
  Shield,
  Wallet,
} from 'lucide-react';

/**
 * Help Center Hub
 *
 * Main landing page for the help center. Links to guides, FAQ, and contact.
 */

const featuredGuides = [
  {
    icon: BookOpen,
    title: 'Getting Started',
    description: 'Create your account, invite your co-parent, and send your first message.',
    href: '/help/guides/getting-started',
    tag: 'Start here',
  },
  {
    icon: Brain,
    title: 'Messaging & ARIA',
    description: 'How ARIA coaches your messages and keeps conversations constructive.',
    href: '/help/guides/messaging-aria',
  },
  {
    icon: Calendar,
    title: 'Calendar & Scheduling',
    description: 'Shared calendars, recurring schedules, and holiday rotation.',
    href: '/help/guides/calendar-scheduling',
  },
  {
    icon: MapPin,
    title: 'Custody Exchanges',
    description: 'GPS-verified Silent Handoff and compliance tracking.',
    href: '/help/guides/custody-exchanges',
  },
  {
    icon: Wallet,
    title: 'Expenses & ClearFund',
    description: 'Log expenses, upload receipts, and track payments.',
    href: '/help/guides/expenses',
  },
  {
    icon: FileText,
    title: 'Agreement Builder',
    description: 'Build custody agreements section by section.',
    href: '/help/guides/agreements',
  },
];

const allGuides = [
  { icon: Heart, title: 'KidSpace', href: '/help/guides/kidspace' },
  { icon: Shield, title: 'Court Documentation', href: '/help/guides/court-exports' },
  { icon: Shield, title: 'Privacy & Security', href: '/help/guides/privacy-security' },
  { icon: CreditCard, title: 'Account & Billing', href: '/help/guides/account-billing' },
  { icon: Scale, title: 'For Professionals', href: '/help/guides/professional-access' },
];

const popularQuestions = [
  { question: 'How does ARIA work?', href: '/help/guides/messaging-aria' },
  { question: 'What can my co-parent see?', href: '/help/guides/privacy-security' },
  { question: 'How do I invite my co-parent?', href: '/help/guides/getting-started#invite' },
  { question: 'Is my data secure?', href: '/help/guides/privacy-security#encryption' },
  { question: 'How do I export for court?', href: '/help/guides/court-exports' },
  { question: 'How do I cancel my subscription?', href: '/help/guides/account-billing#cancel' },
  { question: 'What is KidSpace?', href: '/help/guides/kidspace' },
  { question: 'How does Silent Handoff work?', href: '/help/guides/custody-exchanges' },
];

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      {/* Hero */}
      <section className="pt-16 pb-12 lg:pt-24 lg:pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl text-[#1E3A4A] mb-5 leading-[1.1]"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            How can we <span className="text-[#3DAA8A]">help?</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto">
            Guides, answers, and resources for everything CommonGround.
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: BookOpen,
                title: 'Guides',
                description: 'Step-by-step walkthroughs',
                href: '/help/guides',
              },
              {
                icon: HelpCircle,
                title: 'FAQ',
                description: 'Quick answers',
                href: '/help/faq',
              },
              {
                icon: MessageSquare,
                title: 'Contact Us',
                description: 'Get in touch',
                href: '/help/contact',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-4 bg-white rounded-2xl p-5 border border-gray-100 hover:border-[#3DAA8A]/30 hover:shadow-lg transition-all group"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#3DAA8A]/10 flex items-center justify-center group-hover:bg-[#3DAA8A] transition-colors">
                    <Icon className="h-6 w-6 text-[#3DAA8A] group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1E3A4A]">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 ml-auto group-hover:text-[#3DAA8A] group-hover:translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Guides */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2
              className="text-2xl sm:text-3xl text-[#1E3A4A]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Popular <span className="text-[#3DAA8A]">guides</span>
            </h2>
            <Link
              href="/help/guides"
              className="text-[#3DAA8A] text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredGuides.map((guide) => {
              const Icon = guide.icon;
              return (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="group bg-[#F4F8F7] rounded-2xl p-6 border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-white relative"
                >
                  {'tag' in guide && guide.tag && (
                    <span className="absolute top-4 right-4 text-xs font-medium bg-[#F5A623]/10 text-[#F5A623] px-2.5 py-1 rounded-full">
                      {guide.tag}
                    </span>
                  )}
                  <div className="w-11 h-11 rounded-xl bg-[#3DAA8A]/10 flex items-center justify-center mb-4 group-hover:bg-[#3DAA8A] transition-colors">
                    <Icon className="w-5 h-5 text-[#3DAA8A] group-hover:text-white transition-colors" />
                  </div>
                  <h3
                    className="text-lg text-[#1E3A4A] mb-1.5"
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                    }}
                  >
                    {guide.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {guide.description}
                  </p>
                </Link>
              );
            })}
          </div>

          {/* More guides row */}
          <div className="mt-6 flex flex-wrap gap-3">
            {allGuides.map((guide) => {
              const Icon = guide.icon;
              return (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="flex items-center gap-2 bg-[#F4F8F7] rounded-full px-4 py-2.5 border border-gray-100 hover:border-[#3DAA8A]/30 hover:shadow-sm transition-all text-sm font-medium text-[#1E3A4A] hover:text-[#3DAA8A]"
                >
                  <Icon className="w-4 h-4 text-[#3DAA8A]" />
                  {guide.title}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Questions */}
      <section className="py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2
              className="text-2xl sm:text-3xl text-[#1E3A4A]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Popular <span className="text-[#F5A623]">questions</span>
            </h2>
            <Link
              href="/help/faq"
              className="text-[#3DAA8A] text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              All FAQs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {popularQuestions.map((item) => (
              <Link
                key={item.question}
                href={item.href}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-[#3DAA8A]/30 hover:shadow-md transition-all group"
              >
                <span className="text-[#1E3A4A] text-sm font-medium group-hover:text-[#3DAA8A] transition-colors">
                  {item.question}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#3DAA8A] group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* For Professionals */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] rounded-2xl p-8 lg:p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Scale className="w-5 h-5 text-[#F5A623]" />
                  <span className="text-[#F5A623] text-xs font-medium uppercase tracking-widest">
                    For Professionals
                  </span>
                </div>
                <h3
                  className="text-2xl sm:text-3xl mb-3"
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                  }}
                >
                  Attorneys, mediators & evaluators
                </h3>
                <p className="text-white/70 leading-relaxed">
                  Learn how to access client cases, generate compliance reports,
                  conduct AI-assisted intakes, and create court-ready evidence
                  packages.
                </p>
              </div>
              <div className="flex md:justify-end">
                <Link
                  href="/help/guides/professional-access"
                  className="inline-flex items-center gap-2 bg-white text-[#1E3A4A] font-medium px-6 py-3 rounded-full transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  Professional Guide
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-2xl sm:text-3xl text-[#1E3A4A] mb-4"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Still need help?
          </h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Our support team is here to help you get the most out of
            CommonGround. We typically respond within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/help/contact"
              className="inline-flex items-center justify-center gap-2 bg-[#3DAA8A] text-white font-medium px-8 py-4 rounded-full text-lg transition-all hover:bg-[#34967a] hover:shadow-xl hover:-translate-y-0.5"
            >
              <Mail className="w-5 h-5" />
              Contact Support
            </Link>
            <Link
              href="/help/faq"
              className="inline-flex items-center justify-center gap-2 border-2 border-[#3DAA8A] text-[#3DAA8A] font-medium px-8 py-4 rounded-full text-lg transition-all hover:bg-[#3DAA8A] hover:text-white"
            >
              Browse FAQs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

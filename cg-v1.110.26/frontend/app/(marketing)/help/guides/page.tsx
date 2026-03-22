import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  CreditCard,
  FileText,
  Heart,
  MapPin,
  MessageSquare,
  Scale,
  Shield,
  Wallet,
} from 'lucide-react';

const guides = [
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
    description: 'How ARIA coaches your messages, incoming shielding, and communication tips.',
    href: '/help/guides/messaging-aria',
  },
  {
    icon: Calendar,
    title: 'Calendar & Scheduling',
    description: 'Shared calendars, recurring schedules, holiday rotation, and reminders.',
    href: '/help/guides/calendar-scheduling',
  },
  {
    icon: MapPin,
    title: 'Custody Exchanges',
    description: 'Silent Handoff GPS verification, QR check-in, and compliance tracking.',
    href: '/help/guides/custody-exchanges',
  },
  {
    icon: Wallet,
    title: 'Expenses & ClearFund',
    description: 'Log expenses, upload receipts, split costs, and track payments.',
    href: '/help/guides/expenses',
  },
  {
    icon: FileText,
    title: 'Agreement Builder',
    description: 'Build custody agreements section by section with ARIA guidance.',
    href: '/help/guides/agreements',
  },
  {
    icon: Heart,
    title: 'KidSpace',
    description: 'Video calls, shared activities, My Circle, and child safety features.',
    href: '/help/guides/kidspace',
  },
  {
    icon: Shield,
    title: 'Court Documentation',
    description: 'Export types, SHA-256 verification, and working with your attorney.',
    href: '/help/guides/court-exports',
  },
  {
    icon: Shield,
    title: 'Privacy & Security',
    description: 'What your co-parent sees, data encryption, and account controls.',
    href: '/help/guides/privacy-security',
  },
  {
    icon: CreditCard,
    title: 'Account & Billing',
    description: 'Plans, upgrading, canceling, hardship pricing, and profile settings.',
    href: '/help/guides/account-billing',
  },
  {
    icon: Scale,
    title: 'For Professionals',
    description: 'Attorney and mediator access, intake sessions, compliance reports.',
    href: '/help/guides/professional-access',
  },
];

export default function GuidesIndexPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-12 pb-8 lg:pt-16 lg:pb-12">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1
            className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Step-by-step <span className="text-[#3DAA8A]">guides</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to know about using CommonGround, from your
            first message to court-ready exports.
          </p>
        </div>
      </section>

      {/* Guide Cards */}
      <section className="pb-16 lg:pb-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {guides.map((guide) => {
              const Icon = guide.icon;
              return (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative"
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
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    {guide.description}
                  </p>
                  <span className="text-[#3DAA8A] text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read guide
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

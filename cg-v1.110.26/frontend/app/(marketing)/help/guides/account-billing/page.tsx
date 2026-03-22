import Link from 'next/link';
import { Metadata } from 'next';
import {
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  XCircle,
  CalendarClock,
  Heart,
  Bell,
  UserCog,
  Play,
  Lightbulb,
  ChevronRight,
  ArrowRight,
  Check,
  Shield,
  BookOpen,
  MessageSquare,
  Scale,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Account & Billing | CommonGround Help Center',
  description:
    'Manage your CommonGround subscription, compare plans, update billing, and configure your account settings.',
};

const tocItems = [
  { id: 'plans', label: 'Plan comparison' },
  { id: 'upgrade', label: 'How to upgrade' },
  { id: 'downgrade', label: 'How to downgrade' },
  { id: 'cancel', label: 'How to cancel' },
  { id: 'billing-cycle', label: 'Billing cycle & payments' },
  { id: 'hardship', label: 'Hardship pricing' },
  { id: 'notifications', label: 'Managing notifications' },
  { id: 'profile', label: 'Updating your profile' },
];

const relatedGuides = [
  { title: 'Getting Started', href: '/help/guides/getting-started', icon: BookOpen },
  { title: 'Privacy & Security', href: '/help/guides/privacy-security', icon: Shield },
  { title: 'Messaging & ARIA', href: '/help/guides/messaging-aria', icon: MessageSquare },
  { title: 'For Professionals', href: '/help/guides/professional-access', icon: Scale },
];

const plans = [
  {
    name: 'Web Starter',
    price: 'FREE',
    period: '',
    features: [
      'ARIA-powered messaging',
      'Shared calendar',
      'Expense tracking',
      'Basic web access',
    ],
    highlighted: false,
  },
  {
    name: 'Plus',
    price: '$17.99',
    period: '/mo or $199.99/year',
    features: [
      'Everything in Web Starter',
      'Automated schedules',
      'Quick Accords',
      'PDF exports',
      'My Circle (1 contact)',
      'Holiday rotation',
      'Reminders',
    ],
    highlighted: true,
  },
  {
    name: 'Complete',
    price: '$34.99',
    period: '/mo or $349.99/year',
    features: [
      'Everything in Plus',
      'Silent Handoff GPS',
      'KidSpace video, messaging & activities',
      'Custody analytics',
      'Court-ready exports with SHA-256',
      'My Circle (3 contacts)',
      'Priority support',
    ],
    highlighted: false,
  },
];

export default function AccountBillingGuidePage() {
  return (
    <article className="pb-20">
      {/* Hero */}
      <section className="pt-12 pb-10 lg:pt-16 lg:pb-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#3DAA8A]/10 flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-8 h-8 text-[#3DAA8A]" />
          </div>
          <h1
            className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Account & Billing
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Everything you need to manage your subscription, compare plans, and keep your
            account settings up to date.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">
        {/* Table of Contents */}
        <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-12">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            In this guide
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {tocItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="flex items-center gap-2 text-sm text-[#1E3A4A] hover:text-[#3DAA8A] transition-colors py-1"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#3DAA8A]" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Plan Comparison */}
        <section id="plans" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-6 h-6 text-[#3DAA8A] flex-shrink-0" />
            <h2
              className="text-2xl text-[#1E3A4A]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Plan comparison
            </h2>
          </div>
          <p className="text-gray-600 mb-6 leading-relaxed">
            CommonGround offers three plans to fit your family&apos;s needs. Every plan
            includes ARIA-powered messaging to help keep communication constructive.
          </p>

          <div className="grid gap-5">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-xl border p-6 ${
                  plan.highlighted
                    ? 'border-[#3DAA8A] shadow-md ring-1 ring-[#3DAA8A]/20'
                    : 'border-gray-100'
                }`}
              >
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <h3
                      className="text-lg text-[#1E3A4A]"
                      style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                    >
                      {plan.name}
                    </h3>
                    {plan.highlighted && (
                      <span className="text-xs font-medium text-[#3DAA8A] bg-[#3DAA8A]/10 px-2 py-0.5 rounded-full">
                        Most popular
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[#1E3A4A]">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-gray-500">{plan.period}</span>
                    )}
                  </div>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-[#3DAA8A] mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* How to upgrade */}
        <section id="upgrade" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <ArrowUpCircle className="w-6 h-6 text-[#3DAA8A] flex-shrink-0" />
            <h2
              className="text-2xl text-[#1E3A4A]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              How to upgrade
            </h2>
          </div>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">1</span>
              <span>Go to <strong>Settings &gt; Billing</strong> in your dashboard</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">2</span>
              <span>Select the plan you want to upgrade to</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">3</span>
              <span>Enter your payment information (or use a saved card)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">4</span>
              <span>New features are available <strong>immediately</strong> after upgrading</span>
            </li>
          </ol>

          <div className="bg-[#F5A623]/5 border-l-4 border-[#F5A623] rounded-lg px-5 py-4 mt-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-[#F5A623] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#1E3A4A] text-sm mb-1">Tip</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Choosing an annual plan saves you up to 18% compared to monthly billing.
                  You can switch from monthly to annual at any time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How to downgrade */}
        <section id="downgrade" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <ArrowDownCircle className="w-6 h-6 text-[#3DAA8A] flex-shrink-0" />
            <h2
              className="text-2xl text-[#1E3A4A]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              How to downgrade
            </h2>
          </div>
          <ol className="space-y-3 text-gray-700 mb-4">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">1</span>
              <span>Go to <strong>Settings &gt; Billing</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">2</span>
              <span>Select the plan you want to switch to</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">3</span>
              <span>Confirm the change</span>
            </li>
          </ol>
          <p className="text-gray-600 leading-relaxed">
            The downgrade takes effect at the <strong>end of your current billing period</strong>.
            You keep full access to your current plan features until then. No data is lost
            when downgrading &mdash; features simply become unavailable until you upgrade again.
          </p>
        </section>

        {/* How to cancel */}
        <section id="cancel" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-6 h-6 text-[#3DAA8A] flex-shrink-0" />
            <h2
              className="text-2xl text-[#1E3A4A]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              How to cancel
            </h2>
          </div>
          <ol className="space-y-3 text-gray-700 mb-4">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">1</span>
              <span>Go to <strong>Settings &gt; Billing &gt; Cancel Subscription</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">2</span>
              <span>Confirm your cancellation</span>
            </li>
          </ol>
          <p className="text-gray-600 leading-relaxed">
            There is <strong>no cancellation penalty</strong>. You keep access to your paid
            features until the end of your current billing period. After that, your account
            reverts to the free Web Starter plan and all your data is preserved.
          </p>
        </section>

        {/* Video placeholder */}
        <div className="bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] rounded-2xl p-8 text-center text-white mb-14">
          <Play className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h3
            className="text-xl mb-2"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Managing Your Account
          </h3>
          <p className="text-white/70 text-sm">Video walkthrough coming soon</p>
        </div>

        {/* Billing cycle */}
        <section id="billing-cycle" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <CalendarClock className="w-6 h-6 text-[#3DAA8A] flex-shrink-0" />
            <h2
              className="text-2xl text-[#1E3A4A]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Billing cycle &amp; payment methods
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            You can choose between <strong>monthly</strong> or <strong>annual</strong> billing
            when you subscribe. Annual plans offer significant savings.
          </p>
          <ul className="space-y-2.5 text-gray-700">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3DAA8A] mt-2 flex-shrink-0" />
              <span><strong>Payment methods</strong> &mdash; credit card and debit card accepted, processed securely through Stripe</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3DAA8A] mt-2 flex-shrink-0" />
              <span><strong>Billing date</strong> &mdash; charges occur on the same day each month (or year) as your original signup</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3DAA8A] mt-2 flex-shrink-0" />
              <span><strong>Receipts</strong> &mdash; emailed automatically after each payment</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3DAA8A] mt-2 flex-shrink-0" />
              <span><strong>Update payment method</strong> &mdash; go to Settings &gt; Billing &gt; Payment Method at any time</span>
            </li>
          </ul>
        </section>

        {/* Hardship pricing */}
        <section id="hardship" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-6 h-6 text-[#3DAA8A] flex-shrink-0" />
            <h2
              className="text-2xl text-[#1E3A4A]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Hardship pricing
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            We believe every family deserves access to tools that put children first,
            regardless of financial circumstances. If cost is a barrier, we want to help.
          </p>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Contact us at{' '}
            <a
              href="mailto:support@find-commonground.com"
              className="text-[#3DAA8A] font-medium hover:underline"
            >
              support@find-commonground.com
            </a>{' '}
            to discuss reduced pricing. Requests are evaluated on a case-by-case basis, and
            conversations are always confidential.
          </p>

          <div className="bg-[#F5A623]/5 border-l-4 border-[#F5A623] rounded-lg px-5 py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-[#F5A623] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#1E3A4A] text-sm mb-1">No proof required</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  We do not ask for financial documentation. A short email explaining your
                  situation is all we need to get started.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section id="notifications" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-6 h-6 text-[#3DAA8A] flex-shrink-0" />
            <h2
              className="text-2xl text-[#1E3A4A]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Managing notifications
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Stay informed without being overwhelmed. You have full control over which
            notifications you receive.
          </p>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">1</span>
              <span>Go to <strong>Settings &gt; Notifications</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">2</span>
              <span>Toggle individual notification types on or off (messages, calendar, expenses, exchanges)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">3</span>
              <span>Choose your preferred delivery method: push, email, or both</span>
            </li>
          </ol>
        </section>

        {/* Profile */}
        <section id="profile" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <UserCog className="w-6 h-6 text-[#3DAA8A] flex-shrink-0" />
            <h2
              className="text-2xl text-[#1E3A4A]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Updating your profile
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Keep your information current so your co-parent and any connected professionals
            can reach you.
          </p>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">1</span>
              <span>Go to <strong>Settings &gt; Profile</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">2</span>
              <span>Update your display name, profile photo, or contact information</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A] flex-shrink-0 mt-0.5">3</span>
              <span>Save your changes &mdash; updates appear to your co-parent immediately</span>
            </li>
          </ol>
        </section>

        {/* Related Guides */}
        <section className="border-t border-gray-200 pt-12 mb-14">
          <h2
            className="text-xl text-[#1E3A4A] mb-6"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Related guides
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {relatedGuides.map((guide) => {
              const Icon = guide.icon;
              return (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="group flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#3DAA8A]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#3DAA8A] transition-colors">
                    <Icon className="w-5 h-5 text-[#3DAA8A] group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-medium text-[#1E3A4A] text-sm group-hover:text-[#3DAA8A] transition-colors">
                    {guide.title}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-[#3DAA8A] transition-colors" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Still need help CTA */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <h2
            className="text-xl text-[#1E3A4A] mb-2"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Still need help?
          </h2>
          <p className="text-gray-600 text-sm mb-5">
            Our support team is here for you. We typically respond within a few hours.
          </p>
          <Link
            href="/help/contact"
            className="inline-flex items-center gap-2 bg-[#3DAA8A] text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-[#2E9A7A] transition-colors"
          >
            Contact Support
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </article>
  );
}

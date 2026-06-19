import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { MarketingHeader } from '@/components/marketing';
import { JsonLd } from '@/components/marketing/json-ld';
import {
  CtaBand,
  FaqJsonLd,
} from '@/components/marketing';
import {
  ArrowRight,
  Calendar,
  DollarSign,
  Video,
  MessageCircle,
  Check,
  Shield,
  Users,
  MapPin,
  UserPlus,
  Settings,
  Smile,
  Heart,
  Quote,
  Phone,
  Lock,
  Scale,
} from 'lucide-react';

/* ── Per-page metadata (home = canonical "/") ────────────────────── */
export const metadata: Metadata = {
  title: 'CommonGround — The calm way to co-parent',
  description:
    'Keep handoffs smooth, messages steady, and kids centered. ARIA messaging, automated schedules, KidSpace, and court-ready records in one place.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: 'CommonGround — The calm way to co-parent',
    description:
      'Keep handoffs smooth, messages steady, and kids centered. ARIA messaging, automated schedules, and court-ready records in one place.',
    url: 'https://www.find-commonground.com/',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CommonGround — The calm way to co-parent',
    description:
      'Keep handoffs smooth, messages steady, and kids centered. ARIA, automated schedules, and court-ready records.',
  },
};

/* ── Home FAQ items — shared by visual FAQ and FAQPage JSON-LD ──── */
const HOME_FAQ_ITEMS = [
  {
    question: "What if my co-parent won't sign up?",
    answer:
      'You can still use the calendar, expense tracking, and court documentation on your own. When they join, everything syncs automatically.',
  },
  {
    question: 'Is this really free?',
    answer:
      "The Web Starter plan is free forever — no credit card, no trial that expires. Paid plans add automation and advanced features when you're ready.",
  },
  {
    question: 'Will this hold up in court?',
    answer:
      'Every message, schedule change, and payment is timestamped and securely stored. Our exports are designed for family law proceedings.',
  },
  {
    question: 'What about my kids?',
    answer:
      'KidSpace lets children video call, read stories, and play games with both parents — a safe space designed around them, not the conflict.',
  },
  {
    question: 'How is CommonGround different from other co-parenting apps?',
    answer:
      'CommonGround includes ARIA messaging free (most competitors charge for AI features), plus unique features like KidSpace for direct parent-child video calls and Silent Handoff for GPS-verified contactless exchanges. No other co-parenting app offers these.',
  },
  {
    question: 'Can my attorney access my records?',
    answer:
      'Yes. You can invite your attorney, mediator, or other family law professional to view your CommonGround data. They get read-only access to verified records at no cost to them.',
  },
];

/* ── Client Islands ───────────────────────────────────────────────── */

const FAQSection = dynamic(() => import('@/components/marketing/faq-section'), {
  ssr: true,
});

const AuthRedirectGuard = dynamic(
  () => import('@/components/marketing/auth-redirect-guard'),
);

const MarketingFooter = dynamic(
  () => import('@/components/marketing').then((m) => ({ default: m.MarketingFooter })),
  { ssr: true },
);

const HomeARIADemo = dynamic(
  () => import('@/components/marketing/home-aria-demo').then((m) => ({ default: m.HomeARIADemo })),
);

/* ── Home pricing teaser tiers ───────────────────────────────────── */
const PRICING_TEASER_TIERS = [
  {
    name: 'Web Starter',
    price: '$0',
    period: 'forever',
    tagline: 'Start calm today',
    features: [
      'ARIA-assisted messaging',
      'Shared custody calendar',
      'ClearFund expenses',
    ],
    highlight: false,
  },
  {
    name: 'Plus',
    price: '$17.99',
    period: '/month',
    tagline: 'Automate the hard parts',
    features: [
      'Everything in Web Starter',
      'Automated recurring schedules',
      'PDF court exports',
    ],
    highlight: true,
  },
  {
    name: 'Complete',
    price: '$34.99',
    period: '/month',
    tagline: 'Peace of mind, documented',
    features: [
      'Everything in Plus',
      'Silent Handoff GPS exchanges',
      'KidSpace video calls',
    ],
    highlight: false,
  },
];

export default function HomePage() {
  return (
    <>
      <AuthRedirectGuard />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'CommonGround',
          applicationCategory: 'LifestyleApplication',
          operatingSystem: 'Web',
          offers: [
            {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              description: 'Web Starter — Free forever',
            },
            {
              '@type': 'Offer',
              price: '17.99',
              priceCurrency: 'USD',
              description: 'Plus — Automated co-parenting',
            },
            {
              '@type': 'Offer',
              price: '34.99',
              priceCurrency: 'USD',
              description: 'Complete — Full peace of mind',
            },
          ],
          description:
            'AI-powered co-parenting app with automated schedules, expense tracking, video calls, and court-ready documentation.',
        }}
      />

      {/* FAQPage structured data — paired with visual FAQSection below */}
      <FaqJsonLd items={HOME_FAQ_ITEMS} />

      <div className="marketing-light min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#E8F4F8]">
        <MarketingHeader />

        {/* ═══════════════════════════════════════════════════════════════
            HERO SECTION — Server-rendered LCP content
        ═══════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute top-32 left-0 w-full h-px bg-[#F5A623]" />
            <div className="absolute top-64 right-0 w-3/4 h-px bg-[var(--portal-primary)]" />
          </div>

          <div className="max-w-6xl mx-auto px-6 relative">
            <div className="grid items-center gap-10 lg:gap-14 lg:grid-cols-2">
              {/* Copy column */}
              <div className="text-center lg:text-left">
                <h1 className="font-serif text-[#1E3A4A] text-4xl sm:text-5xl md:text-6xl leading-[1.08] tracking-tight mb-6">
                  The calm way to{' '}
                  <span className="text-[#3DAA8A]">co-parent</span>
                </h1>

                <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  ARIA keeps messages calm. Schedules run on autopilot. Your kids can call you directly &mdash; and every word is documented,{' '}
                  <span className="font-medium text-[var(--portal-primary)]">so you have energy left to actually parent.</span>
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-8">
                  <Link
                    href="/early-access"
                    className="inline-flex items-center justify-center px-8 py-4 bg-[var(--portal-primary)] text-white font-semibold rounded-full hover:bg-[#2D8A70] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
                  >
                    Start free &mdash; no card needed
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/professionals"
                    className="inline-flex items-center justify-center px-7 py-4 bg-white text-[var(--portal-primary)] font-semibold rounded-full hover:bg-gray-50 transition-all border-2 border-[var(--portal-primary)]"
                  >
                    For professionals
                  </Link>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-gray-600">
                  {['Forever-free tier', 'No credit card', 'Court-ready records', 'Built with family-law pros'].map((p) => (
                    <span key={p} className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-[var(--portal-primary)]" />
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hero image */}
              <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
                <Image
                  src="/images/marketing/cg_home_hero.jpg"
                  alt="A father and his young daughter sharing a calm, happy moment at home while he checks the CommonGround app"
                  width={1200}
                  height={800}
                  priority
                  className="w-full h-auto rounded-3xl shadow-xl object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            TRUST BAR — colorful credibility strip directly under the hero
        ═══════════════════════════════════════════════════════════════ */}
        <section className="bg-gradient-to-r from-[#F4F8F7] via-white to-[#E8F4F0] border-y border-[#3DAA8A]/15">
          <div className="max-w-6xl mx-auto px-6 py-7 sm:py-8">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
              {[
                { Icon: Heart, color: '#E07A5F', label: 'Built by a co-parent' },
                { Icon: Lock, color: '#3DAA8A', label: 'Encrypted & private' },
                { Icon: Scale, color: '#2D6A8F', label: 'Attorney-reviewed workflows' },
              ].map(({ Icon, color, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-sm ring-1 ring-black/5"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                    style={{ backgroundColor: `${color}1a` }}
                  >
                    <Icon className="h-5 w-5" style={{ color }} strokeWidth={2.25} />
                  </span>
                  <span className="font-serif text-base sm:text-lg font-semibold tracking-tight text-[#1E3A4A]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            WHAT WE FIX — quick, captivating problem → solution explainer
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12 sm:mb-14">
              <h2
                className="text-3xl sm:text-5xl font-serif text-[#1E3A4A] mb-4"
                style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
              >
                Co-parenting is hard. <span className="text-[#3DAA8A]">CommonGround makes it calm.</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                The same four fights happen in almost every household. Here&rsquo;s how we quietly end each one.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
              {[
                {
                  Icon: MessageCircle,
                  color: '#E07A5F',
                  problem: 'Every message turns into a fight.',
                  solution:
                    'ARIA rewrites the heat out of a text before it sends — so the conversation stays about your kids, not the past.',
                },
                {
                  Icon: Calendar,
                  color: '#3DAA8A',
                  problem: '“Wait — who has them Friday?”',
                  solution:
                    'TimeBridge runs the schedule and custody exchanges on autopilot. One shared calendar, no more guessing.',
                },
                {
                  Icon: DollarSign,
                  color: '#2D6A8F',
                  problem: 'Money becomes a standoff.',
                  solution:
                    'ClearFund splits shared costs by your agreement and tracks every receipt — no chasing, no arguing.',
                },
                {
                  Icon: Video,
                  color: '#C9802E',
                  problem: 'Kids get stuck passing messages.',
                  solution:
                    'KidSpace lets your kids call and text you directly — safe, supervised, and entirely theirs.',
                },
              ].map(({ Icon, color, problem, solution }) => (
                <div
                  key={problem}
                  className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm"
                >
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                    style={{ backgroundColor: `${color}1a` }}
                  >
                    <Icon className="h-5 w-5" style={{ color }} strokeWidth={2.25} />
                  </span>
                  <div>
                    <p className="font-serif text-lg text-[#1E3A4A] leading-snug">{problem}</p>
                    <p className="mt-1.5 text-[15px] text-gray-600 leading-relaxed">{solution}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-10 text-center text-base sm:text-lg text-gray-700 max-w-2xl mx-auto">
              And every message, handoff, and payment is logged automatically —{' '}
              <span className="font-semibold text-[#1E3A4A]">court-ready the day you ever need it.</span>
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            HOW IT WORKS — 3 simple steps
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2
                className="text-3xl sm:text-5xl font-serif text-[#1E3A4A] mb-4"
                style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
              >
                How it <span className="text-[#3DAA8A]">works</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                From signup to peace of mind in three steps.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  icon: UserPlus,
                  title: 'Sign up free',
                  description:
                    'Create your account in 2 minutes. Invite your co-parent when you\'re ready — or start on your own.',
                  image: { alt: 'Parent signing up on phone', src: '/images/marketing/home1.png' },
                },
                {
                  step: '02',
                  icon: Settings,
                  title: 'Set it and forget it',
                  description:
                    'ARIA handles messaging tone. TimeBridge automates your schedule. ClearFund tracks expenses. Everything runs itself.',
                  image: { alt: 'Automated calendar with checkmarks', src: '/images/marketing/home2.png' },
                },
                {
                  step: '03',
                  icon: Smile,
                  title: 'Live your life',
                  description:
                    'Spend your energy on your kids, not on coordination. Everything is documented and court-ready if you ever need it.',
                  image: { alt: 'Parent relaxing with child', src: '/images/marketing/home3.png' },
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="text-center">
                    <div className="relative mb-6 mx-auto max-w-[280px]">
                      <Image
                        src={item.image.src}
                        alt={item.image.alt}
                        width={560}
                        height={420}
                        className="rounded-2xl object-cover w-full"
                      />
                      <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-[#1E3A4A] flex items-center justify-center text-white font-bold text-sm">
                        {item.step}
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-[var(--portal-primary)]/10 flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-6 w-6 text-[var(--portal-primary)]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#1E3A4A] mb-2">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            ARIA LIVE DEMO — interactive hook above the benefits
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white">
          <div className="max-w-6xl mx-auto px-6">
            <HomeARIADemo />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            CORE BENEFITS — outcome-first headline
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-[#F4F8F7] to-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2
                className="text-3xl sm:text-5xl font-serif text-[#1E3A4A] mb-4"
                style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
              >
                Fewer fights. Better handoffs. <span className="text-[#3DAA8A]">Happier kids.</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Tools that bring peace and structure to co-parenting &mdash; including features no other app offers.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Benefit 1: Schedules */}
              <div className="bg-white rounded-3xl p-8 border-2 border-[var(--portal-primary)]/10 hover:border-[var(--portal-primary)]/30 transition-all hover:shadow-lg group">
                <div className="h-16 w-16 rounded-2xl bg-[var(--portal-primary)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Calendar className="h-8 w-8 text-[var(--portal-primary)]" />
                </div>
                <h3 className="text-2xl font-semibold text-[#1E3A4A] mb-3">Schedules that run themselves</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Set your custody schedule once. TimeBridge automates recurring pickups, dropoffs, holidays, and reminders. No more &ldquo;did you forget?&rdquo; texts.
                </p>
                <p className="text-sm font-medium text-[var(--portal-primary)]">TimeBridge &mdash; Automated scheduling</p>
              </div>

              {/* Benefit 2: Finances */}
              <div className="bg-white rounded-3xl p-8 border-2 border-[#F5A623]/10 hover:border-[#F5A623]/30 transition-all hover:shadow-lg group">
                <div className="h-16 w-16 rounded-2xl bg-[#F5A623]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <DollarSign className="h-8 w-8 text-[#F5A623]" />
                </div>
                <h3 className="text-2xl font-semibold text-[#1E3A4A] mb-3">Money tracked, not argued</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Upload receipts, auto-split costs, and track every payment. ClearFund keeps finances transparent so money never becomes a weapon.
                </p>
                <p className="text-sm font-medium text-[#F5A623]">ClearFund &mdash; Expense tracking</p>
              </div>

              {/* Benefit 3: KidSpace — UNIQUE */}
              <div className="relative bg-white rounded-3xl p-8 border-2 border-[var(--portal-primary)]/10 hover:border-[var(--portal-primary)]/30 transition-all hover:shadow-lg group">
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#F5A623]/10 text-[#F5A623] text-xs font-bold rounded-full uppercase tracking-wide">
                    Only on CommonGround
                  </span>
                </div>
                <div className="h-16 w-16 rounded-2xl bg-[var(--portal-primary)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Video className="h-8 w-8 text-[var(--portal-primary)]" />
                </div>
                <h3 className="text-2xl font-semibold text-[#1E3A4A] mb-3">Call your kids directly</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  KidSpace gives your children their own space to video call, watch movies together, and stay connected with both parents &mdash; no coordinator needed.
                </p>
                <p className="text-sm font-medium text-[var(--portal-primary)]">KidSpace &mdash; Child-focused connection</p>
              </div>

              {/* Benefit 4: Silent Handoff — UNIQUE */}
              <div className="relative bg-white rounded-3xl p-8 border-2 border-[var(--portal-primary)]/10 hover:border-[var(--portal-primary)]/30 transition-all hover:shadow-lg group">
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#F5A623]/10 text-[#F5A623] text-xs font-bold rounded-full uppercase tracking-wide">
                    Only on CommonGround
                  </span>
                </div>
                <div className="h-16 w-16 rounded-2xl bg-[var(--portal-primary)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MapPin className="h-8 w-8 text-[var(--portal-primary)]" />
                </div>
                <h3 className="text-2xl font-semibold text-[#1E3A4A] mb-3">Exchanges without conflict</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Silent Handoff uses GPS verification and QR code check-ins for contactless custody exchanges. Zero interaction required. Everything documented.
                </p>
                <p className="text-sm font-medium text-[var(--portal-primary)]">Silent Handoff &mdash; GPS-verified exchanges</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            PRICING TEASER — 3-tier condensed cards
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#1E3A4A] mb-4"
                style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
              >
                Start free. <span className="text-[#3DAA8A]">Upgrade when ready.</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                Three tiers. No hidden fees. Parents pick what fits the week they&apos;re having.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {PRICING_TEASER_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative flex h-full flex-col rounded-2xl border p-6 lg:p-7 transition-all ${
                    tier.highlight
                      ? 'border-[#F5A623] shadow-md ring-1 ring-[#F5A623]/30 bg-gradient-to-br from-[#FEF7ED] to-white'
                      : 'border-gray-100 bg-white shadow-sm hover:border-[#3DAA8A]/30 hover:shadow-md'
                  }`}
                >
                  {tier.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F5A623] text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most popular
                    </span>
                  )}
                  <h3 className="font-serif text-xl text-[#1E3A4A]">{tier.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{tier.tagline}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-serif text-3xl sm:text-4xl text-[#1E3A4A]">{tier.price}</span>
                    <span className="text-sm text-gray-500">{tier.period}</span>
                  </div>
                  <ul className="mt-5 space-y-2 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="h-4 w-4 text-[#3DAA8A] mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/pricing"
                    className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                      tier.highlight
                        ? 'bg-[#1E3A4A] text-white hover:bg-[#13252F]'
                        : 'border-2 border-[#1E3A4A]/15 text-[#1E3A4A] hover:border-[#3DAA8A] hover:text-[#3DAA8A]'
                    }`}
                  >
                    See {tier.name} details
                  </Link>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 text-[var(--portal-primary)] font-medium hover:underline"
              >
                Compare every feature across plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            USE CASES — Who CommonGround is for
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2
                className="text-3xl sm:text-5xl font-serif text-[#1E3A4A] mb-4"
                style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
              >
                Built for every <span className="text-[#3DAA8A]">situation</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Parents navigating a new separation or years of conflict both find stability here.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Just separated',
                  description: 'You need structure and calm from day one.',
                  icon: UserPlus,
                  color: 'var(--portal-primary)',
                  features: [
                    'ARIA messaging to set the right tone early',
                    'Shared calendar for custody schedules',
                    'ClearFund to split costs without awkward conversations',
                  ],
                },
                {
                  title: 'High-conflict',
                  description: 'You need documentation and boundaries.',
                  icon: Shield,
                  color: '#F5A623',
                  features: [
                    'Silent Handoff for zero-contact exchanges',
                    'Court-ready evidence exports with SHA-256 verification',
                    'ARIA to de-escalate heated conversations',
                  ],
                },
                {
                  title: 'Long-distance',
                  description: 'You need to stay connected with your kids.',
                  icon: Phone,
                  color: 'var(--portal-primary)',
                  features: [
                    'KidSpace video calls — talk to your kids directly',
                    'TimeBridge for managing schedules across time zones',
                    'Shared activity logs so you never miss a moment',
                  ],
                },
              ].map((useCase) => {
                const Icon = useCase.icon;
                return (
                  <div
                    key={useCase.title}
                    className="bg-gradient-to-br from-[#F4F8F7] to-white rounded-3xl p-8 border-2 border-gray-100 hover:border-[var(--portal-primary)]/20 transition-all hover:shadow-lg"
                  >
                    <div
                      className="h-14 w-14 rounded-2xl flex items-center justify-center mb-6"
                      style={{ backgroundColor: `color-mix(in srgb, ${useCase.color} 10%, transparent)` }}
                    >
                      <Icon className="h-7 w-7" style={{ color: useCase.color }} />
                    </div>
                    <h3 className="text-xl font-semibold text-[#1E3A4A] mb-2">{useCase.title}</h3>
                    <p className="text-gray-600 mb-4">{useCase.description}</p>
                    <ul className="space-y-2">
                      {useCase.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-[var(--portal-primary)] mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SOCIAL PROOF — Real stories from 4Ever Forward grant
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--portal-primary)]/10 rounded-full mb-6">
                <Heart className="h-4 w-4 text-[var(--portal-primary)]" />
                <span className="text-sm font-medium text-[var(--portal-primary)]">4Ever Forward Foundation Grant Program</span>
              </div>
              <h2
                className="text-3xl sm:text-5xl font-serif text-[#1E3A4A] mb-4"
                style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
              >
                Real families. <span className="text-[#3DAA8A]">Real impact.</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Through a partnership with the 4Ever Forward Foundation, CommonGround helped families in high-conflict situations find peace.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-10">
              {[
                {
                  name: 'Marcus',
                  tagline: 'From hostile texts to movie nights',
                  quote: 'His son stopped asking "is Mom mad?" because the tension at handoffs had disappeared.',
                  icon: MessageCircle,
                },
                {
                  name: 'Diana',
                  tagline: 'From fear to focus',
                  quote: 'She could finally focus on her daughter instead of bracing for the next fight.',
                  icon: Heart,
                },
                {
                  name: 'The Rivera Family',
                  tagline: 'Structure where there was chaos',
                  quote: 'Their mediator called it a breakthrough after two years of conflict.',
                  icon: Users,
                },
              ].map((testimonial) => {
                const Icon = testimonial.icon;
                return (
                  <div
                    key={testimonial.name}
                    className="bg-gradient-to-br from-[#FEF7ED] to-white rounded-3xl p-8 border-2 border-[#F5A623]/10"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-[var(--portal-primary)]/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-[var(--portal-primary)]" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{testimonial.name}</p>
                        <p className="text-sm text-[#F5A623]">{testimonial.tagline}</p>
                      </div>
                    </div>
                    <Quote className="h-6 w-6 text-[#F5A623]/30 mb-2" />
                    <p className="text-gray-600 leading-relaxed italic">
                      {testimonial.quote}
                    </p>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            TRUST & SECURITY
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-16 bg-gradient-to-br from-[#E8F4F8] to-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4"
                style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
              >
                Built to protect what matters most
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Every feature is designed to keep your children&apos;s world stable.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 text-center">
                <div className="h-14 w-14 rounded-xl bg-[var(--portal-primary)]/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-7 w-7 text-[var(--portal-primary)]" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Encrypted &amp; Private</h3>
                <p className="text-sm text-gray-600">Bank-level security for all communications</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 text-center">
                <div className="h-14 w-14 rounded-xl bg-[#F5A623]/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-7 w-7 text-[#F5A623]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Court-Ready</h3>
                <p className="text-sm text-gray-600">SHA-256 verified exports when you need them</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 text-center">
                <div className="h-14 w-14 rounded-xl bg-[var(--portal-primary)]/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-7 w-7 text-[var(--portal-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Always Available</h3>
                <p className="text-sm text-gray-600">Access from phone, tablet, or desktop</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FAQSection />

        {/* ═══════════════════════════════════════════════════════════════
            SPLIT-FUNNEL CTA — Parents vs Firms
        ═══════════════════════════════════════════════════════════════ */}
        <section className="grid md:grid-cols-2">
          <CtaBand
            headline="Parents — start your family file"
            subheadline="Two minutes to sign up. Forever free to stay."
            primaryCta={{ label: 'Start free', href: '/parents' }}
            background="teal"
          />
          <CtaBand
            headline="Firms & mediators — book a demo"
            subheadline="See how CommonGround fits your cases in 15 minutes."
            primaryCta={{ label: 'Book a demo', href: '/demo' }}
            background="gold"
          />
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}

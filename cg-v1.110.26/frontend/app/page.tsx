import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { MarketingHeader } from '@/components/marketing';
import { JsonLd } from '@/components/marketing/json-ld';
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
  Scale,
  Phone,
  Zap,
} from 'lucide-react';

/* ── Client Islands ────────────────────────────────────────────────────
 * Only interactive pieces are loaded as client components.
 * The hero / LCP content renders on the server with zero JS needed.
 * ------------------------------------------------------------------- */

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

      <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#E8F4F8]">
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
            <div className="max-w-4xl mx-auto text-center">
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#1E3A4A] mb-6 leading-[1.05]"
                style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
              >
                The calm way to
                <br />
                <span className="text-[#3DAA8A]">co-parent</span>
              </h1>

              <p className="text-xl sm:text-2xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
                ARIA keeps conversations calm. Schedules run on autopilot. Your kids can video call you directly. Everything is documented
                <br />
                <span className="font-medium text-[var(--portal-primary)]">&mdash; so you have energy left to actually parent.</span>
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link
                  href="/early-access"
                  className="inline-flex items-center justify-center px-8 py-4 bg-[var(--portal-primary)] text-white font-semibold rounded-full hover:bg-[#2D8A70] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
                >
                  Start Free &mdash; Parents
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/professionals"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-[var(--portal-primary)] font-semibold rounded-full hover:bg-gray-50 transition-all border-2 border-[var(--portal-primary)]"
                >
                  For Professionals &mdash; Schedule a Demo
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[var(--portal-primary)]" />
                  Forever free tier
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[var(--portal-primary)]" />
                  No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[var(--portal-primary)]" />
                  Court-ready documentation
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[var(--portal-primary)]" />
                  Designed with family law professionals
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            TRUST BAR — Credibility at a glance
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-8 bg-white border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <Scale className="h-5 w-5 text-[var(--portal-primary)]" />
                <p className="text-sm font-medium text-[#1E3A4A]">Built with family law professionals</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Shield className="h-5 w-5 text-[var(--portal-primary)]" />
                <p className="text-sm font-medium text-[#1E3A4A]">Court-ready documentation</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Zap className="h-5 w-5 text-[#F5A623]" />
                <p className="text-sm font-medium text-[#1E3A4A]">Free forever tier &mdash; no ads</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Heart className="h-5 w-5 text-[var(--portal-primary)]" />
                <p className="text-sm font-medium text-[#1E3A4A]">4Ever Forward Foundation partner</p>
              </div>
            </div>
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
            CORE BENEFITS — 4-card grid with unique features highlighted
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-[#F4F8F7] to-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2
                className="text-3xl sm:text-5xl font-serif text-[#1E3A4A] mb-4"
                style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
              >
                Everything your <span className="text-[#3DAA8A]">family needs</span>
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
            ARIA MESSAGING — Chat mockup with explainer
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 mb-4">
                  <MessageCircle className="h-5 w-5 text-[#F5A623]" />
                  <span className="text-sm font-semibold text-[#F5A623] uppercase tracking-wide">
                    ARIA Messaging
                  </span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl font-serif mb-4"
                  style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
                >
                  AI helps you communicate with <span className="text-[#F5A623]">calm</span>
                </h2>
                <p className="text-lg text-white/80 mb-6 leading-relaxed">
                  ARIA doesn&apos;t rewrite your words or censor you. It gently highlights language that could be misread &mdash; so you can choose to rephrase before sending. You stay in control.
                </p>

                <div className="bg-white/10 rounded-xl p-4 mb-6 border border-white/10">
                  <p className="text-sm text-white/70 font-medium mb-2">How ARIA works:</p>
                  <ol className="text-sm text-white/60 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-[#F5A623] font-bold">1.</span> You draft your message
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#F5A623] font-bold">2.</span> ARIA flags language that could escalate
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#F5A623] font-bold">3.</span> You decide whether to adjust or send as-is
                    </li>
                  </ol>
                </div>

                <p className="text-white/60 italic text-sm">
                  Grant program parents reported calmer, more structured messaging after using ARIA.
                </p>
              </div>

              {/* Chat mockup */}
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
                <div className="bg-[#0b141a] rounded-2xl p-4 shadow-2xl">
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="relative max-w-[85%]">
                        <div className="bg-[#005c4b] text-white px-4 py-2.5 rounded-2xl rounded-br-md shadow-lg">
                          <p className="text-[15px] leading-relaxed">
                            You&apos;re always late. This is ridiculous.
                          </p>
                          <p className="text-[11px] text-white/50 text-right mt-1">Draft</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center my-2">
                      <div className="bg-[#F5A623] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                        ARIA Suggestion
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#F5A623]/30 to-[#F5A623]/10 rounded-2xl p-4 border border-[#F5A623]/40 shadow-lg mx-2">
                      <p className="text-[#F5A623] font-semibold text-sm mb-2">A calmer approach</p>
                      <p className="text-white/90 text-sm leading-relaxed">
                        This phrasing may feel like an attack. Consider focusing on the schedule so your children have a smoother transition.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
                          Rewrite
                        </button>
                        <button className="bg-white/10 hover:bg-white/20 text-white/70 text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
                          Send Anyway
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
                Whether you&apos;re navigating a new separation or managing years of conflict, CommonGround adapts to your needs.
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
            WHY COMMONGROUND — Comparison table
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-[#F4F8F7] to-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-5xl font-serif text-[#1E3A4A] mb-4"
                style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
              >
                Why families choose <span className="text-[#3DAA8A]">CommonGround</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Other co-parenting apps handle messaging and calendars. CommonGround goes further.
              </p>
            </div>

            {(() => {
              const comparisonRows = [
                { feature: 'AI messaging assistance', cg: true, others: 'Paid only' as const },
                { feature: 'Free tier with no ads', cg: true, others: 'Ads or limited' as const },
                { feature: 'Automated recurring schedules', cg: true, others: true as const },
                { feature: 'Expense tracking & splitting', cg: true, others: true as const },
                { feature: 'Court-ready exports (SHA-256)', cg: true, others: 'Basic exports' as const },
                { feature: 'Child video calls (KidSpace)', cg: true, others: false as const, unique: true },
                { feature: 'GPS-verified exchanges (Silent Handoff)', cg: true, others: false as const, unique: true },
                { feature: 'QR code check-in confirmation', cg: true, others: false as const, unique: true },
                { feature: 'Professional portal for attorneys', cg: true, others: true as const },
                { feature: 'Grant program for families in need', cg: true, others: 'Varies' as const },
              ];

              const renderOthers = (val: boolean | string) => {
                if (val === true) return <Check className="h-5 w-5 text-gray-600 mx-auto" />;
                if (val === false) return <span className="text-gray-300">&mdash;</span>;
                return <span className="text-gray-600 text-xs">{val}</span>;
              };

              return (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#1E3A4A] text-white">
                          <th className="text-left py-4 px-6 font-semibold">Feature</th>
                          <th className="text-center py-4 px-6 font-semibold text-[#F5A623]">CommonGround</th>
                          <th className="text-center py-4 px-6 font-semibold text-white/60">Other Apps</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {comparisonRows.map((row) => (
                          <tr key={row.feature} className={row.unique ? 'bg-[#F5A623]/5' : ''}>
                            <td className="py-3 px-6 text-gray-700">
                              {row.feature}
                              {row.unique && (
                                <span className="ml-2 text-xs font-bold text-[#F5A623] uppercase">Unique</span>
                              )}
                            </td>
                            <td className="py-3 px-6 text-center">
                              <Check className="h-5 w-5 text-[var(--portal-primary)] mx-auto" />
                            </td>
                            <td className="py-3 px-6 text-center">
                              {renderOthers(row.others)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {comparisonRows.map((row) => (
                      <div
                        key={row.feature}
                        className={`rounded-xl border p-4 ${row.unique ? 'border-[#F5A623]/30 bg-[#F5A623]/5' : 'border-gray-100 bg-white'}`}
                      >
                        <div className="font-medium text-gray-700 text-sm mb-3">
                          {row.feature}
                          {row.unique && (
                            <span className="ml-2 text-xs font-bold text-[#F5A623] uppercase">Unique</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center gap-2 rounded-lg bg-[var(--portal-primary)]/5 py-2 px-3">
                            <Check className="h-4 w-4 text-[var(--portal-primary)] shrink-0" />
                            <span className="font-medium text-[var(--portal-primary)]">CommonGround</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg bg-gray-50 py-2 px-3">
                            {row.others === true ? (
                              <Check className="h-4 w-4 text-gray-600 shrink-0" />
                            ) : row.others === false ? (
                              <span className="text-gray-300 text-base shrink-0">&mdash;</span>
                            ) : null}
                            <span className="text-gray-600">
                              {row.others === true ? 'Others' : row.others === false ? 'Not available' : row.others}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SOCIAL PROOF — Real testimonials from 4Ever Forward grant
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

            <div className="text-center">
              <Link
                href="/testimonials"
                className="inline-flex items-center gap-2 text-[var(--portal-primary)] font-medium hover:underline"
              >
                Read their full stories
                <ArrowRight className="h-4 w-4" />
              </Link>
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
            FINAL CTA
        ═══════════════════════════════════════════════════════════════ */}
        <section className="py-20 sm:py-28 bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2
              className="text-4xl sm:text-5xl font-serif mb-6"
              style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
            >
              Ready to find common ground?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Join families who&apos;ve found a calmer way to co-parent &mdash; one that puts children first.
            </p>
            <Link
              href="/early-access"
              className="inline-flex items-center justify-center px-10 py-5 bg-[#F5A623] text-white font-bold text-lg rounded-full hover:bg-[#E09520] transition-all shadow-2xl hover:shadow-3xl hover:-translate-y-1 group"
            >
              Start Free Today
              <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </Link>
            <p className="text-sm text-white/60 mt-6">
              Forever free tier for parents. No credit card required. Cancel anytime.
            </p>
            <p className="text-sm text-white/50 mt-3">
              Family law professional?{' '}
              <Link href="/professionals" className="text-[#F5A623] hover:underline">Schedule a demo for your practice</Link>.
            </p>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}

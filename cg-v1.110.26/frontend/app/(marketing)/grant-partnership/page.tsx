import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Calendar,
  Check,
  DollarSign,
  FileText,
  Handshake,
  Heart,
  Quote,
  Shield,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PartnershipInquiryForm } from '@/components/marketing/partnership-inquiry-form';
import { SectionTracker } from '@/components/marketing/analytics-tracker';

export const metadata = {
  title: 'Partner With Us | Bring CommonGround to Families You Serve',
  description:
    'Give the families you serve AI-powered co-parenting tools at zero cost. 25 free accounts, real-time outcomes dashboards, and grant-ready impact reports for your organization.',
};

export default function GrantPartnershipPage() {
  return (
    <div className="font-sans text-foreground bg-cg-sand">
      <SectionTracker page="grant-partnership" />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32"
        data-section="hero"
      >
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-cg-sage/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cg-amber/6 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <p className="text-cg-amber font-medium mb-5 tracking-widest uppercase text-xs flex items-center justify-center gap-3">
            <span className="w-8 h-px bg-cg-amber/40" />
            Community Partnership
            <span className="w-8 h-px bg-cg-amber/40" />
          </p>

          <h1
            className="text-4xl sm:text-5xl lg:text-[3.5rem] text-foreground mb-6 leading-[1.15]"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            The families you serve deserve{' '}
            <span className="text-cg-sage">calmer co-parenting.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-10">
            You already do the hard work of supporting families through
            separation, divorce, and custody. CommonGround gives them a tool
            that keeps working long after they leave your office — at zero cost
            to your organization.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#apply"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-200 hover:bg-cg-sage-dark hover:shadow-xl hover:-translate-y-0.5"
            >
              Become a Partner
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 border-2 border-cg-sage text-cg-sage font-medium px-8 py-4 rounded-full text-lg transition-all duration-200 hover:bg-cg-sage hover:text-white"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <div className="relative z-20 -mt-12 px-6" data-section="stats">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 gap-6 rounded-2xl bg-white p-8 shadow-xl lg:grid-cols-4 border border-gray-100">
            {[
              { value: '25', label: 'Free Accounts Per Partner' },
              { value: '180', label: 'Days of Full Access' },
              { value: '24/7', label: 'AI-Powered Support' },
              { value: '$0', label: 'Cost to Your Organization' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="mb-1 text-4xl font-bold text-cg-sage"
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── The Problem You Know ─────────────────────────────────── */}
      <section className="py-20 lg:py-28" data-section="problem">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              You&rsquo;ve seen what happens{' '}
              <span className="text-cg-sage">after families leave</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
              The families you work with make progress in your programs. But the
              co-parenting conflict follows them home — hostile texts, missed
              handoffs, children caught in the middle. CommonGround keeps the
              progress going.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                before: 'Families relapse into conflict after leaving your program',
                after: 'ARIA coaches every message, keeping communication constructive 24/7',
                icon: BrainCircuit,
              },
              {
                before: 'No way to measure long-term outcomes for grant reporting',
                after: 'Real-time dashboard tracks engagement, communication quality, and retention',
                icon: BarChart3,
              },
              {
                before: 'Limited staff bandwidth to provide ongoing support',
                after: 'AI handles the daily mediation — your team focuses on the families who need you most',
                icon: Users,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.before}
                  className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-cg-sage/10 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-cg-sage" />
                  </div>
                  <p className="text-gray-400 text-sm line-through mb-3">
                    {item.before}
                  </p>
                  <p className="text-foreground font-medium leading-relaxed">
                    {item.after}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Social Proof: Partners Already Doing This ────────────── */}
      <section className="py-16 lg:py-20 bg-white" data-section="social-proof">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Organizations already{' '}
              <span className="text-cg-sage">making it happen</span>
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Community partners across Southern California are bringing
              CommonGround to the families they serve.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                name: '4Ever Forward Foundation',
                tagline: 'Strong fathers. Safer families.',
                quote:
                  'CommonGround gave us a way to support fathers beyond our program walls. The families we serve now have tools that work 24/7 — not just during office hours.',
                image: '/assets/marketing/forever-forward-hero.png',
                href: '/foreverforward',
              },
              {
                name: 'Left Right 4 U',
                tagline: 'Recover. Refresh. Restore.',
                quote:
                  'Our mothers are dealing with cancer treatment, domestic violence, and co-parenting — all at once. CommonGround takes the communication conflict off their plate so they can focus on healing.',
                image: '/assets/marketing/lr4u_hero_nano_banana_1772567466304.png',
                href: '/leftright4u',
              },
            ].map((partner) => (
              <Link
                key={partner.name}
                href={partner.href}
                className="group block bg-cg-sand rounded-2xl overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={partner.image}
                    alt={partner.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                <div className="p-6">
                  <h3
                    className="text-lg text-foreground mb-0.5"
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                    }}
                  >
                    {partner.name}
                  </h3>
                  <p className="text-sm text-cg-sage font-medium mb-3">
                    {partner.tagline}
                  </p>
                  <div className="flex gap-2">
                    <Quote className="w-4 h-4 text-cg-sage/40 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600 text-sm italic leading-relaxed">
                      {partner.quote}
                    </p>
                  </div>
                  <p className="mt-4 text-cg-sage text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    See their story
                    <ArrowRight className="w-4 h-4" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── What Your Families Get ───────────────────────────────── */}
      <section className="py-20 lg:py-24" data-section="features">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              What your families{' '}
              <span className="text-cg-sage">get access to</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Every family receives our Complete tier — the same tools used by
              attorneys, mediators, and court systems. Six months, fully funded.
            </p>
          </div>

          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BrainCircuit,
                title: 'ARIA AI Coaching',
                desc: 'Every message gets real-time coaching to keep conversations constructive and child-focused',
              },
              {
                icon: Users,
                title: 'Secure Messaging',
                desc: 'Court-documented, threaded conversations that replace hostile texts',
              },
              {
                icon: Calendar,
                title: 'Custody Calendar',
                desc: 'Shared schedules, exchange coordination, and GPS handoff verification',
              },
              {
                icon: DollarSign,
                title: 'Expense Tracking',
                desc: 'Split child-related costs with receipts, approvals, and zero-fee payments',
              },
              {
                icon: FileText,
                title: 'Agreement Builder',
                desc: 'Digital parenting plans that both parents can build and approve together',
              },
              {
                icon: Shield,
                title: 'Court-Ready Records',
                desc: 'SHA-256 verified documentation accepted in all 50 states',
              },
              {
                icon: Heart,
                title: 'KidSpace',
                desc: 'Age-appropriate messaging that keeps children connected but out of adult conflict',
              },
              {
                icon: BarChart3,
                title: 'Analytics Dashboard',
                desc: 'Track communication patterns, compliance, and conflict trends over time',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-cg-sage border border-gray-100">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4
                      className="mb-1.5 text-lg font-semibold text-foreground"
                      style={{
                        fontFamily: "'DM Serif Display', Georgia, serif",
                      }}
                    >
                      {item.title}
                    </h4>
                    <p className="text-sm leading-relaxed text-gray-600">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Value callout */}
          <div className="mt-14 bg-gradient-to-r from-cg-amber to-cg-amber-dark rounded-2xl p-8 lg:p-10 text-center text-white shadow-lg">
            <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-2">
              Total Partnership Value
            </p>
            <div
              className="text-5xl lg:text-6xl font-bold mb-3"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              $5,249
            </div>
            <p className="text-white/90 max-w-lg mx-auto">
              Complete tier ($34.99/mo &times; 6 months) &times; 25 families —
              provided free to your organization.
            </p>
          </div>
        </div>
      </section>

      {/* ── What You Get (Org Benefits) ──────────────────────────── */}
      <section
        className="py-20 lg:py-24 bg-white"
        data-section="org-benefits"
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              What your organization{' '}
              <span className="text-cg-sage">gets</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              This isn&rsquo;t just a tool for families. It&rsquo;s
              infrastructure for proving and scaling your impact.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Handshake,
                title: 'Co-Branded Experience',
                desc: 'Families access CommonGround through a custom landing page with your logo, colors, and mission. It feels like your program — because it is.',
              },
              {
                icon: BarChart3,
                title: 'Grant-Ready Reports',
                desc: 'One-click impact reports showing activation rates, communication improvement, retention, and satisfaction — the numbers funders want to see.',
              },
              {
                icon: TrendingUp,
                title: 'Scalable Impact',
                desc: 'Serve 10x more families without adding staff. Our AI handles the daily coaching while your team focuses on the work only humans can do.',
              },
              {
                icon: Star,
                title: '24/7 Ongoing Support',
                desc: 'Your families get help at 2am on a Sunday — when a hostile text comes in and there\u2019s nobody to call. ARIA is always there.',
              },
              {
                icon: Shield,
                title: 'Privacy Protected',
                desc: 'All family data is anonymized before your organization sees it. We handle the security so you can focus on outcomes.',
              },
              {
                icon: Users,
                title: 'Training & Onboarding',
                desc: 'We train your staff, provide orientation materials for families, and give you a dedicated point of contact throughout the partnership.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group bg-cg-sand rounded-2xl p-8 border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-white"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-cg-sage/10 text-cg-sage group-hover:bg-cg-sage group-hover:text-white transition-all duration-300">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3
                    className="mb-3 text-xl text-foreground"
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Measurable Outcomes ───────────────────────────────────── */}
      <section
        className="py-20 lg:py-24 bg-gradient-to-br from-foreground to-cg-slate text-white relative overflow-hidden"
        data-section="outcomes"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cg-amber/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-white mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              The numbers your funders want to see
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto text-lg">
              Every metric is tracked automatically. No surveys. No manual
              reporting. Just real data from real families.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Activation Rate',
                desc: 'How many families activated their codes and started using the platform — proving engagement from day one.',
              },
              {
                title: 'Communication Quality',
                desc: 'Percentage increase in constructive messaging over time — behavioral change you can point to.',
              },
              {
                title: 'Sustained Engagement',
                desc: '30-day and 90-day retention showing families continue benefiting long after your program ends.',
              },
              {
                title: 'Legal Fee Savings',
                desc: 'Estimated legal costs prevented through better communication and documentation.',
              },
              {
                title: 'Feature Utilization',
                desc: 'Which tools families use most — schedules, expenses, agreements — showing comprehensive adoption.',
              },
              {
                title: 'Family Satisfaction',
                desc: 'Net Promoter Scores and anonymized feedback demonstrating quality of life improvement.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition-all hover:bg-white/10"
              >
                <h4
                  className="mb-2 text-xl text-cg-amber"
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                  }}
                >
                  {item.title}
                </h4>
                <p className="leading-relaxed text-white/75 text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="py-20 lg:py-24 bg-white"
        data-section="process"
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              From inquiry to{' '}
              <span className="text-cg-sage">active partnership</span>
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto text-lg">
              Most partners are live within 3 weeks.
            </p>
          </div>

          <div className="relative grid gap-8 md:grid-cols-5">
            {/* Connecting line */}
            <div className="absolute left-0 top-10 hidden h-0.5 w-full bg-gray-100 md:block" />

            {[
              {
                num: '1',
                title: 'Inquiry',
                desc: 'Fill out the form below. Tell us about your organization and the families you serve.',
              },
              {
                num: '2',
                title: 'Discovery Call',
                desc: '30-minute conversation to ensure mutual fit and answer your questions.',
              },
              {
                num: '3',
                title: 'Custom Setup',
                desc: 'We build your co-branded landing page and generate your grant codes.',
              },
              {
                num: '4',
                title: 'Staff Training',
                desc: '45-minute training session plus materials for orienting your families.',
              },
              {
                num: '5',
                title: 'Launch',
                desc: 'Start distributing codes. Watch your dashboard light up with impact.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="relative z-10 text-center bg-white md:bg-transparent p-6 md:p-0 rounded-xl border md:border-0 border-gray-100 shadow-sm md:shadow-none"
              >
                <div
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cg-sage to-[#2C5F5D] text-2xl font-bold text-white shadow-lg shadow-cg-sage/20"
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                  }}
                >
                  {step.num}
                </div>
                <h4
                  className="mb-2 text-lg font-semibold text-cg-sage"
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                  }}
                >
                  {step.title}
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Partnership Requirements ─────────────────────────────── */}
      <section className="py-16 lg:py-20" data-section="requirements">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* What we ask */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <h3
                className="mb-6 pb-4 border-b-2 border-cg-sage/20 text-2xl text-foreground"
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                }}
              >
                What we ask of you
              </h3>
              <ul className="space-y-4">
                {[
                  'Distribute grant codes to families in your program',
                  'Run a 15-minute orientation for new families',
                  'Include CommonGround in your program materials',
                  'Share anonymized success stories (optional)',
                  'Provide feedback so we can keep improving',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cg-sage/10 text-cg-sage">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What you get */}
            <div className="bg-gradient-to-br from-cg-sage to-[#2C5F5D] rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full" />
              <h3
                className="relative mb-6 pb-4 border-b-2 border-white/20 text-2xl"
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                }}
              >
                What you get
              </h3>
              <ul className="relative space-y-4">
                {[
                  '25 Complete tier accounts (6 months each)',
                  'Co-branded landing page with your identity',
                  'Real-time outcomes dashboard',
                  'One-click grant-ready impact reports',
                  'Staff training and ongoing support',
                  'Priority customer support for your families',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-white/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA: Partnership Inquiry Form ────────────────────────── */}
      <section
        id="apply"
        className="py-20 lg:py-24 bg-white"
        data-section="apply"
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: Copy */}
            <div className="lg:sticky lg:top-24">
              <p className="text-cg-amber font-medium mb-4 tracking-widest uppercase text-xs flex items-center gap-3">
                <span className="w-8 h-px bg-cg-amber/40" />
                Get Started
              </p>
              <h2
                className="text-3xl sm:text-4xl text-foreground mb-5 leading-tight"
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                }}
              >
                Start the conversation.{' '}
                <span className="text-cg-sage">No commitment required.</span>
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Tell us about your organization and the families you serve.
                We&rsquo;ll schedule a discovery call to explore whether the
                partnership is a fit — and show you exactly what your families
                would experience.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cg-sage/10">
                    <Check className="h-5 w-5 text-cg-sage" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Zero cost, zero risk
                    </p>
                    <p className="text-sm text-gray-500">
                      The entire partnership is funded. Your organization pays
                      nothing.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cg-sage/10">
                    <Check className="h-5 w-5 text-cg-sage" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Live in 3 weeks
                    </p>
                    <p className="text-sm text-gray-500">
                      From first call to families using the platform — most
                      partners launch in under a month.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cg-sage/10">
                    <Check className="h-5 w-5 text-cg-sage" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Impact you can prove
                    </p>
                    <p className="text-sm text-gray-500">
                      Grant-ready reports generated automatically. No surveys,
                      no manual tracking.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-8 text-sm text-gray-400">
                Prefer email?{' '}
                <a
                  href="mailto:partnerships@find-commonground.com"
                  className="text-cg-sage underline"
                >
                  partnerships@find-commonground.com
                </a>
              </p>
            </div>

            {/* Right: Form */}
            <div className="rounded-2xl border-2 border-cg-sage/20 bg-gradient-to-b from-cg-sage/[0.03] to-transparent p-6 sm:p-8">
              <PartnershipInquiryForm source="grant_partnership_page" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Final Nudge ──────────────────────────────────────────── */}
      <section className="py-16 border-t border-gray-200" data-section="final-cta">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-lg leading-relaxed">
            Every family your organization connects with CommonGround is a
            family with calmer conversations, fewer court appearances, and
            children who are no longer caught in the middle.
          </p>
          <Link
            href="#apply"
            className="inline-flex items-center gap-2 text-cg-sage font-medium mt-4 hover:underline"
          >
            Become a partner
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

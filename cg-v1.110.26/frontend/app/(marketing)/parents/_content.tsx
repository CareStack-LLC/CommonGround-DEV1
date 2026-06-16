'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Shield,
  DollarSign,
  Calendar,
  MessageSquare,
  Heart,
  FileCheck,
  ArrowRight,
  Check,
  Sparkles,
  Video,
  MapPin,
} from 'lucide-react';
import {
  FeatureGrid,
  ComparisonTable,
  FaqJsonLd,
} from '@/components/marketing';

/* ── Features: 6 items rendered via FeatureGrid (columns=3) ─────── */
const PARENT_FEATURES = [
  {
    icon: MessageSquare,
    title: 'ARIA AI mediation',
    description:
      'Calm-tone coaching before you hit send. ARIA flags what could read as hostile so your words land the way you meant them.',
  },
  {
    icon: MapPin,
    title: 'Silent Handoff GPS exchanges',
    description:
      'Contactless custody exchanges confirmed by GPS and QR check-in. Zero interaction at the curb. Everything logged.',
  },
  {
    icon: Video,
    title: 'KidSpace video + messaging',
    description:
      "Your child's own space to video call and message you directly — safe, monitored, and free of grown-up conflict.",
  },
  {
    icon: FileCheck,
    title: 'Court-ready exports',
    description:
      'One-click SHA-256 verified bundles of messages, schedules, and expenses, formatted for family-law proceedings.',
  },
  {
    icon: Calendar,
    title: 'Unified calendar',
    description:
      'Custody, school, and activities in one shared view. Automatic reminders so nobody misses a pickup.',
  },
  {
    icon: DollarSign,
    title: 'ClearFund shared expenses',
    description:
      'Upload a receipt, split by custody percentage, see every payment — no more fighting about who paid what.',
  },
];

/* ── Before / after comparison (string cells, not booleans) ─────── */
const BEFORE_AFTER_ROWS = [
  {
    feature: 'Message tone',
    ours: 'Calm, ARIA-reviewed before sending',
    theirs: 'Heated texts that end up in court',
  },
  {
    feature: 'Handoff clarity',
    ours: 'GPS + QR confirmed, contactless',
    theirs: 'Parking-lot arguments, missed pickups',
  },
  {
    feature: 'Expense splits',
    ours: 'Auto-split by custody %, tracked',
    theirs: 'Spreadsheets, screenshots, disputes',
  },
  {
    feature: 'Court prep time',
    ours: 'One-click SHA-256 export package',
    theirs: 'Weeks reconstructing evidence',
  },
  {
    feature: "Child's experience",
    ours: 'KidSpace — their own calm corner',
    theirs: 'Caught between two worlds',
  },
];

/* ── Parents FAQ items (shared by visual + JSON-LD) ─────────────── */
const PARENTS_FAQ_ITEMS = [
  {
    question: 'Is CommonGround safe for high-conflict custody?',
    answer:
      'Yes. ARIA coaches messages before they send, Silent Handoff enables contactless GPS-verified exchanges, and every record is tamper-proof for court.',
  },
  {
    question: 'Do both parents need to sign up?',
    answer:
      'No. You can document exchanges, expenses, and messages on your own. When your co-parent joins, everything syncs retroactively.',
  },
  {
    question: 'How does ARIA actually help?',
    answer:
      'ARIA reviews your draft for tone that could be misread as hostile or dismissive. You decide whether to accept, modify, or send as-is — ARIA never rewrites for you.',
  },
  {
    question: 'Will the records hold up in court?',
    answer:
      'Every message, schedule change, and expense is timestamped and SHA-256 verified. Exports are formatted for family-law proceedings.',
  },
];

export function ParentsContent() {
  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      <FaqJsonLd items={PARENTS_FAQ_ITEMS} />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Organic background shape */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-[40%] -right-[20%] w-[800px] h-[800px] rounded-full opacity-[0.03]"
            style={{
              background: 'radial-gradient(circle, #3DAA8A 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-24 lg:pt-32 lg:pb-32">
          <div className="grid items-center gap-10 lg:gap-14 lg:grid-cols-2">
            {/* Left: Hero content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3DAA8A]/5 border border-[#3DAA8A]/10">
                <Sparkles className="w-4 h-4 text-[#3DAA8A]" />
                <span className="text-sm font-medium text-[#3DAA8A]">Trusted by 10,000+ families</span>
              </div>

              <h1 className="font-serif text-[#1E3A4A] text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight">
                Peaceful co-parenting,
                <br />
                <span className="text-[#3DAA8A]">finally made simple</span>
              </h1>

              <p className="text-lg sm:text-xl text-[#4b5563] leading-relaxed max-w-xl mx-auto lg:mx-0">
                Keep every message calm, every exchange documented, and every expense fair — so your kids get the stability they deserve.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                <Link
                  href="/early-access"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#3DAA8A] text-white text-lg font-semibold rounded-xl hover:bg-[#2E9577] transition-all hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#3DAA8A] text-lg font-semibold rounded-xl border-2 border-[#3DAA8A]/20 hover:border-[#3DAA8A] transition-all"
                >
                  Watch Demo
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-gray-600">
                {['Free forever tier', 'No credit card', 'Court-ready records', "Works even if they won't join"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#3DAA8A]" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Hero image */}
            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <Image
                src="/images/marketing/cg_parents_coparents.jpg"
                alt="Two co-parents standing together calmly with their child at a youth soccer field"
                width={1200}
                height={800}
                priority
                className="w-full h-auto rounded-3xl shadow-xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[#1E3A4A] mb-4 leading-tight tracking-tight">
              You shouldn&apos;t have to dread
              <br />
              <span className="text-[#3DAA8A]">every message</span>
            </h2>
            <p className="text-lg sm:text-xl text-[#6b7280] max-w-2xl mx-auto">
              Parents deserve peace of mind — not more stress. Each problem below maps to a tool built to remove it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: MessageSquare,
                problem: '"Every message feels stressful"',
                solution: 'ARIA supports calm, child-focused communication',
                color: '#F5A623',
              },
              {
                icon: DollarSign,
                problem: '"I can\'t keep track of who owes what"',
                solution: 'ClearFund tracks every dollar, automatically',
                color: '#3DAA8A',
              },
              {
                icon: FileCheck,
                problem: '"I have no proof for court"',
                solution: 'Everything documented, court-ready, uneditable',
                color: '#2D6A8F',
              },
            ].map((item, i) => (
              <div key={i} className="space-y-6">
                {/* Icon */}
                <div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <item.icon className="w-8 h-8" style={{ color: item.color }} />
                </div>

                {/* Problem */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-[#6b7280] uppercase tracking-wide">
                    The Problem
                  </div>
                  <div className="text-xl font-serif text-[#1E3A4A] italic">
                    {item.problem}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center">
                  <div className="flex-1 h-px bg-gradient-to-r from-[#e5e7eb] to-transparent" />
                  <ArrowRight className="w-5 h-5 text-[#3DAA8A] mx-2" />
                  <div className="flex-1 h-px bg-gradient-to-l from-[#e5e7eb] to-transparent" />
                </div>

                {/* Solution */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: item.color }}>
                    The Solution
                  </div>
                  <div className="text-lg text-[#374151] font-medium leading-snug">
                    {item.solution}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features — FeatureGrid columns=3 */}
      <section className="bg-[#F4F8F7]">
        <FeatureGrid
          columns={3}
          heading="Six tools. One calmer family."
          subheading="Parents pick whichever solves today's problem — ARIA for the message, ClearFund for the bill, Silent Handoff for the curbside exchange."
          features={PARENT_FEATURES}
        />
      </section>

      {/* Life Before vs After — descriptive comparison */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[#1E3A4A] mb-4 leading-tight tracking-tight">
              Life before vs. <span className="text-[#3DAA8A]">life with CommonGround</span>
            </h2>
            <p className="text-lg text-[#6b7280] max-w-2xl mx-auto">
              Parents describe the shift more than any single feature.
            </p>
          </div>
          <ComparisonTable
            ourProduct="With CommonGround"
            competitor="Before CommonGround"
            rows={BEFORE_AFTER_ROWS}
          />
        </div>
      </section>

      {/* Social Proof / Stats Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-[#3DAA8A] to-[#2E9577] text-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif mb-4 leading-tight tracking-tight">
              Join thousands of parents
              <br />
              finding peace
            </h2>
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
              Parents get stability, structure, and focus on their kids.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: '87%', label: 'Calmer communication', subtext: 'ARIA supports constructive messaging' },
              { value: '10,000+', label: 'Families protected', subtext: 'Growing every day' },
              { value: '$2.4M', label: 'Expenses tracked', subtext: 'Fair & transparent' },
              { value: '99.4%', label: 'Exchange success rate', subtext: 'GPS verified' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-serif font-bold mb-2">{stat.value}</div>
                <div className="text-lg font-semibold mb-1">{stat.label}</div>
                <div className="text-sm text-white/60">{stat.subtext}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="bg-[#F4F8F7] rounded-3xl p-8 sm:p-12 border border-gray-100">
            <div className="flex items-start gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className="w-6 h-6 text-[#F5A623] fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <blockquote className="text-xl sm:text-2xl font-serif text-[#1E3A4A] mb-6 leading-relaxed">
              CommonGround gave us structure when everything felt chaotic. The automated
              schedule means neither of us can &ldquo;forget&rdquo; anymore — and our
              daughter stopped getting caught in the middle.
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-[#3DAA8A]" />
              </div>
              <div>
                <div className="font-semibold text-[#1E3A4A]">The Rivera Family</div>
                <div className="text-sm text-[#6b7280]">4Ever Forward Foundation Grant Program</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — Parents */}
      <section className="py-16 lg:py-24 bg-[#F4F8F7]">
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <h2 className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-10 text-center leading-tight tracking-tight">
            Questions parents ask
          </h2>
          <div className="space-y-4">
            {PARENTS_FAQ_ITEMS.map((faq) => (
              <details key={faq.question} className="group bg-white rounded-xl p-6 border border-[#e5e7eb]">
                <summary className="cursor-pointer list-none flex items-center justify-between font-medium text-[#1E3A4A]">
                  {faq.question}
                  <span className="text-[#6b7280] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-[#4b5563] leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-link to For Moms / For Dads */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            <Link
              href="/for-moms"
              className="group rounded-2xl border-2 border-[#e5e7eb] p-6 sm:p-8 bg-gradient-to-br from-[#F4F8F7] to-white hover:border-[#3DAA8A]/40 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-3">
                <Shield className="h-6 w-6 text-[#3DAA8A]" />
                <h3 className="font-serif text-xl sm:text-2xl text-[#1E3A4A]">For moms</h3>
              </div>
              <p className="text-[#4b5563] mb-3 leading-relaxed">
                Mothers navigating custody get the calm tools, documented exchanges, and kid-first workflows made for their reality.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#3DAA8A] group-hover:underline">
                See the moms&apos; guide
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link
              href="/for-dads"
              className="group rounded-2xl border-2 border-[#e5e7eb] p-6 sm:p-8 bg-gradient-to-br from-[#FEF7ED] to-white hover:border-[#F5A623]/40 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-3">
                <Shield className="h-6 w-6 text-[#F5A623]" />
                <h3 className="font-serif text-xl sm:text-2xl text-[#1E3A4A]">For dads</h3>
              </div>
              <p className="text-[#4b5563] mb-3 leading-relaxed">
                Fathers get tools that prove parenting time, keep communication even-toned, and document every handoff.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#F5A623] group-hover:underline">
                See the dads&apos; guide
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-32 bg-[#F4F8F7]">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-[#1E3A4A] mb-6 leading-tight tracking-tight">
            Ready to reclaim
            <br />
            <span className="text-[#3DAA8A]">your peace?</span>
          </h2>
          <p className="text-lg sm:text-xl text-[#6b7280] mb-10 max-w-2xl mx-auto">
            Parents who chose a calmer path started here — free trial, no credit card.
          </p>

          <Link
            href="/early-access"
            className="group inline-flex items-center justify-center gap-3 px-12 py-5 bg-[#3DAA8A] text-white text-xl font-semibold rounded-2xl hover:bg-[#2E9577] transition-all hover:scale-105 shadow-2xl hover:shadow-3xl"
          >
            Start Your Free Trial
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>

          <p className="mt-6 text-sm text-[#6b7280]">
            Questions? <Link href="/help/contact" className="text-[#3DAA8A] hover:underline">Contact us</Link> • Takes 2 minutes to set up
          </p>
        </div>
      </section>
    </div>
  );
}

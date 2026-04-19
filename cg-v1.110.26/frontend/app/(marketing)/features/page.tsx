import Link from 'next/link';
import { JsonLd } from '@/components/marketing/json-ld';
import {
  FeatureGrid,
  SectionHeading,
  FaqJsonLd,
} from '@/components/marketing';
import type { FeatureGridItem } from '@/components/marketing/primitives/feature-grid';
import {
  MessageSquare,
  Calendar,
  DollarSign,
  Video,
  MapPin,
  Clock,
  FileCheck,
  Shield,
  Bell,
  CheckCircle,
  ArrowRight,
  Sparkles,
  BookOpen,
  Lock,
  Hash,
} from 'lucide-react';

/* ── Category feature sets ─────────────────────────────────────── */

const AI_FEATURES: FeatureGridItem[] = [
  {
    icon: MessageSquare,
    title: 'ARIA message coaching',
    description:
      'Parents see how their words could land before hitting send. ARIA flags hostility or blame and suggests calmer phrasing — you choose whether to use it.',
  },
  {
    icon: Sparkles,
    title: 'ARIA agreement assistant',
    description:
      'Guided prompts help parents draft custody agreements section by section, with neutral, kid-first language.',
  },
];

const SCHEDULING_FEATURES: FeatureGridItem[] = [
  {
    icon: Calendar,
    title: 'TimeBridge automated schedules',
    description:
      'Set custody once. Pickups, dropoffs, holidays, and reminders run on autopilot for both parents.',
  },
  {
    icon: Bell,
    title: 'Smart reminders',
    description:
      'Parents and kids get gentle nudges before every event, so nobody is ambushed by a 6 PM Friday handoff.',
  },
  {
    icon: Clock,
    title: 'Custody time tracking',
    description:
      'Every overnight and every hour logged automatically — visual charts and reports for attorneys or the court.',
  },
];

const MONEY_FEATURES: FeatureGridItem[] = [
  {
    icon: DollarSign,
    title: 'ClearFund shared expenses',
    description:
      'Parents upload a receipt, split by custody percentage, and track every payment. No more "I already paid for that."',
    accent: 'gold',
  },
  {
    icon: FileCheck,
    title: 'Clear payment records',
    description:
      'Every submission, approval, and transfer is timestamped and exportable — ready for court or mediation.',
    accent: 'gold',
  },
];

const CHILD_FEATURES: FeatureGridItem[] = [
  {
    icon: Video,
    title: 'KidSpace video calls',
    description:
      "Your child's own space to call you directly — no middleman, no middle-of-an-argument timing.",
  },
  {
    icon: BookOpen,
    title: 'KidSpace activities',
    description:
      "Read a story or watch a movie together across households. Stay connected even when you're not in the same room.",
  },
];

const COMPLIANCE_FEATURES: FeatureGridItem[] = [
  {
    icon: MapPin,
    title: 'Silent Handoff GPS exchanges',
    description:
      'Drop off at a public location. GPS confirms arrival. QR code confirms pickup. Zero interaction required.',
    accent: 'gold',
  },
  {
    icon: Hash,
    title: 'SHA-256 verified exports',
    description:
      'One-click court-ready evidence bundles with tamper-proof hashing — the strongest integrity standard in any co-parenting app.',
  },
  {
    icon: Lock,
    title: 'Uneditable audit trails',
    description:
      'Every message, schedule change, and payment is locked and timestamped. Records you can rely on years later.',
  },
];

/* ── Hero trust pills ──────────────────────────────────────────── */
const trustPoints = [
  { icon: Shield, text: 'Bank-level encryption' },
  { icon: Bell, text: 'Automated reminders' },
  { icon: CheckCircle, text: 'Court-admissible records' },
];

/* ── Features FAQ (shared by JSON-LD + visual) ─────────────────── */
const FEATURES_FAQ_ITEMS = [
  {
    question: 'Does ARIA rewrite my messages?',
    answer:
      'No. ARIA highlights language that could be misread and offers alternatives. You stay in control of every send — accept, modify, or send as-is.',
  },
  {
    question: 'What makes Silent Handoff different from a regular check-in?',
    answer:
      'Silent Handoff combines GPS location verification with QR-code confirmation, so both parents have tamper-proof proof of pickup and drop-off without any face-to-face contact.',
  },
  {
    question: 'Can my child use KidSpace on their own phone?',
    answer:
      'Yes — KidSpace is designed for direct child access with both parents, in a safe monitored environment built for kids rather than grown-up conflict.',
  },
  {
    question: 'Are exports really accepted in court?',
    answer:
      'CommonGround exports are formatted for family-law proceedings and carry SHA-256 hash verification so any edits after export are detectable.',
  },
];

/* ── Anchor sub-nav config ─────────────────────────────────────── */
const SUB_NAV = [
  { id: 'aria', label: 'ARIA' },
  { id: 'kidspace', label: 'KidSpace' },
  { id: 'safe-handoff', label: 'Silent Handoff' },
  { id: 'clearfund', label: 'ClearFund' },
  { id: 'timebridge', label: 'TimeBridge' },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'CommonGround',
          applicationCategory: 'LifestyleApplication',
          featureList: [
            'ARIA AI Messaging',
            'TimeBridge Automated Scheduling',
            'ClearFund Expense Tracking',
            'KidSpace Video Calls',
            'Silent Handoff GPS Exchanges',
            'Court-Ready Evidence Exports',
            'Custody Analytics',
          ],
        }}
      />
      <FaqJsonLd items={FEATURES_FAQ_ITEMS} />

      {/* Hero */}
      <section className="relative pt-16 pb-10 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--portal-primary)] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#F5A623] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-[#1E3A4A] text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight mb-6">
            Every feature solves
            <br />
            <span className="text-[var(--portal-primary)]">one problem</span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
            Parents get less coordination, more peace of mind, and more automation.{' '}
            <span className="font-medium text-[#F5A623]">
              No forced mediation. No relationship coaching. Just structured tools that bring calm.
            </span>
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            {trustPoints.map((point) => {
              const Icon = point.icon;
              return (
                <div
                  key={point.text}
                  className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full backdrop-blur-sm"
                >
                  <Icon className="w-4 h-4 text-[var(--portal-primary)]" />
                  <span>{point.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Anchored sub-nav */}
      <nav
        aria-label="Feature categories"
        className="sticky top-16 z-10 bg-white/90 backdrop-blur border-y border-gray-100"
      >
        <div className="max-w-5xl mx-auto px-6 py-3 overflow-x-auto">
          <ul className="flex flex-nowrap gap-3 sm:gap-6 text-sm font-medium whitespace-nowrap">
            {SUB_NAV.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  className="text-[#1E3A4A]/70 hover:text-[var(--portal-primary)] transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* AI — ARIA */}
      <section id="aria" className="scroll-mt-24 bg-white">
        <div className="max-w-7xl mx-auto pt-12 pb-2 px-6">
          <SectionHeading
            eyebrow="AI"
            title="ARIA keeps conversations calm"
            description="Parents and kids both benefit when tone is steady. ARIA helps you hear yourself before the other parent does."
          />
        </div>
        <FeatureGrid columns={2} features={AI_FEATURES} />
      </section>

      {/* Child-facing — KidSpace */}
      <section id="kidspace" className="scroll-mt-24 bg-[#F4F8F7]">
        <div className="max-w-7xl mx-auto pt-12 pb-2 px-6">
          <SectionHeading
            eyebrow="Child-facing"
            title="KidSpace puts kids first"
            description="Children get a calm corner for video calls, stories, and movies — independent of grown-up conflict."
          />
        </div>
        <FeatureGrid columns={2} features={CHILD_FEATURES} />
      </section>

      {/* Compliance — Silent Handoff */}
      <section id="safe-handoff" className="scroll-mt-24 bg-white">
        <div className="max-w-7xl mx-auto pt-12 pb-2 px-6">
          <SectionHeading
            eyebrow="Compliance"
            title="Silent Handoff and court-ready evidence"
            description="Parents get verified proof of every exchange and tamper-proof bundles when the court asks."
          />
        </div>
        <FeatureGrid columns={3} features={COMPLIANCE_FEATURES} />
      </section>

      {/* Money — ClearFund */}
      <section id="clearfund" className="scroll-mt-24 bg-[#F4F8F7]">
        <div className="max-w-7xl mx-auto pt-12 pb-2 px-6">
          <SectionHeading
            eyebrow="Money"
            title="ClearFund makes dollars boring again"
            description="Expenses get split, tracked, and documented — money stops being a weapon."
          />
        </div>
        <FeatureGrid columns={2} features={MONEY_FEATURES} />
      </section>

      {/* Scheduling — TimeBridge */}
      <section id="timebridge" className="scroll-mt-24 bg-white">
        <div className="max-w-7xl mx-auto pt-12 pb-2 px-6">
          <SectionHeading
            eyebrow="Scheduling"
            title="TimeBridge runs the calendar so parents don't have to"
            description="Recurring pickups, holiday rotations, and reminders happen without anyone chasing anyone."
          />
        </div>
        <FeatureGrid columns={3} features={SCHEDULING_FEATURES} />
      </section>

      {/* Philosophy */}
      <section className="py-20 px-6 bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#F5A623] rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif mb-6 leading-tight tracking-tight">
            The less you have to coordinate,
            <br />
            <span className="text-[#F5A623]">the more peace your family has</span>
          </h2>
          <p className="text-lg sm:text-xl text-white/80 mb-8 leading-relaxed max-w-2xl mx-auto">
            Parents focus on being parents. Schedules run themselves. Money tracks itself. The kids stay connected.
          </p>
          <p className="text-base sm:text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
            Everything you need. Nothing you don&apos;t. No forced mediation. No relationship coaching. Just structured tools that bring calm to your family.
          </p>
        </div>
      </section>

      {/* Features FAQ — visual list paired with JSON-LD above */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <SectionHeading
            title="Feature questions parents ask"
            align="center"
            className="mx-auto mb-10"
          />
          <div className="space-y-4">
            {FEATURES_FAQ_ITEMS.map((faq) => (
              <details key={faq.question} className="group bg-gray-50 rounded-xl p-6">
                <summary className="cursor-pointer list-none flex items-center justify-between font-medium text-[#1E3A4A]">
                  {faq.question}
                  <span className="text-gray-600 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-gray-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#1E3A4A] mb-6 leading-tight tracking-tight">
            Ready to find common ground?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Start with a free account. No credit card. No pressure. Just see if automation beats coordination.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/early-access"
              className="inline-flex items-center justify-center px-8 py-4 bg-[var(--portal-primary)] text-white rounded-xl font-medium text-lg hover:bg-[#2D6A8F] transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
            >
              Start Free
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[var(--portal-primary)] rounded-xl font-medium text-lg hover:bg-gray-50 transition-all duration-200 border-2 border-[var(--portal-primary)]"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-600">
            Free tier includes ARIA messaging, basic scheduling, and ClearFund tracking. No fees.
          </p>
          <p className="mt-3 text-sm text-gray-600">
            Family law professional?{' '}
            <Link href="/professionals" className="text-[var(--portal-primary)] hover:underline">
              See how professionals use CommonGround
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

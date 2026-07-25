import Link from 'next/link';
import Image from 'next/image';
import { JsonLd } from '@/components/marketing/json-ld';
import {
  SectionHeading,
  FaqJsonLd,
} from '@/components/marketing';
import { BrandIcon, type BrandIconName } from '@/components/brand/brand-icon';
import {
  Clock,
  FileCheck,
  Shield,
  Bell,
  CheckCircle,
  ArrowRight,
  Sparkles,
  BookOpen,
  Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ── Category feature sets ─────────────────────────────────────── */

type FeatureItem = { title: string; description: string; accent?: string } & (
  | { brandIcon: BrandIconName; icon?: never }
  | { icon: LucideIcon; brandIcon?: never }
);

const AI_FEATURES: FeatureItem[] = [
  {
    brandIcon: 'aria',
    title: 'ARIA message coaching',
    description:
      'Parents see how their words could land before hitting send. ARIA flags hostility or blame and suggests calmer phrasing — you choose whether to use it.',
  },
  {
    brandIcon: 'agreement',
    title: 'ARIA agreement assistant',
    description:
      'Guided prompts help parents draft custody agreements section by section, with neutral, kid-first language.',
  },
];

const SCHEDULING_FEATURES: FeatureItem[] = [
  {
    brandIcon: 'timebridge',
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

const MONEY_FEATURES: FeatureItem[] = [
  {
    brandIcon: 'clearfund',
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

const CHILD_FEATURES: FeatureItem[] = [
  {
    brandIcon: 'kidspace',
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

const COMPLIANCE_FEATURES: FeatureItem[] = [
  {
    brandIcon: 'exchange',
    title: 'Silent Handoff GPS exchanges',
    description:
      'Drop off at a public location. GPS confirms arrival. QR code confirms pickup. Zero interaction required.',
    accent: 'gold',
  },
  {
    brandIcon: 'export',
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

/* ── Zig-zag category sections (image + features) ──────────────── */
interface Category {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  features: FeatureItem[];
}

const CATEGORIES: Category[] = [
  {
    id: 'aria',
    eyebrow: 'AI',
    title: 'ARIA keeps conversations calm',
    description:
      'Parents and kids both benefit when tone is steady. ARIA helps you hear yourself before the other parent does.',
    image: '/images/marketing/cg_howitworks_phone.jpg',
    alt: 'A parent calmly composing a message in the CommonGround app',
    features: AI_FEATURES,
  },
  {
    id: 'kidspace',
    eyebrow: 'Child-facing',
    title: 'KidSpace puts kids first',
    description:
      'Children get a calm corner for video calls, stories, and movies — independent of grown-up conflict.',
    image: '/images/marketing/cg_kidspace_call.jpg',
    alt: 'A child happily video-calling a parent from KidSpace',
    features: CHILD_FEATURES,
  },
  {
    id: 'safe-handoff',
    eyebrow: 'Compliance',
    title: 'Silent Handoff and court-ready evidence',
    description:
      'Parents get verified proof of every exchange and tamper-proof bundles when the court asks.',
    image: '/images/marketing/cg_parents_coparents.jpg',
    alt: 'Co-parents calmly exchanging their child at a public location',
    features: COMPLIANCE_FEATURES,
  },
  {
    id: 'clearfund',
    eyebrow: 'Money',
    title: 'ClearFund makes dollars boring again',
    description:
      'Expenses get split, tracked, and documented — money stops being a weapon.',
    image: '/images/marketing/cg_clearfund_money.jpg',
    alt: 'A parent calmly reviewing shared expenses at home',
    features: MONEY_FEATURES,
  },
  {
    id: 'timebridge',
    eyebrow: 'Scheduling',
    title: "TimeBridge runs the calendar so parents don't have to",
    description:
      'Recurring pickups, holiday rotations, and reminders happen without anyone chasing anyone.',
    image: '/images/marketing/cg_timebridge_calendar.jpg',
    alt: 'A parent checking the shared family calendar',
    features: SCHEDULING_FEATURES,
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
    <div className="min-h-screen bg-background">
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

      {/* Hero — two-column, light */}
      <section className="relative pt-16 pb-12 sm:pt-20 sm:pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--portal-primary)] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cg-amber rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto grid items-center gap-10 lg:gap-14 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium text-[var(--portal-primary)] mb-6">
              <Sparkles className="h-4 w-4 text-cg-amber" />
              Everything you need. Nothing you don&apos;t.
            </span>
            <h1 className="font-serif text-foreground text-4xl sm:text-5xl md:text-6xl leading-[1.05] tracking-tight mb-6">
              Every feature ends{' '}
              <span className="text-[var(--portal-primary)]">one fight</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Trade coordination for calm. ARIA cools messages, TimeBridge runs the schedule, and ClearFund settles the money &mdash; each one quietly documented, {' '}
              <span className="font-medium text-foreground">
                court-ready the day you ever need it.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-7">
              <Link
                href="/early-access"
                className="group inline-flex items-center justify-center px-8 py-4 bg-[var(--portal-primary)] text-white font-semibold rounded-full hover:bg-cg-sage-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Start free &mdash; no card needed
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-7 py-4 bg-white text-[var(--portal-primary)] font-semibold rounded-full hover:bg-gray-50 transition-all border-2 border-[var(--portal-primary)]"
              >
                See plans &amp; pricing
              </Link>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-3 text-sm text-gray-600">
              {trustPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <div
                    key={point.text}
                    className="flex items-center gap-2 bg-white/70 px-4 py-2 rounded-full"
                  >
                    <Icon className="w-4 h-4 text-[var(--portal-primary)]" />
                    <span>{point.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <Image
              src="/images/marketing/cg_features_hero.jpg"
              alt="A calm parent confidently managing co-parenting from the CommonGround app"
              width={1200}
              height={800}
              priority
              className="w-full h-auto rounded-3xl shadow-xl object-cover"
            />
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
                  className="text-foreground/70 hover:text-[var(--portal-primary)] transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Zig-zag category sections */}
      {CATEGORIES.map((cat, i) => {
        const imageLeft = i % 2 === 1;
        return (
          <section
            key={cat.id}
            id={cat.id}
            className={`scroll-mt-28 py-16 sm:py-24 ${i % 2 === 0 ? 'bg-white' : 'bg-background'}`}
          >
            <div className="max-w-6xl mx-auto px-6 grid items-center gap-10 lg:gap-16 lg:grid-cols-2">
              {/* Image */}
              <div className={imageLeft ? 'lg:order-1' : 'lg:order-2'}>
                <Image
                  src={cat.image}
                  alt={cat.alt}
                  width={1000}
                  height={667}
                  className="w-full h-auto rounded-3xl shadow-xl object-cover"
                />
              </div>

              {/* Content */}
              <div className={imageLeft ? 'lg:order-2' : 'lg:order-1'}>
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-[var(--portal-primary)] mb-3">
                  {cat.eyebrow}
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl text-foreground leading-tight tracking-tight mb-4">
                  {cat.title}
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  {cat.description}
                </p>
                <ul className="space-y-6">
                  {cat.features.map((f) => {
                    const Icon = f.icon;
                    const gold = f.accent === 'gold';
                    return (
                      <li key={f.title} className="flex gap-4">
                        <span
                          className={`flex-shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl ${
                            gold ? 'bg-cg-amber/10' : 'bg-cg-sage/10'
                          }`}
                        >
                          {f.brandIcon ? (
                            <BrandIcon name={f.brandIcon} size={24} />
                          ) : Icon ? (
                            <Icon
                              className={`h-5 w-5 ${gold ? 'text-cg-amber' : 'text-cg-sage'}`}
                              aria-hidden="true"
                            />
                          ) : null}
                        </span>
                        <div>
                          <h3 className="font-serif text-lg text-foreground">
                            {f.title}
                          </h3>
                          <p className="mt-1 text-gray-600 leading-relaxed">
                            {f.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>
        );
      })}

      {/* Philosophy */}
      <section className="py-20 px-6 bg-gradient-to-br from-[var(--portal-primary)] to-cg-slate text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cg-amber rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif mb-6 leading-tight tracking-tight">
            The less you have to coordinate,
            <br />
            <span className="text-cg-amber">the more peace your family has</span>
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
                <summary className="cursor-pointer list-none flex items-center justify-between font-medium text-foreground">
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
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-foreground mb-6 leading-tight tracking-tight">
            Ready to find common ground?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Put these tools to work today. Create a free account, invite your co-parent when you&apos;re ready, and let automation replace the coordination.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/early-access"
              className="inline-flex items-center justify-center px-8 py-4 bg-[var(--portal-primary)] text-white rounded-xl font-medium text-lg hover:bg-cg-slate transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
            >
              Start free &mdash; no card needed
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[var(--portal-primary)] rounded-xl font-medium text-lg hover:bg-gray-50 transition-all duration-200 border-2 border-[var(--portal-primary)]"
            >
              See plans &amp; pricing
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-600">
            Free forever &middot; No credit card &middot; 2-minute setup &middot; Cancel anytime
          </p>
          <p className="mt-3 text-sm text-gray-600">
            Family law professional?{' '}
            <Link href="/professionals" className="text-[var(--portal-primary)] hover:underline">
              See the professional portal
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

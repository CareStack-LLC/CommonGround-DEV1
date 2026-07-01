import type { Metadata } from 'next';
import Image from 'next/image';
import { EarlyAdopterForm } from '@/components/marketing/early-adopter-form';
import { JsonLd } from '@/components/marketing/json-ld';
import { FaqJsonLd } from '@/components/marketing';
import { BrandIcon, type BrandIconName } from '@/components/brand/brand-icon';
import {
  ArrowDown,
  CheckCircle,
  ChevronDown,
  Quote,
  Shield,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Starting over? A fresh start for co-parents | CommonGround',
  description:
    'Reset your co-parenting relationship. Put everything in writing, set a shared schedule, and track expenses — without a lawyer or a fight.',
  alternates: { canonical: '/fresh-start' },
  openGraph: {
    type: 'website',
    title: 'Starting over? A fresh start for co-parents | CommonGround',
    description:
      'Put agreements in writing, set a shared schedule, and track expenses without a lawyer or a fight.',
    url: 'https://www.find-commonground.com/fresh-start',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A fresh start for co-parents | CommonGround',
    description:
      'Reset your co-parenting relationship with shared agreements and a common calendar.',
  },
};

const painPoints = [
  {
    old: 'Verbal agreements that get "remembered" differently every week',
    cg: 'Quick Accords puts everything in writing — both parents sign off digitally',
  },
  {
    old: 'Texting back and forth about who has the kids this weekend',
    cg: 'TimeBridge sets the custody schedule once and sends reminders automatically',
  },
  {
    old: 'Splitting soccer fees on Venmo with no record of what\'s been paid',
    cg: 'ClearFund tracks every expense, splits costs automatically, and keeps receipts',
  },
  {
    old: 'One bad exchange undoing months of keeping things civil',
    cg: 'ARIA coaches messages to stay calm and child-focused before they\'re sent',
  },
];

const story = [
  { time: 'For a year', tone: 'before', text: 'Sam’s phone was a tripwire. Every buzz could be a fight, a guilt trip, or a plan changed at the last minute.' },
  { time: 'Trying to move on', tone: 'before', text: 'It felt impossible when the past kept texting. The old conflict followed Sam into every new morning.' },
  { time: 'The first week', tone: 'turn', text: 'A fresh start needed a clean system. Sam set the schedule once, switched ARIA on, and let the old patterns hit a wall.' },
  { time: 'Now', tone: 'after', text: 'The logistics run themselves. Messages stay civil or they don’t get sent. The past is documented and set down — not carried.' },
  { time: 'One quiet morning', tone: 'after', kicker: true, text: 'Sam made coffee, looked at a phone that wasn’t buzzing, and realized the new chapter had actually started.' },
];

const features: {
  brandIcon: BrandIconName;
  name: string;
  tagline: string;
  description: string;
  accent: string;
}[] = [
  {
    brandIcon: 'agreement',
    name: 'Quick Accords',
    tagline: 'Agreements that stick',
    description:
      'Set up parenting agreements in minutes — not months. Both parents review, sign digitally, and get a copy. Holiday schedules, pickup rules, communication boundaries. Everything documented, nothing forgotten.',
    accent: '#F5A623',
  },
  {
    brandIcon: 'timebridge',
    name: 'TimeBridge',
    tagline: 'Autopilot for your schedule',
    description:
      'Enter your custody arrangement once. TimeBridge creates recurring events, sends reminders to both parents, and handles holiday rotations. The system runs itself so you don\'t have to coordinate anything.',
    accent: '#3DAA8A',
  },
  {
    brandIcon: 'clearfund',
    name: 'ClearFund',
    tagline: 'Expenses on autopilot',
    description:
      'Set percentage splits for shared costs. Upload receipts. ClearFund calculates who owes what and sends reminders. No awkward money conversations. No chasing payments. Just clear, documented records.',
    accent: '#F5A623',
  },
];

const faqs = [
  {
    q: 'We\'re actually getting along right now. Do we need this?',
    a: 'That\'s exactly the right time to set up structure. CommonGround works best when things are calm — it locks in agreements and automates logistics so small misunderstandings don\'t become big fights. Think of it as insurance for your progress.',
  },
  {
    q: 'Can we set up our own custody schedule?',
    a: 'Absolutely. TimeBridge supports any custody arrangement — week on/week off, 2-2-3, every other weekend, custom splits, and holiday rotations. You set it once and the system handles the rest.',
  },
  {
    q: 'What if we already have a court order?',
    a: 'CommonGround helps you follow your existing court order more easily. Enter your ordered schedule into TimeBridge, document compliance, and keep records that show you\'re meeting your obligations.',
  },
  {
    q: 'What does "30% off for 3 years" actually mean?',
    a: 'As one of our first 50 early adopters, your subscription rate is locked at 30% below the standard price for 36 months on any paid plan. The discount stays with your account regardless of future price changes.',
  },
];

export default function FreshStartPage() {
  return (
    <div className="min-h-screen">
      {/* FAQPage structured data — paired with the visible FAQ below */}
      <FaqJsonLd
        items={faqs.map((f) => ({ question: f.q, answer: f.a }))}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'CommonGround Fresh Start',
          description: 'AI-powered co-parenting app for recently divorced parents who want structure and civility.',
          url: 'https://www.find-commonground.com/fresh-start',
          provider: {
            '@type': 'Organization',
            name: 'CommonGround',
            url: 'https://www.find-commonground.com',
          },
          offers: {
            '@type': 'Offer',
            name: 'Early Adopter — 30% Off for 3 Years',
            description: 'First 50 members get 30% off all subscriptions, locked for 36 months.',
            eligibleQuantity: { '@type': 'QuantitativeValue', value: 50 },
          },
        }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cg-sand via-cg-sand to-white" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-cg-sage/[0.04] blur-3xl -translate-y-1/3 translate-x-1/4" />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-cg-sage font-medium mb-4 tracking-wide uppercase text-sm">
                For your fresh start
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-[3.4rem] text-foreground mb-6 leading-[1.1] tracking-tight"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                The Hard Part Is Over.{' '}
                <span className="text-cg-sage">Don&apos;t Let Co-Parenting Undo It.</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
                Keep the calm you fought for. TimeBridge runs the schedule,
                ClearFund tracks the money, and ARIA keeps messages civil before
                they send — everything documented, so a bad week doesn&apos;t
                become a bad year.
              </p>
              <a
                href="#early-adopter"
                className="inline-flex items-center gap-2 bg-cg-sage text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:bg-cg-sage-dark hover:shadow-lg hover:shadow-cg-sage/20 text-base"
              >
                Start free — no card needed
                <ArrowDown className="w-4 h-4" />
              </a>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
                {['Free forever tier', 'No credit card', 'Set up in minutes', 'Start on your own'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-cg-sage" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-cg-sage/10">
                <Image
                  src="/images/marketing/cg_freshstart_hopeful.jpg"
                  alt="A hopeful parent and child in a bright new home, starting fresh"
                  width={1000}
                  height={667}
                  className="w-full h-auto object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full border-2 border-cg-amber/30 -z-10" />
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-cg-sage/10 -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Sound Familiar?
            </h2>
            <p className="text-gray-600 text-lg">
              These small cracks are how progress unravels. Structure prevents them.
            </p>
          </div>

          <div className="space-y-6">
            {painPoints.map((point, i) => (
              <div
                key={i}
                className="group relative bg-cg-sand rounded-2xl p-6 sm:p-8 border border-transparent hover:border-cg-sage/20 transition-colors duration-300"
              >
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                  <div className="flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2 block">
                      Without structure
                    </span>
                    <p className="text-gray-600 line-through decoration-[#E85D75]/40 decoration-2">
                      {point.old}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center">
                    <div className="w-8 h-px bg-cg-sage/40" />
                    <CheckCircle className="w-5 h-5 text-cg-sage mx-1 flex-shrink-0" />
                    <div className="w-8 h-px bg-cg-sage/40" />
                  </div>
                  <div className="sm:hidden flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cg-sage" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-cg-sage">
                      With CommonGround
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="hidden sm:block text-xs font-semibold uppercase tracking-wider text-cg-sage mb-2">
                      With CommonGround
                    </span>
                    <p className="text-foreground font-medium">
                      {point.cg}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          STORY — A short narrative that captivates
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-[#F4F8F7] to-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-medium mb-3 tracking-wide uppercase text-sm" style={{ color: '#E85D75' }}>
              A day in the life
            </p>
            <h2
              className="text-3xl sm:text-4xl lg:text-[2.75rem] text-[#1E3A4A] leading-[1.15]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              The first week that
              <br className="hidden sm:block" /> felt like a fresh start
            </h2>
          </div>
          <div className="relative">
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-[#E85D75]/40 via-[#F5A623]/40 to-[#3DAA8A]/50" />
            <div className="space-y-10">
              {story.map((beat, i) => {
                const dot =
                  beat.tone === 'before'
                    ? '#E85D75'
                    : beat.tone === 'turn'
                    ? '#F5A623'
                    : '#3DAA8A';
                return (
                  <div key={i} className="relative pl-14">
                    <div className="absolute left-0 top-0.5">
                      <div
                        className="w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center shadow-sm"
                        style={{ borderColor: dot }}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dot }} />
                      </div>
                    </div>
                    <span
                      className="block text-xs font-semibold uppercase tracking-wider mb-2"
                      style={{ color: dot }}
                    >
                      {beat.time}
                    </span>
                    {beat.kicker ? (
                      <p
                        className="text-xl sm:text-2xl text-[#1E3A4A] leading-relaxed"
                        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                      >
                        {beat.text}
                      </p>
                    ) : (
                      <p className="text-gray-600 leading-relaxed text-[17px]">{beat.text}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-center text-gray-600 text-lg mt-16 max-w-2xl mx-auto">
            A fresh start isn’t forgetting what happened. It’s making sure it can’t
            keep happening. Here’s what drew the line.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-cg-sand">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-cg-sage font-medium mb-3 tracking-wide uppercase text-sm">
              Structure that scales
            </p>
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Automate the Logistics. Protect the Peace.
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Set it up once. Let the system handle the coordination.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature) => {
              return (
                <div
                  key={feature.name}
                  className="group relative bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `${feature.accent}15` }}
                  >
                    <BrandIcon name={feature.brandIcon} size={24} />
                  </div>
                  <span
                    className="inline-block text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: feature.accent }}
                  >
                    {feature.name}
                  </span>
                  <h3
                    className="text-xl text-foreground mb-3"
                    style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                  >
                    {feature.tagline}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-[15px]">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF — Rivera Family */}
      <section className="py-20 lg:py-24 bg-cg-sand">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100">
            <Quote className="w-10 h-10 text-cg-sage/20 mb-6" />
            <blockquote
              className="text-xl sm:text-2xl text-foreground leading-relaxed mb-8"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Their mediator said it was the first time she had seen them
              cooperate — on anything — after two years of conflict.
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-cg-sage/10 flex items-center justify-center">
                <span className="text-cg-sage font-semibold text-lg">R</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">The Rivera Family</p>
                <p className="text-sm text-gray-600">
                  4Ever Forward Foundation Grant Program
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden rounded-tr-3xl">
              <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full border-2 border-cg-amber/10" />
            </div>
          </div>
        </div>
      </section>

      {/* EARLY ADOPTER CTA */}
      <section id="early-adopter" className="py-20 lg:py-28 bg-white scroll-mt-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-cg-amber font-medium mb-3 tracking-wide uppercase text-sm">
              Early Adopter Offer
            </p>
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Lock in the calm — in minutes
            </h2>
            <p className="text-gray-600 text-lg">
              Join the first 50 members and lock in 30% off for 3 years.
              No credit card required. Just your email.
            </p>
          </div>
          <EarlyAdopterForm source="fresh_start" />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-24 bg-cg-sand">
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className="text-3xl sm:text-4xl text-foreground mb-12 text-center"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Questions You Might Have
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <h3 className="font-semibold text-foreground text-left">{faq.q}</h3>
                  <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 -mt-1">
                  <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
          <div className="text-center mt-14">
            <a
              href="#early-adopter"
              className="inline-flex items-center gap-2 text-cg-sage font-semibold hover:text-cg-sage-dark transition-colors"
            >
              <Shield className="w-4 h-4" />
              Claim your early adopter spot
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

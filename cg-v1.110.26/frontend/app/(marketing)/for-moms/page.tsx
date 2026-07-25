import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { EarlyAdopterForm } from '@/components/marketing/early-adopter-form';
import { JsonLd } from '@/components/marketing/json-ld';
import { FaqJsonLd } from '@/components/marketing';
import {
  MessageSquare,
  Calendar,
  DollarSign,
  ArrowDown,
  CheckCircle,
  ChevronDown,
  Quote,
  Shield,
  Heart,
  Lock,
  Scale,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Co-parenting app for moms | CommonGround',
  description:
    'Built for moms managing the mental load of co-parenting — automatic expense tracking, exchange reminders, and ARIA coaching that keeps messages calm.',
  alternates: { canonical: '/for-moms' },
  openGraph: {
    type: 'website',
    title: 'Co-parenting app for moms | CommonGround',
    description:
      'Expense tracking, exchange reminders, and ARIA coaching built for moms carrying the mental load.',
    url: 'https://www.find-commonground.com/for-moms',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Co-parenting app for moms | CommonGround',
    description:
      'Expense tracking, reminders, and calm-tone coaching built for moms.',
  },
};

const heroTrust = [
  'Free forever tier',
  'No credit card',
  'Works even if he won\'t join',
  'Court-ready records',
];

const outcomes = [
  {
    title: 'No more chasing payments',
    body: 'Expenses, splits, and reminders run on their own. You stop being the collections department.',
  },
  {
    title: 'No more "did you forget?"',
    body: 'The schedule reminds both of you automatically. Missed pickups stop landing on your shoulders.',
  },
  {
    title: 'No more screenshot wars',
    body: 'Everything is documented as it happens. You never have to scroll back to prove what was said.',
  },
  {
    title: 'More presence with your kids',
    body: 'Less time managing him means more time actually being there — at the table, at the game, at bedtime.',
  },
  {
    title: 'Finally able to breathe',
    body: 'The mental load gets quieter. You get to be a mom again, not a project manager.',
  },
];

const trustBand = [
  { icon: Heart, label: 'Built by co-parents' },
  { icon: Scale, label: 'Attorney-reviewed workflows' },
  { icon: Shield, label: 'Court-ready records' },
  { icon: Lock, label: 'Encrypted & private' },
];

const testimonials = [
  {
    quote:
      'CommonGround gave us structure when everything felt chaotic. The automated schedule means neither of us can "forget" anymore.',
    name: 'The Rivera Family',
    sub: '4Ever Forward Foundation Grant Program',
    initial: 'R',
  },
  {
    quote:
      'I used to dread my phone lighting up. Now the hard stuff is just handled — logged, calm, done. I found focus instead of fear, and my kids got a calmer mom.',
    name: 'Diana M.',
    sub: 'Mom of two, co-parenting two years',
    initial: 'D',
  },
];

const story = [
  {
    time: '6:42 PM',
    tone: 'before',
    text:
      'The text lights up her phone. Maya’s stomach drops before she even reads it — a simple question about Friday’s pickup that somehow, again, becomes about her.',
  },
  {
    time: 'Every night before',
    tone: 'before',
    text:
      'She used to reread it five times. Draft a reply, delete it, screenshot it just in case. Then carry it into bedtime, into the morning, into the soccer game she barely saw.',
  },
  {
    time: 'The evening it shifted',
    tone: 'turn',
    text:
      'One night she set the custody schedule once, switched ARIA on, and let CommonGround hold the part she’d been carrying alone.',
  },
  {
    time: 'This Tuesday',
    tone: 'after',
    text:
      'Friday’s pickup is already on both their calendars. The reminder went out without her. The cleats receipt is logged. And the text? ARIA kept it about the kids — so she read it once, answered what mattered, and looked back up.',
  },
  {
    time: 'That same night',
    tone: 'after',
    kicker: true,
    text:
      'Her daughter scored in the second half. For the first time in a long time, Maya saw the whole thing.',
  },
];

const features = [
  {
    icon: MessageSquare,
    name: 'ARIA',
    tagline: 'Messages stay about the kids',
    description:
      'ARIA gently flags when messages go off-topic or escalate. You see what he wrote, but with context — so you can respond to the part that matters and ignore the noise. Every exchange is documented.',
    accent: 'var(--cg-amber)',
  },
  {
    icon: Calendar,
    name: 'TimeBridge',
    tagline: 'Reminders he can\'t ignore',
    description:
      'Set the custody schedule once. TimeBridge sends automated reminders for pickups, dropoffs, and events to both parents. No more "I forgot" — because the system doesn\'t forget.',
    accent: 'var(--cg-sage)',
  },
  {
    icon: DollarSign,
    name: 'ClearFund',
    tagline: 'Stop chasing payments',
    description:
      'Upload receipts, set split percentages, and let ClearFund handle the math and the reminders. Every payment is tracked. If you ever need records for court, they\'re already organized.',
    accent: '#E85D75',
  },
];

const faqs = [
  {
    q: 'What if he refuses to use the app?',
    a: 'CommonGround works even if only one parent is actively using it. You can document your side of communication, track expenses, and maintain records. If he does join, the experience gets even better — but you don\'t need his cooperation to benefit.',
  },
  {
    q: 'Is this admissible in court?',
    a: 'CommonGround creates timestamped, tamper-evident records of all communication, schedules, and financial exchanges. Many family law professionals recommend structured co-parenting platforms. We\'re designed with documentation in mind.',
  },
  {
    q: 'How is this different from just texting or using a shared calendar?',
    a: 'Texts can be deleted, screenshots can be manipulated, and shared calendars don\'t send enforceable reminders. CommonGround combines AI-assisted communication, automated scheduling, expense tracking, and court-ready documentation in one place.',
  },
  {
    q: 'Will this make co-parenting feel more combative?',
    a: 'Just the opposite. CommonGround is designed to take the heat out of co-parenting, not add to it. ARIA keeps messages calm and child-focused, reminders go out automatically, and records are kept quietly in the background — so you can step back from the conflict instead of being pulled into it.',
  },
  {
    q: 'What does "30% off for 3 years" actually mean?',
    a: 'As one of our first 50 early adopters, your subscription rate is locked at 30% below the standard price for 36 months on any paid plan. The discount stays with your account regardless of future price changes.',
  },
];

export default function ForMomsPage() {
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
          name: 'CommonGround for Moms',
          description: 'AI-powered co-parenting app designed for moms dealing with unreliable co-parents.',
          url: 'https://www.find-commonground.com/for-moms',
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

      {/* ═══════════════════════════════════════════════════
          HERO — Emotional, direct, editorial
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-white" />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid items-center gap-10 lg:gap-14 lg:grid-cols-2">
            {/* Copy */}
            <div className="text-center lg:text-left">
              <p className="text-[#E85D75] font-medium mb-4 tracking-wide uppercase text-sm">
                For moms who are done chasing
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-[3.4rem] text-foreground mb-6 leading-[1.1] tracking-tight"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                Stop Chasing Him.{' '}
                <span className="text-cg-sage">Start Focusing</span> on Your Kids.
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                Forgotten pickups. Texts that turn into something else. You&apos;re not
                asking for perfection — just someone who shows up. Let TimeBridge
                send the reminders, ClearFund track the money, and ARIA keep the
                messages about your kids &mdash; so you can be present for what
                actually matters.
              </p>
              <a
                href="#early-adopter"
                className="inline-flex items-center gap-2 bg-cg-sage text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:bg-[#2E9577] hover:shadow-lg hover:shadow-cg-sage/20 text-base"
              >
                Lock in 30% off for 3 years
                <ArrowDown className="w-4 h-4" />
              </a>

              {/* Trust microbar */}
              <ul className="mt-6 flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2">
                {heroTrust.map((point) => (
                  <li
                    key={point}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-600"
                  >
                    <CheckCircle className="w-4 h-4 text-cg-sage flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Hero — subtle looping video with the still image as poster/fallback */}
            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster="/images/marketing/cg_formoms_calm.jpg"
                aria-label="A calm mother relaxing at home, smiling at her phone"
                className="w-full rounded-3xl shadow-xl object-cover aspect-[3/2]"
              >
                <source src="/videos/marketing/cg_formoms_hero.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          STORY — A short narrative that captivates
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-background to-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#E85D75] font-medium mb-3 tracking-wide uppercase text-sm">
              A day in the life
            </p>
            <h2
              className="text-3xl sm:text-4xl lg:text-[2.75rem] text-foreground leading-[1.15]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              The Tuesday Maya stopped
              <br className="hidden sm:block" /> bracing for her phone
            </h2>
          </div>

          {/* Narrative timeline */}
          <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-[#E85D75]/40 via-cg-amber/40 to-cg-sage/50" />

            <div className="space-y-10">
              {story.map((beat, i) => {
                const dot =
                  beat.tone === 'before'
                    ? '#E85D75'
                    : beat.tone === 'turn'
                    ? 'var(--cg-amber)'
                    : 'var(--cg-sage)';
                return (
                  <div key={i} className="relative pl-14">
                    {/* Dot marker */}
                    <div className="absolute left-0 top-0.5">
                      <div
                        className="w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center shadow-sm"
                        style={{ borderColor: dot }}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: dot }}
                        />
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
                        className="text-xl sm:text-2xl text-foreground leading-relaxed"
                        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                      >
                        {beat.text}
                      </p>
                    ) : (
                      <p className="text-gray-600 leading-relaxed text-[17px]">
                        {beat.text}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transition line to the solution */}
          <p className="text-center text-gray-600 text-lg mt-16 max-w-2xl mx-auto">
            Maya didn&apos;t find more hours in the day. She just stopped spending
            them on the chasing. Here&apos;s what carried the weight for her.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          HOW CG HELPS — 3 Feature Cards
      ═══════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-cg-sage font-medium mb-3 tracking-wide uppercase text-sm">
              Built for this
            </p>
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Three Tools That Change Everything
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              You don&apos;t need another messaging app. You need one that actually
              understands what co-parenting requires.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.name}
                  className="group relative bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `${feature.accent}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: feature.accent }} />
                  </div>
                  {/* Badge */}
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

      {/* ═══════════════════════════════════════════════════
          OUTCOMES — "Your week, lighter"
      ═══════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid items-center gap-10 lg:gap-16 lg:grid-cols-2">
            {/* Image */}
            <div className="relative order-2 lg:order-1 mx-auto w-full max-w-xl lg:max-w-none">
              <Image
                src="/images/marketing/cg_features_hero.jpg"
                alt="A calm, confident mom checking her phone with a relaxed smile"
                width={1200}
                height={800}
                className="w-full h-auto rounded-3xl shadow-xl object-cover"
              />
            </div>

            {/* Copy */}
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <p className="text-cg-sage font-medium mb-3 tracking-wide uppercase text-sm">
                What changes
              </p>
              <h2
                className="text-3xl sm:text-4xl text-foreground mb-4 leading-tight"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                Your week, lighter
              </h2>
              <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto lg:mx-0">
                When the chasing stops, the weight you&apos;ve been carrying alone
                starts to lift. Here&apos;s what that looks like.
              </p>

              <ul className="space-y-5 text-left">
                {outcomes.map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <CheckCircle className="w-5 h-5 text-cg-sage flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-gray-600 text-[15px] leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <a
                href="#early-adopter"
                className="mt-8 inline-flex items-center gap-2 bg-cg-sage text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:bg-[#2E9577] hover:shadow-lg hover:shadow-cg-sage/20 text-base"
              >
                Set it up in 2 minutes &mdash; free
                <ArrowDown className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TRUST BAND — slim credibility row
      ═══════════════════════════════════════════════════ */}
      <section className="py-10 lg:py-12 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
            {trustBand.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left"
                >
                  <Icon className="w-5 h-5 text-cg-sage flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SOCIAL PROOF — Two mom-voice testimonials
      ═══════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-24 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Moms who stopped chasing
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="relative bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-gray-100 flex flex-col"
              >
                {/* Quote icon */}
                <Quote className="w-9 h-9 text-cg-sage/20 mb-5" />

                <blockquote
                  className="text-lg sm:text-xl text-foreground leading-relaxed mb-8 flex-1"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                >
                  {t.quote}
                </blockquote>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-cg-sage/10 flex items-center justify-center">
                    <span className="text-cg-sage font-semibold text-lg">
                      {t.initial}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{t.name}</p>
                    <p className="text-sm text-gray-600">{t.sub}</p>
                  </div>
                </div>

                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden rounded-tr-3xl pointer-events-none">
                  <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full border-2 border-cg-amber/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          EARLY ADOPTER CTA
      ═══════════════════════════════════════════════════ */}
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
              You Deserve Peace of Mind
            </h2>
            <p className="text-gray-600 text-lg">
              Join the first 50 members and lock in 30% off for 3 years.
              No credit card required. Just your email.
            </p>
          </div>

          <EarlyAdopterForm source="for_moms" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-24 bg-background">
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
                  <h3 className="font-semibold text-foreground text-left">
                    {faq.q}
                  </h3>
                  <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 -mt-1">
                  <p className="text-gray-600 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </details>
            ))}
          </div>

          {/* Final nudge */}
          <div className="text-center mt-14">
            <a
              href="#early-adopter"
              className="inline-flex items-center gap-2 text-cg-sage font-semibold hover:text-[#2E9577] transition-colors"
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

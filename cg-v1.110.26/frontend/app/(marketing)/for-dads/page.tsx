import type { Metadata } from 'next';
import Image from 'next/image';
import { EarlyAdopterForm } from '@/components/marketing/early-adopter-form';
import { JsonLd } from '@/components/marketing/json-ld';
import { FaqJsonLd } from '@/components/marketing';
import {
  MessageSquare,
  Video,
  FileText,
  ArrowDown,
  CheckCircle,
  ChevronDown,
  Quote,
  Shield,
  Lock,
  Scale,
  FileCheck,
  Eye,
  UserCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Co-parenting app for dads | CommonGround',
  description:
    'Tools for dads who want more time with their kids — documented messaging, KidSpace video calls, and court-ready records that protect every interaction.',
  alternates: { canonical: '/for-dads' },
  openGraph: {
    type: 'website',
    title: 'Co-parenting app for dads | CommonGround',
    description:
      'Documented messaging, KidSpace video calls, and court-ready records built for dads fighting for more time with their kids.',
    url: 'https://www.find-commonground.com/for-dads',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Co-parenting app for dads | CommonGround',
    description:
      'Documented messaging, KidSpace video, and court-ready records for dads.',
  },
};

const outcomes = [
  {
    icon: Video,
    text: 'More real time with your kids — video calls, storytime, and movie nights through KidSpace, on your schedule.',
  },
  {
    icon: FileText,
    text: 'Every interaction documented automatically — no more screenshots, no more he-said-she-said.',
  },
  {
    icon: Eye,
    text: 'Manipulation flagged the moment it happens, so you respond calm instead of reactive.',
  },
  {
    icon: FileCheck,
    text: 'A clean, organized file your attorney can use — court-ready the day you need it.',
  },
  {
    icon: CheckCircle,
    text: 'Calm, contactless handoffs with GPS-verified check-ins — less friction, fewer flashpoints.',
  },
];

const trustBand = [
  { icon: UserCheck, label: 'Built by a co-parent' },
  { icon: Scale, label: 'Attorney-reviewed workflows' },
  { icon: Shield, label: 'SHA-256 verified exports' },
  { icon: Lock, label: 'Encrypted & private' },
];

const heroTrust = [
  'Court-ready records',
  'Free forever tier',
  'No credit card',
  'Time-stamped & tamper-evident',
];

const features = [
  {
    icon: MessageSquare,
    name: 'ARIA',
    tagline: 'Your words, protected',
    description:
      'ARIA monitors conversations for manipulative patterns — guilt-tripping, gaslighting, gatekeeping. It flags what\'s happening so you can see it clearly, respond calmly, and build a documented record over time.',
    accent: '#F5A623',
  },
  {
    icon: Video,
    name: 'KidSpace',
    tagline: 'Bond without barriers',
    description:
      'Video calls, shared movies, storytime, and games — all in a safe, monitored space. Your kids see Dad, not a phone screen controlled by someone else. She doesn\'t need to be involved for you to be present.',
    accent: '#3DAA8A',
  },
  {
    icon: FileText,
    name: 'Evidence Exports',
    tagline: 'Documentation that speaks for itself',
    description:
      'Every message, schedule change, missed pickup, and financial transaction is timestamped and exportable. When your attorney asks for records, you hand them a clean, organized file — not a folder of screenshots.',
    accent: '#2D6A8F',
  },
];

const faqs = [
  {
    q: 'Can ARIA really detect manipulation?',
    a: 'ARIA is trained to recognize common high-conflict communication patterns including guilt-tripping, gatekeeping, gaslighting, and blame-shifting. It flags these patterns privately for you — it doesn\'t confront the other parent or change their messages. Over time, you build a documented record of behavioral patterns.',
  },
  {
    q: 'What if she refuses to let the kids use KidSpace?',
    a: 'KidSpace works best when both parents participate, but the documentation features work regardless. If you\'re court-ordered to have communication or visitation, CommonGround provides the structured framework many family courts recommend. Your attorney can advise on how to request platform-based communication.',
  },
  {
    q: 'Will using this app make things worse?',
    a: 'CommonGround is designed to de-escalate. ARIA coaches your messages to be clear and child-focused, and the structured format removes the emotional back-and-forth that fuels conflict. Many family law professionals recommend moving high-conflict communication to a monitored platform.',
  },
  {
    q: 'Will the records actually hold up in court?',
    a: 'Every message, schedule change, and exchange is time-stamped and logged in a tamper-evident record. Exports are SHA-256 verified, so the file you hand your attorney is organized, chronological, and integrity-checked — not a folder of disputable screenshots. Many family law professionals already recommend moving communication to a monitored platform for exactly this reason.',
  },
  {
    q: 'What does "30% off for life" actually mean?',
    a: 'As one of our first 50 early adopters, your subscription rate is locked at 30% below the standard price for 36 months on any paid plan. The discount stays with your account regardless of future price changes.',
  },
];

const story = [
  { time: 'Championship week', tone: 'before', text: 'The group text about the big game lands. Marcus offers to drive. The reply is a list of everything he’s done wrong since March.' },
  { time: 'Every time before', tone: 'before', text: 'He used to just let it go — skip the game rather than start a fight, and tell himself the kids knew he tried, even when he wasn’t there to see it.' },
  { time: 'The week it shifted', tone: 'turn', text: 'Then he put the schedule into CommonGround, switched ARIA on, and started logging every exchange — not to win anything, just to show up clearly.' },
  { time: 'This season', tone: 'after', text: 'Now his parenting time is on the record. The game is on both calendars. ARIA kept his messages short and about his son — no fight to dodge, no point to prove.' },
  { time: 'Game night', tone: 'after', kicker: true, text: 'He was in the third row when his son looked up into the stands. Marcus was already there.' },
];

export default function ForDadsPage() {
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
          name: 'CommonGround for Dads',
          description: 'AI-powered co-parenting app for fathers dealing with high-conflict custody situations.',
          url: 'https://www.find-commonground.com/for-dads',
          provider: {
            '@type': 'Organization',
            name: 'CommonGround',
            url: 'https://www.find-commonground.com',
          },
          offers: {
            '@type': 'Offer',
            name: 'Early Adopter — 30% Off for Life',
            description: 'First 50 members get 30% off all subscriptions, locked for 36 months.',
            eligibleQuantity: { '@type': 'QuantitativeValue', value: 50 },
          },
        }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F4F8F7] via-[#F4F8F7] to-white" />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid items-center gap-10 lg:gap-14 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <p className="text-[#2D6A8F] font-medium mb-4 tracking-wide uppercase text-sm">
                For dads who refuse to disappear
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-[3.4rem] text-[#1E3A4A] mb-6 leading-[1.1] tracking-tight"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                Being a Good Dad Shouldn&apos;t Mean{' '}
                <span className="text-[#3DAA8A]">Walking on Eggshells</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                Every text gets twisted. You play nice because the alternative is
                losing time with your kids. CommonGround puts the facts on your
                side, keeps you present, and helps you stay the dad they count on.
              </p>
              <a
                href="#early-adopter"
                className="inline-flex items-center gap-2 bg-[#3DAA8A] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:bg-[#2E9577] hover:shadow-lg hover:shadow-[#3DAA8A]/20 text-base"
              >
                Join the Early Adopter List
                <ArrowDown className="w-4 h-4" />
              </a>

              <ul className="mt-6 flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2">
                {heroTrust.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-1.5 text-sm text-gray-600"
                  >
                    <CheckCircle className="w-4 h-4 text-[#3DAA8A] flex-shrink-0" />
                    {item}
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
                poster="/images/marketing/cg_fordads_bond.jpg"
                aria-label="A father and his son laughing together outdoors"
                className="w-full rounded-3xl shadow-xl object-cover aspect-[3/2]"
              >
                <source src="/videos/marketing/cg_fordads_hero.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          STORY — A short narrative that captivates
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-[#F4F8F7] to-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-medium mb-3 tracking-wide uppercase text-sm" style={{ color: '#2D6A8F' }}>
              A day in the life
            </p>
            <h2
              className="text-3xl sm:text-4xl lg:text-[2.75rem] text-[#1E3A4A] leading-[1.15]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              The season Marcus stopped
              <br className="hidden sm:block" /> feeling like a visitor
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
            Marcus didn’t argue his way back into his kids’ lives. He just made it
            impossible to be left out. Here’s what did the showing up for him.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-[#F4F8F7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[#3DAA8A] font-medium mb-3 tracking-wide uppercase text-sm">
              Your corner
            </p>
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Tools That Have Your Back
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              You shouldn&apos;t need to be a lawyer to protect your relationship
              with your kids.
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
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `${feature.accent}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: feature.accent }} />
                  </div>
                  <span
                    className="inline-block text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: feature.accent }}
                  >
                    {feature.name}
                  </span>
                  <h3
                    className="text-xl text-[#1E3A4A] mb-3"
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

      {/* OUTCOME / TRANSFORMATION */}
      <section className="py-20 lg:py-28 bg-[#F4F8F7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid items-center gap-10 lg:gap-14 lg:grid-cols-2">
            <div className="relative order-last lg:order-first mx-auto w-full max-w-xl lg:max-w-none">
              <Image
                src="/images/marketing/cg_home_hero.jpg"
                alt="A dad and his daughter sharing a calm moment together using the CommonGround app"
                width={1200}
                height={800}
                className="w-full h-auto rounded-3xl shadow-xl object-cover"
              />
            </div>

            <div className="text-center lg:text-left">
              <p className="text-[#2D6A8F] font-medium mb-3 tracking-wide uppercase text-sm">
                Get back in the game
              </p>
              <h2
                className="text-3xl sm:text-4xl text-[#1E3A4A] mb-5 leading-tight"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                Show Up — And Have the Receipts
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                You don&apos;t need to win an argument. You need to be present and
                have a clean record while you do it. Here&apos;s what changes:
              </p>

              <ul className="space-y-4 text-left">
                {outcomes.map((outcome) => {
                  const Icon = outcome.icon;
                  return (
                    <li key={outcome.text} className="flex gap-4">
                      <span
                        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
                        style={{ backgroundColor: '#3DAA8A15' }}
                      >
                        <Icon className="w-5 h-5 text-[#3DAA8A]" />
                      </span>
                      <p className="text-[#1E3A4A] leading-relaxed pt-1">
                        {outcome.text}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST / CREDIBILITY BAND */}
      <section className="py-10 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
            {trustBand.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  className="flex items-center gap-2 text-sm font-medium text-[#1E3A4A]"
                >
                  <Icon className="w-5 h-5 text-[#3DAA8A] flex-shrink-0" />
                  {item.label}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* SOCIAL PROOF — two dad voices */}
      <section className="py-20 lg:py-24 bg-[#F4F8F7]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid gap-6 lg:gap-8 md:grid-cols-2">
            {/* Marcus */}
            <div className="relative bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-gray-100 overflow-hidden">
              <Quote className="w-10 h-10 text-[#3DAA8A]/20 mb-6" />
              <blockquote
                className="text-xl text-[#1E3A4A] leading-relaxed mb-8"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                My son stopped asking &ldquo;is Mom mad?&rdquo; because the tension
                at handoffs had disappeared. Now we have a standing KidSpace movie
                night every Wednesday — even on weeks when we&apos;re apart.
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#2D6A8F]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#2D6A8F] font-semibold text-lg">M</span>
                </div>
                <div>
                  <p className="font-semibold text-[#1E3A4A]">Marcus</p>
                  <p className="text-sm text-gray-600">
                    4Ever Forward Foundation Grant Program
                  </p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden rounded-tr-3xl pointer-events-none">
                <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full border-2 border-[#F5A623]/10" />
              </div>
            </div>

            {/* Second dad voice */}
            <div className="relative bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-gray-100 overflow-hidden">
              <Quote className="w-10 h-10 text-[#3DAA8A]/20 mb-6" />
              <blockquote
                className="text-xl text-[#1E3A4A] leading-relaxed mb-8"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                When the schedule got disputed, I didn&apos;t panic — I exported
                the record and handed it to my attorney in five minutes. The
                back-and-forth stopped, and I went from every-other-weekend to
                real midweek time with my daughter.
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#3DAA8A] font-semibold text-lg">D</span>
                </div>
                <div>
                  <p className="font-semibold text-[#1E3A4A]">Derek</p>
                  <p className="text-sm text-gray-600">
                    Dad of one, 14 months on CommonGround
                  </p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden rounded-tr-3xl pointer-events-none">
                <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full border-2 border-[#3DAA8A]/10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EARLY ADOPTER CTA */}
      <section id="early-adopter" className="py-20 lg:py-28 bg-white scroll-mt-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-[#F5A623] font-medium mb-3 tracking-wide uppercase text-sm">
              Early Adopter Offer
            </p>
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Your Kids Need You Present
            </h2>
            <p className="text-gray-600 text-lg">
              Join the first 50 members and lock in 30% off for life.
              No credit card required. Just your email.
            </p>
          </div>
          <EarlyAdopterForm source="for_dads" />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-24 bg-[#F4F8F7]">
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className="text-3xl sm:text-4xl text-[#1E3A4A] mb-12 text-center"
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
                  <h3 className="font-semibold text-[#1E3A4A] text-left">{faq.q}</h3>
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
              className="inline-flex items-center gap-2 text-[#3DAA8A] font-semibold hover:text-[#2E9577] transition-colors"
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

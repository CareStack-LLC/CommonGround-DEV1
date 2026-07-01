import type { Metadata } from 'next';
import Image from 'next/image';
import { EarlyAdopterForm } from '@/components/marketing/early-adopter-form';
import { JsonLd } from '@/components/marketing/json-ld';
import { FaqJsonLd } from '@/components/marketing';
import {
  Video,
  BookOpen,
  Film,
  Gamepad2,
  ShieldCheck,
  CheckCircle,
  ChevronDown,
  Quote,
  Gift,
  Heart,
  Smartphone,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'KidSpace for grandparents & extended family | CommonGround',
  description:
    'Grandparents, aunts, and uncles stay in the kids’ world with KidSpace — safe, parent-approved video calls, bedtime stories, movie nights, and games, even from miles away.',
  alternates: { canonical: '/grandparents' },
  openGraph: {
    type: 'website',
    title: 'KidSpace for grandparents & extended family | CommonGround',
    description:
      'Safe, parent-approved video calls, stories, movie nights, and games that keep grandparents, aunts, and uncles close to the kids — from anywhere.',
    url: 'https://www.find-commonground.com/grandparents',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KidSpace for grandparents & extended family | CommonGround',
    description:
      'Stay in the kids’ world — safe, simple video calls, stories, movies, and games for the whole family.',
  },
};

const heroTrust = [
  'Parent-approved & safe',
  'Works on any device',
  'No tech skills needed',
  'Free to try',
];

const doTogether = [
  {
    icon: Video,
    title: 'Video & voice calls',
    body: 'A quick “goodnight, sweetheart” or a long catch-up — call the grandkids in their own safe space, on a schedule that works for everyone.',
    accent: '#3DAA8A',
  },
  {
    icon: BookOpen,
    title: 'Read stories together',
    body: 'Be the voice of bedtime again. Read the same book on the same screen, turning pages together from two homes — or two time zones.',
    accent: '#F5A623',
  },
  {
    icon: Film,
    title: 'Family movie night',
    body: 'Press play together and watch an age-appropriate movie in sync. Popcorn optional. Being there is the point.',
    accent: '#2D6A8F',
  },
  {
    icon: Gamepad2,
    title: 'Play games together',
    body: 'Cooperative games and a shared whiteboard. Beat Grandpa at tic-tac-toe, draw silly pictures — connection that feels like play.',
    accent: '#E85D75',
  },
];

const safeSimple = [
  {
    icon: ShieldCheck,
    title: 'Parents approve every contact',
    body: 'The kids’ parents add you through My Circle. You only ever see and reach the children their parents have approved.',
  },
  {
    icon: Heart,
    title: 'ARIA keeps it safe',
    body: 'Calls and messages are gently monitored for safety, and everything is private. Loving connection, zero worry.',
  },
  {
    icon: Smartphone,
    title: 'Simple enough for anyone',
    body: 'No complicated setup. Tap to call, tap to read, tap to watch. Works on the phone or tablet you already own.',
  },
];

const faqs = [
  {
    q: 'Do I need to be tech-savvy to use it?',
    a: 'Not at all. KidSpace is built to be tap-simple — one button to start a video call, read a story, or watch a movie together. If you can make a phone call, you can use KidSpace.',
  },
  {
    q: 'Who controls whether I can reach the kids?',
    a: 'The children’s parents do. They add approved family members through My Circle and set the rules — so you’re always welcome, and always within the boundaries the parents are comfortable with.',
  },
  {
    q: 'Is it safe for the children?',
    a: 'Yes. Every contact is parent-approved, calls and messages are monitored by ARIA for safety, and parents can set calling hours and end any call. KidSpace is built around the kids, not the conflict.',
  },
  {
    q: 'What devices does it work on?',
    a: 'Any modern phone, tablet, or computer. Most grandparents use a tablet — the bigger screen makes story time and movie nights feel close.',
  },
  {
    q: 'Can I give KidSpace as a gift?',
    a: 'Absolutely. Many grandparents and aunts gift or cover a plan just to keep their weekly movie nights and bedtime stories going. It may be the most meaningful gift you give all year.',
  },
];

const story = [
  { time: 'Every Sunday', tone: 'before', text: 'Carol used to wait by the phone, never sure the call would come. Caught between her son and his ex, she had become something to negotiate over.' },
  { time: 'Birthday after birthday', tone: 'before', text: 'They passed with a text, if that. She loved those kids more than anything and saw them less than she saw the mailman.' },
  { time: 'The month it changed', tone: 'turn', text: 'The family set up KidSpace in CommonGround — approved contacts and scheduled calls, so no parent had to broker every hello.' },
  { time: 'Now', tone: 'after', text: 'Sunday at 4 is hers. The call just happens. She reads the same bedtime story she once read their father — two states away, every single week.' },
  { time: 'These days', tone: 'after', kicker: true, text: 'Her granddaughter calls it “Grandma o’clock.” Carol hasn’t missed one yet.' },
];

export default function GrandparentsPage() {
  return (
    <div className="min-h-screen">
      <FaqJsonLd items={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'KidSpace for Grandparents & Extended Family',
          description:
            'Safe, parent-approved video calls, stories, movie nights, and games that keep grandparents, aunts, and uncles connected to the children.',
          url: 'https://www.find-commonground.com/grandparents',
          provider: {
            '@type': 'Organization',
            name: 'CommonGround',
            url: 'https://www.find-commonground.com',
          },
        }}
      />

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F4F8F7] via-[#F4F8F7] to-white" />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid items-center gap-10 lg:gap-14 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <p className="text-[#F5A623] font-medium mb-4 tracking-wide uppercase text-sm">
                For grandparents, aunts &amp; uncles
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-[3.4rem] text-[#1E3A4A] mb-6 leading-[1.1] tracking-tight"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                Stay in their world —{' '}
                <span className="text-[#3DAA8A]">even from miles away.</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                Don&apos;t let distance or a separation quietly cost you the grandkids.
                Once parents approve you through My Circle, KidSpace gives the whole
                family a safe, simple way to call, read, watch, and play together &mdash;
                so you don&apos;t miss the little moments. You&apos;re just there.
              </p>
              <a
                href="#early-adopter"
                className="inline-flex items-center gap-2 bg-[#3DAA8A] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:bg-[#2E9577] hover:shadow-lg hover:shadow-[#3DAA8A]/20 text-base"
              >
                Start staying close &mdash; free to try
              </a>
              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-gray-600">
                {heroTrust.map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-[#3DAA8A]" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <Image
                src="/images/marketing/cg_grandparents_call.jpg"
                alt="A grandmother joyfully waving at her grandchild during a KidSpace video call"
                width={1200}
                height={800}
                priority
                className="w-full h-auto rounded-3xl shadow-xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ EMOTIONAL BEAT ═══════════════ */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-3xl sm:text-4xl text-[#1E3A4A] mb-6"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            They grow up so fast. <span className="text-[#3DAA8A]">Don&apos;t miss it.</span>
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            A move across the country. A separation that made things complicated. Schedules
            that never line up. The reasons families drift apart are real — but the love
            doesn&apos;t have to fade with the miles. KidSpace turns &ldquo;we hardly see
            them anymore&rdquo; into a standing Wednesday movie night and a bedtime story
            you read together.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          STORY — A short narrative that captivates
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-[#F4F8F7] to-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-medium mb-3 tracking-wide uppercase text-sm" style={{ color: '#F5A623' }}>
              A day in the life
            </p>
            <h2
              className="text-3xl sm:text-4xl lg:text-[2.75rem] text-[#1E3A4A] leading-[1.15]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              The video call Grandma
              <br className="hidden sm:block" /> almost didn’t get
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
            Carol didn’t take sides or fight for time. She just got a door that stays
            open. Here’s what keeps it that way.
          </p>
        </div>
      </section>

      {/* ═══════════════ WHAT YOU CAN DO TOGETHER ═══════════════ */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-[#F4F8F7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid items-center gap-10 lg:gap-16 lg:grid-cols-2 mb-16">
            <div className="order-2 lg:order-1">
              <p className="text-[#3DAA8A] font-medium mb-3 tracking-wide uppercase text-sm">
                More than a phone call
              </p>
              <h2
                className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4 leading-tight"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                Do real things together, not just talk
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                A five-minute call is lovely. But bonding happens in the doing — the same
                story, the same movie, the same silly game. KidSpace lets you share the
                moment, not just the screen.
              </p>
            </div>
            <div className="order-1 lg:order-2 relative mx-auto w-full max-w-xl lg:max-w-none">
              <Image
                src="/images/marketing/cg_grandparents_together.jpg"
                alt="A grandfather and grandchild reading a story together on a tablet"
                width={1000}
                height={667}
                className="w-full h-auto rounded-3xl shadow-xl object-cover"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
            {doTogether.map((d) => {
              const Icon = d.icon;
              return (
                <div
                  key={d.title}
                  className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `${d.accent}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: d.accent }} />
                  </div>
                  <h3
                    className="text-xl text-[#1E3A4A] mb-2"
                    style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                  >
                    {d.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-[15px]">{d.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ SAFE & SIMPLE ═══════════════ */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Safe for the kids. <span className="text-[#3DAA8A]">Simple for you.</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              KidSpace isn&apos;t unsupervised internet time. It&apos;s a protected space
              the parents control — and it&apos;s easy enough for anyone to use.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {safeSimple.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="bg-[#F4F8F7] rounded-2xl p-8 text-center">
                  <div className="w-14 h-14 bg-[#3DAA8A]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Icon className="w-7 h-7 text-[#3DAA8A]" />
                  </div>
                  <h3 className="font-bold text-[#1E3A4A] mb-2">{s.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-[15px]">{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ GIFT / SOCIAL PROOF ═══════════════ */}
      <section className="py-20 lg:py-24 bg-[#F4F8F7]">
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          <div className="bg-[#FEF7ED] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Gift className="w-10 h-10 text-amber-600" />
            </div>
            <div>
              <h3
                className="text-2xl md:text-3xl text-[#1E3A4A] mb-3"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                The gift that keeps the family close
              </h3>
              <p className="text-gray-600 text-lg">
                Many grandparents and aunts cover a plan themselves — just to protect their
                weekly movie night and bedtime stories. It&apos;s the kind of gift the whole
                family feels, all year long.
              </p>
            </div>
          </div>

          <div className="relative bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100">
            <Quote className="w-10 h-10 text-[#3DAA8A]/20 mb-6" />
            <blockquote
              className="text-xl sm:text-2xl text-[#1E3A4A] leading-relaxed mb-8"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              I live three states away and I used to only see my granddaughter in photos.
              Now we read a story every Sunday night. She calls it &ldquo;our book.&rdquo;
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#F5A623]/15 flex items-center justify-center">
                <span className="text-[#F5A623] font-semibold text-lg">G</span>
              </div>
              <div>
                <p className="font-semibold text-[#1E3A4A]">Grandma Lewis</p>
                <p className="text-sm text-gray-600">KidSpace family member</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ EARLY ADOPTER CTA ═══════════════ */}
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
              Don&apos;t miss another bedtime story
            </h2>
            <p className="text-gray-600 text-lg">
              Join the early list and be first to start weekly calls, stories, and
              movie nights in KidSpace. No credit card required &mdash; just your email.
            </p>
          </div>
          <EarlyAdopterForm source="grandparents" />
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section className="py-20 lg:py-24 bg-[#F4F8F7]">
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className="text-3xl sm:text-4xl text-[#1E3A4A] mb-12 text-center"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Questions families ask
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
        </div>
      </section>
    </div>
  );
}

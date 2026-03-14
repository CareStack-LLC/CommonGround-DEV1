'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  MessageSquare,
  Shield,
  Brain,
  TrendingUp,
  Heart,
  ArrowRight,
  Check,
  RefreshCw,
} from 'lucide-react';

/**
 * ARIA Feature Page
 *
 * Matches homepage design with ARIA mascot for KidComs section
 */

const features = [
  {
    icon: Shield,
    title: 'Supports clarity before you send',
    description: 'ARIA reads your message and gently flags language that could be misread or cause tension.',
  },
  {
    icon: RefreshCw,
    title: 'Suggests gentler alternatives',
    description: 'Not rewriting your words—just showing you how it might land better.',
  },
  {
    icon: TrendingUp,
    title: 'Builds your court record',
    description: 'Every time you accept a suggestion, you\'re building evidence of good faith.',
  },
  {
    icon: Brain,
    title: 'Learns your agreement',
    description: 'ARIA knows your custody terms and can reference them when helping you communicate.',
  },
];

const beforeAfter = [
  {
    before: '"You NEVER follow the schedule!"',
    after: '"I noticed some schedule changes. Can we discuss?"',
  },
  {
    before: '"This is ALL your fault."',
    after: '"Let\'s focus on how to handle this going forward."',
  },
  {
    before: '"I guess you just don\'t care about the kids."',
    after: '"I want to make sure the kids have what they need."',
  },
];

export default function ARIAPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#F5F9F9]">
      {/* Hero */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--portal-primary)]/10 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[var(--portal-primary)]" />
            <span className="text-sm font-medium text-[var(--portal-primary)]">AI-Powered Communication</span>
          </div>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#1E3A4A] mb-6 leading-[1.05]"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Meet <span className="text-[#F5A623]">ARIA</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 mb-4">
            AI Relationship Intelligence Assistant
          </p>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            ARIA helps you communicate with calm and clarity—before you hit send.
            <span className="font-medium text-[var(--portal-primary)]"> Think of her as a supportive guide for every message.</span>
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 bg-[var(--portal-primary)] text-white font-semibold rounded-full hover:bg-[#2D6A8F] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
          >
            Try ARIA Free
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* How ARIA Works - Demo */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] text-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-serif mb-6"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                See ARIA in action
              </h2>
              <p className="text-lg text-white/80 mb-6">
                You write what you're thinking. ARIA highlights what could be misread.
                You decide whether to adjust your tone — or send as-is.
              </p>
              <p className="text-white/60 italic">
                "ARIA saved me from sending so many messages I'd regret."
                <br />
                <span className="text-white/40">— Parent in California</span>
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              {/* Chat demo */}
              <div className="bg-[#0b141a] rounded-2xl p-4 shadow-2xl">
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="relative max-w-[85%]">
                      <div className="bg-[#005c4b] text-white px-4 py-2.5 rounded-2xl rounded-br-md shadow-lg">
                        <p className="text-[15px] leading-relaxed">
                          You're always late. This is ridiculous.
                        </p>
                        <p className="text-[11px] text-white/50 text-right mt-1">Draft</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center my-2">
                    <div className="bg-[#F5A623] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                      ⚠️ ARIA ALERT
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#F5A623]/30 to-[#F5A623]/10 rounded-2xl p-4 border border-[#F5A623]/40 shadow-lg mx-2">
                    <p className="text-[#F5A623] font-semibold text-sm mb-2">A calmer approach</p>
                    <p className="text-white/90 text-sm leading-relaxed">
                      "Always" is an absolutist word that typically triggers defensiveness. Try focusing on the specific instance.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
                        Use suggestion
                      </button>
                      <button className="bg-white/10 hover:bg-white/20 text-white/70 text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
                        Send anyway
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              More than <span className="text-[#F5A623]">a messaging tool</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              ARIA understands context, supports cooperative communication, and helps you build a record of good faith.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-gradient-to-br from-[#F5F9F9] to-white rounded-3xl p-8 border-2 border-[var(--portal-primary)]/10 hover:border-[var(--portal-primary)]/30 transition-all hover:shadow-lg group"
                >
                  <div className="h-14 w-14 rounded-2xl bg-[var(--portal-primary)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon className="h-7 w-7 text-[var(--portal-primary)]" />
                  </div>
                  <h3
                    className="text-xl font-semibold text-[#1E3A4A] mb-3"
                    style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Before & After */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              The ARIA <span className="text-[#F5A623]">difference</span>
            </h2>
          </div>

          <div className="space-y-6">
            {beforeAfter.map((item, index) => (
              <div key={index} className="grid md:grid-cols-2 gap-4">
                <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-red-500 font-bold text-sm">✗ BEFORE</span>
                  </div>
                  <p className="text-red-700 font-medium">{item.before}</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-green-600 font-bold text-sm">✓ WITH ARIA</span>
                  </div>
                  <p className="text-green-700 font-medium">{item.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARIA for Kids (KidComs) - with mascot */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-[#F4F8F7] to-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5A623]/10 rounded-full mb-6">
                <Heart className="w-4 h-4 text-[#F5A623]" />
                <span className="text-sm font-medium text-[#F5A623]">Child-First Design</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-6"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                ARIA keeps kids <span className="text-[#F5A623]">protected</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                When children use KidComs to talk with their other parent, ARIA provides gentle, age-appropriate
                guardrails. Children stay protected and supported in a safe space.
              </p>
              <ul className="space-y-3">
                {[
                  'Filters inappropriate content automatically',
                  'Alerts parents to concerning patterns',
                  'Age-appropriate conversation guidance',
                  'Creates a safe space for parent-child connection',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#F5A623]/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#F5A623]" />
                    </div>
                    <span className="text-[#1E3A4A]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ARIA Mascot */}
            <div className="relative flex justify-center">
              <div className="relative">
                {/* Decorative background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#F5A623]/20 to-[var(--portal-primary)]/20 rounded-full blur-3xl scale-110" />

                {/* Mascot with actual image */}
                <div className="relative bg-white rounded-3xl p-8 shadow-2xl border-4 border-[#F5A623]/20">
                  <div className="w-48 h-48 mx-auto relative">
                    <Image
                      src="/images/Aria.png"
                      alt="ARIA - AI Relationship Intelligence Assistant"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p
                    className="text-center text-[#1E3A4A] font-semibold mt-4"
                    style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                  >
                    Hi! I'm ARIA
                  </p>
                  <p className="text-center text-gray-500 text-sm mt-1">
                    I help families communicate better
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Heart className="w-12 h-12 mx-auto mb-6 text-[#F5A623]" />
          <h2
            className="text-4xl sm:text-5xl font-serif mb-6"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Ready to communicate better?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            ARIA is included free with every CommonGround account.
            Your co-parent will thank you (eventually).
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-10 py-5 bg-[#F5A623] text-white font-bold text-lg rounded-full hover:bg-[#c26647] transition-all shadow-2xl hover:-translate-y-1 group"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Brain,
  Check,
  FileText,
  Heart,
  MessageSquare,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';

/**
 * ARIA Feature Page
 *
 * Redesigned to lead with the emotional problem (hostile co-parent texts)
 * and position ARIA as the calm voice that changes everything.
 */

const capabilities = [
  {
    icon: Shield,
    title: 'Catches tension before you send',
    description:
      'ARIA reads every message and gently flags language that could be misread, escalate conflict, or hurt your case. You always have the final say.',
  },
  {
    icon: RefreshCw,
    title: 'Suggests a calmer way to say it',
    description:
      'Not rewriting your words — showing you how they might land, and offering an alternative that keeps your meaning without the edge.',
  },
  {
    icon: Brain,
    title: 'Knows your custody agreement',
    description:
      'ARIA references your specific parenting plan, schedule, and court orders. When you\u2019re unsure what you agreed to, she can remind you.',
  },
  {
    icon: TrendingUp,
    title: 'Builds your court record',
    description:
      'Every time you accept a suggestion, you\u2019re building documented evidence of good-faith communication — timestamped, verified, court-ready.',
  },
  {
    icon: Zap,
    title: 'Shields you from incoming hostility',
    description:
      'ARIA reviews messages you receive, too. She can summarize hostile incoming texts so you get the information without the emotional impact.',
  },
  {
    icon: FileText,
    title: 'Helps you draft agreements',
    description:
      'Need to propose a schedule change or respond to a request? ARIA helps you compose clear, neutral language that keeps the focus on your kids.',
  },
];

const beforeAfter = [
  {
    before: '"You NEVER follow the schedule!"',
    after: '"I noticed the pickup was different from what we agreed. Can we talk about it?"',
  },
  {
    before: '"This is ALL your fault."',
    after: '"This situation is frustrating. Let\u2019s focus on what we can do going forward."',
  },
  {
    before: '"I guess you just don\u2019t care about the kids."',
    after: '"I want to make sure the kids have what they need. Here\u2019s what I\u2019m thinking."',
  },
  {
    before: '"My lawyer is going to hear about this."',
    after: '"I\u2019d like to document this concern. Can we discuss a solution first?"',
  },
];

export default function ARIAPage() {
  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-[#3DAA8A]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-[#F5A623]/6 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5A623]/10 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[#F5A623]" />
            <span className="text-sm font-medium text-[#F5A623]">
              AI-Powered Communication Coach
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-[3.5rem] text-[#1E3A4A] mb-6 leading-[1.1]"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            The message you almost sent{' '}
            <span className="text-[#F5A623]">could have changed everything.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-4">
            ARIA is your AI co-parenting coach. She reads every message before
            you send it — catching the tone that escalates, suggesting the words
            that de-escalate, and building a court-ready record of good faith
            along the way.
          </p>

          <p className="text-base text-gray-500 max-w-xl mx-auto mb-10">
            Think of her as the calm voice in your head that stops you from
            hitting send on the text you\u2019d regret tomorrow.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-[#3DAA8A] text-white font-medium px-8 py-4 rounded-full text-lg transition-all duration-200 hover:bg-[#34967a] hover:shadow-xl hover:-translate-y-0.5"
            >
              Try ARIA Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 border-2 border-[#3DAA8A] text-[#3DAA8A] font-medium px-8 py-4 rounded-full text-lg transition-all duration-200 hover:bg-[#3DAA8A] hover:text-white"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ── How ARIA Works — Interactive Demo ────────────────────── */}
      <section
        id="how-it-works"
        className="py-16 lg:py-24 bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white"
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-3xl sm:text-4xl mb-6"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                See ARIA in action
              </h2>
              <p className="text-lg text-white/80 mb-6 leading-relaxed">
                You type what you\u2019re feeling. ARIA catches what could go
                wrong. You decide whether to adjust — or send as-is. She never
                blocks you. She just makes sure you\u2019re choosing, not
                reacting.
              </p>

              <div className="space-y-4 mt-8">
                {[
                  'Works in real-time as you type',
                  'You always have the final say',
                  'Every suggestion is optional',
                  'Learns your communication patterns over time',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-white/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat demo mockup */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/20">
              <div className="bg-[#0b141a] rounded-2xl p-5 shadow-2xl">
                <div className="space-y-4">
                  {/* User draft message */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="bg-[#005c4b] text-white px-4 py-3 rounded-2xl rounded-br-md shadow-lg">
                        <p className="text-[15px] leading-relaxed">
                          You\u2019re always late. This is ridiculous. I\u2019m
                          done dealing with this.
                        </p>
                        <p className="text-[11px] text-white/40 text-right mt-1.5">
                          Draft
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ARIA alert */}
                  <div className="flex justify-center">
                    <div className="bg-[#F5A623] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      ARIA suggestion
                    </div>
                  </div>

                  {/* ARIA suggestion */}
                  <div className="bg-gradient-to-br from-[#F5A623]/25 to-[#F5A623]/10 rounded-2xl p-4 border border-[#F5A623]/30 mx-1">
                    <p className="text-[#F5A623] font-semibold text-sm mb-2">
                      A calmer approach
                    </p>
                    <p className="text-white/80 text-sm leading-relaxed mb-1">
                      Words like &ldquo;always&rdquo; and &ldquo;done dealing
                      with this&rdquo; can escalate quickly. Try focusing on the
                      specific issue:
                    </p>
                    <p className="text-white text-sm leading-relaxed italic mt-2 bg-white/10 rounded-lg px-3 py-2">
                      &ldquo;The last two pickups were 20+ minutes late. Can we
                      find a time that works better for both of us?&rdquo;
                    </p>
                    <div className="flex gap-2 mt-3">
                      <span className="bg-white/20 text-white text-xs font-medium px-4 py-2 rounded-full">
                        Use suggestion
                      </span>
                      <span className="bg-white/10 text-white/60 text-xs font-medium px-4 py-2 rounded-full">
                        Edit myself
                      </span>
                      <span className="bg-white/5 text-white/40 text-xs font-medium px-4 py-2 rounded-full">
                        Send as-is
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The ARIA Difference — Before & After ─────────────────── */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              The ARIA{' '}
              <span className="text-[#F5A623]">difference</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Same intent. Same frustration. Completely different outcome. ARIA
              helps you say what you mean without saying something you\u2019ll
              regret.
            </p>
          </div>

          <div className="space-y-4">
            {beforeAfter.map((item, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-0"
              >
                {/* Before */}
                <div className="flex-1 bg-red-50 rounded-xl sm:rounded-r-none px-6 py-5 border-l-4 border-red-300">
                  <p className="text-red-400 text-xs font-semibold uppercase tracking-wide mb-1.5">
                    Without ARIA
                  </p>
                  <p className="text-red-700 font-medium">{item.before}</p>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center sm:px-3 text-[#3DAA8A]">
                  <ArrowRight className="w-5 h-5 rotate-90 sm:rotate-0" />
                </div>

                {/* After */}
                <div className="flex-1 bg-[#3DAA8A]/5 rounded-xl sm:rounded-l-none px-6 py-5 border-l-4 border-[#3DAA8A]">
                  <p className="text-[#3DAA8A] text-xs font-semibold uppercase tracking-wide mb-1.5">
                    With ARIA
                  </p>
                  <p className="text-[#1E3A4A] font-medium">{item.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities ─────────────────────────────────────────── */}
      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              More than a{' '}
              <span className="text-[#3DAA8A]">messaging tool</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              ARIA understands the dynamics of co-parenting conflict. She
              doesn\u2019t just check your grammar — she understands what\u2019s
              at stake.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="group bg-white rounded-2xl p-7 border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#3DAA8A]/10 flex items-center justify-center mb-5 group-hover:bg-[#3DAA8A] group-hover:text-white transition-all duration-300">
                    <Icon className="w-6 h-6 text-[#3DAA8A] group-hover:text-white transition-colors" />
                  </div>
                  <h3
                    className="text-lg text-[#1E3A4A] mb-2"
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                    }}
                  >
                    {cap.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {cap.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ARIA for KidSpace ────────────────────────────────────── */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5A623]/10 rounded-full mb-6">
                <Heart className="w-4 h-4 text-[#F5A623]" />
                <span className="text-sm font-medium text-[#F5A623]">
                  Child-First Design
                </span>
              </div>
              <h2
                className="text-3xl sm:text-4xl text-[#1E3A4A] mb-6"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                ARIA keeps kids{' '}
                <span className="text-[#F5A623]">out of the middle</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                When children use KidSpace to talk with their other parent, ARIA
                provides gentle, age-appropriate guardrails. She makes sure the
                space stays safe — so kids can just be kids.
              </p>
              <ul className="space-y-4">
                {[
                  'Filters inappropriate content before it reaches children',
                  'Alerts parents to concerning language patterns',
                  'Provides age-appropriate conversation guidance',
                  'Creates a safe, monitored space for parent-child connection',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-[#F5A623]/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-[#F5A623]" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ARIA mascot */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F5A623]/15 to-[#3DAA8A]/15 rounded-full blur-3xl scale-110" />
                <div className="relative bg-gradient-to-br from-[#F4F8F7] to-white rounded-3xl p-10 shadow-xl border border-gray-100">
                  <div className="w-48 h-48 mx-auto relative">
                    <Image
                      src="/images/Aria.png"
                      alt="ARIA - AI Relationship Intelligence Assistant"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p
                    className="text-center text-[#1E3A4A] text-xl mt-5"
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                    }}
                  >
                    Hi! I&rsquo;m ARIA
                  </p>
                  <p className="text-center text-gray-500 text-sm mt-1">
                    I help families communicate with calm and clarity
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust & Privacy ──────────────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#F4F8F7] to-white rounded-2xl p-8 lg:p-12 border border-gray-100">
            <div className="text-center mb-8">
              <h2
                className="text-2xl sm:text-3xl text-[#1E3A4A] mb-3"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                Built on trust,{' '}
                <span className="text-[#3DAA8A]">not surveillance</span>
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                ARIA is a coach, not a spy. Here\u2019s what that means:
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  title: 'You\u2019re always in control',
                  desc: 'ARIA suggests — you decide. Every message is your choice. She never sends anything without your approval.',
                },
                {
                  title: 'Private by default',
                  desc: 'Your drafts and ARIA\u2019s suggestions are never shared with your co-parent. Only what you choose to send is visible.',
                },
                {
                  title: 'Court-admissible records',
                  desc: 'Sent messages are SHA-256 verified and timestamped. Accepted in courts across all 50 states.',
                },
                {
                  title: 'No data selling, ever',
                  desc: 'Your family\u2019s communication is never used for advertising, training, or sold to third parties.',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-[#3DAA8A]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1E3A4A] mb-1">
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F5A623]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <Heart className="w-10 h-10 mx-auto mb-6 text-[#F5A623]" />
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl mb-6"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Every calm message is a better day for your kids
          </h2>
          <p className="text-xl text-white/75 mb-10 max-w-xl mx-auto leading-relaxed">
            ARIA is included free with every CommonGround account. Start
            communicating differently today.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-[#F5A623] text-white font-semibold text-lg px-10 py-5 rounded-full shadow-xl transition-all duration-300 hover:bg-[#E09520] hover:-translate-y-1 hover:shadow-2xl"
          >
            Get Started Free
            <ArrowRight className="w-6 h-6" />
          </Link>
          <p className="text-sm text-white/40 mt-5">
            No credit card required. Free tier includes ARIA.
          </p>
        </div>
      </section>
    </div>
  );
}

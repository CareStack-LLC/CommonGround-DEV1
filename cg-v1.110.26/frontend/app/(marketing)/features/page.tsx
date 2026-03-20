import Link from 'next/link';
import { ImagePlaceholder } from '@/components/marketing/image-placeholder';
import { JsonLd } from '@/components/marketing/json-ld';
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
  Check,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    problem: 'Every message feels like a minefield',
    solution: 'AI that helps you communicate with calm',
    detail:
      "ARIA doesn't rewrite your words or censor you. It gently highlights language that could be misread — so you can choose to rephrase before sending. You stay in control of every message.",
    differentiator:
      'Unlike tone rewriters that put words in your mouth, ARIA helps you see how your words will land — then lets you decide.',
    benefit: 'Grant program parents reported calmer messaging',
    color: '#F5A623',
    image: {
      alt: 'ARIA messaging interface with AI suggestion',
      prompt:
        'Clean UI mockup of messaging interface showing draft message with AI suggestion overlay, teal and gold UI, dark chat background, mobile app style, no text',
    },
  },
  {
    icon: Calendar,
    problem: 'Coordinating schedules never ends',
    solution: 'Set your custody schedule once. TimeBridge handles the rest.',
    detail:
      'Automated recurring pickups, dropoffs, holiday rotations, and special events. Both parents get reminders. No more "did you forget it\'s your weekend?" texts at 6 PM Friday.',
    differentiator:
      "Not just a shared calendar — TimeBridge automates recurring events and reminders so you don't have to coordinate anything.",
    benefit: 'Zero coordination required',
    color: 'var(--portal-primary)',
    image: {
      alt: 'TimeBridge automated custody calendar',
      prompt:
        'Clean calendar UI mockup showing custody schedule with color-coded parent days in teal and gold, automated reminder notification popup, modern app interface, no text',
    },
  },
  {
    icon: DollarSign,
    problem: 'Money discussions become arguments',
    solution: 'Track every dollar, split costs automatically',
    detail:
      'ClearFund handles school fees, medical bills, and extracurriculars. Upload receipts, set split percentages, track payments. Clear records for court if you ever need them.',
    differentiator:
      'No transaction fees. No payment processing delays. Just clear, documented financial records both parents can see.',
    benefit: '100% payment transparency',
    color: '#F5A623',
    image: {
      alt: 'ClearFund expense tracking dashboard',
      prompt:
        'Clean expense tracking UI showing receipt upload, split percentage selector, payment history chart with teal and gold accent colors, modern dashboard style, no text',
    },
  },
  {
    icon: Video,
    problem: 'Calling your kids means coordinating with your ex',
    solution: 'Video call your children directly — no middleman',
    detail:
      'KidSpace gives you a direct line to your children. Schedule calls, watch movies together, and stay connected across households. High-quality video with logs for your records.',
    differentiator:
      'No other co-parenting app lets your children video call, watch movies, and stay connected in a child-safe space.',
    benefit: 'Stay connected on your terms',
    color: 'var(--portal-primary)',
    unique: true,
    image: {
      alt: 'KidSpace parent-child video call',
      prompt:
        'Warm illustration of parent and child on video call, kid-friendly colorful UI with storybook elements, teal accent, movie night feature visible, no text',
    },
  },
  {
    icon: MapPin,
    problem: 'Exchanges feel stressful for everyone — especially the kids',
    solution: 'GPS-verified, contactless exchanges with QR confirmation',
    detail:
      'Drop off at a public location. GPS confirms arrival. QR code confirms pickup. Zero interaction required. Complete records of every exchange with timestamps and locations.',
    differentiator:
      'The only co-parenting app with GPS + QR code verification for zero-contact custody exchanges.',
    benefit: 'Verified exchanges, zero stress',
    color: '#F5A623',
    unique: true,
    image: {
      alt: 'Silent Handoff GPS exchange verification',
      prompt:
        'Map UI showing GPS exchange location with QR code check-in confirmation, timestamp overlay, clean teal UI, mobile app style, no text',
    },
  },
  {
    icon: FileCheck,
    problem: 'Gathering evidence for court takes forever',
    solution: 'One-click court-ready evidence packages',
    detail:
      'Export messages, schedules, expenses, custody time, and exchange logs in court-accepted formats. SHA-256 verification proves authenticity. Everything organized and timestamped.',
    differentiator:
      'SHA-256 tamper-proof verification — the strongest evidence integrity standard available in any co-parenting app.',
    benefit: 'Professional evidence bundles',
    color: 'var(--portal-primary)',
    image: {
      alt: 'Court-ready evidence export preview',
      prompt:
        'PDF export preview showing court-ready document with verification seal, organized sections for messages and schedules, professional formatting, no text',
    },
  },
  {
    icon: Clock,
    problem: 'Tracking parenting time for court is manual and tedious',
    solution: 'Automatic custody tracking with visual analytics',
    detail:
      'Every exchange, every overnight, every hour tracked automatically. Generate reports showing exactly who had the children when. Court-ready analytics that hold up under scrutiny.',
    differentiator:
      'Automatic tracking from exchange data — no manual entry. Visual charts and reports for attorneys and mediators.',
    benefit: 'Accurate time records for court',
    color: '#F5A623',
    image: {
      alt: 'Custody analytics dashboard',
      prompt:
        'Dashboard showing custody time pie chart, compliance metrics, parenting time bar graph, clean data visualization with teal and gold colors, no text',
    },
  },
];

const trustPoints = [
  { icon: Shield, text: 'Bank-level encryption' },
  { icon: Bell, text: 'Automated reminders' },
  { icon: CheckCircle, text: 'Court-admissible records' },
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

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--portal-primary)] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#F5A623] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#1E3A4A] mb-6 leading-[1.05]"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Every feature solves
            <br />
            <span className="text-[var(--portal-primary)]">one problem</span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
            Less coordination. More peace of mind. More automation.{' '}
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

      {/* Feature Deep-Dives — Alternating Layout */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto space-y-24">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            const isEven = idx % 2 === 0;

            return (
              <div
                key={feature.solution}
                className="grid lg:grid-cols-2 gap-12 items-center"
              >
                {/* Content */}
                <div className={isEven ? 'lg:order-1' : 'lg:order-2'}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="inline-flex p-3 rounded-xl"
                      style={{ backgroundColor: `color-mix(in srgb, ${feature.color} 10%, transparent)` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: feature.color }} />
                    </div>
                    {feature.unique && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#F5A623]/10 text-[#F5A623] text-xs font-bold rounded-full uppercase tracking-wide">
                        Only on CommonGround
                      </span>
                    )}
                  </div>

                  <p className="text-lg text-gray-400 mb-2 line-through decoration-[#F5A623]/30">
                    {feature.problem}
                  </p>

                  <h2
                    className="text-2xl sm:text-3xl font-serif text-[#1E3A4A] mb-4 leading-tight"
                    style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                  >
                    {feature.solution}
                  </h2>

                  <p className="text-gray-600 leading-relaxed mb-4">{feature.detail}</p>

                  <div className="bg-[#F4F8F7] rounded-xl p-4 mb-4 border-l-4 border-[var(--portal-primary)]">
                    <p className="text-sm text-[#1E3A4A] font-medium">{feature.differentiator}</p>
                  </div>

                  <div
                    className="inline-block px-4 py-2 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${feature.color} 8%, transparent)`,
                      color: feature.color,
                    }}
                  >
                    <Check className="w-4 h-4 inline mr-1" />
                    {feature.benefit}
                  </div>
                </div>

                {/* Image */}
                <div className={isEven ? 'lg:order-2' : 'lg:order-1'}>
                  <ImagePlaceholder
                    alt={feature.image.alt}
                    prompt={feature.image.prompt}
                    aspectRatio="4/3"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-20 px-6 bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#F5A623] rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif mb-6 leading-tight"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            The less you have to coordinate,
            <br />
            <span className="text-[#F5A623]">the more peace your family has</span>
          </h2>
          <p className="text-xl text-white/80 mb-8 leading-relaxed max-w-2xl mx-auto">
            We automate the coordination so you can focus on being a parent. Schedules run themselves. Money tracks itself. The kids stay connected.
          </p>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
            Everything you need. Nothing you don&apos;t. No forced mediation. No relationship coaching. Just structured tools that bring calm to your family.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif text-[#1E3A4A] mb-6"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Ready to find common ground?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Start with a free account. No credit card. No pressure. Just see if automation beats coordination.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
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
          <p className="mt-6 text-sm text-gray-500">
            Free tier includes ARIA messaging, basic scheduling, and ClearFund tracking. No fees.
          </p>
          <p className="mt-3 text-sm text-gray-400">
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

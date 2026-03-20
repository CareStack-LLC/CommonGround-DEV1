import Image from 'next/image';
import { EarlyAdopterForm } from '@/components/marketing/early-adopter-form';
import { JsonLd } from '@/components/marketing/json-ld';
import {
  FileCheck,
  Calendar,
  DollarSign,
  ArrowDown,
  CheckCircle,
  ChevronDown,
  Quote,
  Shield,
} from 'lucide-react';

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

const features = [
  {
    icon: FileCheck,
    name: 'Quick Accords',
    tagline: 'Agreements that stick',
    description:
      'Set up parenting agreements in minutes — not months. Both parents review, sign digitally, and get a copy. Holiday schedules, pickup rules, communication boundaries. Everything documented, nothing forgotten.',
    accent: '#F5A623',
  },
  {
    icon: Calendar,
    name: 'TimeBridge',
    tagline: 'Autopilot for your schedule',
    description:
      'Enter your custody arrangement once. TimeBridge creates recurring events, sends reminders to both parents, and handles holiday rotations. The system runs itself so you don\'t have to coordinate anything.',
    accent: '#3DAA8A',
  },
  {
    icon: DollarSign,
    name: 'ClearFund',
    tagline: 'Expenses on autopilot',
    description:
      'Set percentage splits for shared costs. Upload receipts. ClearFund calculates who owes what and sends reminders. No awkward money conversations. No chasing payments. Just clear, documented records.',
    accent: '#E85D75',
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
    q: 'What does "30% off for life" actually mean?',
    a: 'As one of our first 50 early adopters, your subscription rate is locked at 30% below the standard price for 36 months on any paid plan. The discount stays with your account regardless of future price changes.',
  },
];

export default function FreshStartPage() {
  return (
    <div className="min-h-screen">
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
            name: 'Early Adopter — 30% Off for Life',
            description: 'First 50 members get 30% off all subscriptions, locked for 36 months.',
            eligibleQuantity: { '@type': 'QuantitativeValue', value: 50 },
          },
        }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F4F8F7] via-[#F4F8F7] to-white" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#3DAA8A]/[0.04] blur-3xl -translate-y-1/3 translate-x-1/4" />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-[#3DAA8A] font-medium mb-4 tracking-wide uppercase text-sm">
                For your fresh start
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-[3.4rem] text-[#1E3A4A] mb-6 leading-[1.1] tracking-tight"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                The Hard Part Is Over.{' '}
                <span className="text-[#3DAA8A]">Don&apos;t Let Co-Parenting Undo It.</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
                You got through the divorce. You set boundaries. Things are running
                smoothly — for now. CommonGround locks in that progress with
                structure, automation, and documentation so a bad week doesn&apos;t
                become a bad year.
              </p>
              <a
                href="#early-adopter"
                className="inline-flex items-center gap-2 bg-[#3DAA8A] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:bg-[#2E9577] hover:shadow-lg hover:shadow-[#3DAA8A]/20 text-base"
              >
                Join the Early Adopter List
                <ArrowDown className="w-4 h-4" />
              </a>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-[#3DAA8A]/10">
                <Image
                  src="/images/Website pictes/divorce1.png"
                  alt="Co-parents finding structure after divorce with CommonGround"
                  width={1200}
                  height={800}
                  className="w-full h-auto object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full border-2 border-[#F5A623]/30 -z-10" />
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-[#3DAA8A]/10 -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Sound Familiar?
            </h2>
            <p className="text-gray-500 text-lg">
              These small cracks are how progress unravels. Structure prevents them.
            </p>
          </div>

          <div className="space-y-6">
            {painPoints.map((point, i) => (
              <div
                key={i}
                className="group relative bg-[#F4F8F7] rounded-2xl p-6 sm:p-8 border border-transparent hover:border-[#3DAA8A]/20 transition-colors duration-300"
              >
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                  <div className="flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
                      Without structure
                    </span>
                    <p className="text-gray-500 line-through decoration-[#E85D75]/40 decoration-2">
                      {point.old}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center">
                    <div className="w-8 h-px bg-[#3DAA8A]/40" />
                    <CheckCircle className="w-5 h-5 text-[#3DAA8A] mx-1 flex-shrink-0" />
                    <div className="w-8 h-px bg-[#3DAA8A]/40" />
                  </div>
                  <div className="sm:hidden flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#3DAA8A]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#3DAA8A]">
                      With CommonGround
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="hidden sm:block text-xs font-semibold uppercase tracking-wider text-[#3DAA8A] mb-2">
                      With CommonGround
                    </span>
                    <p className="text-[#1E3A4A] font-medium">
                      {point.cg}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-[#F4F8F7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[#3DAA8A] font-medium mb-3 tracking-wide uppercase text-sm">
              Structure that scales
            </p>
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Automate the Logistics. Protect the Peace.
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Set it up once. Let the system handle the coordination.
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
                  <p className="text-gray-500 leading-relaxed text-[15px]">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF — Rivera Family */}
      <section className="py-20 lg:py-24 bg-[#F4F8F7]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100">
            <Quote className="w-10 h-10 text-[#3DAA8A]/20 mb-6" />
            <blockquote
              className="text-xl sm:text-2xl text-[#1E3A4A] leading-relaxed mb-8"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Their mediator said it was the first time she had seen them
              cooperate — on anything — after two years of conflict.
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center">
                <span className="text-[#3DAA8A] font-semibold text-lg">R</span>
              </div>
              <div>
                <p className="font-semibold text-[#1E3A4A]">The Rivera Family</p>
                <p className="text-sm text-gray-500">
                  4Ever Forward Foundation Grant Program
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden rounded-tr-3xl">
              <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full border-2 border-[#F5A623]/10" />
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
              Protect Your Fresh Start
            </h2>
            <p className="text-gray-500 text-lg">
              Join the first 50 members and lock in 30% off for life.
              No credit card required. Just your email.
            </p>
          </div>
          <EarlyAdopterForm source="fresh_start" />
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
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 -mt-1">
                  <p className="text-gray-500 leading-relaxed">{faq.a}</p>
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

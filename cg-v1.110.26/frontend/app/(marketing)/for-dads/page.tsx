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

const painPoints = [
  {
    old: 'Every message you send gets twisted and used against you',
    cg: 'ARIA detects manipulative patterns and documents everything with timestamps',
  },
  {
    old: 'Walking on eggshells just to ask about your own kid\'s school play',
    cg: 'Structured messaging keeps conversations child-focused — no room for games',
  },
  {
    old: 'Missing bedtime stories because she won\'t hand over the phone',
    cg: 'KidSpace lets you video call, watch movies, and read together — on your own terms',
  },
  {
    old: 'No proof when she changes the story about what was agreed',
    cg: 'Every agreement, message, and schedule change is documented and court-ready',
  },
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
    q: 'What does "30% off for life" actually mean?',
    a: 'As one of our first 50 early adopters, your subscription rate is locked at 30% below the standard price for 36 months on any paid plan. The discount stays with your account regardless of future price changes.',
  },
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
                losing time with your kids. CommonGround documents what&apos;s
                really happening and gives you a way to stay present.
              </p>
              <a
                href="#early-adopter"
                className="inline-flex items-center gap-2 bg-[#3DAA8A] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:bg-[#2E9577] hover:shadow-lg hover:shadow-[#3DAA8A]/20 text-base"
              >
                Join the Early Adopter List
                <ArrowDown className="w-4 h-4" />
              </a>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <Image
                src="/images/marketing/cg_fordads_bond.jpg"
                alt="A father and his son laughing together outdoors"
                width={1200}
                height={800}
                priority
                className="w-full h-auto rounded-3xl shadow-xl object-cover"
              />
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
            <p className="text-gray-600 text-lg">
              You&apos;re not imagining it. And you don&apos;t have to keep tolerating it.
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
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2 block">
                      The reality
                    </span>
                    <p className="text-gray-600 line-through decoration-[#E85D75]/40 decoration-2">
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

      {/* SOCIAL PROOF — Marcus */}
      <section className="py-20 lg:py-24 bg-[#F4F8F7]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100">
            <Quote className="w-10 h-10 text-[#3DAA8A]/20 mb-6" />
            <blockquote
              className="text-xl sm:text-2xl text-[#1E3A4A] leading-relaxed mb-8"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              My son stopped asking &ldquo;is Mom mad?&rdquo; because the tension
              at handoffs had disappeared. Now we have a standing KidSpace movie
              night every Wednesday — even on weeks when we&apos;re apart.
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#2D6A8F]/10 flex items-center justify-center">
                <span className="text-[#2D6A8F] font-semibold text-lg">M</span>
              </div>
              <div>
                <p className="font-semibold text-[#1E3A4A]">Marcus</p>
                <p className="text-sm text-gray-600">
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

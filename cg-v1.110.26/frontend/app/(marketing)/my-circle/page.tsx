import Image from 'next/image';
import { EarlyAdopterForm } from '@/components/marketing/early-adopter-form';
import { JsonLd } from '@/components/marketing/json-ld';
import {
  Video,
  BookOpen,
  Gamepad2,
  ArrowDown,
  CheckCircle,
  ChevronDown,
  Quote,
  Shield,
  Heart,
} from 'lucide-react';

const painPoints = [
  {
    old: 'Only seeing your grandchild at holidays — if the parents can agree',
    cg: 'KidSpace lets you video call, read stories, and watch movies together anytime',
  },
  {
    old: 'Asking permission through one parent who controls all the access',
    cg: 'Parents set your access once — then you connect directly through KidSpace',
  },
  {
    old: 'Worrying the child is caught in the middle and losing family connections',
    cg: 'ARIA monitors every interaction for safety so parents feel confident saying yes',
  },
  {
    old: 'Feeling like you\'re overstepping by wanting to be part of their life',
    cg: 'KidSpace is designed for exactly this — family beyond the parents',
  },
];

const features = [
  {
    icon: Video,
    name: 'KidSpace Video Calls',
    tagline: 'Face time that matters',
    description:
      'Video calls designed for kids and family. Read a bedtime story. Watch a movie together. Just talk about their day. Parents control access and can end calls anytime — but you get real quality time, not a rushed phone handoff.',
    accent: '#3DAA8A',
  },
  {
    icon: BookOpen,
    name: 'Shared Activities',
    tagline: 'More than just a call',
    description:
      'Read stories together with the built-in library. Watch movies side by side. It\'s not just screen time — it\'s bonding time. Kids can show you their drawings, share what they\'re learning, and feel your presence even when you\'re miles away.',
    accent: '#F5A623',
  },
  {
    icon: Gamepad2,
    name: 'Safe & Monitored',
    tagline: 'Trust built into every interaction',
    description:
      'ARIA monitors all interactions for anything harmful. Parents have complete control — they approve access, can join or end any session, and everything is documented. This is how parents feel comfortable saying yes.',
    accent: '#E85D75',
  },
];

const faqs = [
  {
    q: 'Do the parents have to agree to let me use KidSpace?',
    a: 'Yes — and that\'s by design. Parents control who has access to their child through KidSpace. The key difference is that CommonGround makes it easy and safe for parents to say yes. With ARIA monitoring, documented interactions, and full parental controls, there\'s a framework of trust that doesn\'t exist with regular video calls.',
  },
  {
    q: 'What ages is KidSpace designed for?',
    a: 'KidSpace works for children of all ages. Younger children love the shared storytime and movie features. Older kids enjoy the games and the independence of connecting with family on their own terms. The interface adapts to be age-appropriate.',
  },
  {
    q: 'Can both parents give me access, or just one?',
    a: 'Either parent can add trusted family members to their child\'s KidSpace circle. The setup is simple — they add you, set your access level, and you\'re connected. Both parents can see who has access at any time.',
  },
  {
    q: 'What does "30% off for life" actually mean?',
    a: 'As one of our first 50 early adopters, your subscription rate is locked at 30% below the standard price for 36 months on any paid plan. The discount stays with your account regardless of future price changes.',
  },
];

export default function MyCirclePage() {
  return (
    <div className="min-h-screen">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'CommonGround My Circle — KidSpace for Extended Family',
          description: 'Video calls, stories, movies, and games for grandparents and extended family to bond with children safely.',
          url: 'https://www.find-commonground.com/my-circle',
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
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-[#F5A623]/[0.04] blur-3xl -translate-y-1/3 -translate-x-1/4" />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-[#F5A623] font-medium mb-4 tracking-wide uppercase text-sm flex items-center gap-2">
                <Heart className="w-4 h-4" />
                For grandparents, aunts, uncles & your village
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-[3.4rem] text-[#1E3A4A] mb-6 leading-[1.1] tracking-tight"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                Family Doesn&apos;t End at{' '}
                <span className="text-[#3DAA8A]">the Front Door</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
                When families separate, it&apos;s not just the parents who lose
                connection — it&apos;s grandparents, aunts, uncles, and the entire
                village. KidSpace gives you a safe, fun way to stay bonded with the
                children you love, with parents in full control.
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
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-[#F5A623]/10">
                <Image
                  src="/images/Website pictes/mycircle1.png"
                  alt="Grandmother bonding with grandchild through KidSpace video call"
                  width={800}
                  height={533}
                  className="w-full h-auto object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full border-2 border-[#F5A623]/30 -z-10" />
              <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-[#E85D75]/10 -z-10" />
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
              You love this child. You shouldn&apos;t need to fight to be part of their life.
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
                      The distance
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
                      With KidSpace
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="hidden sm:block text-xs font-semibold uppercase tracking-wider text-[#3DAA8A] mb-2">
                      With KidSpace
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
              Built for your village
            </p>
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              A Safe Space to Stay Connected
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              KidSpace isn&apos;t just video calls. It&apos;s a whole world where
              family bonds grow — safely and on the parents&apos; terms.
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

      {/* SOCIAL PROOF — Marcus (KidSpace movie nights) */}
      <section className="py-20 lg:py-24 bg-[#F4F8F7]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100">
            <Quote className="w-10 h-10 text-[#3DAA8A]/20 mb-6" />
            <blockquote
              className="text-xl sm:text-2xl text-[#1E3A4A] leading-relaxed mb-8"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Now we have a standing KidSpace movie night every Wednesday — even
              on weeks when we&apos;re apart. The kids light up when the call connects.
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#F5A623]/10 flex items-center justify-center">
                <span className="text-[#F5A623] font-semibold text-lg">M</span>
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
              Stay Part of Their Story
            </h2>
            <p className="text-gray-600 text-lg">
              Join the first 50 members and lock in 30% off for life.
              No credit card required. Just your email.
            </p>
          </div>
          <EarlyAdopterForm source="my_circle" />
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
              <Heart className="w-4 h-4" />
              Claim your early adopter spot
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

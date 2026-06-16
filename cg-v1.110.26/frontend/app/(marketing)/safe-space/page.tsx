import type { Metadata } from 'next';
import Image from 'next/image';
import { EarlyAdopterForm } from '@/components/marketing/early-adopter-form';
import { JsonLd } from '@/components/marketing/json-ld';
import { FaqJsonLd } from '@/components/marketing';
import {
  MapPin,
  MessageSquare,
  FileText,
  ArrowDown,
  CheckCircle,
  ChevronDown,
  Quote,
  Shield,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Safe Space — for parents who need distance | CommonGround',
  description:
    'Silent Handoff GPS exchanges, no-contact messaging, and court-ready records for parents who need safety and distance from a difficult ex.',
  alternates: { canonical: '/safe-space' },
  openGraph: {
    type: 'website',
    title: 'Safe Space — for parents who need distance | CommonGround',
    description:
      'GPS-verified Silent Handoff, no-contact messaging, and court-ready records built for safety.',
    url: 'https://www.find-commonground.com/safe-space',
    siteName: 'CommonGround',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Safe Space | CommonGround',
    description:
      'GPS-verified exchanges and no-contact messaging for parents who need distance.',
  },
};

const painPoints = [
  {
    old: 'Having to stand face-to-face with the person you\'re trying to protect yourself from',
    cg: 'Silent Handoff uses GPS verification — prove the exchange happened without any interaction',
  },
  {
    old: 'Giving out your phone number and dreading every notification',
    cg: 'All communication stays inside CommonGround — no personal contact info exchanged',
  },
  {
    old: 'His word against yours when he claims he showed up on time',
    cg: 'GPS timestamps, QR check-ins, and documented exchanges create undeniable records',
  },
  {
    old: 'Spending thousands on a lawyer just to prove he isn\'t complying',
    cg: 'Court-ready exports organized by date with timestamps, GPS data, and communication logs',
  },
];

const features = [
  {
    icon: MapPin,
    name: 'Silent Handoff',
    tagline: 'Exchanges without interaction',
    description:
      'GPS-verified custody exchanges with QR check-in. Both parents confirm the handoff happened — without needing to see, speak to, or text each other. Location, time, and confirmation are logged automatically for court.',
    accent: '#3DAA8A',
  },
  {
    icon: MessageSquare,
    name: 'ARIA Shield',
    tagline: 'Communication without contact',
    description:
      'All messages stay inside CommonGround. No phone numbers exchanged. No direct contact. ARIA monitors for threatening language, documents patterns, and helps you respond to child-related logistics without engaging with manipulation.',
    accent: '#2D6A8F',
  },
  {
    icon: FileText,
    name: 'Court-Ready Records',
    tagline: 'Documentation that protects',
    description:
      'Every exchange, message, missed pickup, and schedule change is timestamped and exportable. When your attorney needs evidence of non-compliance or concerning behavior, you have a clean, organized record — not a shoebox of screenshots.',
    accent: '#F5A623',
  },
];

const faqs = [
  {
    q: 'Does he get my phone number or email?',
    a: 'No. All communication happens inside CommonGround. He never sees your phone number, email address, or any personal contact information. Your identity is protected within the platform.',
  },
  {
    q: 'What if I have a protective order?',
    a: 'CommonGround is designed to support court-ordered no-contact communication. Silent Handoff allows custody exchanges to be documented without any direct interaction. Many family courts recommend platform-based communication for protective order cases.',
  },
  {
    q: 'Can he see my location through Silent Handoff?',
    a: 'No. Silent Handoff only records that an exchange occurred at the designated location and time. Your real-time location, home address, and movement patterns are never shared with the other parent. Only the exchange confirmation is logged.',
  },
  {
    q: 'What does "30% off for life" actually mean?',
    a: 'As one of our first 50 early adopters, your subscription rate is locked at 30% below the standard price for 36 months on any paid plan. The discount stays with your account regardless of future price changes.',
  },
];

export default function SafeSpacePage() {
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
          name: 'CommonGround Safe Space — Co-Parenting for DV Survivors',
          description: 'Zero-contact co-parenting with GPS-verified exchanges and court-ready documentation for domestic violence survivors.',
          url: 'https://www.find-commonground.com/safe-space',
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
        <div className="absolute inset-0 bg-gradient-to-b from-cg-sand via-cg-sand to-white" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-cg-sage/[0.04] blur-3xl -translate-y-1/2 translate-x-1/3" />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-cg-sage font-medium mb-4 tracking-wide uppercase text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                For survivors who need safety first
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-[3.4rem] text-foreground mb-6 leading-[1.1] tracking-tight"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                You Deserve to Feel{' '}
                <span className="text-cg-sage">Safe</span> Raising Your Child
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
                Co-parenting after abuse shouldn&apos;t mean giving up your safety.
                CommonGround keeps you protected — no phone numbers exchanged, no
                face-to-face required, every exchange documented and court-ready.
                You focus on your child. We handle the rest.
              </p>
              <a
                href="#early-adopter"
                className="inline-flex items-center gap-2 bg-cg-sage text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:bg-cg-sage-dark hover:shadow-lg hover:shadow-cg-sage/20 text-base"
              >
                Join the Early Adopter List
                <ArrowDown className="w-4 h-4" />
              </a>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
                {['Contactless exchanges', 'Private & encrypted', 'Court-ready evidence', 'You control contact'].map((t) => (
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
                  src="/images/marketing/cg_safespace_calm.jpg"
                  alt="A calm, composed parent feeling safe and at ease at home"
                  width={1000}
                  height={667}
                  className="w-full h-auto object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full border-2 border-cg-sage/30 -z-10" />
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
              You shouldn&apos;t have to sacrifice your safety to be a good parent.
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
                      The fear
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

      {/* FEATURES */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-cg-sand">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-cg-sage font-medium mb-3 tracking-wide uppercase text-sm">
              Safety by design
            </p>
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Protection Built Into Every Feature
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Every tool in CommonGround was designed with your safety as the
              first priority — not an afterthought.
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

      {/* SOCIAL PROOF — Diana */}
      <section className="py-20 lg:py-24 bg-cg-sand">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100">
            <Quote className="w-10 h-10 text-cg-sage/20 mb-6" />
            <blockquote
              className="text-xl sm:text-2xl text-foreground leading-relaxed mb-8"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              For the first time in years, I could focus on my daughter —
              helping with homework, planning weekend adventures — instead
              of bracing for the next fight.
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-cg-sage/10 flex items-center justify-center">
                <span className="text-cg-sage font-semibold text-lg">D</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Diana</p>
                <p className="text-sm text-gray-600">
                  4Ever Forward Foundation Grant Program
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden rounded-tr-3xl">
              <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full border-2 border-cg-sage/10" />
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
              Your Safety Comes First
            </h2>
            <p className="text-gray-600 text-lg">
              Join the first 50 members and lock in 30% off for life.
              No credit card required. Just your email.
            </p>
          </div>
          <EarlyAdopterForm source="safe_space" />
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

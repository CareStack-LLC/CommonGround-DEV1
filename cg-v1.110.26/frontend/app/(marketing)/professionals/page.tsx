import Link from 'next/link';
import Image from 'next/image';
import { JsonLd } from '@/components/marketing/json-ld';
import { ProfessionalInterestForm } from '@/components/marketing/professional-interest-form';
import { SectionTracker } from '@/components/marketing/analytics-tracker';
import {
  TrustBar,
  CtaBand,
  TestimonialCard,
  FaqJsonLd,
} from '@/components/marketing';
import {
  Scale,
  Users,
  Building2,
  FileText,
  Shield,
  Eye,
  ArrowRight,
  Check,
  BarChart3,
  Download,
  MessageSquare,
  Calendar,
  DollarSign,
  ClipboardCheck,
  Brain,
  HelpCircle,
} from 'lucide-react';

const whoItsFor = [
  {
    role: 'Family Law Attorneys',
    icon: Scale,
    description: 'Access verified evidence for custody and support cases',
    benefit: 'Court-ready exports in one click',
  },
  {
    role: 'Mediators',
    icon: Building2,
    description: 'Review communication patterns before and during sessions',
    benefit: 'ARIA tone analysis for context',
  },
  {
    role: 'Guardians ad Litem',
    icon: Shield,
    description: 'See the full picture of family dynamics and compliance',
    benefit: 'Compliance metrics dashboard',
  },
  {
    role: 'Custody Evaluators',
    icon: FileText,
    description: 'Analyze behavioral data and co-parenting patterns',
    benefit: 'Custody analytics & time tracking',
  },
  {
    role: 'Parenting Coordinators',
    icon: Users,
    description: 'Monitor compliance and track agreement adherence',
    benefit: 'Real-time agreement tracking',
  },
];

const dataAccess = [
  {
    icon: MessageSquare,
    title: 'Communications',
    description:
      'Verified, timestamped messages between co-parents with tone and sentiment context from ARIA.',
  },
  {
    icon: Calendar,
    title: 'Custody Exchanges',
    description:
      'Check-in/check-out logs, schedule adherence, and any documented disruptions or modifications.',
  },
  {
    icon: BarChart3,
    title: 'Compliance Data',
    description:
      'Agreement adherence tracking, schedule compliance rates, and behavioral pattern analysis.',
  },
  {
    icon: DollarSign,
    title: 'Financial Records',
    description:
      'Shared expense submissions, payment history, and verified financial documentation.',
  },
  {
    icon: Brain,
    title: 'ARIA Analysis',
    description:
      'AI-powered insights on communication quality, co-parenting dynamics, and areas of concern.',
  },
  {
    icon: Download,
    title: 'Court-Ready Exports',
    description:
      'Professional PDF reports with SHA-256 verification, neutral formatting, and complete audit trails.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Get invited or self-enroll',
    description:
      "A parent adds you to their case, or you join through our professional portal.",
  },
  {
    step: '02',
    title: 'Access the family file',
    description:
      "Review the family's CommonGround activity — communications, exchanges, finances, and compliance.",
  },
  {
    step: '03',
    title: 'Review and analyze',
    description:
      'Use verified data and ARIA insights to inform your recommendations and decisions.',
  },
  {
    step: '04',
    title: 'Export court-ready documentation',
    description:
      'Generate professional, tamper-proof reports ready for court filings or mediation sessions.',
  },
];

const objections = [
  {
    question: 'I already use another co-parenting app with my clients.',
    answer:
      'CommonGround offers features no other platform provides — KidSpace for direct parent-child video calls, Silent Handoff for GPS-verified contactless exchanges, and ARIA messaging included free for clients. Your clients get a better experience at no extra cost to you.',
    icon: HelpCircle,
  },
  {
    question: "My clients won't adopt another app.",
    answer:
      "CommonGround's free tier means zero cost barrier for clients. They can sign up in 2 minutes with just an email. No credit card, no trial expiration. When both parents can start for free, adoption is easy.",
    icon: Users,
  },
  {
    question: 'I need records that hold up in court.',
    answer:
      'Every record in CommonGround is timestamped, encrypted, and verified with SHA-256 hashing. Exports are formatted for family law proceedings with complete audit trails. Tamper-proof by design.',
    icon: Shield,
  },
  {
    question: 'How much does it cost for professionals?',
    answer:
      'Professional access is free. Your clients choose and pay for their own plans. You get read access to verified data, exports, and analytics at no cost to you or your firm.',
    icon: DollarSign,
  },
];

export default function ProfessionalsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#F5F9F9]">
      <SectionTracker page="professionals" />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ProfessionalService',
          name: 'CommonGround Professional Portal',
          description:
            'Verified co-parenting data access for family law professionals. Communications, exchanges, compliance, financials, and court-ready exports.',
          serviceType: 'Family Law Technology',
        }}
      />

      {/* Hero */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-24" data-section="hero">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A4A]/10 rounded-full mb-6">
                <Eye className="w-4 h-4 text-[#1E3A4A]" />
                <span className="text-sm font-medium text-[#1E3A4A]">For Family Law Professionals</span>
              </div>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl text-[#1E3A4A] mb-6 leading-[1.1]"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                Access verified family data
                <br />
                <span className="text-[#3DAA8A]">in minutes, not months</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-6 leading-relaxed">
                CommonGround gives professionals a window into verified co-parenting activity — messages,
                custody exchanges, finances, and compliance — without managing the case yourself.
              </p>
              <p className="text-base text-[var(--portal-primary)] font-medium mb-8">
                Free for professionals. Your clients pay for their own plans.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#demo"
                  className="inline-flex items-center justify-center px-8 py-4 bg-[#1E3A4A] text-white font-semibold rounded-full hover:bg-[#2D6A8F] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
                >
                  Request a Demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <Link
                  href="/features"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#1E3A4A] font-semibold rounded-full border-2 border-[#1E3A4A]/20 hover:border-[#1E3A4A]/40 hover:bg-[#1E3A4A]/5 transition-all"
                >
                  See All Features
                </Link>
              </div>
            </div>

            <div>
              <Image
                src="/images/marketing/pro1.png"
                alt="Professional dashboard showing case overview with timeline and compliance metrics"
                width={640}
                height={480}
                className="rounded-2xl object-cover w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* TrustBar — firm-grade credibility under the hero */}
      <section className="bg-white border-y border-gray-100" data-section="trust-bar">
        <div className="max-w-5xl mx-auto px-6">
          <TrustBar
            variant="stats"
            items={[
              { value: 'Free', label: 'for professionals' },
              { value: 'SHA-256', label: 'verified exports' },
              { value: '15 min', label: 'setup, zero install' },
              { value: 'Firm-ready', label: 'audit trails' },
            ]}
          />
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 sm:py-24 bg-white" data-section="who-its-for">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Built for every family law <span className="text-[#3DAA8A]">professional</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you represent a parent, evaluate a family, or mediate a dispute — CommonGround
              gives you the verified data you need to do your best work.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whoItsFor.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.role}
                  className="flex flex-col bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-6 border-2 border-[#1E3A4A]/8 hover:border-[#3DAA8A]/30 transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-[#3DAA8A]/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-[#3DAA8A]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1E3A4A] mb-1">{item.role}</h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-[var(--portal-primary)]">
                      <Check className="w-3 h-3 inline mr-1" />
                      {item.benefit}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Professional Interest Form — Demo CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-[#F4F8F7] to-white" id="demo" data-section="demo-form">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2
                className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                Better data makes for <span className="text-[#3DAA8A]">better outcomes</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                See how CommonGround gives family law professionals the verified, organized data
                they need — without adding another tool to manage.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Free for all professionals — always',
                  'Your clients choose their own plans',
                  'Set up in under 5 minutes',
                  'No software to install',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-[#3DAA8A] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/early-access"
                className="inline-flex items-center gap-2 text-[#3DAA8A] font-medium hover:underline"
              >
                Or recommend CommonGround to a client
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <ProfessionalInterestForm source="professionals_page" />
          </div>
        </div>
      </section>

      {/* Data Access */}
      <section className="py-16 sm:py-24 bg-white" data-section="data-access">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#3DAA8A]/10 rounded-full mb-6">
              <ClipboardCheck className="w-4 h-4 text-[#3DAA8A]" />
              <span className="text-sm font-medium text-[#3DAA8A]">What You&apos;ll See</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              A complete window into <span className="text-[#3DAA8A]">family activity</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              When a parent invites you to their case, you get read access to verified, timestamped
              records — the kind of data that changes how you approach family law.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {dataAccess.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-[#3DAA8A]/30 hover:shadow-lg transition-all group"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#1E3A4A]/8 flex items-center justify-center mb-4 group-hover:bg-[#3DAA8A]/10 transition-colors">
                    <Icon className="h-6 w-6 text-[#1E3A4A] group-hover:text-[#3DAA8A] transition-colors" />
                  </div>
                  <h3
                    className="text-lg font-semibold text-[#1E3A4A] mb-2"
                    style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Image
              src="/images/marketing/pro2.png"
              alt="Professional portal communications timeline view"
              width={640}
              height={400}
              className="rounded-2xl object-cover w-full"
            />
            <Image
              src="/images/marketing/pro3.png"
              alt="Professional portal compliance dashboard"
              width={640}
              height={400}
              className="rounded-2xl object-cover w-full"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 bg-[#F4F8F7]" data-section="how-it-works">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Simple to <span className="text-[#3DAA8A]">get started</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              No complex onboarding. No software to install. Access verified family data in minutes.
            </p>
          </div>

          <div className="space-y-8">
            {steps.map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#1E3A4A] flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{item.step}</span>
                </div>
                <div className="flex-1 pt-1">
                  <h3
                    className="text-xl font-semibold text-[#1E3A4A] mb-2"
                    style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Trust */}
      <section className="py-16 sm:py-24 bg-white" data-section="security">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] rounded-3xl p-8 sm:p-12 text-white">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-full mb-6">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Security & Compliance</span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl mb-4"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  Built for the standards your profession demands
                </h2>
                <p className="text-lg text-white/80">
                  Every record is encrypted, timestamped, and tamper-proof. Court-ready by design.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  'End-to-end encryption',
                  'SHA-256 verification',
                  'Uneditable audit trails',
                  'Role-based access',
                  'Tamper-proof records',
                  'Secure data exports',
                ].map((feature) => (
                  <div
                    key={feature}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                  >
                    <Check className="w-5 h-5 text-[#3DAA8A] mb-2" />
                    <div className="text-sm font-medium text-white/90">{feature}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Testimonials — placeholder quotes pending real reviews */}
      <section className="py-16 sm:py-24 bg-white" data-section="testimonials">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              What professionals <span className="text-[#3DAA8A]">are saying</span>
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Attorneys, mediators, and GALs reach for CommonGround when a case needs clean evidence fast.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* TODO(marketing): replace with real quote */}
            <div data-seed="placeholder">
              <TestimonialCard
                variant="featured"
                quote="Verified timestamps and calm-messaging data saved me hours of deposition prep — the exports hold up under scrutiny."
                name="Attorney placeholder"
                role="Attorney, Family Law · Austin, TX"
                rating={5}
              />
            </div>
            {/* TODO(marketing): replace with real quote */}
            <div data-seed="placeholder">
              <TestimonialCard
                variant="featured"
                quote="Couples arrive at mediation less defensive because ARIA already lowered the temperature between sessions."
                name="Mediator placeholder"
                role="Mediator · Los Angeles, CA"
                rating={5}
              />
            </div>
            {/* TODO(marketing): replace with real quote */}
            <div data-seed="placeholder">
              <TestimonialCard
                variant="featured"
                quote="I can see the family's real dynamics instead of reconstructing them from screenshots — it changes my recommendations."
                name="Guardian ad Litem placeholder"
                role="Guardian ad Litem · Atlanta, GA"
                rating={5}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Book-a-demo CTA band */}
      <section data-section="book-demo">
        <CtaBand
          headline="Book a 15-minute demo"
          subheadline="See how your cases look inside CommonGround before you recommend it to a client."
          primaryCta={{ label: 'Book demo', href: '/demo' }}
          background="gold"
        />
      </section>

      {/* FAQ — Questions Professionals Ask */}
      <section className="py-16 sm:py-24 bg-[#F4F8F7]" data-section="faq">
        <FaqJsonLd
          items={objections.map((o) => ({ question: o.question, answer: o.answer }))}
        />
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Common <span className="text-[#3DAA8A]">questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {objections.map((obj) => {
              const Icon = obj.icon;
              return (
                <div
                  key={obj.question}
                  className="bg-white rounded-2xl p-6 border border-gray-100"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#1E3A4A]/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-5 h-5 text-[#1E3A4A]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1E3A4A] mb-2">{obj.question}</h3>
                      <p className="text-gray-600 leading-relaxed">{obj.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Final CTA */}
          <div className="text-center mt-12">
            <a
              href="#demo"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#1E3A4A] text-white font-semibold rounded-full hover:bg-[#2D6A8F] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
            >
              Request a Demo
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

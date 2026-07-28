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
import { BrandIcon, type BrandIconName } from '@/components/brand/brand-icon';
import {
  Users,
  Building2,
  FileText,
  Shield,
  Eye,
  ArrowRight,
  Check,
  BarChart3,
  DollarSign,
  ClipboardCheck,
  HelpCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type IconCard = {
  brandIcon?: BrandIconName;
  icon?: LucideIcon;
} & Record<string, unknown>;

const whoItsFor: (IconCard & { role: string; description: string; benefit: string })[] = [
  {
    role: 'Family Law Attorneys',
    brandIcon: 'court',
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

const dataAccess: (IconCard & { title: string; description: string })[] = [
  {
    brandIcon: 'messages',
    title: 'Communications',
    description:
      'Verified, timestamped messages between co-parents with tone and sentiment context from ARIA.',
  },
  {
    brandIcon: 'exchange',
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
    brandIcon: 'clearfund',
    title: 'Financial Records',
    description:
      'Shared expense submissions, payment history, and verified financial documentation.',
  },
  {
    brandIcon: 'aria',
    title: 'ARIA Analysis',
    description:
      'AI-powered insights on communication quality, co-parenting dynamics, and areas of concern.',
  },
  {
    brandIcon: 'export',
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
      'Professional access is free — reviewing cases clients invite you to costs nothing, and your clients choose and pay for their own plans. Optional practice plans (from $49/mo) add AI-assisted intake, court-order OCR, included compliance reports, and featured directory placement.',
    icon: DollarSign,
  },
];

const story = [
  { time: 'Intake day', tone: 'before', text: 'David’s new case folder was the usual: a shoebox of screenshots, contradictory calendars, and two clients who remembered every event differently.' },
  { time: 'Week after week', tone: 'before', text: 'Half his billable hours went to reconstructing a timeline nobody could agree on — before he could even start advocating for his client.' },
  { time: 'This case', tone: 'turn', text: 'His client’s family was on CommonGround. One export: every message, exchange, and payment — timestamped and tamper-evident.' },
  { time: 'Now', tone: 'after', text: 'He opens a case to a clean record. ARIA had already kept the communication civil. The facts weren’t in dispute, so he could focus on the outcome.' },
  { time: 'At the hearing', tone: 'after', kicker: true, text: 'It took half as long. The judge had everything she needed on page one.' },
];

// Real, attributed professional testimonials only. The testimonials section
// renders exclusively from this list — when it is empty, an honest pilot band
// is shown instead. Never ship placeholder or invented attribution.
const professionalTestimonials: {
  quote: string;
  name: string;
  role: string;
  rating: number;
}[] = [];

export default function ProfessionalsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-white to-[#F5F9F9]">
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-foreground/10 rounded-full mb-6">
                <Eye className="w-4 h-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">For Family Law Professionals</span>
              </div>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6 leading-[1.1]"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                Open a clean case file,
                <br />
                <span className="text-cg-sage">not a box of screenshots</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-6 leading-relaxed">
                CommonGround hands you verified, timestamped co-parenting activity — messages,
                exchanges, finances, and compliance — with one-click SHA-256 exports built for the courtroom.
              </p>
              <p className="text-base text-[var(--portal-primary)] font-medium mb-8">
                Free for professionals. Your clients pay for their own plans.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#demo"
                  className="inline-flex items-center justify-center px-8 py-4 bg-foreground text-white font-semibold rounded-full hover:bg-cg-slate transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
                >
                  Request a Demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <Link
                  href="/features"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-foreground font-semibold rounded-full border-2 border-foreground/20 hover:border-foreground/40 hover:bg-foreground/5 transition-all"
                >
                  See what your clients get
                </Link>
              </div>
              <p className="mt-5 text-sm text-gray-500">
                Free for professionals &middot; No install &middot; 15-minute setup
              </p>
            </div>

            <div>
              <Image
                src="/images/marketing/pro1.jpg"
                alt="A family law attorney reviewing a case at her desk"
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
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Built for every family law <span className="text-cg-sage">professional</span>
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
                  className="flex flex-col bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-6 border-2 border-foreground/8 hover:border-cg-sage/30 transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-cg-sage/10 flex items-center justify-center flex-shrink-0">
                      {item.brandIcon ? (
                        <BrandIcon name={item.brandIcon} size={24} />
                      ) : Icon ? (
                        <Icon className="w-6 h-6 text-cg-sage" />
                      ) : null}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{item.role}</h3>
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
      <section className="py-16 sm:py-24 bg-gradient-to-b from-background to-white" id="demo" data-section="demo-form">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2
                className="text-3xl sm:text-4xl text-foreground mb-4"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                Better data makes for <span className="text-cg-sage">better outcomes</span>
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
                    <div className="w-5 h-5 rounded-full bg-cg-sage flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/early-access"
                className="inline-flex items-center gap-2 text-cg-sage font-medium hover:underline"
              >
                Or recommend CommonGround to a client
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <ProfessionalInterestForm source="professionals_page" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          STORY — A short narrative that captivates
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-background to-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-medium mb-3 tracking-wide uppercase text-sm" style={{ color: 'var(--cg-slate)' }}>
              From the case file
            </p>
            <h2
              className="text-3xl sm:text-4xl lg:text-[2.75rem] text-foreground leading-[1.15]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              The custody case that
              <br className="hidden sm:block" /> finally made sense
            </h2>
          </div>
          <div className="relative">
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-[#E85D75]/40 via-cg-amber/40 to-cg-sage/50" />
            <div className="space-y-10">
              {story.map((beat, i) => {
                const dot =
                  beat.tone === 'before'
                    ? '#E85D75'
                    : beat.tone === 'turn'
                    ? 'var(--cg-amber)'
                    : 'var(--cg-sage)';
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
                        className="text-xl sm:text-2xl text-foreground leading-relaxed"
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
            CommonGround doesn’t replace your judgment. It hands you the clean record
            your case has always needed. Here’s what it puts in front of you.
          </p>
        </div>
      </section>

      {/* Data Access */}
      <section className="py-16 sm:py-24 bg-white" data-section="data-access">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage/10 rounded-full mb-6">
              <ClipboardCheck className="w-4 h-4 text-cg-sage" />
              <span className="text-sm font-medium text-cg-sage">What You&apos;ll See</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              A complete window into <span className="text-cg-sage">family activity</span>
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
                  className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-cg-sage/30 hover:shadow-lg transition-all group"
                >
                  <div className="h-12 w-12 rounded-xl bg-foreground/8 flex items-center justify-center mb-4 group-hover:bg-cg-sage/10 transition-colors">
                    {item.brandIcon ? (
                      <BrandIcon name={item.brandIcon} size={24} />
                    ) : Icon ? (
                      <Icon className="h-6 w-6 text-foreground group-hover:text-cg-sage transition-colors" />
                    ) : null}
                  </div>
                  <h3
                    className="text-lg font-semibold text-foreground mb-2"
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
              src="/images/marketing/pro2.jpg"
              alt="A mediator facilitating a calm conversation between co-parents"
              width={640}
              height={400}
              className="rounded-2xl object-cover w-full"
            />
            <Image
              src="/images/marketing/pro3.jpg"
              alt="A family law attorney reviewing case documents"
              width={640}
              height={400}
              className="rounded-2xl object-cover w-full"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 bg-background" data-section="how-it-works">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Simple to <span className="text-cg-sage">get started</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              No complex onboarding. No software to install. Access verified family data in minutes.
            </p>
          </div>

          <div className="space-y-8">
            {steps.map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{item.step}</span>
                </div>
                <div className="flex-1 pt-1">
                  <h3
                    className="text-xl font-semibold text-foreground mb-2"
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
          <div className="bg-gradient-to-br from-foreground to-cg-slate rounded-3xl p-8 sm:p-12 text-white">
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
                  'Encrypted in transit & at rest',
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
                    <Check className="w-5 h-5 text-cg-sage mb-2" />
                    <div className="text-sm font-medium text-white/90">{feature}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Testimonials — real quotes only; honest pilot band until then */}
      {professionalTestimonials.length > 0 ? (
        <section className="py-16 sm:py-24 bg-white" data-section="testimonials">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2
                className="text-3xl sm:text-4xl text-foreground mb-4"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                What professionals <span className="text-cg-sage">are saying</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                Attorneys, mediators, and GALs reach for CommonGround when a case needs clean evidence fast.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {professionalTestimonials.map((t) => (
                <TestimonialCard
                  key={t.name}
                  variant="featured"
                  quote={t.quote}
                  name={t.name}
                  role={t.role}
                  rating={t.rating}
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="py-16 sm:py-24 bg-white" data-section="testimonials">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Built <span className="text-cg-sage">with</span> family-law professionals
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              CommonGround is currently in pilot with attorneys, mediators, and guardians ad
              litem. We&apos;ll publish reviews when our first cohort has taken real cases
              through the platform — not before. Want to shape the tool your practice will
              use? Join the pilot.
            </p>
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 bg-cg-sage text-white font-medium px-8 py-3 rounded-full transition-all duration-300 hover:bg-cg-sage-light hover:shadow-lg"
            >
              Join the professional pilot
            </a>
          </div>
        </section>
      )}

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
      <section className="py-16 sm:py-24 bg-background" data-section="faq">
        <FaqJsonLd
          items={objections.map((o) => ({ question: o.question, answer: o.answer }))}
        />
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Common <span className="text-cg-sage">questions</span>
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
                    <div className="w-10 h-10 rounded-xl bg-foreground/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">{obj.question}</h3>
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
              className="inline-flex items-center justify-center px-8 py-4 bg-foreground text-white font-semibold rounded-full hover:bg-cg-slate transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
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

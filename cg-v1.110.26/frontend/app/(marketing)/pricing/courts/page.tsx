'use client';

import Link from 'next/link';
import {
  Check,
  ArrowRight,
  Gavel,
  FileText,
  Shield,
  BarChart3,
  Lock,
  Clock,
  Building,
  Users,
} from 'lucide-react';

/**
 * Court Pricing Page
 *
 * Focus on Contact Sales, no specific pricing shown
 */

const courtFeatures = [
  {
    icon: FileText,
    title: 'Digital parenting plans',
    description: 'Parents complete court-required forms online. Reduce paper, improve accuracy.',
  },
  {
    icon: Shield,
    title: 'Verified documentation',
    description: 'SHA-256 hashed documents with timestamps. Court-admissible by design.',
  },
  {
    icon: BarChart3,
    title: 'Compliance dashboards',
    description: 'Track parenting plan compliance across all cases. Spot problems early.',
  },
  {
    icon: Lock,
    title: 'Secure access controls',
    description: 'Role-based access for judges, clerks, GALs. Full audit logging.',
  },
  {
    icon: Clock,
    title: 'Faster case resolution',
    description: 'Better documentation means fewer disputes over facts.',
  },
  {
    icon: Building,
    title: 'System integration',
    description: 'Connect with existing court case management via secure API.',
  },
];

const outcomes = [
  { value: '40%', label: 'fewer modification hearings' },
  { value: '60%', label: 'faster plan completion' },
  { value: '75%', label: 'fewer incomplete filings' },
];

const useCases = [
  'Initial parenting plan filing',
  'Modification requests',
  'Compliance monitoring',
  'GAL and evaluator access',
  'Post-decree enforcement',
];

export default function CourtPricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#F5F9F9]">
      {/* Hero */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--portal-primary)]/10 rounded-full mb-6">
            <Gavel className="w-4 h-4 text-[var(--portal-primary)]" />
            <span className="text-sm font-medium text-[var(--portal-primary)]">For Family Courts</span>
          </div>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#1E3A4A] mb-6 leading-[1.05]"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Modernize your
            <br />
            <span className="text-[#F5A623]">family court</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Digital parenting plans. Compliance monitoring.
            <span className="font-medium text-[var(--portal-primary)]"> Better outcomes for families.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact?type=court"
              className="inline-flex items-center justify-center px-8 py-4 bg-[var(--portal-primary)] text-white font-semibold rounded-full hover:bg-[#2D6A8F] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
            >
              Contact Sales
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/contact?type=court-demo"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[var(--portal-primary)] font-semibold rounded-full border-2 border-[var(--portal-primary)] hover:bg-[var(--portal-primary)]/5 transition-all"
            >
              Schedule Demo
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            <Link href="/pricing" className="hover:text-[var(--portal-primary)]">Parent pricing</Link>
            {' · '}
            <Link href="/professionals" className="hover:text-[var(--portal-primary)]">Professional pricing</Link>
          </p>
        </div>
      </section>

      {/* Outcomes */}
      <section className="py-12 -mt-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-3xl border-2 border-[var(--portal-primary)]/10 p-8 shadow-lg">
            <div className="grid sm:grid-cols-3 gap-8">
              {outcomes.map((outcome) => (
                <div key={outcome.label} className="text-center">
                  <div
                    className="text-4xl font-serif font-bold text-[var(--portal-primary)] mb-2"
                    style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                  >
                    {outcome.value}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    {outcome.label}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-6">
              *Based on pilot program data
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Built for <span className="text-[#F5A623]">courts</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Tools designed specifically for family court administration.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {courtFeatures.map((feature) => {
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

      {/* Use Cases & Pricing CTA */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-6"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                How courts use <span className="text-[#F5A623]">CommonGround</span>
              </h2>
              <ul className="space-y-4">
                {useCases.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--portal-primary)]/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-[var(--portal-primary)]" />
                    </div>
                    <span className="text-[#1E3A4A] font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] rounded-3xl p-8 text-white">
              <h3
                className="text-2xl font-serif mb-4"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                Flexible options for every court
              </h3>
              <p className="text-white/80 mb-6">
                We offer per-form processing, subscription plans, and enterprise deployments
                tailored to your court's size and needs.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Per-form processing',
                  'Unlimited subscription plans',
                  'Multi-courthouse enterprise',
                  'Custom integrations',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#F5A623]" />
                    <span className="text-white/90">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact?type=court"
                className="inline-flex items-center justify-center w-full px-6 py-4 bg-[#F5A623] text-white font-semibold rounded-full hover:bg-[#c26647] transition-all group"
              >
                Get Custom Quote
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Implementation */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-serif text-[#1E3A4A] mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Simple <span className="text-[#F5A623]">implementation</span>
            </h2>
          </div>

          <div className="space-y-8">
            {[
              { step: '01', title: 'Discovery & planning', description: 'We learn your workflows, integration needs, and customization requirements.' },
              { step: '02', title: 'Configuration', description: 'We configure forms for your jurisdiction and establish secure system connections.' },
              { step: '03', title: 'Pilot program', description: 'Run a pilot with select cases to refine workflows before full deployment.' },
              { step: '04', title: 'Training & launch', description: 'Comprehensive staff training followed by full deployment with ongoing support.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <span
                  className="text-5xl font-serif text-gray-100"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  {item.step}
                </span>
                <div className="flex-1 pt-2">
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

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif mb-6"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Ready to modernize?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            See how CommonGround can help your court serve families better.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact?type=court-demo"
              className="inline-flex items-center justify-center px-10 py-5 bg-[#F5A623] text-white font-bold text-lg rounded-full hover:bg-[#c26647] transition-all shadow-2xl hover:-translate-y-1 group"
            >
              Schedule Demo
              <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link
              href="/contact?type=court"
              className="inline-flex items-center justify-center px-10 py-5 bg-white/10 text-white font-bold text-lg rounded-full hover:bg-white/20 transition-all border-2 border-white/30"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

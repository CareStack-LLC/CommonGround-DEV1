'use client';

import Link from 'next/link';
import {
  Shield,
  Lock,
  Eye,
  Server,
  FileCheck,
  Users,
  ArrowRight,
  Check,
} from 'lucide-react';

/**
 * Security Page
 *
 * Matches homepage design: Crimson Text serif, warm colors, compelling copy
 */

const securityFeatures = [
  {
    icon: Lock,
    title: 'AES-256 Encryption',
    description: 'Same encryption banks use. Your data is unreadable to everyone—including us.',
  },
  {
    icon: Eye,
    title: 'You Control Access',
    description: 'Decide who sees what. Grant time-limited access to attorneys when needed.',
  },
  {
    icon: Server,
    title: '99.9% Uptime',
    description: 'Enterprise cloud. Daily backups. Your data is always there when you need it.',
  },
  {
    icon: FileCheck,
    title: 'Complete Audit Trail',
    description: 'Every action timestamped. Perfect for court if things get ugly.',
  },
  {
    icon: Users,
    title: 'Professional Access',
    description: 'Attorneys and GALs get verified, time-limited access. Revoke anytime.',
  },
  {
    icon: Shield,
    title: 'Court-Ready Exports',
    description: 'SHA-256 verified documents. Tamper-proof evidence that holds up.',
  },
];

const commitments = [
  'We never sell your data',
  'We never share with third parties',
  'You can export everything anytime',
  'You can delete everything anytime',
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9]">
      {/* Hero */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-3xl mb-8 shadow-lg">
            <Shield className="w-10 h-10 text-[var(--portal-primary)]" />
          </div>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#2C3E50] mb-6 leading-[1.05]"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            Your family's data
            <br />
            <span className="text-[#D97757]">is sacred</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            We built CommonGround knowing your most sensitive information would live here.
            <span className="font-medium text-[var(--portal-primary)]"> That trust is everything to us.</span>
          </p>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-4"
              style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
            >
              Enterprise-grade protection
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The same security standards used by banks and hospitals.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {securityFeatures.map((feature) => {
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
                    className="text-xl font-semibold text-[#2C3E50] mb-3"
                    style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
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

      {/* Our Commitment */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-serif text-[#2C3E50] mb-6"
                style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
              >
                Your data. <span className="text-[#D97757]">Your control.</span>
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                We don't monetize your information. We don't analyze it for ads.
                We don't share it with anyone unless you explicitly ask us to.
              </p>
              <ul className="space-y-4">
                {commitments.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--portal-primary)]/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-[var(--portal-primary)]" />
                    </div>
                    <span className="text-[#2C3E50] font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-[var(--portal-primary)] to-[#1e4442] rounded-3xl p-8 text-white">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-8 h-8" />
                <span
                  className="text-2xl font-semibold"
                  style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                >
                  Security Specs
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                  <span className="text-white/70">Encryption at Rest</span>
                  <span className="font-semibold">AES-256</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                  <span className="text-white/70">Encryption in Transit</span>
                  <span className="font-semibold">TLS 1.3</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                  <span className="text-white/70">Data Backups</span>
                  <span className="font-semibold">Daily</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Uptime SLA</span>
                  <span className="font-semibold">99.9%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-[var(--portal-primary)] to-[#1e4442] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif mb-6"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            Ready to get started?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join thousands of families who trust CommonGround with their most important information.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-10 py-5 bg-[#D97757] text-white font-bold text-lg rounded-full hover:bg-[#c26647] transition-all shadow-2xl hover:-translate-y-1 group"
            >
              Start Free Today
              <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link
              href="/legal/privacy"
              className="inline-flex items-center justify-center px-10 py-5 bg-white/10 text-white font-bold text-lg rounded-full hover:bg-white/20 transition-all border-2 border-white/30"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

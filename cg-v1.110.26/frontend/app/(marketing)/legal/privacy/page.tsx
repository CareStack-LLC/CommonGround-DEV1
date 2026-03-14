'use client';

import Link from 'next/link';
import { Shield, Lock, Eye, Server, Check, ArrowRight } from 'lucide-react';

/**
 * Privacy Policy Page
 *
 * Comprehensive privacy policy matching the design system.
 */

const dataCategories = [
  {
    title: 'Account Information',
    items: ['Name, email, phone number', 'Password (encrypted)', 'Profile preferences'],
  },
  {
    title: 'Case Information',
    items: ['Children\'s details', 'Co-parent information', 'Custody arrangements'],
  },
  {
    title: 'Communications',
    items: ['Messages between parents', 'ARIA suggestions (not stored separately)', 'Professional correspondence'],
  },
  {
    title: 'Financial Data',
    items: ['Expense records', 'Payment information (via Stripe)', 'Reimbursement history'],
  },
  {
    title: 'Usage Data',
    items: ['Features used', 'Login times', 'Device information'],
  },
  {
    title: 'Location Data',
    items: ['Exchange check-in GPS (optional)', 'Only when you explicitly enable'],
  },
];

const securityMeasures = [
  { label: 'Encryption at Rest', value: 'AES-256' },
  { label: 'Encryption in Transit', value: 'TLS 1.3' },
  { label: 'Authentication', value: 'Multi-factor available' },
  { label: 'Access Controls', value: 'Role-based permissions' },
  { label: 'Audit Logging', value: 'All actions logged' },
  { label: 'Data Backups', value: 'Daily, encrypted' },
];

const neverDo = [
  'We NEVER sell your personal information',
  'We NEVER share data for advertising purposes',
  'We NEVER use your communications to train AI models',
  'We NEVER provide data to third parties without consent',
  'We NEVER access your account without your permission',
];

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 24, 2026';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#F5F9F9]">
      {/* Hero */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl mb-6">
            <Shield className="w-8 h-8 text-[var(--portal-primary)]" />
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-serif text-[#1E3A4A] mb-4 leading-[1.1]"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Privacy <span className="text-[#F5A623]">Policy</span>
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Your family's data is sacred. Here's how we protect it.
          </p>
          <p className="text-sm text-gray-400">Last updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Our Commitment */}
      <section className="py-12 -mt-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] rounded-3xl p-8 text-white">
            <h2
              className="text-2xl font-serif mb-4"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Our Commitment to You
            </h2>
            <p className="text-white/80 mb-6">
              CommonGround was built by parents who understand the sensitivity of family information.
              We collect only what's necessary, protect it with bank-level security, and give you
              complete control over your data.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: Lock, text: 'Bank-level encryption' },
                { icon: Eye, text: 'You control access' },
                { icon: Server, text: 'Never sold or shared' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#F5A623]" />
                    </div>
                    <span className="text-sm text-white/90">{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* What We Collect */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-4 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Information We <span className="text-[#F5A623]">Collect</span>
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            We collect only what's necessary to provide our services. Here's exactly what we gather:
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataCategories.map((category) => (
              <div
                key={category.title}
                className="bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10"
              >
                <h3
                  className="font-semibold text-[#1E3A4A] mb-3"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  {category.title}
                </h3>
                <ul className="space-y-2">
                  {category.items.map((item) => (
                    <li key={item} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-[var(--portal-primary)] mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How We Use It */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            How We <span className="text-[#F5A623]">Use</span> Your Information
          </h2>

          <div className="space-y-4">
            {[
              { title: 'Provide Services', desc: 'Enable messaging, scheduling, agreements, and expense tracking between co-parents.' },
              { title: 'Power ARIA', desc: 'Analyze messages in real-time to suggest calmer alternatives. Content is processed but not stored separately.' },
              { title: 'Generate Court Documents', desc: 'Create verified exports when you request them for legal proceedings.' },
              { title: 'Send Notifications', desc: 'Alert you about messages, schedule changes, and important updates you\'ve enabled.' },
              { title: 'Improve Security', desc: 'Detect and prevent fraud, abuse, and unauthorized access to protect all users.' },
              { title: 'Comply with Law', desc: 'Respond to valid legal requests and protect our rights when required.' },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10 hover:border-[var(--portal-primary)]/30 transition-colors"
              >
                <h3 className="font-semibold text-[#1E3A4A] mb-1">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We NEVER Do */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            What We <span className="text-[#F5A623]">Never</span> Do
          </h2>

          <div className="bg-gradient-to-br from-red-50 to-white rounded-3xl p-8 border-2 border-red-100">
            <ul className="space-y-4">
              {neverDo.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-500 font-bold text-sm">✕</span>
                  </div>
                  <span className="text-[#1E3A4A] font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Data Sharing */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Who Can <span className="text-[#F5A623]">Access</span> Your Data
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">Your Co-Parent</h3>
              <p className="text-gray-600 text-sm">
                Messages, shared calendars, agreements, and expense records are visible to both parents.
                This is core to how CommonGround works.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">Authorized Professionals</h3>
              <p className="text-gray-600 text-sm">
                Attorneys, GALs, and mediators you invite can view case information according to
                permissions you set. All access is logged and can be revoked anytime.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">Service Providers</h3>
              <p className="text-gray-600 text-sm mb-3">
                Trusted partners who help us operate, all bound by strict confidentiality:
              </p>
              <div className="flex flex-wrap gap-2">
                {['Supabase (Database)', 'Anthropic (AI)', 'Stripe (Payments)', 'Vercel (Hosting)'].map((p) => (
                  <span key={p} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">Legal Requirements</h3>
              <p className="text-gray-600 text-sm">
                We may disclose information when required by law, court order, or to protect the
                safety of users. We will notify you when legally permitted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            How We <span className="text-[#F5A623]">Protect</span> Your Data
          </h2>

          <div className="bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] rounded-3xl p-8 text-white">
            <div className="grid sm:grid-cols-2 gap-4">
              {securityMeasures.map((measure) => (
                <div key={measure.label} className="flex items-center justify-between border-b border-white/20 pb-3">
                  <span className="text-white/70">{measure.label}</span>
                  <span className="font-semibold">{measure.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Your Rights */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Your <span className="text-[#F5A623]">Rights</span>
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Access', desc: 'Request a copy of all your personal data' },
              { title: 'Correction', desc: 'Update inaccurate or incomplete information' },
              { title: 'Deletion', desc: 'Request deletion of your data (subject to legal requirements)' },
              { title: 'Export', desc: 'Download your data in a portable format' },
              { title: 'Opt-Out', desc: 'Disable optional data collection like location services' },
              { title: 'Withdraw Consent', desc: 'Revoke consent for optional data processing' },
            ].map((right) => (
              <div
                key={right.title}
                className="bg-white rounded-2xl p-5 border-2 border-[var(--portal-primary)]/10"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Check className="w-5 h-5 text-[var(--portal-primary)]" />
                  <h3 className="font-semibold text-[#1E3A4A]">{right.title}</h3>
                </div>
                <p className="text-gray-600 text-sm pl-7">{right.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-600 mt-8">
            To exercise these rights, email{' '}
            <a href="mailto:privacy@commonground.app" className="text-[var(--portal-primary)] font-medium hover:underline">
              privacy@commonground.app
            </a>
          </p>
        </div>
      </section>

      {/* Data Retention */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Data <span className="text-[#F5A623]">Retention</span>
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl border-2 border-[var(--portal-primary)]/10">
              <div className="w-12 h-12 rounded-xl bg-[var(--portal-primary)]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--portal-primary)] font-bold">∞</span>
              </div>
              <div>
                <h3 className="font-semibold text-[#1E3A4A]">Active Accounts</h3>
                <p className="text-gray-600 text-sm">Data retained while your account is active</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl border-2 border-[var(--portal-primary)]/10">
              <div className="w-12 h-12 rounded-xl bg-[#F5A623]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#F5A623] font-bold">90</span>
              </div>
              <div>
                <h3 className="font-semibold text-[#1E3A4A]">After Deletion Request</h3>
                <p className="text-gray-600 text-sm">Data deleted within 90 days of account deletion request</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl border-2 border-[var(--portal-primary)]/10">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-500 font-bold">⚖</span>
              </div>
              <div>
                <h3 className="font-semibold text-[#1E3A4A]">Legal Requirements</h3>
                <p className="text-gray-600 text-sm">Some data may be retained longer if required by law or court proceedings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Special Provisions */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Special <span className="text-[#F5A623]">Provisions</span>
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">Children's Privacy</h3>
              <p className="text-gray-600 text-sm">
                CommonGround is designed for parents, not children. Information about children is
                provided by parents and protected with the same security as all data. We do not
                knowingly collect information directly from children under 13.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">California Residents (CCPA)</h3>
              <p className="text-gray-600 text-sm mb-3">
                California residents have additional rights under the CCPA:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Right to know what personal information we collect</li>
                <li>• Right to delete personal information</li>
                <li>• Right to opt-out of sale (we don't sell your data)</li>
                <li>• Right to non-discrimination for exercising privacy rights</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">International Users</h3>
              <p className="text-gray-600 text-sm">
                CommonGround is based in the United States. If you access our services from outside
                the US, your information will be transferred to and processed in the US. We comply
                with applicable data protection laws.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">Policy Changes</h3>
              <p className="text-gray-600 text-sm">
                We may update this policy from time to time. We'll notify you of significant changes
                via email or through the platform. Continued use after changes constitutes acceptance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2
            className="text-3xl sm:text-4xl font-serif mb-4"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Questions about privacy?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            We're here to help. Reach out to our privacy team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:privacy@commonground.app"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#F5A623] text-white font-semibold rounded-full hover:bg-[#c26647] transition-all"
            >
              privacy@commonground.app
            </a>
            <Link
              href="/legal/terms"
              className="inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-all border-2 border-white/30"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

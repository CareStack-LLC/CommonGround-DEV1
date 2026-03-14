'use client';

import Link from 'next/link';
import { FileText, AlertTriangle, Check, Shield, Scale, Ban, ArrowRight } from 'lucide-react';

/**
 * Terms of Service Page
 *
 * Comprehensive terms matching the design system with strong legal coverage.
 */

const serviceDescription = [
  'Secure messaging between co-parents with AI-assisted communication (ARIA)',
  'Custody agreement building tools with dual-approval workflow',
  'Shared calendar and custody schedule management',
  'Expense tracking, documentation, and reimbursement requests',
  'Court-ready documentation exports with integrity verification',
  'Professional access portal for attorneys, GALs, and mediators',
];

const prohibitedUses = [
  'Harass, threaten, abuse, or intimidate any person',
  'Submit false, misleading, or fraudulent information',
  'Impersonate another person or misrepresent your identity',
  'Attempt to access another user\'s account without authorization',
  'Circumvent security features or access restrictions',
  'Use the Service for any illegal purpose',
  'Upload malicious code, viruses, or harmful content',
  'Manipulate or falsify records intended for court use',
  'Violate any court orders or legal obligations',
  'Scrape, copy, or redistribute content without permission',
];

const ariaTerms = [
  'ARIA is an AI tool, not a substitute for professional advice',
  'Suggestions are recommendations only—you decide what to send',
  'You remain responsible for all messages, regardless of ARIA use',
  'We do not guarantee ARIA will prevent all conflicts',
  'ARIA suggestions are appropriate for most situations but use judgment',
];

const disclaimers = [
  {
    title: 'No Legal Advice',
    content: 'CommonGround is a technology platform, not a law firm. Nothing in our Service constitutes legal advice. Consult with a qualified attorney for legal matters.',
  },
  {
    title: 'No Guarantee of Outcomes',
    content: 'We do not guarantee any particular outcome from using CommonGround, including reduced conflict, improved communication, or favorable court results.',
  },
  {
    title: 'Court Acceptance',
    content: 'While we provide court-ready documentation with integrity verification, we cannot guarantee any court will accept our exports as evidence. Check with your attorney.',
  },
  {
    title: 'Service Availability',
    content: 'CommonGround is provided "as is" and "as available." We strive for 99.9% uptime but cannot guarantee uninterrupted service.',
  },
];

export default function TermsOfServicePage() {
  const lastUpdated = 'January 24, 2026';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#F5F9F9]">
      {/* Hero */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl mb-6">
            <FileText className="w-8 h-8 text-[var(--portal-primary)]" />
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-serif text-[#1E3A4A] mb-4 leading-[1.1]"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Terms of <span className="text-[#F5A623]">Service</span>
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Please read these terms carefully before using CommonGround.
          </p>
          <p className="text-sm text-gray-400">Last updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-12 -mt-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#F5A623]/10 to-[#F5A623]/5 rounded-3xl p-8 border-2 border-[#F5A623]/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#F5A623]/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-[#F5A623]" />
              </div>
              <div>
                <h2
                  className="text-xl font-serif text-[#1E3A4A] mb-2"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  Important Notice
                </h2>
                <p className="text-gray-600">
                  By accessing or using CommonGround, you agree to be bound by these Terms of Service.
                  If you don't agree to these terms, please don't use our services. These Terms apply
                  to all users, including parents, legal professionals, and any other visitors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is CommonGround */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            What is <span className="text-[#F5A623]">CommonGround</span>
          </h2>

          <p className="text-gray-600 mb-6 text-center max-w-2xl mx-auto">
            CommonGround is a co-parenting communication and coordination platform that provides:
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {serviceDescription.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 p-4 bg-gradient-to-br from-[#F5F9F9] to-white rounded-xl border-2 border-[var(--portal-primary)]/10"
              >
                <Check className="w-5 h-5 text-[var(--portal-primary)] flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Account Requirements */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Account <span className="text-[#F5A623]">Requirements</span>
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-3">Eligibility</h3>
              <p className="text-gray-600 text-sm">
                You must be at least 18 years old to use CommonGround. By registering, you represent
                that you are of legal age and have the authority to enter into these Terms.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-3">Account Security</h3>
              <p className="text-gray-600 text-sm mb-3">
                You are responsible for maintaining the confidentiality of your account credentials
                and for all activities under your account. You agree to:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-[var(--portal-primary)]">•</span>
                  Create a strong, unique password
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--portal-primary)]">•</span>
                  Never share your account with others
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--portal-primary)]">•</span>
                  Notify us immediately of unauthorized access
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--portal-primary)]">•</span>
                  Keep your contact information current
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-3">Account Accuracy</h3>
              <p className="text-gray-600 text-sm">
                You agree to provide accurate, current, and complete information during registration
                and to update it as needed. Misrepresentation of identity or relationship to a case
                may result in immediate account termination and potential legal action.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Prohibited Uses */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Prohibited <span className="text-[#F5A623]">Uses</span>
          </h2>

          <div className="bg-gradient-to-br from-red-50 to-white rounded-3xl p-8 border-2 border-red-100">
            <p className="text-gray-600 mb-6 text-center">
              You agree NOT to use CommonGround to:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {prohibitedUses.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Ban className="w-3 h-3 text-red-500" />
                  </div>
                  <span className="text-gray-600 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ARIA Terms */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            ARIA AI <span className="text-[#F5A623]">Assistant</span>
          </h2>

          <div className="bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] rounded-3xl p-8 text-white">
            <p className="text-white/80 mb-6">
              ARIA (AI-Powered Relationship Intelligence Assistant) analyzes messages and suggests
              calmer alternatives to reduce conflict. By using ARIA, you understand and agree:
            </p>
            <ul className="space-y-3">
              {ariaTerms.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-[#F5A623]" />
                  </div>
                  <span className="text-white/90 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Court Documentation */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Court <span className="text-[#F5A623]">Documentation</span>
          </h2>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--portal-primary)]/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-[var(--portal-primary)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E3A4A] mb-2">Evidence Integrity</h3>
                  <p className="text-gray-600 text-sm">
                    CommonGround provides SHA-256 integrity verification, timestamps, and chain of
                    custody documentation. However, we cannot guarantee that any court will accept
                    our documentation as evidence. Court rules vary by jurisdiction.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--portal-primary)]/10 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-5 h-5 text-[var(--portal-primary)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E3A4A] mb-2">User Responsibility</h3>
                  <p className="text-gray-600 text-sm">
                    You are responsible for ensuring that any documentation you submit to courts is
                    accurate and appropriate. We are not liable for how courts interpret or use
                    exported documentation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Terms */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Subscription & <span className="text-[#F5A623]">Payment</span>
          </h2>

          <div className="space-y-4">
            {[
              {
                title: 'Free and Paid Plans',
                content: 'CommonGround offers free and paid subscription plans. Features vary by plan as described on our pricing page.',
              },
              {
                title: 'Billing',
                content: 'Paid subscriptions are billed monthly or annually in advance. By subscribing, you authorize us to charge your payment method on a recurring basis until you cancel.',
              },
              {
                title: 'Cancellation',
                content: 'You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of your current billing period. No refunds are provided for partial periods.',
              },
              {
                title: 'Price Changes',
                content: 'We may change prices with 30 days\' notice. Price changes apply to the next billing cycle after notice is given.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10"
              >
                <h3 className="font-semibold text-[#1E3A4A] mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimers */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Important <span className="text-[#F5A623]">Disclaimers</span>
          </h2>

          <div className="bg-gradient-to-br from-[#F5A623]/10 to-[#F5A623]/5 rounded-3xl p-8 border-2 border-[#F5A623]/20">
            <div className="space-y-6">
              {disclaimers.map((item) => (
                <div key={item.title}>
                  <h3 className="font-semibold text-[#1E3A4A] mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Limitation of Liability */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Limitation of <span className="text-[#F5A623]">Liability</span>
          </h2>

          <div className="bg-white rounded-2xl p-8 border-2 border-[var(--portal-primary)]/10">
            <p className="text-gray-600 text-sm mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, COMMONGROUND AND ITS OFFICERS, DIRECTORS,
              EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 mb-4">
              <li>• Loss of profits, revenue, or business opportunities</li>
              <li>• Loss of data or information</li>
              <li>• Loss of goodwill or reputation</li>
              <li>• Any damages arising from your use of the Service</li>
              <li>• Any damages arising from disputes between co-parents</li>
              <li>• Any outcomes in legal proceedings</li>
            </ul>
            <p className="text-gray-600 text-sm font-medium">
              Our total liability for any claims arising from these Terms or the Service shall
              not exceed the amount you paid us in the 12 months preceding the claim, or $100,
              whichever is greater.
            </p>
          </div>
        </div>
      </section>

      {/* Indemnification */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Indemnification
          </h2>

          <div className="bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-8 border-2 border-[var(--portal-primary)]/10">
            <p className="text-gray-600 text-sm">
              You agree to indemnify, defend, and hold harmless CommonGround, its affiliates, and
              their respective officers, directors, employees, and agents from any claims, damages,
              losses, liabilities, and expenses (including reasonable legal fees) arising from:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 mt-4">
              <li>• Your use of the Service</li>
              <li>• Your violation of these Terms</li>
              <li>• Your violation of any rights of another person or entity</li>
              <li>• Any content you submit, post, or transmit through the Service</li>
              <li>• Any disputes with your co-parent or other users</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Dispute Resolution */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Dispute <span className="text-[#F5A623]">Resolution</span>
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">Informal Resolution First</h3>
              <p className="text-gray-600 text-sm">
                Before filing a formal dispute, you agree to contact us at{' '}
                <a href="mailto:legal@find-commonground.com" className="text-[var(--portal-primary)] hover:underline">
                  legal@find-commonground.com
                </a>{' '}
                to attempt informal resolution. We'll work in good faith to resolve your concerns.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">Binding Arbitration</h3>
              <p className="text-gray-600 text-sm">
                Any disputes not resolved informally shall be resolved through binding arbitration
                in accordance with the American Arbitration Association rules. Arbitration shall
                take place in Delaware, and the arbitrator's decision shall be final.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">Class Action Waiver</h3>
              <p className="text-gray-600 text-sm">
                You agree to resolve disputes with CommonGround on an individual basis and waive
                the right to participate in class actions, class arbitrations, or representative
                actions.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">Governing Law</h3>
              <p className="text-gray-600 text-sm">
                These Terms are governed by the laws of the State of Delaware, without regard to
                conflict of law principles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Termination */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Termination
          </h2>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">By You</h3>
              <p className="text-gray-600 text-sm">
                You may terminate your account at any time through settings or by contacting support.
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">By Us</h3>
              <p className="text-gray-600 text-sm">
                We may suspend or terminate accounts that violate these Terms, with notice when possible.
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#F5F9F9] to-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
              <h3 className="font-semibold text-[#1E3A4A] mb-2">Effect</h3>
              <p className="text-gray-600 text-sm">
                Upon termination, your access ends but data may be retained per our Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* General Provisions */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-serif text-[#1E3A4A] mb-8 text-center"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            General <span className="text-[#F5A623]">Provisions</span>
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Entire Agreement', desc: 'These Terms and our Privacy Policy constitute the entire agreement between you and CommonGround.' },
              { title: 'Severability', desc: 'If any provision is found unenforceable, the remaining provisions remain in full effect.' },
              { title: 'No Waiver', desc: 'Our failure to enforce any right does not waive that right or any other provision.' },
              { title: 'Assignment', desc: 'You may not assign these Terms. We may assign our rights without restriction.' },
              { title: 'Changes', desc: 'We may update these Terms with notice. Continued use after changes constitutes acceptance.' },
              { title: 'Contact', desc: 'Questions? Email legal@find-commonground.com' },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-5 border-2 border-[var(--portal-primary)]/10"
              >
                <h3 className="font-semibold text-[#1E3A4A] mb-1">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
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
            Questions about these terms?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Our legal team is here to help clarify anything.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:legal@find-commonground.com"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#F5A623] text-white font-semibold rounded-full hover:bg-[#c26647] transition-all"
            >
              legal@find-commonground.com
            </a>
            <Link
              href="/legal/privacy"
              className="inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-all border-2 border-white/30"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

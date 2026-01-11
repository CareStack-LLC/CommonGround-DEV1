import { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | CommonGround',
  description: 'Terms and conditions for using the CommonGround co-parenting platform.',
};

/**
 * Terms of Service Page
 *
 * Comprehensive terms of service for CommonGround.
 */

export default function TermsOfServicePage() {
  const lastUpdated = 'January 1, 2025';

  return (
    <div className="bg-background">
      {/* Header */}
      <section className="py-16 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/legal/privacy"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Legal
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-cg-sage-subtle rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-cg-sage" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Terms of Service</h1>
              <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-gray dark:prose-invert max-w-none">

            <div className="bg-cg-amber-subtle rounded-xl p-6 mb-8 not-prose">
              <h2 className="text-lg font-semibold text-foreground mb-2">Important Notice</h2>
              <p className="text-muted-foreground">
                By using CommonGround, you agree to these terms. Please read them carefully.
                If you don't agree, please don't use our services.
              </p>
            </div>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using CommonGround ("the Service"), you agree to be bound by these
              Terms of Service ("Terms"). These Terms apply to all users, including parents,
              legal professionals, and any other visitors.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              CommonGround is a co-parenting communication and coordination platform that provides:
            </p>
            <ul>
              <li>Secure messaging between co-parents with AI-assisted communication</li>
              <li>Custody agreement building tools</li>
              <li>Shared calendar and scheduling</li>
              <li>Expense tracking and documentation</li>
              <li>Court-ready documentation exports</li>
              <li>Professional access for attorneys, GALs, and mediators</li>
            </ul>

            <h2>3. Account Registration</h2>

            <h3>3.1 Eligibility</h3>
            <p>
              You must be at least 18 years old to use CommonGround. By registering, you represent
              that you are of legal age and have the authority to enter into these Terms.
            </p>

            <h3>3.2 Account Security</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities under your account. You agree to:
            </p>
            <ul>
              <li>Create a strong, unique password</li>
              <li>Not share your account with others</li>
              <li>Notify us immediately of unauthorized access</li>
              <li>Keep your contact information current</li>
            </ul>

            <h3>3.3 Account Accuracy</h3>
            <p>
              You agree to provide accurate, current, and complete information during registration
              and to update it as needed. Misrepresentation may result in account termination.
            </p>

            <h2>4. Acceptable Use</h2>

            <h3>4.1 Permitted Uses</h3>
            <p>You may use CommonGround to:</p>
            <ul>
              <li>Communicate with your co-parent about parenting matters</li>
              <li>Create and manage custody agreements</li>
              <li>Track schedules, expenses, and important information</li>
              <li>Generate documentation for legal proceedings</li>
              <li>Grant access to authorized professionals</li>
            </ul>

            <h3>4.2 Prohibited Uses</h3>
            <p>You agree NOT to:</p>
            <ul>
              <li>Use the Service to harass, threaten, or abuse anyone</li>
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Impersonate another person or entity</li>
              <li>Attempt to access another user's account</li>
              <li>Circumvent security features or access restrictions</li>
              <li>Use the Service for any illegal purpose</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Scrape, copy, or redistribute content without permission</li>
              <li>Use the Service to violate any court orders</li>
              <li>Manipulate or falsify records intended for court use</li>
            </ul>

            <h2>5. ARIA AI Assistant</h2>

            <h3>5.1 Nature of ARIA</h3>
            <p>
              ARIA is an AI-powered communication assistant that analyzes messages and suggests
              alternatives to reduce conflict. ARIA is a tool, not a substitute for professional
              advice. Suggestions are recommendations only.
            </p>

            <h3>5.2 User Control</h3>
            <p>
              You always have the choice to accept, modify, or reject ARIA's suggestions. You
              remain responsible for all messages you send, regardless of whether you use ARIA.
            </p>

            <h3>5.3 No Guarantee</h3>
            <p>
              We do not guarantee that ARIA will prevent all conflicts or that its suggestions
              are appropriate for every situation. Use your own judgment.
            </p>

            <h2>6. Court Documentation</h2>

            <h3>6.1 Evidence Integrity</h3>
            <p>
              CommonGround provides tools to generate court-ready documentation with integrity
              verification. However, we do not guarantee that any court will accept our
              documentation as evidence.
            </p>

            <h3>6.2 User Responsibility</h3>
            <p>
              You are responsible for ensuring that any documentation you submit to courts is
              accurate and appropriate. We are not liable for how courts interpret or use
              exported documentation.
            </p>

            <h3>6.3 Not Legal Advice</h3>
            <p>
              CommonGround is a technology platform, not a law firm. Nothing in our Service
              constitutes legal advice. Consult with a qualified attorney for legal matters.
            </p>

            <h2>7. Subscription and Payment</h2>

            <h3>7.1 Free and Paid Plans</h3>
            <p>
              CommonGround offers free and paid subscription plans. Features vary by plan as
              described on our <Link href="/pricing">pricing page</Link>.
            </p>

            <h3>7.2 Billing</h3>
            <p>
              Paid subscriptions are billed monthly or annually in advance. By subscribing,
              you authorize us to charge your payment method on a recurring basis.
            </p>

            <h3>7.3 Cancellation</h3>
            <p>
              You may cancel your subscription at any time. Cancellation takes effect at the
              end of your current billing period. No refunds are provided for partial periods.
            </p>

            <h3>7.4 Price Changes</h3>
            <p>
              We may change prices with 30 days' notice. Price changes apply to the next
              billing cycle after notice.
            </p>

            <h2>8. Intellectual Property</h2>

            <h3>8.1 Our Content</h3>
            <p>
              CommonGround, including its design, features, code, and branding, is owned by us
              and protected by intellectual property laws. You may not copy, modify, or
              distribute our content without permission.
            </p>

            <h3>8.2 Your Content</h3>
            <p>
              You retain ownership of content you create on CommonGround. By using the Service,
              you grant us a license to store, process, and display your content as needed to
              provide the Service.
            </p>

            <h2>9. Privacy</h2>
            <p>
              Your privacy is important to us. Our collection and use of personal information
              is governed by our <Link href="/legal/privacy">Privacy Policy</Link>, which is
              incorporated into these Terms.
            </p>

            <h2>10. Disclaimers</h2>

            <h3>10.1 As-Is Service</h3>
            <p>
              CommonGround is provided "as is" and "as available" without warranties of any
              kind, express or implied, including merchantability, fitness for a particular
              purpose, and non-infringement.
            </p>

            <h3>10.2 No Guarantee of Outcomes</h3>
            <p>
              We do not guarantee any particular outcome from using CommonGround, including
              reduced conflict, improved communication, or favorable court results.
            </p>

            <h3>10.3 Third-Party Services</h3>
            <p>
              CommonGround integrates with third-party services. We are not responsible for
              the availability, accuracy, or practices of these services.
            </p>

            <h2>11. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, CommonGround and its officers, directors,
              employees, and agents shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, including loss of profits, data, or goodwill,
              arising from your use of the Service.
            </p>
            <p>
              Our total liability for any claims arising from these Terms or the Service shall
              not exceed the amount you paid us in the 12 months preceding the claim.
            </p>

            <h2>12. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless CommonGround from any claims, damages,
              losses, or expenses (including legal fees) arising from your use of the Service,
              your violation of these Terms, or your violation of any rights of another.
            </p>

            <h2>13. Dispute Resolution</h2>

            <h3>13.1 Informal Resolution</h3>
            <p>
              Before filing a formal dispute, you agree to contact us at{' '}
              <a href="mailto:legal@commonground.app">legal@commonground.app</a> to attempt
              informal resolution.
            </p>

            <h3>13.2 Arbitration</h3>
            <p>
              Any disputes not resolved informally shall be resolved through binding arbitration
              in accordance with the American Arbitration Association rules. Arbitration shall
              take place in [Location].
            </p>

            <h3>13.3 Class Action Waiver</h3>
            <p>
              You agree to resolve disputes individually and waive the right to participate in
              class actions or class arbitrations.
            </p>

            <h2>14. Termination</h2>

            <h3>14.1 By You</h3>
            <p>
              You may terminate your account at any time by contacting us or using the account
              deletion feature in settings.
            </p>

            <h3>14.2 By Us</h3>
            <p>
              We may suspend or terminate your account if you violate these Terms, engage in
              harmful conduct, or for any other reason with notice.
            </p>

            <h3>14.3 Effect of Termination</h3>
            <p>
              Upon termination, your right to use the Service ends. We may retain your data
              as described in our Privacy Policy and as required by law.
            </p>

            <h2>15. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We'll notify you of material changes
              via email or through the Service. Continued use after changes constitutes acceptance.
            </p>

            <h2>16. General Provisions</h2>

            <h3>16.1 Entire Agreement</h3>
            <p>
              These Terms, together with the Privacy Policy, constitute the entire agreement
              between you and CommonGround regarding the Service.
            </p>

            <h3>16.2 Severability</h3>
            <p>
              If any provision of these Terms is found unenforceable, the remaining provisions
              remain in effect.
            </p>

            <h3>16.3 Waiver</h3>
            <p>
              Our failure to enforce any right or provision does not constitute a waiver of
              that right or provision.
            </p>

            <h3>16.4 Assignment</h3>
            <p>
              You may not assign these Terms without our consent. We may assign our rights
              and obligations without restriction.
            </p>

            <h3>16.5 Governing Law</h3>
            <p>
              These Terms are governed by the laws of [State], without regard to conflict
              of law principles.
            </p>

            <h2>17. Contact Us</h2>
            <p>For questions about these Terms:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:legal@commonground.app">legal@commonground.app</a></li>
              <li><strong>Mail:</strong> CommonGround Legal, [Address]</li>
              <li><strong>Contact Form:</strong> <Link href="/help/contact">Contact Us</Link></li>
            </ul>

          </div>
        </div>
      </section>

      {/* Related Links */}
      <section className="py-12 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Related Documents</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/legal/privacy"
              className="px-4 py-2 bg-background rounded-lg border border-border hover:border-cg-sage/30 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/security"
              className="px-4 py-2 bg-background rounded-lg border border-border hover:border-cg-sage/30 transition-colors"
            >
              Security
            </Link>
            <Link
              href="/help/contact"
              className="px-4 py-2 bg-background rounded-lg border border-border hover:border-cg-sage/30 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

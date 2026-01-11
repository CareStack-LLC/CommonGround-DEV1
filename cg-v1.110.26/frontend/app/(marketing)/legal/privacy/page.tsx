import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | CommonGround',
  description: 'Learn how CommonGround collects, uses, and protects your personal information.',
};

/**
 * Privacy Policy Page
 *
 * Comprehensive privacy policy for CommonGround.
 */

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 1, 2025';

  return (
    <div className="bg-background">
      {/* Header */}
      <section className="py-16 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/legal/terms"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Legal
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-cg-sage-subtle rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-cg-sage" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Privacy Policy</h1>
              <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-gray dark:prose-invert max-w-none">

            <div className="bg-cg-sage-subtle rounded-xl p-6 mb-8 not-prose">
              <h2 className="text-lg font-semibold text-foreground mb-2">Our Commitment</h2>
              <p className="text-muted-foreground">
                At CommonGround, we believe your family's data is sacred. We collect only what's necessary
                to provide our services, we never sell your information, and we give you control over your data.
              </p>
            </div>

            <h2>1. Information We Collect</h2>

            <h3>1.1 Information You Provide</h3>
            <p>When you use CommonGround, you may provide us with:</p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, phone number, and password when you register</li>
              <li><strong>Profile Information:</strong> Address, timezone, and notification preferences</li>
              <li><strong>Case Information:</strong> Details about your custody case, children's information, and co-parent details</li>
              <li><strong>Communication Content:</strong> Messages you send through the platform</li>
              <li><strong>Agreement Content:</strong> Information you enter when creating custody agreements</li>
              <li><strong>Financial Information:</strong> Expense records, payment information for subscriptions</li>
              <li><strong>Schedule Information:</strong> Custody schedules, events, and exchange check-ins</li>
            </ul>

            <h3>1.2 Information We Collect Automatically</h3>
            <p>When you use our platform, we automatically collect:</p>
            <ul>
              <li><strong>Usage Data:</strong> Features you use, pages you visit, actions you take</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
              <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
              <li><strong>Location Data:</strong> GPS coordinates when you use exchange check-in features (with your permission)</li>
            </ul>

            <h3>1.3 Information from Third Parties</h3>
            <p>We may receive information from:</p>
            <ul>
              <li><strong>Authentication Providers:</strong> When you sign in with Google or other providers</li>
              <li><strong>Payment Processors:</strong> Transaction confirmation from Stripe</li>
              <li><strong>Professional Verifiers:</strong> Bar association verification for legal professionals</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li><strong>Provide Services:</strong> Enable messaging, scheduling, agreement building, and expense tracking</li>
              <li><strong>Improve Communication:</strong> Power ARIA's sentiment analysis and suggestions (processed in real-time, not stored separately)</li>
              <li><strong>Generate Reports:</strong> Create court export packages when you request them</li>
              <li><strong>Send Notifications:</strong> Alert you about messages, schedule changes, and important updates</li>
              <li><strong>Provide Support:</strong> Respond to your questions and help resolve issues</li>
              <li><strong>Improve the Platform:</strong> Analyze usage patterns to improve features (using aggregated, anonymized data)</li>
              <li><strong>Ensure Security:</strong> Detect and prevent fraud, abuse, and security incidents</li>
              <li><strong>Comply with Law:</strong> Respond to legal requests and protect our rights</li>
            </ul>

            <h2>3. How We Share Your Information</h2>

            <h3>3.1 With Your Co-Parent</h3>
            <p>
              Messages, shared calendars, agreements, and expense records are visible to both parents
              in your case. This is core to how CommonGround works.
            </p>

            <h3>3.2 With Authorized Professionals</h3>
            <p>
              When you grant access to attorneys, GALs, mediators, or other professionals, they can
              view case information according to the permissions you set. All access is logged.
            </p>

            <h3>3.3 With Service Providers</h3>
            <p>We share information with trusted service providers who help us operate:</p>
            <ul>
              <li><strong>Supabase:</strong> Database hosting and authentication</li>
              <li><strong>Anthropic:</strong> AI processing for ARIA (message content is processed but not stored by Anthropic)</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>SendGrid:</strong> Email delivery</li>
              <li><strong>Vercel/Railway:</strong> Application hosting</li>
            </ul>

            <h3>3.4 For Legal Reasons</h3>
            <p>We may disclose information when required by law, court order, or to protect rights and safety.</p>

            <h3>3.5 What We Never Do</h3>
            <ul>
              <li>We <strong>never sell</strong> your personal information</li>
              <li>We <strong>never share</strong> your data for advertising purposes</li>
              <li>We <strong>never use</strong> your communications to train AI models</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>We protect your data with:</p>
            <ul>
              <li><strong>Encryption:</strong> AES-256 encryption at rest, TLS 1.3 in transit</li>
              <li><strong>Access Controls:</strong> Role-based permissions and authentication</li>
              <li><strong>Audit Logging:</strong> All access and modifications are logged</li>
              <li><strong>Regular Audits:</strong> Security assessments and penetration testing</li>
              <li><strong>Employee Training:</strong> Security awareness for all team members</li>
            </ul>

            <h2>5. Data Retention</h2>
            <p>We retain your data as follows:</p>
            <ul>
              <li><strong>Active Accounts:</strong> Data is retained while your account is active</li>
              <li><strong>Deleted Accounts:</strong> Data is deleted within 90 days of account deletion request</li>
              <li><strong>Legal Requirements:</strong> Some data may be retained longer if required by law</li>
              <li><strong>Court Records:</strong> Data that has been exported for court proceedings may be retained per court requirements</li>
            </ul>

            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Opt-Out:</strong> Disable certain data collection (like location services)</li>
              <li><strong>Withdraw Consent:</strong> Revoke consent for optional data processing</li>
            </ul>
            <p>
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@commonground.app">privacy@commonground.app</a>.
            </p>

            <h2>7. Children's Privacy</h2>
            <p>
              CommonGround is designed for parents and legal professionals, not children. While we
              collect information about children as part of custody cases, this information is provided
              by parents and is protected with the same security as all other data.
            </p>
            <p>
              We do not knowingly collect information directly from children under 13. If you believe
              a child has provided us with personal information, please contact us.
            </p>

            <h2>8. International Users</h2>
            <p>
              CommonGround is based in the United States. If you access our services from outside the
              US, your information will be transferred to and processed in the US. We comply with
              applicable data protection laws and provide appropriate safeguards for international transfers.
            </p>

            <h2>9. California Privacy Rights (CCPA)</h2>
            <p>California residents have additional rights:</p>
            <ul>
              <li>Right to know what personal information we collect</li>
              <li>Right to delete personal information</li>
              <li>Right to opt-out of sale (we don't sell your data)</li>
              <li>Right to non-discrimination for exercising privacy rights</li>
            </ul>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. We'll notify you of significant changes
              via email or through the platform. Continued use after changes constitutes acceptance.
            </p>

            <h2>11. Contact Us</h2>
            <p>For privacy-related questions or to exercise your rights:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:privacy@commonground.app">privacy@commonground.app</a></li>
              <li><strong>Mail:</strong> CommonGround Privacy, [Address]</li>
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
              href="/legal/terms"
              className="px-4 py-2 bg-background rounded-lg border border-border hover:border-cg-sage/30 transition-colors"
            >
              Terms of Service
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

import Link from 'next/link';
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Play,
  Lightbulb,
  FileText,
  Lock,
  Download,
  UserCheck,
  Scale,
  Fingerprint,
  FolderOpen,
  ClipboardList,
} from 'lucide-react';

export const metadata = {
  title: 'Court Documentation Guide | CommonGround Help Center',
  description:
    'Learn about SHA-256 tamper-proof verification, the 5 export types, generating court-ready PDFs, and working with your attorney.',
};

const tocItems = [
  { id: 'court-ready', label: 'What makes CommonGround court-ready' },
  { id: 'sha-256', label: 'SHA-256 verification explained' },
  { id: 'export-types', label: '5 export types' },
  { id: 'generating-export', label: 'How to generate an export' },
  { id: 'working-with-attorney', label: 'Working with your attorney' },
  { id: 'court-acceptance', label: 'What courts accept' },
  { id: 'tips', label: 'Tips for strong records' },
];

const exportTypes = [
  {
    name: 'Full Case Package',
    desc: 'A comprehensive export containing all communications, agreements, schedules, financial records, and exchange logs. This is typically used when filing a new motion or providing a complete picture to the court.',
  },
  {
    name: 'Communication Log',
    desc: 'All messages between co-parents, including ARIA intervention records, timestamps, and read receipts. Demonstrates the tone, frequency, and content of parental communication.',
  },
  {
    name: 'Custody Schedule Report',
    desc: 'A detailed record of custody time, including scheduled versus actual exchanges, GPS verification data, late pickups, and missed visits with compliance percentages.',
  },
  {
    name: 'Financial Summary',
    desc: 'All ClearFund transactions including expenses, reimbursements, payment history, and outstanding balances. Includes receipt attachments and obligation compliance data.',
  },
  {
    name: 'ARIA Assessment',
    desc: 'A summary of ARIA\'s communication analysis, including sentiment trends, intervention frequency, and cooperation metrics. Provides an objective measure of co-parenting dynamics.',
  },
];

export default function CourtExportsGuidePage() {
  return (
    <article className="pb-16 lg:pb-24">
      {/* Hero */}
      <section className="pt-10 pb-8 lg:pt-14 lg:pb-10">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-cg-sage/10 flex items-center justify-center mx-auto mb-5">
            <Shield className="w-7 h-7 text-cg-sage" />
          </div>
          <h1
            className="text-3xl sm:text-4xl text-foreground mb-3"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Court <span className="text-cg-sage">Documentation</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Tamper-proof, court-ready exports with SHA-256 verification, professional access, and acceptance across all 50 states.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">
        {/* Table of Contents */}
        <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-10">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">In this guide</h2>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {tocItems.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-foreground hover:text-cg-sage text-sm transition-colors">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* What Makes CommonGround Court-Ready */}
        <section id="court-ready" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              What makes CommonGround court-ready
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            CommonGround was built from the ground up with court admissibility in mind. Every piece of data created on the platform is timestamped, attributed to a specific user, and protected by cryptographic verification that proves records have not been tampered with.
          </p>
          <ul className="space-y-2 mb-4">
            {[
              'SHA-256 tamper-proof verification on every record and export.',
              'Complete chain of custody showing who created, viewed, and modified each record.',
              'Precise timestamps on every action, down to the second.',
              'Immutable audit logs that cannot be edited or deleted by either parent.',
              'Professional-grade PDF exports formatted for legal proceedings.',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* SHA-256 Verification */}
        <section id="sha-256" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Fingerprint className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              SHA-256 verification explained
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Think of SHA-256 verification as a digital fingerprint for your records. When a record is created, the system generates a unique code based on its exact contents. If even one character in the record were changed, the verification code would be completely different, instantly proving the record has been altered.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            This means that when you export your records for court, the judge, attorney, or guardian ad litem can independently verify that the documents are authentic and unmodified. It is the same technology used by banks and government agencies to protect sensitive data.
          </p>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex gap-2 items-start">
              <Lightbulb className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> You do not need to understand the technical details of SHA-256. The key point is that your records are cryptographically proven to be authentic, which gives them significant weight in legal proceedings.
              </p>
            </div>
          </div>
        </section>

        {/* 5 Export Types */}
        <section id="export-types" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <FolderOpen className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              5 export types
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-6">
            CommonGround offers five specialized export types, each designed for a specific legal purpose. You can generate any of these independently or combine them into a comprehensive package.
          </p>
          <div className="space-y-4">
            {exportTypes.map((type, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-cg-sage/10 text-cg-sage text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{type.name}</h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed ml-8">{type.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to Generate an Export */}
        <section id="generating-export" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              How to generate an export
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Generating a court-ready export takes just a few steps. Each export is compiled as a professional PDF with verification codes and formatted for legal use.
          </p>
          <ol className="space-y-3 mb-6">
            {[
              'Navigate to the Exports section from your family file dashboard.',
              'Choose the export type (or select multiple types for a combined package).',
              'Select the date range you want the export to cover.',
              'Choose which sections and data points to include or exclude.',
              'Tap "Generate PDF" and wait for the document to compile.',
              'Download the PDF or share it directly with your attorney through the Professional Portal.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage/10 text-cg-sage text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-gray-600 text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex gap-2 items-start">
              <Lightbulb className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Generate a test export before your court date so you know exactly what it includes and can discuss any adjustments with your attorney.
              </p>
            </div>
          </div>
        </section>

        {/* Working with Your Attorney */}
        <section id="working-with-attorney" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <UserCheck className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Working with your attorney
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            CommonGround includes a Professional Portal that allows you to grant your attorney secure, read-only access to your case records. This eliminates the back-and-forth of emailing documents and ensures your attorney always has the most current information.
          </p>
          <ul className="space-y-2 mb-4">
            {[
              'Invite your attorney by email through the Professional Access section.',
              'Set time-limited access windows (e.g., access expires after 30 days).',
              'Attorneys receive read-only access. They cannot modify any records.',
              'All attorney activity is logged, creating a transparent access history.',
              'Revoke access at any time from your settings.',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* What Courts Accept */}
        <section id="court-acceptance" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              What courts accept
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            CommonGround exports have been accepted in family courts across all 50 states. The combination of SHA-256 verification, detailed timestamps, and chain-of-custody documentation meets the evidentiary standards that courts require for digital records.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            That said, court requirements can vary by jurisdiction and judge. Always discuss your specific situation with your attorney to ensure CommonGround exports meet the requirements in your case.
          </p>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex gap-2 items-start">
              <Lightbulb className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Ask your attorney to review a sample export early in your case. This ensures there are no surprises and gives your attorney time to request any additional documentation formats the court may require.
              </p>
            </div>
          </div>
        </section>

        {/* Tips for Strong Records */}
        <section id="tips" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardList className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Tips for strong records
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            The quality of your court documentation depends on how consistently you use the platform. Here are best practices for maintaining strong records.
          </p>
          <ol className="space-y-3 mb-6">
            {[
              'Export regularly. Generate exports monthly or quarterly so you always have up-to-date records available.',
              'Keep all records current. Log expenses promptly, confirm exchanges on time, and respond to messages through the platform.',
              'Use ARIA to maintain a good-faith communication record. Let ARIA help you phrase messages constructively, which demonstrates cooperative intent.',
              'Document everything in the platform. Courts give more weight to records created in real time than to after-the-fact summaries.',
              'Review your exports for completeness before submitting them to your attorney or the court.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-sage/10 text-cg-sage text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-gray-600 text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Video Placeholder */}
        <div className="bg-gradient-to-br from-foreground to-cg-slate rounded-2xl p-8 text-center text-white mb-12">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Play className="w-7 h-7 text-white" />
          </div>
          <h3
            className="text-xl mb-2"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Court exports walkthrough
          </h3>
          <p className="text-white/70 text-sm">Video walkthrough coming soon</p>
        </div>

        {/* Related Guides */}
        <section className="mb-12">
          <h2
            className="text-xl text-foreground mb-5"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Related guides
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Expenses & ClearFund', desc: 'Financial records that feed into court exports.', href: '/help/guides/expenses' },
              { title: 'Agreement Builder', desc: 'Create agreements that export as court-ready PDFs.', href: '/help/guides/agreements' },
              { title: 'Messaging & ARIA', desc: 'Communication logs used in court documentation.', href: '/help/guides/messaging-aria' },
              { title: 'For Professionals', desc: 'How attorneys and mediators access your case records.', href: '/help/guides/professional-access' },
            ].map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all"
              >
                <h3 className="text-foreground font-medium text-sm mb-1 group-hover:text-cg-sage transition-colors">
                  {guide.title}
                </h3>
                <p className="text-xs text-gray-500">{guide.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Still Need Help CTA */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <h2
            className="text-xl text-foreground mb-2"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Still need help?
          </h2>
          <p className="text-gray-600 text-sm mb-5">
            Our support team can help you with export questions or guide you through the process.
          </p>
          <Link
            href="/help/contact"
            className="inline-flex items-center gap-2 bg-cg-sage text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-cg-sage-dark transition-colors"
          >
            Contact support
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

import Link from 'next/link';
import {
  FileText,
  ArrowRight,
  CheckCircle2,
  Play,
  Lightbulb,
  Users,
  Brain,
  Download,
  History,
  ListChecks,
  Handshake,
  ShieldCheck,
  Layers,
} from 'lucide-react';

export const metadata = {
  title: 'Agreement Builder Guide | CommonGround Help Center',
  description:
    'Learn how to create custody agreements step by step, use ARIA guidance, manage Quick Accords, and export court-ready PDFs.',
};

const tocItems = [
  { id: 'what-is-agreement-builder', label: 'What is the Agreement Builder?' },
  { id: 'starting-agreement', label: 'Starting a new agreement' },
  { id: 'the-18-sections', label: 'The 18 sections explained' },
  { id: 'aria-guidance', label: 'Using ARIA guidance' },
  { id: 'quick-accords', label: 'Quick Accords' },
  { id: 'dual-parent-approval', label: 'Dual-parent approval' },
  { id: 'exporting-pdf', label: 'Exporting as PDF' },
  { id: 'version-history', label: 'Version history' },
];

const agreementSections = [
  { num: 1, name: 'Parent Info', desc: 'Names, contact details, and identifying information for both parents.' },
  { num: 2, name: 'Children', desc: 'Names, dates of birth, and relevant details for each child.' },
  { num: 3, name: 'Legal Custody', desc: 'Who makes major decisions about education, health, and religion.' },
  { num: 4, name: 'Physical Custody', desc: 'Primary residence and the overall living arrangement.' },
  { num: 5, name: 'Parenting Schedule', desc: 'Weekly and biweekly schedules for regular custody time.' },
  { num: 6, name: 'Holidays', desc: 'Holiday rotation, school breaks, and special occasion scheduling.' },
  { num: 7, name: 'Exchanges', desc: 'Drop-off and pick-up locations, times, and procedures.' },
  { num: 8, name: 'Transportation', desc: 'Who provides transportation and how travel costs are shared.' },
  { num: 9, name: 'Child Support', desc: 'Payment amounts, frequency, and method of payment.' },
  { num: 10, name: 'Medical', desc: 'Insurance coverage, uncovered costs, and medical decision-making.' },
  { num: 11, name: 'Education', desc: 'School choice, tutoring, extracurricular activity decisions.' },
  { num: 12, name: 'Communication', desc: 'How parents communicate and rules for contacting the child.' },
  { num: 13, name: 'Child Contact', desc: 'Phone and video call schedules with the non-custodial parent.' },
  { num: 14, name: 'Travel', desc: 'Domestic and international travel notification and consent rules.' },
  { num: 15, name: 'Relocation', desc: 'Notice requirements and procedures if a parent plans to move.' },
  { num: 16, name: 'Dispute Resolution', desc: 'Mediation, arbitration, and escalation procedures.' },
  { num: 17, name: 'Other Provisions', desc: 'Additional terms specific to your family\'s needs.' },
  { num: 18, name: 'Review', desc: 'Final review of all sections before submission for approval.' },
];

export default function AgreementsGuidePage() {
  return (
    <article className="pb-16 lg:pb-24">
      {/* Hero */}
      <section className="pt-10 pb-8 lg:pt-14 lg:pb-10">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-cg-sage/10 flex items-center justify-center mx-auto mb-5">
            <FileText className="w-7 h-7 text-cg-sage" />
          </div>
          <h1
            className="text-3xl sm:text-4xl text-foreground mb-3"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Agreement <span className="text-cg-sage">Builder</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Create comprehensive SharedCare Agreements with guided wizards, ARIA assistance, and court-ready PDF exports.
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

        {/* What is the Agreement Builder? */}
        <section id="what-is-agreement-builder" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Layers className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              What is the Agreement Builder?
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            The Agreement Builder is a guided wizard that walks you through creating a comprehensive custody agreement, called a SharedCare Agreement in CommonGround. Instead of starting from a blank document, you fill in 18 structured sections covering every aspect of your co-parenting arrangement.
          </p>
          <p className="text-gray-600 leading-relaxed">
            ARIA, your AI assistant, can help with suggested language for each section, ensuring terms are fair, clear, and legally sound. Once both parents approve, the agreement can be exported as a court-ready PDF.
          </p>
        </section>

        {/* Starting a New Agreement */}
        <section id="starting-agreement" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <ListChecks className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Starting a new agreement
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            You can start a new SharedCare Agreement from your family file dashboard. The process is designed to be completed over multiple sessions, so you can save your progress and return at any time.
          </p>
          <ol className="space-y-3 mb-6">
            {[
              'From your family file dashboard, tap "Agreements" in the navigation.',
              'Tap "Create New Agreement" to begin the guided wizard.',
              'Work through each section at your own pace. Completed sections show a green check.',
              'Use the sidebar to jump between sections or return to unfinished ones.',
              'When all sections are complete, submit the agreement for your co-parent\'s review.',
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
                <strong>Tip:</strong> You do not need to complete every section in one sitting. Your progress is automatically saved. Many parents take several days to work through all 18 sections thoughtfully.
              </p>
            </div>
          </div>
        </section>

        {/* The 18 Sections */}
        <section id="the-18-sections" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              The 18 sections explained
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-6">
            Each SharedCare Agreement covers 18 key areas of your co-parenting arrangement. Here is a brief overview of what each section addresses.
          </p>
          <div className="space-y-3">
            {agreementSections.map((section) => (
              <div key={section.num} className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-foreground text-white text-xs font-semibold flex items-center justify-center">
                  {section.num}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{section.name}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{section.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Using ARIA Guidance */}
        <section id="aria-guidance" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Using ARIA guidance
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Within each section, you can ask ARIA for help. ARIA provides suggested language, explains common approaches, and helps you articulate terms that are fair to both parents and prioritize your children&apos;s wellbeing.
          </p>
          <ul className="space-y-2 mb-4">
            {[
              'Tap the "Ask ARIA" button in any section to start a guidance conversation.',
              'ARIA suggests language based on your state\'s custody norms and best practices.',
              'You can accept ARIA\'s suggestions as-is, modify them, or write your own terms.',
              'ARIA helps ensure your agreement uses clear, enforceable language.',
              'All ARIA suggestions are recommendations. You always have final control over the content.',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex gap-2 items-start">
              <Lightbulb className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> ARIA is not a lawyer. While its suggestions are based on common custody best practices, always review your agreement with a family law attorney before filing it with the court.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Accords */}
        <section id="quick-accords" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Handshake className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Quick Accords
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Quick Accords are one-time modifications to your existing agreement. They are perfect for handling schedule swaps, temporary changes, or special circumstances without amending your full agreement.
          </p>
          <ol className="space-y-3 mb-6">
            {[
              'From the Agreements section, tap "New Quick Accord."',
              'Describe the proposed change (e.g., swapping weekends, adjusting pickup time).',
              'Your co-parent receives a notification and can approve or suggest modifications.',
              'Once both parents approve, the Quick Accord is documented with timestamps.',
              'All Quick Accords are stored alongside your main agreement for reference.',
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

        {/* Dual-Parent Approval */}
        <section id="dual-parent-approval" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Dual-parent approval
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            No agreement or modification is finalized until both parents approve. This ensures that every term in the document reflects mutual consent.
          </p>
          <p className="text-gray-600 leading-relaxed">
            When one parent submits an agreement or Quick Accord, the other parent is notified and can review every section. They can approve the agreement as-is, request changes to specific sections, or add comments for discussion. The approval workflow is fully documented with timestamps, creating a clear record of consent.
          </p>
        </section>

        {/* Exporting as PDF */}
        <section id="exporting-pdf" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Exporting as PDF
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Once both parents approve the agreement, you can generate a professional, court-ready PDF that includes all 18 sections formatted for legal use. The PDF includes both parents&apos; approval timestamps and can be submitted to the court as part of your filing.
          </p>
          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4">
            <div className="flex gap-2 items-start">
              <Lightbulb className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Share the exported PDF with your attorney before filing. They can verify that the language meets your state&apos;s requirements and suggest any necessary adjustments.
              </p>
            </div>
          </div>
        </section>

        {/* Version History */}
        <section id="version-history" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <History className="w-5 h-5 text-cg-sage" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Version history
            </h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Every change to your agreement is tracked in the version history. You can see exactly what was modified, when, and by whom. This is valuable for court purposes and helps both parents stay informed about the evolution of their agreement.
          </p>
          <ul className="space-y-2">
            {[
              'View a timeline of all changes across every section.',
              'Compare different versions side by side to see what changed.',
              'Identify who made each modification with timestamp attribution.',
              'Revert to a previous version if both parents agree.',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
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
            Agreement Builder walkthrough
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
              { title: 'Expenses & ClearFund', desc: 'Set up expense splits defined in your agreement.', href: '/help/guides/expenses' },
              { title: 'Court Documentation', desc: 'Export your agreement and records for court filings.', href: '/help/guides/court-exports' },
              { title: 'Calendar & Scheduling', desc: 'Your parenting schedule syncs from the agreement.', href: '/help/guides/calendar-scheduling' },
              { title: 'Messaging & ARIA', desc: 'Learn more about ARIA and how it assists communication.', href: '/help/guides/messaging-aria' },
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
            Our support team can help you with agreement questions or guide you through the process.
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

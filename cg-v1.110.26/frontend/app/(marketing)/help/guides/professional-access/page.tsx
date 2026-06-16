import Link from 'next/link';
import { Metadata } from 'next';
import {
  Scale,
  Users,
  KeyRound,
  Rocket,
  LayoutDashboard,
  Layers,
  Brain,
  FileBarChart,
  FileCheck2,
  Building2,
  Play,
  Lightbulb,
  ChevronRight,
  ArrowRight,
  Shield,
  CreditCard,
  BookOpen,
  MessageSquare,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Professionals | CommonGround Help Center',
  description:
    'How attorneys, mediators, and family law professionals use CommonGround to manage cases, generate reports, and support co-parenting families.',
};

const tocItems = [
  { id: 'who-can-use', label: 'Who can use the portal' },
  { id: 'how-access-works', label: 'How access works' },
  { id: 'getting-started', label: 'Getting started' },
  { id: 'dashboard', label: 'The professional dashboard' },
  { id: 'case-views', label: 'Case views' },
  { id: 'ai-intake', label: 'AI-assisted intake' },
  { id: 'reports', label: 'Report types' },
  { id: 'court-evidence', label: 'Court evidence packages' },
  { id: 'firm-management', label: 'Firm management' },
];

const relatedGuides = [
  { title: 'Privacy & Security', href: '/help/guides/privacy-security', icon: Shield },
  { title: 'Court Documentation', href: '/help/guides/court-exports', icon: FileCheck2 },
  { title: 'Account & Billing', href: '/help/guides/account-billing', icon: CreditCard },
  { title: 'Messaging & ARIA', href: '/help/guides/messaging-aria', icon: MessageSquare },
];

const professionalTypes = [
  'Family law attorneys',
  'Mediators',
  'Guardians ad litem (GALs) and custody evaluators',
  'Family therapists and counselors',
  'Paralegals',
  'Parenting coordinators',
];

const caseViews = [
  { name: 'Timeline', description: 'Chronological feed of all case activity including messages, exchanges, and court events' },
  { name: 'Messages', description: 'Full message history with ARIA intervention flags and sentiment indicators' },
  { name: 'Schedule', description: 'Custody exchanges, compliance rates, and upcoming handoff details' },
  { name: 'Agreements', description: 'All custody agreement sections, versions, and approval status' },
  { name: 'ClearFund', description: 'Financial tracking including expenses, obligations, and payment history' },
  { name: 'ARIA Controls', description: 'Adjust AI sensitivity thresholds and review good-faith communication scores' },
  { name: 'Exports', description: 'Generate and download court-ready reports and evidence packages' },
];

const reportTypes = [
  { name: 'Full Compliance Report', description: 'Comprehensive overview of schedule adherence, communication patterns, and financial obligations across all areas' },
  { name: 'Communication Analysis', description: 'Message volume, ARIA intervention frequency, sentiment trends, and response time metrics' },
  { name: 'Exchange Compliance', description: 'Custody handoff data including GPS verification, on-time rates, and documented incidents' },
  { name: 'Financial Compliance', description: 'Expense submissions, payment timeliness, outstanding balances, and obligation fulfillment' },
  { name: 'ARIA Assessment', description: 'AI-generated analysis of communication health, cooperation trends, and recommended interventions' },
];

export default function ProfessionalAccessGuidePage() {
  return (
    <article className="pb-20">
      {/* Hero */}
      <section className="pt-12 pb-10 lg:pt-16 lg:pb-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cg-sage/10 flex items-center justify-center mx-auto mb-6">
            <Scale className="w-8 h-8 text-cg-sage" />
          </div>
          <h1
            className="text-3xl sm:text-4xl text-foreground mb-4"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            For Professionals
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            A complete guide to the CommonGround professional portal for attorneys,
            mediators, and family law professionals supporting co-parenting families.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">
        {/* Table of Contents */}
        <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-12">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            In this guide
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {tocItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="flex items-center gap-2 text-sm text-foreground hover:text-cg-sage transition-colors py-1"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-cg-sage" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Who can use */}
        <section id="who-can-use" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Who can use the professional portal
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            The professional portal is designed for anyone involved in supporting
            co-parenting families in a legal or therapeutic capacity.
          </p>
          <ul className="space-y-2.5 text-gray-700">
            {professionalTypes.map((type) => (
              <li key={type} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
                <span>{type}</span>
              </li>
            ))}
          </ul>

          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4 mt-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">Free for professionals</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Professional accounts are completely free. Parents pay for their own
                  subscriptions &mdash; you never pay to access client cases.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How access works */}
        <section id="how-access-works" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <KeyRound className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              How professional access works
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Access is parent-initiated and consent-based. This ensures families stay in
            control of who sees their information.
          </p>
          <ul className="space-y-2.5 text-gray-700">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Parent-initiated invitations</strong> &mdash; a parent invites you by entering your email address in their case settings</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Dual-parent consent (configurable)</strong> &mdash; by default both parents must approve, though this can be adjusted per case</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Scoped permissions</strong> &mdash; your access is limited to the specific case you are invited to, not the parent&apos;s entire account</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Complete audit logging</strong> &mdash; every action you take within a case is recorded for transparency</span>
            </li>
          </ul>
        </section>

        {/* Getting started */}
        <section id="getting-started" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Rocket className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Getting started as a professional
            </h2>
          </div>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">1</span>
              <span><strong>Create a free professional account</strong> at commonground.com/professional/register</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">2</span>
              <span><strong>Set up your profile</strong> &mdash; add your name, credentials, practice area, and firm affiliation</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">3</span>
              <span><strong>Wait for a client invitation</strong> &mdash; when a parent adds you to their case, you will receive an email notification</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">4</span>
              <span><strong>Accept the invitation</strong> and the case will appear on your professional dashboard</span>
            </li>
          </ol>

          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4 mt-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">Tip</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  If you are part of a firm, ask your firm administrator to add you to the
                  firm account. This lets clients find you through the firm directory and
                  streamlines case assignment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard */}
        <section id="dashboard" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <LayoutDashboard className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              The professional dashboard
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Your dashboard is your command center. At a glance you can see your entire
            practice workload and prioritize what needs attention.
          </p>
          <ul className="space-y-2.5 text-gray-700">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Practice overview</strong> &mdash; total active cases, pending invitations, and recent activity summary</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>All assigned cases</strong> &mdash; sortable and filterable list of every case you are connected to</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Alerts</strong> &mdash; flagged messages, missed exchanges, overdue payments, and compliance issues</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Key metrics</strong> &mdash; communication health scores, exchange compliance rates, and financial summaries</span>
            </li>
          </ul>
        </section>

        {/* Video placeholder */}
        <div className="bg-gradient-to-br from-foreground to-cg-slate rounded-2xl p-8 text-center text-white mb-14">
          <Play className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h3
            className="text-xl mb-2"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Professional Portal Walkthrough
          </h3>
          <p className="text-white/70 text-sm">Video walkthrough coming soon</p>
        </div>

        {/* Case views */}
        <section id="case-views" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Layers className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Case views
            </h2>
          </div>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Each case provides multiple views so you can quickly find the information
            you need. Switch between views using the tabs at the top of any case page.
          </p>
          <div className="space-y-4">
            {caseViews.map((view) => (
              <div key={view.name} className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-foreground mb-1">{view.name}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{view.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AI Intake */}
        <section id="ai-intake" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              AI-assisted intake sessions
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Save hours on client intake with CommonGround&apos;s AI-assisted intake system.
            The AI conducts a structured interview with prospective clients and delivers
            organized, actionable data to your dashboard.
          </p>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">1</span>
              <span><strong>Send an intake link</strong> to a prospective client via email from your Intake Center</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">2</span>
              <span><strong>AI conducts the interview</strong> &mdash; the client answers guided questions about their situation, children, and goals</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">3</span>
              <span><strong>Key data is auto-extracted</strong> &mdash; names, dates, custody details, and concerns are organized into a structured summary</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">4</span>
              <span><strong>Convert to a full case</strong> &mdash; review the intake, accept the client, and the data flows directly into a new case</span>
            </li>
          </ol>
        </section>

        {/* Reports */}
        <section id="reports" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <FileBarChart className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Report types
            </h2>
          </div>
          <p className="text-gray-600 mb-6 leading-relaxed">
            CommonGround offers five specialized report types, each designed for specific
            legal and professional needs.
          </p>
          <div className="space-y-4">
            {reportTypes.map((report, index) => (
              <div key={report.name} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{report.name}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{report.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Court evidence */}
        <section id="court-evidence" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <FileCheck2 className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Generating court evidence packages
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Court evidence packages compile case data into a verified, tamper-evident PDF
            that is ready to present in legal proceedings.
          </p>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">1</span>
              <span><strong>Select a date range</strong> for the evidence you want to include</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">2</span>
              <span><strong>Choose sections</strong> &mdash; messages, exchanges, finances, agreements, or any combination</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">3</span>
              <span><strong>Generate the verified PDF</strong> &mdash; each page includes a SHA-256 hash for tamper detection and integrity verification</span>
            </li>
          </ol>

          <div className="bg-cg-amber/5 border-l-4 border-cg-amber rounded-lg px-5 py-4 mt-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-cg-amber mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">Accepted in court</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  SHA-256 verified exports include a unique hash per page that can be
                  independently validated, making them suitable as court exhibits. Each
                  export also includes a certificate of authenticity page.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Firm management */}
        <section id="firm-management" className="mb-14 scroll-mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-6 h-6 text-cg-sage flex-shrink-0" />
            <h2
              className="text-2xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Firm management
            </h2>
          </div>
          <p className="text-gray-600 mb-4 leading-relaxed">
            If you work as part of a practice, CommonGround lets you create a firm account
            to centralize case management and team coordination.
          </p>
          <h3 className="font-semibold text-foreground mb-3">Setting up a firm</h3>
          <ol className="space-y-3 text-gray-700 mb-6">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">1</span>
              <span><strong>Create your firm</strong> from the Professional Dashboard &gt; Firm Settings</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">2</span>
              <span><strong>Invite team members</strong> by email &mdash; they will receive a link to join your firm</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center text-xs font-bold text-cg-sage flex-shrink-0 mt-0.5">3</span>
              <span><strong>Assign roles</strong> to each team member to control their permissions</span>
            </li>
          </ol>

          <h3 className="font-semibold text-foreground mb-3">Available roles</h3>
          <ul className="space-y-2.5 text-gray-700">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Attorney</strong> &mdash; full case access, report generation, and client communication</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Paralegal</strong> &mdash; case viewing, document preparation, and export generation</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Intake Coordinator</strong> &mdash; manage intake sessions and initial client contact</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cg-sage mt-2 flex-shrink-0" />
              <span><strong>Admin</strong> &mdash; firm settings, team management, billing, and all case access</span>
            </li>
          </ul>
        </section>

        {/* Related Guides */}
        <section className="border-t border-gray-200 pt-12 mb-14">
          <h2
            className="text-xl text-foreground mb-6"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Related guides
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {relatedGuides.map((guide) => {
              const Icon = guide.icon;
              return (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="group flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-cg-sage/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cg-sage transition-colors">
                    <Icon className="w-5 h-5 text-cg-sage group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-medium text-foreground text-sm group-hover:text-cg-sage transition-colors">
                    {guide.title}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-cg-sage transition-colors" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Still need help CTA */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <h2
            className="text-xl text-foreground mb-2"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Still need help?
          </h2>
          <p className="text-gray-600 text-sm mb-5">
            Our support team is here for you. We typically respond within a few hours.
          </p>
          <Link
            href="/help/contact"
            className="inline-flex items-center gap-2 bg-cg-sage text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-[#2E9A7A] transition-colors"
          >
            Contact Support
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </article>
  );
}
